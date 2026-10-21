import hashlib
import importlib.metadata
import json
import os
from pathlib import Path


def digest(path):
    h = hashlib.sha256()
    with Path(path).open("rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def write_json(path, data):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(temporary, path)


def verify_meta(saved, current):
    for key in ("schema", "actions", "observationSize", "ruleHash", "codeHash"):
        if saved.get(key) != current.get(key):
            raise ValueError(f"Incompatible {key}: saved={saved.get(key)} current={current.get(key)}")


def versions():
    names = ("numpy", "torch", "gymnasium", "lightning", "stable-baselines3", "sb3-contrib")
    return {name: importlib.metadata.version(name) for name in names}


def save_model(model, path, metadata):
    path = Path(path).with_suffix(".zip")
    temporary = path.with_name(path.stem + ".tmp.zip")
    model.save(temporary)
    os.replace(temporary, path)
    write_json(path.with_suffix(".meta.json"), {**metadata, "modelHash": digest(path)})
    return path


def read_model_meta(path, current):
    path = Path(path)
    meta = json.loads(path.with_suffix(".meta.json").read_text(encoding="utf-8"))
    verify_meta(meta, current)
    if digest(path) != meta["modelHash"]:
        raise ValueError("Checkpoint hash mismatch (incomplete or changed model)")
    return meta
