"""
backend/app/seed.py

Initializes and resets VERITAS demo database and state from data/seed.json.
Generates artifacts, registers base models, issues certificates, and logs everything.
"""

import json
from pathlib import Path
from typing import Any, Dict

from datetime import datetime, timezone, timedelta
import random
from .certs import issue_certificate
from .config import SEED_FILE
from .db import reset_db, get_db_connection
from .log import TransparencyLog
from .passport import register_passport


def seed_verifications(count: int = 200):
    """
    Seeds a realistic enterprise distribution of evaluated AI decisions:
    - 172 VERIFIED (86%): Clean production runs with valid enclave quotes & certified claims
    - 18 NEEDS_REVIEW (9%): Minor artifact drift (tokenizer/prompt) requiring selective re-audit
    - 8 DENIED (4%): Blocked model swaps, revoked certificates, or replayed nonces
    - 2 UNVERIFIED (1%): Un-attested legacy runtimes without hardware quotes
    Real latency distribution centered at 1.38ms (p50: ~1.32ms, p95: ~2.1ms).
    """
    now = datetime.now(timezone.utc)
    records = []

    # 1. 172 VERIFIED runs
    for i in range(172):
        ts = (now - timedelta(minutes=random.randint(5, 720))).isoformat()
        lat = round(random.gauss(1.35, 0.18), 2)
        if lat < 0.85:
            lat = 1.12
        checks = [
            {"check_number": 1, "name": "receipt_signature", "status": "PASS", "reason": "Ed25519 signature valid"},
            {"check_number": 2, "name": "quote_platform_binding", "status": "PASS", "reason": "Platform quote verified"},
            {"check_number": 3, "name": "nonce_and_replay", "status": "PASS", "reason": "Fresh single-use nonce"},
            {"check_number": 4, "name": "measurement_match", "status": "PASS", "reason": "Measurement matches certified passport"},
            {"check_number": 5, "name": "passport_log_inclusion", "status": "PASS", "reason": "Inclusion verified in Merkle tree"},
            {"check_number": 6, "name": "certificate_authenticity", "status": "PASS", "reason": "Certificate valid & unrevoked"},
            {"check_number": 7, "name": "policy_compliance", "status": "PASS", "reason": "All required claims verified"},
            {"check_number": 8, "name": "zk_membership", "status": "PASS", "reason": "Groth16 ZK proof valid"}
        ]
        records.append((
            f"job-prod-{1000 + i}",
            "VERIFIED",
            json.dumps(checks),
            json.dumps({"hash": f"e{i}f7a4...", "claims_valid": ["C1", "C2", "C4"]}),
            None,
            lat,
            ts
        ))

    # 2. 18 NEEDS_REVIEW runs (prompt or tokenizer drift)
    for i in range(18):
        ts = (now - timedelta(minutes=random.randint(15, 600))).isoformat()
        lat = round(random.gauss(1.68, 0.22), 2)
        plan = {
            "suites_rerun_count": 1 if i % 2 == 0 else 2,
            "suites_total": 4,
            "pct_saved": 75.0 if i % 2 == 0 else 50.0,
            "full_reaudit_required": False
        }
        checks = [
            {"check_number": 1, "name": "receipt_signature", "status": "PASS", "reason": "Ed25519 signature valid"},
            {"check_number": 2, "name": "quote_platform_binding", "status": "PASS", "reason": "Platform quote verified"},
            {"check_number": 3, "name": "nonce_and_replay", "status": "PASS", "reason": "Fresh single-use nonce"},
            {"check_number": 4, "name": "measurement_match", "status": "PASS", "reason": "Measurement matches registered passport"},
            {"check_number": 5, "name": "passport_log_inclusion", "status": "PASS", "reason": "Inclusion verified in Merkle tree"},
            {"check_number": 6, "name": "certificate_authenticity", "status": "PASS", "reason": "Certificate cert-001 valid"},
            {"check_number": 7, "name": "policy_compliance", "status": "NEEDS_REVIEW", "reason": "Artifact drift detected: selective re-audit required"},
            {"check_number": 8, "name": "zk_membership", "status": "NOT_EVALUATED", "reason": "ZK optional"}
        ]
        records.append((
            f"job-review-{2000 + i}",
            "NEEDS_REVIEW",
            json.dumps(checks),
            json.dumps({"drift": "tokenizer" if i % 2 == 0 else "prompt_template"}),
            json.dumps(plan),
            lat,
            ts
        ))

    # 3. 8 DENIED runs (security violations)
    denied_reasons = [
        ("Check 4: Measurement mismatch (model swap to shadow weights)", 4),
        ("Check 4: Measurement mismatch (model swap to shadow weights)", 4),
        ("Check 6: Certificate revoked in Transparency Log", 6),
        ("Check 6: Certificate revoked in Transparency Log", 6),
        ("Check 3: Nonce replay detected (previously consumed token)", 3),
        ("Check 3: Nonce replay detected (previously consumed token)", 3),
        ("Check 1: Receipt signature invalid (relay / foreign key)", 1),
        ("Check 5: Merkle tree inclusion proof failed (corrupt leaf)", 5),
    ]
    for i, (reason, failed_check) in enumerate(denied_reasons):
        ts = (now - timedelta(minutes=random.randint(10, 480))).isoformat()
        lat = round(random.gauss(1.15, 0.15), 2)
        checks = [
            {"check_number": j, "name": f"check_{j}", "status": "FAIL" if j == failed_check else "PASS", "reason": reason if j == failed_check else "PASS"}
            for j in range(1, 9)
        ]
        records.append((
            f"job-attack-{3000 + i}",
            "DENIED",
            json.dumps(checks),
            json.dumps({"threat_blocked": reason}),
            None,
            lat,
            ts
        ))

    # 4. 2 UNVERIFIED runs (legacy / unattested)
    for i in range(2):
        ts = (now - timedelta(minutes=random.randint(30, 300))).isoformat()
        lat = 0.94
        checks = [
            {"check_number": 1, "name": "receipt_signature", "status": "PASS", "reason": "Self-signed"},
            {"check_number": 2, "name": "quote_platform_binding", "status": "FAIL", "reason": "Hardware TEE quote missing"}
        ]
        records.append((
            f"job-unattested-{4000 + i}",
            "UNVERIFIED",
            json.dumps(checks),
            json.dumps({"missing": "hardware_quote"}),
            None,
            lat,
            ts
        ))

    with get_db_connection() as conn:
        conn.executemany("""
            INSERT INTO verifications (job_id, verdict, checks_json, evidence_vector_json, revalidation_plan_json, latency_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, records)
        conn.commit()


def seed_database() -> Dict[str, Any]:
    """
    Clears database and populates with seed models, passports, certificates, log entries, and verification history.
    """
    reset_db()

    with open(SEED_FILE, "r", encoding="utf-8") as f:
        seed_data = json.load(f)

    # 1. Register Models & Passports
    registered_passports = {}
    for m in seed_data["models"]:
        passport = register_passport(
            model_id=m["model_id"],
            dir_name=m["dir"],
            version=m["version"],
            operator_id=m["operator_id"]
        )
        registered_passports[m["model_id"]] = passport

    # 2. Issue Certificates
    issued_certificates = {}
    for c in seed_data["certificates"]:
        # Lookup passport digest for the model
        model_dir = c["model_dir"]
        passport = registered_passports.get(model_dir)
        if not passport:
            raise ValueError(f"Passport for model {model_dir} not registered")

        cert = issue_certificate(
            cert_id=c["cert_id"],
            auditor_id=c["auditor_id"],
            model_id=model_dir,
            passport_digest=passport["passport_digest"],
            issued_at=c["issued_at"],
            expires_at=c["expires_at"],
            claims=c["claims"]
        )
        issued_certificates[c["cert_id"]] = cert

    # 3. Create initial signed checkpoint
    checkpoint = TransparencyLog.create_checkpoint()

    # 4. Populate realistic operational verification history
    seed_verifications(count=200)

    return {
        "status": "seeded",
        "passports_registered": len(registered_passports),
        "certificates_issued": len(issued_certificates),
        "tree_size": checkpoint["tree_size"],
        "root": checkpoint["root"],
        "verifications_seeded": 200
    }


if __name__ == "__main__":
    res = seed_database()
    print("Seed complete:", res)
