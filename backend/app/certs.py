"""
backend/app/certs.py

Certificate issuance, soundness verification, auditor signing, and revocation.
Soundness rule: behavioral claims MUST depend on 'weights'.
"""

import json
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional
from fastapi import HTTPException

from .crypto import (
    canonical_json,
    get_demo_keypair,
    sha256_text,
    sign_data,
    verify_signature,
)
from .db import get_db_connection
from .log import TransparencyLog


def validate_soundness_rules(claims: List[Dict[str, Any]]) -> None:
    """
    Enforces soundness rule:
    Every claim with behavioral = true MUST list 'weights' in depends_on.
    """
    for c in claims:
        is_behavioral = c.get("behavioral", False)
        deps = c.get("depends_on", [])
        if is_behavioral and "weights" not in deps:
            raise HTTPException(
                status_code=400,
                detail=f"Soundness rule violation: Claim '{c.get('claim_id')}' has behavioral=True but does not include 'weights' in depends_on."
            )


def issue_certificate(
    cert_id: str,
    auditor_id: str,
    model_id: str,
    passport_digest: str,
    issued_at: Optional[str] = None,
    expires_at: Optional[str] = None,
    claims: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Validates claims, signs certificate with auditor key, stores, and logs to Merkle tree.
    """
    claims_list = claims or []
    validate_soundness_rules(claims_list)

    now_utc = datetime.now(timezone.utc)
    actual_issued_at = issued_at or now_utc.isoformat()
    actual_expires_at = expires_at or (now_utc + timedelta(days=180)).isoformat()

    unsigned_cert = {
        "cert_id": cert_id,
        "auditor_id": auditor_id,
        "model_id": model_id,
        "passport_digest": passport_digest,
        "issued_at": actual_issued_at,
        "expires_at": actual_expires_at,
        "claims": claims_list
    }

    # Auditor signs canonical unsigned certificate
    priv_key, pub_hex = get_demo_keypair(auditor_id)
    canonical_payload = canonical_json(unsigned_cert)
    auditor_signature = sign_data(priv_key, canonical_payload)

    cert_data = dict(unsigned_cert)
    cert_data["auditor_signature"] = auditor_signature

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT OR REPLACE INTO certificates
            (cert_id, auditor_id, model_id, passport_digest, issued_at, expires_at, claims_json, auditor_signature, raw_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cert_id,
                auditor_id,
                model_id,
                passport_digest,
                issued_at,
                expires_at,
                canonical_json(claims),
                auditor_signature,
                canonical_json(cert_data)
            )
        )
        conn.commit()

    # Append to transparency log
    TransparencyLog.append_entry("CERTIFICATE", cert_data)
    return cert_data


def revoke_certificate(cert_id: str, reason: str = "Revoked by auditor") -> Dict[str, Any]:
    """Revokes certificate, stores revocation, and appends to transparency log."""
    now_ts = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        # Check cert exists
        row = conn.execute("SELECT cert_id FROM certificates WHERE cert_id = ?", (cert_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail=f"Certificate {cert_id} not found")

        conn.execute(
            """
            INSERT OR REPLACE INTO revocations (cert_id, revoked_at, reason)
            VALUES (?, ?, ?)
            """,
            (cert_id, now_ts, reason)
        )
        conn.commit()

    revocation_payload = {
        "cert_id": cert_id,
        "revoked_at": now_ts,
        "reason": reason
    }
    TransparencyLog.append_entry("REVOCATION", revocation_payload)
    return revocation_payload


def is_certificate_revoked(cert_id: str) -> bool:
    with get_db_connection() as conn:
        row = conn.execute("SELECT cert_id FROM revocations WHERE cert_id = ?", (cert_id,)).fetchone()
        return row is not None


_CERT_CACHE: Dict[str, Dict[str, Any]] = {}


def get_certificate_by_id(cert_id: str) -> Optional[Dict[str, Any]]:
    if cert_id in _CERT_CACHE:
        return _CERT_CACHE[cert_id]
    with get_db_connection() as conn:
        row = conn.execute("SELECT raw_json FROM certificates WHERE cert_id = ?", (cert_id,)).fetchone()
        if row:
            data = json.loads(row["raw_json"])
            _CERT_CACHE[cert_id] = data
            return data
    return None


def get_all_certificates() -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        rows = conn.execute("SELECT raw_json FROM certificates ORDER BY issued_at DESC").fetchall()
        certs = [json.loads(r["raw_json"]) for r in rows]
        for c in certs:
            if "cert_id" in c:
                _CERT_CACHE[c["cert_id"]] = c
        return certs
