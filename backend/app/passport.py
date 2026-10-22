"""
backend/app/passport.py

Model artifact hashing, passport generation, operator signing, and registration.
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from .config import ARTIFACTS_DIR, DEMO_NOW
from .crypto import (
    canonical_json,
    compute_passport_digest,
    get_demo_keypair,
    sha256_bytes,
    sign_data,
    verify_signature,
)
from .db import get_db_connection
from .log import TransparencyLog


def infer_artifact_type(filename: str) -> Optional[str]:
    fn = filename.lower()
    if fn.startswith("weights"):
        return "weights"
    if fn.startswith("adapter"):
        return "adapter"
    if fn.startswith("tokenizer"):
        return "tokenizer"
    if fn.startswith("config"):
        return "config"
    if fn.startswith("prompt"):
        return "prompt_template"
    return None


def scan_model_dir(dir_path: Path) -> Dict[str, Dict[str, Any]]:
    """
    Scans a directory for model artifacts, computes sha256 and size for each.
    Returns dict: type -> {file, sha256, size}.
    """
    if not dir_path.exists() or not dir_path.is_dir():
        raise FileNotFoundError(f"Model directory not found: {dir_path}")

    artifacts = {}
    for p in sorted(dir_path.iterdir()):
        if p.is_file():
            art_type = infer_artifact_type(p.name)
            if art_type:
                data = p.read_bytes()
                h = sha256_bytes(data)
                artifacts[art_type] = {
                    "file": p.name,
                    "sha256": h,
                    "size": len(data)
                }
    if not artifacts:
        raise ValueError(f"No valid model artifacts found in {dir_path}")
    return artifacts


def register_passport(
    model_id: str,
    dir_name: str,
    version: str = "1.0.0",
    operator_id: str = "op-finlend",
    parent_digest: Optional[str] = None,
    custom_dir_path: Optional[Path] = None,
    created_at: Optional[str] = None
) -> Dict[str, Any]:
    """
    Creates, signs, stores and logs a model passport.
    """
    target_path = custom_dir_path or (ARTIFACTS_DIR / dir_name)
    artifacts = scan_model_dir(target_path)
    passport_digest = compute_passport_digest(artifacts)

    now_iso = created_at or DEMO_NOW

    # Sign passport digest with operator's Ed25519 key
    priv_key, pub_hex = get_demo_keypair(operator_id)
    operator_signature = sign_data(priv_key, passport_digest)

    passport_data = {
        "model_id": model_id,
        "version": version,
        "operator_id": operator_id,
        "artifacts": artifacts,
        "parent_digest": parent_digest,
        "created_at": now_iso,
        "passport_digest": passport_digest,
        "operator_signature": operator_signature
    }

    # Store in database
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO passports
            (passport_digest, model_id, version, operator_id, parent_digest, artifacts_json, created_at, operator_signature, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                passport_digest,
                model_id,
                version,
                operator_id,
                parent_digest,
                canonical_json(artifacts),
                now_iso,
                operator_signature,
                canonical_json(passport_data)
            )
        )
        conn.commit()

    # Append to transparency log
    TransparencyLog.append_entry("PASSPORT", passport_data)
    return passport_data


def get_passport_by_digest(passport_digest: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        row = conn.execute("SELECT raw_json FROM passports WHERE passport_digest = ?", (passport_digest,)).fetchone()
        if row:
            import json
            return json.loads(row["raw_json"])
    return None


def get_all_passports() -> list:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT raw_json FROM passports ORDER BY created_at DESC").fetchall()
        import json
        return [json.loads(r["raw_json"]) for r in rows]
