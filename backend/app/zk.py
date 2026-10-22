"""
backend/app/zk.py

Zero-knowledge Groth16 membership proof bridge.
Honesty rule: Uses real Circom + snarkjs. Never fakes or mocks proofs.
If the toolchain or keys are missing, reports honest status:
'ZK proof unavailable in this environment'
"""

import json
import subprocess
import time
from pathlib import Path
from typing import Any, Dict, Optional

from .config import ZK_DIR


def is_zk_available() -> bool:
    """
    Checks if Node.js and compiled Groth16 artifacts exist.
    """
    vkey_path = ZK_DIR / "verification_key.json"
    zkey_path = ZK_DIR / "membership_final.zkey"
    wasm_path = ZK_DIR / "membership_js" / "membership.wasm"
    prove_script = ZK_DIR / "prove.js"
    verify_script = ZK_DIR / "verify.js"

    return (
        vkey_path.exists()
        and zkey_path.exists()
        and wasm_path.exists()
        and prove_script.exists()
        and verify_script.exists()
    )


def generate_zk_proof(passport_digest: str, nonce: str) -> Dict[str, Any]:
    """
    Generates Groth16 proof using Node scripts.
    Never mocks. Returns unavailable message if toolchain missing.
    """
    if not is_zk_available():
        return {
            "available": False,
            "message": "ZK proof unavailable in this environment",
            "proof": None,
            "public_signals": None,
            "generation_time_ms": 0.0,
            "proof_size_bytes": 0
        }

    prove_script = ZK_DIR / "prove.js"
    start_time = time.perf_counter()
    try:
        proc = subprocess.run(
            ["node", str(prove_script), passport_digest, nonce],
            cwd=str(ZK_DIR),
            capture_output=True,
            text=True,
            timeout=30
        )
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        if proc.returncode != 0:
            return {
                "available": False,
                "message": f"ZK prover failed: {proc.stderr}",
                "proof": None,
                "public_signals": None,
                "generation_time_ms": duration_ms,
                "proof_size_bytes": 0
            }

        result = json.loads(proc.stdout)
        proof_str = json.dumps(result.get("proof", {}))
        return {
            "available": True,
            "proof": result.get("proof"),
            "public_signals": result.get("public_signals"),
            "root": result.get("root"),
            "generation_time_ms": round(duration_ms, 2),
            "proof_size_bytes": len(proof_str.encode("utf-8")),
            "caveat": "Membership proof does not by itself prove execution. It is bound to the nonce and checked together with the receipt."
        }
    except Exception as e:
        return {
            "available": False,
            "message": f"ZK proof generation error: {str(e)}",
            "proof": None,
            "public_signals": None,
            "generation_time_ms": 0.0,
            "proof_size_bytes": 0
        }


def verify_zk_proof(proof: Dict[str, Any], public_signals: list) -> Dict[str, Any]:
    """
    Verifies Groth16 proof using Node scripts and verification_key.json.
    """
    if not is_zk_available():
        return {
            "available": False,
            "valid": False,
            "message": "ZK proof unavailable in this environment",
            "verification_time_ms": 0.0
        }

    verify_script = ZK_DIR / "verify.js"
    start_time = time.perf_counter()
    try:
        input_data = json.dumps({"proof": proof, "public_signals": public_signals})
        proc = subprocess.run(
            ["node", str(verify_script)],
            input=input_data,
            cwd=str(ZK_DIR),
            capture_output=True,
            text=True,
            timeout=15
        )
        duration_ms = (time.perf_counter() - start_time) * 1000.0

        if proc.returncode != 0:
            return {
                "available": True,
                "valid": False,
                "message": proc.stderr or "Verification script error",
                "verification_time_ms": round(duration_ms, 2)
            }

        res = json.loads(proc.stdout)
        return {
            "available": True,
            "valid": res.get("valid", False),
            "message": res.get("message", "Proof verified successfully" if res.get("valid") else "Proof invalid"),
            "verification_time_ms": round(duration_ms, 2)
        }
    except Exception as e:
        return {
            "available": False,
            "valid": False,
            "message": f"ZK verification error: {str(e)}",
            "verification_time_ms": 0.0
        }
