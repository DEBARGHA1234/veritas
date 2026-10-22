"""
backend/app/seed.py

Initializes and resets VERITAS demo database and state from data/seed.json.
Generates artifacts, registers base models, issues certificates, and logs everything.
"""

import json
from pathlib import Path
from typing import Any, Dict

from .certs import issue_certificate
from .config import SEED_FILE
from .db import reset_db
from .log import TransparencyLog
from .passport import register_passport


def seed_database() -> Dict[str, Any]:
    """
    Clears database and populates with seed models, passports, certificates, and log entries.
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

    return {
        "status": "seeded",
        "passports_registered": len(registered_passports),
        "certificates_issued": len(issued_certificates),
        "tree_size": checkpoint["tree_size"],
        "root": checkpoint["root"]
    }


if __name__ == "__main__":
    res = seed_database()
    print("Seed complete:", res)
