"""
backend/app/runtime_sim.py

Simulated Trusted Execution Environment (TEE) runtime:
- Measures loaded model directory
- Generates ephemeral receipt keypair inside enclave
- Produces platform-attested Quote bound to receipt_pubkey and nonce
- Executes jobs and generates cryptographically signed Receipts
- Honesty rule: attestation_mode is explicitly 'simulated'
"""

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from .config import ARTIFACTS_DIR, ATTESTATION_MODE, DEMO_NOW, SCRATCH_DIR
from .crypto import (
    canonical_json,
    compute_measurement,
    generate_ephemeral_keypair,
    get_demo_keypair,
    sha256_text,
    sign_data,
    verify_signature,
)
from .db import get_db_connection
from .passport import scan_model_dir


def create_challenge_nonce() -> str:
    """Generates and records a fresh 60-second single-use challenge nonce."""
    nonce = f"nonce-{uuid.uuid4().hex}"
    now_ts = datetime.now(timezone.utc).isoformat()
    # 60s expiration
    expires_ts = datetime.fromtimestamp(datetime.now(timezone.utc).timestamp() + 60, timezone.utc).isoformat()

    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO challenges (nonce, issued_at, used, expires_at) VALUES (?, ?, 0, ?)",
            (nonce, now_ts, expires_ts)
        )
        conn.commit()
    return nonce


def start_runtime(model_dir: str, custom_dir: Optional[Path] = None, nonce: Optional[str] = None) -> Dict[str, Any]:
    """
    Initializes simulated TEE runtime:
    - Measures model files in directory
    - Generates ephemeral keypair
    - Produces platform quote
    """
    target_dir = custom_dir or (ARTIFACTS_DIR / model_dir)
    if not target_dir.exists():
        # Check scratch
        scratch_path = SCRATCH_DIR / model_dir
        if scratch_path.exists():
            target_dir = scratch_path
        else:
            raise FileNotFoundError(f"Model directory '{model_dir}' not found")

    artifacts = scan_model_dir(target_dir)
    measurement = compute_measurement(artifacts)

    # Ephemeral keypair inside simulated TEE
    priv_key, pub_hex = generate_ephemeral_keypair()

    runtime_id = f"rt-{uuid.uuid4().hex[:8]}"
    now_ts = datetime.now(timezone.utc).isoformat()
    active_nonce = nonce or create_challenge_nonce()

    # Platform signature over measurement, receipt_pubkey, and nonce
    platform_key_id = "sim-platform-1"
    platform_priv, _ = get_demo_keypair(platform_key_id)
    quote_binding_msg = f"{measurement}:{pub_hex}:{active_nonce}"
    platform_sig = sign_data(platform_priv, quote_binding_msg)

    quote = {
        "quote_id": f"quote-{uuid.uuid4().hex[:8]}",
        "measurement": measurement,
        "receipt_pubkey": pub_hex,
        "nonce": active_nonce,
        "attestation_mode": ATTESTATION_MODE,
        "platform_key_id": platform_key_id,
        "platform_signature": platform_sig
    }

    # Export private key bytes for in-memory session (stored in DB for runtime service)
    # Serialize private key for simulated enclave storage
    from cryptography.hazmat.primitives import serialization
    priv_bytes = priv_key.private_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PrivateFormat.Raw,
        encryption_algorithm=serialization.NoEncryption()
    ).hex()

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO runtimes
            (runtime_id, model_dir, measurement, receipt_pubkey, receipt_privkey, quote_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                runtime_id,
                model_dir,
                measurement,
                pub_hex,
                priv_bytes,
                canonical_json(quote),
                now_ts
            )
        )
        conn.commit()

    return {
        "runtime_id": runtime_id,
        "model_dir": model_dir,
        "quote": quote
    }


def run_job(
    runtime_id: str,
    input_text: str,
    passport_digest: str,
    cert_id: str,
    nonce: Optional[str] = None
) -> Dict[str, Any]:
    """
    Simulates model inference and produces signed receipt.
    Receipt never contains raw input or raw output, only output_hash.
    """
    with get_db_connection() as conn:
        row = conn.execute("SELECT * FROM runtimes WHERE runtime_id = ?", (runtime_id,)).fetchone()
        if not row:
            raise ValueError(f"Runtime '{runtime_id}' not found")
        quote = json.loads(row["quote_json"])
        receipt_priv_hex = row["receipt_privkey"]

    # Deterministic mock inference
    job_id = f"job-{uuid.uuid4().hex[:8]}"
    mock_output = f"InferenceResult(job={job_id}, input_len={len(input_text)}, model={row['model_dir']})"
    output_hash = sha256_text(mock_output)
    now_ts = datetime.now(timezone.utc).isoformat()
    active_nonce = nonce or quote["nonce"]

    unsigned_receipt = {
        "job_id": job_id,
        "nonce": active_nonce,
        "passport_digest": passport_digest,
        "cert_id": cert_id,
        "output_hash": output_hash,
        "policy_decision": "PASS",
        "issued_at": now_ts,
        "quote_id": quote["quote_id"],
        "attestation_mode": ATTESTATION_MODE
    }

    # Sign receipt using ephemeral receipt private key
    from cryptography.hazmat.primitives.asymmetric import ed25519
    priv_key = ed25519.Ed25519PrivateKey.from_private_bytes(bytes.fromhex(receipt_priv_hex))
    receipt_sig = sign_data(priv_key, canonical_json(unsigned_receipt))

    receipt = dict(unsigned_receipt)
    receipt["signature"] = receipt_sig

    # Store job in database
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO jobs
            (job_id, runtime_id, nonce, passport_digest, cert_id, input_data, output_data, output_hash, receipt_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job_id,
                runtime_id,
                active_nonce,
                passport_digest,
                cert_id,
                input_text,
                mock_output,
                output_hash,
                canonical_json(receipt),
                now_ts
            )
        )
        conn.commit()

    return {
        "job_id": job_id,
        "output": mock_output,
        "output_hash": output_hash,
        "receipt": receipt,
        "quote": quote
    }
