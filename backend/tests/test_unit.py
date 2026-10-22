"""
backend/tests/test_unit.py

Unit tests for VERITAS core components:
- Canonical JSON and passport digest stability
- Merkle root and inclusion proof verification
- Checkpoint signature verification
- Claim status computation
- Soundness rule rejection
- Nonce single-use enforcement
- Verifier checks in isolation
"""

import json
import pytest
from fastapi import HTTPException

from backend.app.certs import issue_certificate, validate_soundness_rules
from backend.app.config import DEMO_NOW
from backend.app.crypto import (
    canonical_json,
    compute_measurement,
    compute_passport_digest,
    get_demo_keypair,
    sha256_text,
    sign_data,
    verify_signature,
)
from backend.app.deps import compute_claim_statuses, resolve_passport_lineage
from backend.app.log import (
    TransparencyLog,
    compute_mth,
    generate_audit_path,
    leaf_hash_bytes,
    verify_audit_path,
)
from backend.app.runtime_sim import create_challenge_nonce
from backend.app.seed import seed_database
from backend.app.verifier import verify_receipt


@pytest.fixture(autouse=True)
def run_around_tests():
    seed_database()
    yield


def test_canonical_json_stability():
    """Canonical JSON must sort keys and have no whitespace."""
    d1 = {"b": 2, "a": 1, "c": {"y": 20, "x": 10}}
    d2 = {"c": {"x": 10, "y": 20}, "a": 1, "b": 2}
    c1 = canonical_json(d1)
    c2 = canonical_json(d2)
    assert c1 == c2
    assert c1 == '{"a":1,"b":2,"c":{"x":10,"y":20}}'


def test_passport_digest_stability():
    """Passport digest must be deterministic given identical artifacts."""
    artifacts = {
        "weights": {"file": "weights.bin", "sha256": "abc123", "size": 100},
        "config": {"file": "config.yaml", "sha256": "def456", "size": 50}
    }
    d1 = compute_passport_digest(artifacts)
    d2 = compute_passport_digest(artifacts)
    assert d1 == d2
    assert len(d1) == 64


def test_merkle_tree_and_inclusion_proofs():
    """Verifies RFC 6962 tree hash and audit paths for all tree sizes."""
    leaves = [leaf_hash_bytes(f"leaf_{i}".encode("utf-8")) for i in range(7)]
    root = compute_mth(leaves)
    assert len(root) == 64

    for i in range(len(leaves)):
        path = generate_audit_path(i, leaves)
        valid = verify_audit_path(leaves[i], i, len(leaves), path, root)
        assert valid is True, f"Inclusion proof failed for leaf {i}"

    # Tampered leaf must fail verification
    bad_leaf = leaf_hash_bytes(b"tampered")
    assert verify_audit_path(bad_leaf, 0, len(leaves), generate_audit_path(0, leaves), root) is False


def test_checkpoint_signature():
    """Checkpoint signature must verify under log authority public key."""
    cp = TransparencyLog.get_latest_checkpoint()
    assert cp is not None
    _, log_pub = get_demo_keypair("log-authority")
    msg = f"{cp['tree_size']}:{cp['root']}:{cp['timestamp']}"
    assert verify_signature(log_pub, msg, cp["signature"]) is True


def test_soundness_rule_enforcement():
    """Behavioral claim must fail if 'weights' is omitted from depends_on."""
    # Valid behavioral claim
    valid_claims = [
        {"claim_id": "V1", "statement": "Test", "suite": "s1", "result": 1.0, "threshold": 1.0, "behavioral": True, "depends_on": ["weights", "config"]}
    ]
    validate_soundness_rules(valid_claims)  # Should not raise

    # Invalid behavioral claim missing weights
    invalid_claims = [
        {"claim_id": "INV1", "statement": "Test", "suite": "s1", "result": 1.0, "threshold": 1.0, "behavioral": True, "depends_on": ["config", "tokenizer"]}
    ]
    with pytest.raises(HTTPException) as exc_info:
        validate_soundness_rules(invalid_claims)
    assert exc_info.value.status_code == 400
    assert "Soundness rule violation" in exc_info.value.detail


def test_claim_status_computation():
    """Tests claim status dynamic transition from VALID to IMPACTED."""
    cert = {
        "claims": [
            {"claim_id": "C1", "suite": "fairness", "behavioral": True, "depends_on": ["weights", "config"]},
            {"claim_id": "C2", "suite": "robustness", "behavioral": True, "depends_on": ["weights", "tokenizer"]}
        ],
        "expires_at": "2027-01-01T00:00:00Z"
    }
    p_certified = {
        "artifacts": {
            "weights": {"sha256": "w1"},
            "config": {"sha256": "c1"},
            "tokenizer": {"sha256": "t1"}
        }
    }
    # Current passport with modified config
    p_current = {
        "artifacts": {
            "weights": {"sha256": "w1"},
            "config": {"sha256": "c2_MODIFIED"},
            "tokenizer": {"sha256": "t1"}
        }
    }

    eval_res = compute_claim_statuses(cert, p_certified, p_current)
    statuses = eval_res["claim_statuses"]
    assert statuses["C1"] == "IMPACTED"  # config changed
    assert statuses["C2"] == "VALID"     # weights & tokenizer unchanged
    plan = eval_res["revalidation_plan"]
    assert plan["suites_rerun_count"] == 1
    assert plan["pct_saved"] == 50.0


def test_nonce_single_use():
    """Nonce can only be verified once; second attempt is rejected as replay."""
    from backend.app.runtime_sim import start_runtime, run_job
    from backend.app.passport import get_all_passports

    nonce = create_challenge_nonce()
    rt = start_runtime("credit-risk", nonce=nonce)
    cr_passport = next(p for p in get_all_passports() if p["model_id"] == "credit-risk")

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Applicant John",
        passport_digest=cr_passport["passport_digest"],
        cert_id="cert-001",
        nonce=nonce
    )

    # First verify passes
    v1 = verify_receipt(receipt=job_res["receipt"], quote=rt["quote"], policy_id="regulated-lending")
    assert v1["verdict"] == "VERIFIED"

    # Second verify with same nonce fails
    v2 = verify_receipt(receipt=job_res["receipt"], quote=rt["quote"], policy_id="regulated-lending")
    assert v2["verdict"] == "DENIED"
    assert "3 replay" in v2["deciding_check"]
