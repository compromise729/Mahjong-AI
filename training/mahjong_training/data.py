"""Generate sharded demonstrations without keeping a full dataset in memory."""
import bisect
import json
from functools import lru_cache
from pathlib import Path
import numpy as np
from .bridge import Bridge
from .artifacts import digest, write_json


def generate(directory, games=1000, seed=10000, teacher="teacher", samples=32):
    if games < 3:
        raise ValueError("At least 3 games are required for disjoint splits")
    directory = Path(directory)
    directory.mkdir(parents=True, exist_ok=False)
    ntrain = max(1, min(games - 2, int(games * .8)))
    nvalid = max(1, int(games * .1))
    with Bridge() as bridge:
        meta = bridge.request("hello")
        manifest = {**meta, "status": "generating", "teacher": teacher,
                    "teacherSamples": samples, "searchDepth": 0, "shards": []}
        write_json(directory / "manifest.json", manifest)
        for i in range(games):
            split = "train" if i < ntrain else "validation" if i < ntrain + nvalid else "test"
            game_seed = seed + i
            state = bridge.request("reset", seed=game_seed, policies=["external"] * 4,
                                   teacherOptions={"samples": samples, "searchDepth": 0})
            observations, masks, actions, seats, before = [], [], [], [], []
            while not state["done"]:
                action = bridge.request("teacher", kind=teacher)["action"]
                observations.append(state["observation"])
                masks.append(state["mask"])
                actions.append(action)
                seats.append(state["actor"])
                before.append(state["scores"][state["actor"]])
                state = bridge.request("step", action=action)
            returns = [(state["scores"][s] - score) / 512 for s, score in zip(seats, before)]
            name = f"game-{game_seed}.npz"
            np.savez_compressed(directory / name, observations=np.asarray(observations, dtype=np.float32),
                                masks=np.asarray(masks, dtype=bool), actions=np.asarray(actions, dtype=np.int64),
                                returns=np.asarray(returns, dtype=np.float32))
            manifest["shards"].append({"file": name, "split": split, "seed": game_seed,
                                      "rows": len(actions), "sha256": digest(directory / name)})
            write_json(directory / "manifest.json", manifest)
            print(f"demonstrations {i + 1}/{games}: {len(actions)} decisions", flush=True)
        manifest["status"] = "complete"
        write_json(directory / "manifest.json", manifest)
    return manifest


class Demonstrations:
    def __init__(self, directory, split):
        self.directory = Path(directory)
        self.meta = json.loads((self.directory / "manifest.json").read_text(encoding="utf-8"))
        if self.meta["status"] != "complete":
            raise ValueError("Dataset generation did not finish")
        self.shards = [s for s in self.meta["shards"] if s["split"] == split]
        if not self.shards:
            raise ValueError(f"Empty split {split}")
        self.game_seeds = [s["seed"] for s in self.shards]
        self.ends = np.cumsum([s["rows"] for s in self.shards]).tolist()
        for shard in self.shards:
            if digest(self.directory / shard["file"]) != shard["sha256"]:
                raise ValueError(f"Dataset hash mismatch: {shard['file']}")

    def __len__(self):
        return self.ends[-1]

    @lru_cache(maxsize=2)
    def _load(self, index):
        with np.load(self.directory / self.shards[index]["file"], allow_pickle=False) as data:
            return {name: data[name] for name in data.files}

    def __getitem__(self, index):
        if not 0 <= index < len(self):
            raise IndexError(index)
        shard = bisect.bisect_right(self.ends, index)
        row = index - (self.ends[shard - 1] if shard else 0)
        data = self._load(shard)
        return data["observations"][row], data["masks"][row], data["actions"][row], data["returns"][row]
