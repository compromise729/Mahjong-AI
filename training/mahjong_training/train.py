"""Supervised warm start and masked PPO. No training runs on import."""
import json
import random
from pathlib import Path
import numpy as np
import torch
import lightning as L
from lightning.pytorch.callbacks import ModelCheckpoint
from lightning.pytorch.loggers import CSVLogger
from torch.utils.data import DataLoader
from sb3_contrib import MaskablePPO
from stable_baselines3.common.callbacks import BaseCallback
from stable_baselines3.common.logger import configure
from .env import MahjongEnv
from .data import Demonstrations
from .artifacts import save_model, read_model_meta, verify_meta, versions, write_json, digest


def device_name(device):
    if device == "auto":
        return "cuda" if torch.cuda.is_available() else "cpu"
    if device == "cuda" and not torch.cuda.is_available():
        raise ValueError("CUDA is unavailable in this Python environment; use --device cpu")
    return device


def new_model(env, seed, device, rollout=256, batch=64):
    if rollout < 2 or batch < 2 or rollout % batch:
        raise ValueError("rollout must be >=2 and a multiple of batch (>=2)")
    return MaskablePPO("MlpPolicy", env, seed=seed, device=device, gamma=1,
                       n_steps=rollout, batch_size=batch, n_epochs=4,
                       learning_rate=3e-4, ent_coef=.01,
                       policy_kwargs={"net_arch": dict(pi=[128, 128], vf=[128, 128])}, verbose=0)


class Imitation(L.LightningModule):
    def __init__(self, policy, metadata):
        super().__init__()
        self.policy = policy
        self.metadata = metadata

    def loss(self, batch, prefix):
        obs, masks, actions, returns = batch
        values, log_prob, _ = self.policy.evaluate_actions(obs, actions, action_masks=masks)
        policy_loss = -log_prob.mean()
        value_loss = torch.nn.functional.smooth_l1_loss(values.flatten(), returns)
        loss = policy_loss + .1 * value_loss
        self.log(f"{prefix}_loss", loss, on_step=False, on_epoch=True, batch_size=len(actions))
        return loss

    def training_step(self, batch, _):
        return self.loss(batch, "train")

    def validation_step(self, batch, _):
        return self.loss(batch, "validation")

    def configure_optimizers(self):
        return torch.optim.Adam(self.policy.parameters(), lr=3e-4)

    def on_save_checkpoint(self, checkpoint):
        checkpoint["mahjong_meta"] = self.metadata

    def on_load_checkpoint(self, checkpoint):
        verify_meta(checkpoint["mahjong_meta"], self.metadata)
        if checkpoint["mahjong_meta"].get("dataHash") != self.metadata["dataHash"]:
            raise ValueError("Cannot resume imitation with a different dataset")


def imitate(data, output, epochs=10, batch=64, seed=0, device="auto", resume=None):
    if epochs < 1 or batch < 2:
        raise ValueError("epochs >=1 and batch >=2 required")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    torch.set_num_threads(2)
    L.seed_everything(seed, workers=True)
    device = device_name(device)
    train_set, validation_set = Demonstrations(data, "train"), Demonstrations(data, "validation")
    env = MahjongEnv(opponents=("efficiency",), teacher_samples=0)
    try:
        verify_meta(train_set.meta, env.meta)
        meta = {**env.meta, "stage": "imitation", "seed": seed, "versions": versions(),
                "dataHash": digest(Path(data) / "manifest.json"), "device": device,
                "trainingSeeds": train_set.game_seeds, "validationSeeds": validation_set.game_seeds}
        write_json(output / "config.json", meta)
        model = new_model(env, seed, device)
        module = Imitation(model.policy, meta)
        checkpoint = ModelCheckpoint(dirpath=output, filename="best-imitation",
                                     monitor="validation_loss", mode="min", save_last=True)
        trainer = L.Trainer(max_epochs=epochs, accelerator="gpu" if device == "cuda" else "cpu",
                            devices=1, callbacks=[checkpoint],
                            logger=CSVLogger(str(output), name="logs"), enable_progress_bar=False,
                            num_sanity_val_steps=0, deterministic=True)
        trainer.fit(module, DataLoader(train_set, batch_size=batch, shuffle=True, num_workers=0),
                    DataLoader(validation_set, batch_size=batch, num_workers=0), ckpt_path=resume)
        # Load best validation weights, not merely the final epoch.
        state = torch.load(checkpoint.best_model_path, map_location=device, weights_only=False)
        module.load_state_dict(state["state_dict"])
        saved = save_model(model, output / "policy.zip", meta)
        loaded = MaskablePPO.load(saved, device=device)
        sample = [train_set[i] for i in range(min(8, len(train_set)))]
        obs = torch.as_tensor(np.stack([s[0] for s in sample]), device=device)
        masks = np.stack([s[1] for s in sample])
        with torch.no_grad():
            a = model.policy.get_distribution(obs, action_masks=masks).distribution.probs
            b = loaded.policy.get_distribution(obs, action_masks=masks).distribution.probs
            torch.testing.assert_close(a, b)
            torch.testing.assert_close(model.policy.predict_values(obs), loaded.policy.predict_values(obs))
        write_json(output / "result.json", {"status": "complete", "model": str(saved),
                   "validationLoss": float(checkpoint.best_model_score), "roundTripVerified": True})
        return saved
    finally:
        env.close()


def random_state():
    n = np.random.get_state()
    return {"python": random.getstate(), "numpy": [n[0], n[1].tolist(), n[2], n[3], n[4]],
            "torch": torch.get_rng_state().tolist(),
            "cuda": [s.tolist() for s in torch.cuda.get_rng_state_all()] if torch.cuda.is_available() else []}


def restore_random(state):
    def tuples(x):
        return tuple(tuples(i) for i in x) if isinstance(x, list) else x
    random.setstate(tuples(state["python"]))
    n = state["numpy"]
    np.random.set_state((n[0], np.asarray(n[1], dtype=np.uint32), n[2], n[3], n[4]))
    torch.set_rng_state(torch.tensor(state["torch"], dtype=torch.uint8))
    if torch.cuda.is_available() and state["cuda"]:
        torch.cuda.set_rng_state_all([torch.tensor(s, dtype=torch.uint8) for s in state["cuda"]])


class Checkpoints(BaseCallback):
    def __init__(self, output, metadata, interval=4096):
        super().__init__()
        self.output, self.metadata, self.interval = Path(output), metadata, interval
        self.saved_steps = -interval

    def save(self):
        path = self.output / f"step-{self.model.num_timesteps}.zip"
        seeds = set(self.metadata.get("trainingSeeds", []))
        for group in self.training_env.get_attr("seen_seeds"):
            seeds.update(group)
        saved = save_model(self.model, path, {**self.metadata, "steps": self.model.num_timesteps,
                           "trainingSeeds": sorted(seeds),
                           "rng": random_state(), "resumeMode": "optimizer+weights; environments restart"})
        write_json(self.output / "latest.json", {"path": saved.name})
        self.saved_steps = self.model.num_timesteps

    def _on_rollout_start(self):
        # Called after the previous PPO update, before collecting the next rollout.
        if self.model.num_timesteps - self.saved_steps >= self.interval:
            self.save()

    def _on_step(self):
        return True

    def _on_training_end(self):
        self.save()


def reinforce(output, steps=100000, warm_start=None, resume=None, seed=100000,
              device="auto", opponents=("random", "efficiency", "teacher"),
              teacher_samples=32, snapshots=(), rollout=256, batch=64):
    if steps < 1 or (warm_start and resume):
        raise ValueError("steps must be positive; choose warm-start OR resume")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    device = device_name(device)
    torch.set_num_threads(2)
    frozen = {}
    env = MahjongEnv(opponents=opponents, teacher_samples=teacher_samples, snapshots=frozen)
    training_logger = None
    try:
        for i, path in enumerate(snapshots):
            read_model_meta(path, env.meta)
            frozen[f"snapshot-{i}"] = MaskablePPO.load(path, device=device)
        # Explicitly provided, validated snapshots join the opponent pool.
        env.snapshots = frozen
        env.opponents = tuple(opponents) + tuple(frozen)
        source = resume or warm_start
        previous = read_model_meta(source, env.meta) if source else {}
        if resume and previous.get("stage") != "ppo":
            raise ValueError("Use --warm-start for an imitation policy")
        model = MaskablePPO.load(source, env=env, device=device) if resume else new_model(env, seed, device, rollout, batch)
        if warm_start:
            initial = MaskablePPO.load(warm_start, device=device)
            model.policy.load_state_dict(initial.policy.state_dict())
        if resume and previous.get("rng"):
            restore_random(previous["rng"])
        meta = {**env.meta, "stage": "ppo", "seed": seed, "versions": versions(), "device": device,
                "parent": str(source) if source else None, "opponents": list(env.opponents),
                "snapshots": [{"path": str(p), "sha256": digest(p)} for p in snapshots],
                "teacherSamples": teacher_samples, "requestedAdditionalSteps": steps,
                "trainingSeeds": previous.get("trainingSeeds", []),
                "validationSeeds": previous.get("validationSeeds", []),
                "resumeMode": "optimizer+weights; environments restart"}
        write_json(output / "config.json", meta)
        training_logger = configure(str(output), ["stdout", "csv"])
        model.set_logger(training_logger)
        callback = Checkpoints(output, meta)
        model.learn(total_timesteps=steps, reset_num_timesteps=not bool(resume), callback=callback)
        write_json(output / "result.json", {"status": "complete", "steps": model.num_timesteps})
        return output / f"step-{model.num_timesteps}.zip"
    except BaseException as error:
        # Last completed rollout checkpoint remains authoritative; no partial overwrite.
        write_json(output / "failure.json", {"error": repr(error),
                   "recovery": "Use the checkpoint referenced by latest.json, if present."})
        raise
    finally:
        if training_logger is not None:
            training_logger.close()
        env.close()
