"""
scripts/make_artifacts.py

Deterministic artifact generator for VERITAS demo models.
Generates artifact files from data/seed.json using seeded PRNG.
Provides mutate() helper for scenarios.
"""

import json
import os
import random
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
SEED_FILE = ROOT_DIR / "data" / "seed.json"
ARTIFACTS_DIR = ROOT_DIR / "data" / "artifacts"
SCRATCH_DIR = ROOT_DIR / "data" / "scratch"


def generate_artifacts():
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    for model in seed_data["models"]:
        model_dir = ARTIFACTS_DIR / model["dir"]
        model_dir.mkdir(parents=True, exist_ok=True)
        for art_type, art_info in model["artifacts"].items():
            file_path = model_dir / art_info["file"]
            rng = random.Random(art_info["seed"])
            data = rng.randbytes(art_info["size"])
            with open(file_path, "wb") as out_f:
                out_f.write(data)
            print(f"Generated {model['dir']}/{art_info['file']} ({len(data)} bytes)")


def mutate(model_dir: str, artifact_type: str, mode: str = "append") -> Path:
    """
    Copies data/artifacts/<model_dir> into data/scratch/<model_dir>,
    and mutates the specified artifact type by appending 16 deterministic bytes.
    Original artifact is never modified.
    Returns the scratch directory path.
    """
    with open(SEED_FILE, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    target_model = None
    for m in seed_data["models"]:
        if m["dir"] == model_dir:
            target_model = m
            break
    if not target_model:
        raise ValueError(f"Model dir {model_dir} not found in seed.json")

    if artifact_type not in target_model["artifacts"]:
        raise ValueError(f"Artifact type {artifact_type} not found in model {model_dir}")

    target_file = target_model["artifacts"][artifact_type]["file"]
    src_dir = ARTIFACTS_DIR / model_dir
    dst_dir = SCRATCH_DIR / model_dir

    if dst_dir.exists():
        shutil.rmtree(dst_dir)
    shutil.copytree(src_dir, dst_dir)

    mutated_file_path = dst_dir / target_file
    with open(mutated_file_path, "ab") as f:
        # Append 16 deterministic bytes
        mutation_bytes = b"VERITAS_MUT_16B!"
        f.write(mutation_bytes)

    return dst_dir


if __name__ == "__main__":
    generate_artifacts()
    print("All artifacts generated successfully.")
