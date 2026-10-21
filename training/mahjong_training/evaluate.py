"""Paired full-round evaluation; cluster uncertainty by wall seed."""
import numpy as np
from pathlib import Path
from sb3_contrib import MaskablePPO
from .env import MahjongEnv
from .artifacts import read_model_meta, write_json


def paired_summary(rows, seed=0):
    groups = {}
    for row in rows:
        groups.setdefault(row["seed"], []).append(row["candidate"]["score"] - row["baseline"]["score"])
    differences = np.asarray([np.mean(v) for v in groups.values()])
    ci = None
    if len(differences) >= 2:
        random = np.random.default_rng(seed)
        means = [random.choice(differences, size=len(differences), replace=True).mean() for _ in range(2000)]
        ci = [float(x) for x in np.quantile(means, [.025, .975])]
    def side(name):
        values = [r[name] for r in rows]
        winners = [r for r in values if r["won"]]
        return {"meanScore": float(np.mean([r["score"] for r in values])),
                "winRate": float(np.mean([r["won"] for r in values])),
                "dealInRoundRate": float(np.mean([r["dealInEvents"] > 0 for r in values])),
                "meanDealInPayments": float(np.mean([r["dealInPayments"] for r in values])),
                "meanWinIncome": float(np.mean([r["winIncome"] for r in winners])) if winners else None,
                "meanDrawsToWin": float(np.mean([r["winDraws"] for r in winners])) if winners else None}
    return {"independentSeeds": len(groups), "pairedRounds": len(rows),
            "meanScoreDifference": float(differences.mean()), "pairedSeedBootstrap95CI": ci,
            "candidate": side("candidate"), "baseline": side("baseline"),
            "positiveEvidence": len(groups) >= 1000 and ci is not None and ci[0] > 0,
            "scope": "This fixed opponent/rule setup only; repeat with independent training seeds."}


def evaluate(model_path, output, seeds=1000, seed_start=2000000, opponent="teacher", samples=32):
    if seeds < 1:
        raise ValueError("seeds must be positive")
    output = Path(output)
    output.mkdir(parents=True, exist_ok=False)
    env = MahjongEnv(opponents=(opponent,), teacher_samples=samples)
    try:
        metadata = read_model_meta(model_path, env.meta)
        used = set(metadata.get("trainingSeeds", [])) | set(metadata.get("validationSeeds", []))
        if used.intersection(range(seed_start, seed_start + seeds)):
            raise ValueError("Evaluation seeds overlap training or validation")
        model = MaskablePPO.load(model_path, device="cpu")
        rows = []
        def play(seed, seat, candidate):
            obs, _ = env.reset(seed=seed, options={"game_seed": seed, "seat": seat})
            while True:
                if env.state["done"]:
                    action = 136
                elif candidate:
                    action, _ = model.predict(obs, action_masks=env.action_masks(), deterministic=True)
                else:
                    action = env.bridge.request("teacher", kind="teacher")["action"]
                obs, _, done, _, info = env.step(int(action))
                if done:
                    return {**info["metrics"][seat], "stageDecisions": info["stage_decisions"]}
        for seed in range(seed_start, seed_start + seeds):
            for seat in range(4):
                rows.append({"seed": seed, "seat": seat, "candidate": play(seed, seat, True),
                             "baseline": play(seed, seat, False)})
            print(f"evaluation {seed - seed_start + 1}/{seeds}", flush=True)
            write_json(output / "rounds.json", rows)
        report = {**paired_summary(rows), "model": str(model_path), "opponent": opponent,
                  "teacherSamples": samples, "metadata": env.meta}
        write_json(output / "report.json", report)
        return report
    finally:
        env.close()
