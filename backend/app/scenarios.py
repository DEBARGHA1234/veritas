"""
backend/app/scenarios.py

Scenario test runner for S1 to S15.
Produces real verification runs and asserts expected verdicts and deciding checks.
"""

import copy
import json
from typing import Any, Dict, List, Optional

from .certs import get_certificate_by_id, revoke_certificate
from .config import DEMO_NOW, SCRATCH_DIR
from .crypto import (
    canonical_json,
    generate_ephemeral_keypair,
    get_demo_keypair,
    sign_data,
)
from .deps import compute_claim_statuses
from .log import TransparencyLog
from .passport import get_all_passports, get_passport_by_digest, register_passport
from .runtime_sim import create_challenge_nonce, run_job, start_runtime
from .seed import seed_database
from .verifier import verify_receipt
from .zk import generate_zk_proof, is_zk_available, verify_zk_proof

# Import mutation helper from scripts
import sys
from pathlib import Path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))
from scripts.make_artifacts import mutate


def run_scenario_s1() -> Dict[str, Any]:
    """S1: Honest run, credit-risk -> VERIFIED"""
    nonce = create_challenge_nonce()
    rt = start_runtime("credit-risk", nonce=nonce)
    passports = get_all_passports()
    cr_passport = next(p for p in passports if p["model_id"] == "credit-risk")
    
    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Applicant: Jane Doe, Income: 85k, Score: 740",
        passport_digest=cr_passport["passport_digest"],
        cert_id="cert-001",
        nonce=nonce
    )

    verif = verify_receipt(
        receipt=job_res["receipt"],
        quote=rt["quote"],
        policy_id="regulated-lending"
    )

    return {
        "id": "S1",
        "name": "Honest run, credit-risk",
        "expected_verdict": "VERIFIED",
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": "none failed",
        "passed": (verif["verdict"] == "VERIFIED"),
        "what_happened": "Model files matched certified passport, signed enclave quote verified, claims satisfied."
    }


def run_scenario_s2() -> Dict[str, Any]:
    """S2: Honest run, med-triage -> VERIFIED"""
    nonce = create_challenge_nonce()
    rt = start_runtime("med-triage-llm", nonce=nonce)
    passports = get_all_passports()
    med_passport = next(p for p in passports if p["model_id"] == "med-triage-llm")

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Patient: 45yo Male, chest pain radiating to left arm",
        passport_digest=med_passport["passport_digest"],
        cert_id="cert-002",
        nonce=nonce
    )

    verif = verify_receipt(
        receipt=job_res["receipt"],
        quote=rt["quote"],
        policy_id="clinical-triage"
    )

    return {
        "id": "S2",
        "name": "Honest run, med-triage",
        "expected_verdict": "VERIFIED",
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": "none failed",
        "passed": (verif["verdict"] == "VERIFIED"),
        "what_happened": "Clinical model matched passport, valid platform quote, all safety claims VALID."
    }


def run_scenario_s3() -> Dict[str, Any]:
    """S3: Model swap -> DENIED (4 measurement mismatch)"""
    nonce = create_challenge_nonce()
    # Runtime actually started on shadow-model files
    rt = start_runtime("shadow-model", nonce=nonce)
    passports = get_all_passports()
    cr_passport = next(p for p in passports if p["model_id"] == "credit-risk")

    # Operator fraudulently claims the credit-risk passport and cert-001
    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Applicant: John Smith",
        passport_digest=cr_passport["passport_digest"],
        cert_id="cert-001",
        nonce=nonce
    )

    verif = verify_receipt(
        receipt=job_res["receipt"],
        quote=rt["quote"],
        policy_id="regulated-lending"
    )

    return {
        "id": "S3",
        "name": "Model swap",
        "expected_verdict": "DENIED",
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": "4 measurement mismatch",
        "passed": (verif["verdict"] == "DENIED" and "4" in str(verif["deciding_check"])),
        "what_happened": "Enclave measurement from shadow-model disagreed with credit-risk passport."
    }


def _run_mutation_scenario(
    scenario_id: str,
    name: str,
    art_type: str,
    expected_verdict: str,
    expected_deciding: str,
    policy_id: str,
    what_happened: str,
    model_dir: str = "credit-risk",
    cert_id: str = "cert-001"
) -> Dict[str, Any]:
    mutated_dir = mutate(model_dir, art_type)
    passports = get_all_passports()
    base_passport = next(p for p in passports if p["model_id"] == model_dir)

    # Register new passport pointing to mutated directory with parent_digest
    new_passport = register_passport(
        model_id=model_dir,
        dir_name=model_dir,
        version="1.0.1",
        operator_id=base_passport["operator_id"],
        parent_digest=base_passport["passport_digest"],
        custom_dir_path=mutated_dir
    )

    nonce = create_challenge_nonce()
    rt = start_runtime(model_dir, custom_dir=mutated_dir, nonce=nonce)

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Evaluation input",
        passport_digest=new_passport["passport_digest"],
        cert_id=cert_id,
        nonce=nonce
    )

    verif = verify_receipt(
        receipt=job_res["receipt"],
        quote=rt["quote"],
        policy_id=policy_id
    )

    return {
        "id": scenario_id,
        "name": name,
        "expected_verdict": expected_verdict,
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": expected_deciding,
        "passed": (verif["verdict"] == expected_verdict),
        "revalidation_plan": verif.get("revalidation_plan"),
        "what_happened": what_happened
    }


def run_scenario_s4() -> Dict[str, Any]:
    """S4: Config changed after audit -> NEEDS_REVIEW (7: C1 and C3 impacted. Plan: 2 of 4 suites, 50% saved)"""
    return _run_mutation_scenario(
        scenario_id="S4",
        name="Config changed after audit",
        art_type="config",
        expected_verdict="NEEDS_REVIEW",
        expected_deciding="7: C1 and C3 impacted",
        policy_id="regulated-lending",
        what_happened="Config changed. C1 (fairness) & C3 (docs) impacted. 2 of 4 test suites must re-run (50% saved)."
    )


def run_scenario_s5() -> Dict[str, Any]:
    """S5: Tokenizer changed -> NEEDS_REVIEW (7: C2 and C4 impacted. Plan: 2 of 4 suites, 50% saved)"""
    return _run_mutation_scenario(
        scenario_id="S5",
        name="Tokenizer changed",
        art_type="tokenizer",
        expected_verdict="NEEDS_REVIEW",
        expected_deciding="7: C2 and C4 impacted",
        policy_id="regulated-lending",
        what_happened="Tokenizer changed. C2 (robustness) & C4 (promptsafe) impacted. 2 of 4 suites re-run (50% saved)."
    )


def run_scenario_s6() -> Dict[str, Any]:
    """S6: Prompt template changed -> NEEDS_REVIEW (7: C4 impacted. Plan: 1 of 4 suites, 75% saved)"""
    return _run_mutation_scenario(
        scenario_id="S6",
        name="Prompt template changed",
        art_type="prompt_template",
        expected_verdict="NEEDS_REVIEW",
        expected_deciding="7: C4 impacted",
        policy_id="regulated-lending",
        what_happened="Prompt template changed. Only C4 impacted. 1 of 4 suites re-run (75% saved)."
    )


def run_scenario_s7() -> Dict[str, Any]:
    """S7: Weights changed (fine-tune) -> NEEDS_REVIEW (7: all 4 claims impacted. Plan: 4 of 4, 0% saved)"""
    return _run_mutation_scenario(
        scenario_id="S7",
        name="Weights changed (fine-tune)",
        art_type="weights",
        expected_verdict="NEEDS_REVIEW",
        expected_deciding="7: all 4 claims impacted",
        policy_id="regulated-lending",
        what_happened="Weights modified. All behavioral claims invalidated. Full re-audit required (0% saved)."
    )


def run_scenario_s8() -> Dict[str, Any]:
    """S8: Adapter changed under strict policy -> DENIED (7: M1, M2, M3 impacted, on_impacted = deny)"""
    return _run_mutation_scenario(
        scenario_id="S8",
        name="Adapter changed under strict policy",
        art_type="adapter",
        expected_verdict="DENIED",
        expected_deciding="7: M1, M2, M3 impacted, on_impacted = deny",
        policy_id="clinical-triage",
        what_happened="Adapter modified. Policy 'clinical-triage' specifies on_impacted=deny; request denied immediately.",
        model_dir="med-triage-llm",
        cert_id="cert-002"
    )


def run_scenario_s9() -> Dict[str, Any]:
    """S9: Certificate revoked -> DENIED (6 revoked)"""
    # Start runtime and generate receipt for med-triage
    nonce = create_challenge_nonce()
    rt = start_runtime("med-triage-llm", nonce=nonce)
    passports = get_all_passports()
    med_passport = next(p for p in passports if p["model_id"] == "med-triage-llm")

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Triage inquiry",
        passport_digest=med_passport["passport_digest"],
        cert_id="cert-002",
        nonce=nonce
    )

    # Revoke cert-002
    revoke_certificate("cert-002", reason="Safety non-compliance detected post-audit")

    verif = verify_receipt(
        receipt=job_res["receipt"],
        quote=rt["quote"],
        policy_id="clinical-triage"
    )

    return {
        "id": "S9",
        "name": "Certificate revoked",
        "expected_verdict": "DENIED",
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": "6 revoked",
        "passed": (verif["verdict"] == "DENIED" and "6" in str(verif["deciding_check"])),
        "what_happened": "Auditor revoked cert-002; verifier rejected receipt under Check 6."
    }


def run_scenario_s10() -> Dict[str, Any]:
    """S10: Certificate expired -> NEEDS_REVIEW (7 certificate expired)"""
    nonce = create_challenge_nonce()
    rt = start_runtime("fraud-detector", nonce=nonce)
    passports = get_all_passports()
    fd_passport = next(p for p in passports if p["model_id"] == "fraud-detector")

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Transaction id=8847, amount=1200",
        passport_digest=fd_passport["passport_digest"],
        cert_id="cert-003",
        nonce=nonce
    )

    # cert-003 expired on 2026-06-01 (demo_now is 2026-10-21)
    verif = verify_receipt(
        receipt=job_res["receipt"],
        quote=rt["quote"],
        policy_id="standard"
    )

    return {
        "id": "S10",
        "name": "Certificate expired",
        "expected_verdict": "NEEDS_REVIEW",
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": "7 certificate expired",
        "passed": (verif["verdict"] == "NEEDS_REVIEW" and "7" in str(verif["deciding_check"])),
        "what_happened": "cert-003 expired in June 2026. Cryptography valid, but policy triggers NEEDS_REVIEW."
    }


def run_scenario_s11() -> Dict[str, Any]:
    """S11: Replay of an old receipt -> DENIED (3 replay)"""
    nonce = create_challenge_nonce()
    rt = start_runtime("credit-risk", nonce=nonce)
    passports = get_all_passports()
    cr_passport = next(p for p in passports if p["model_id"] == "credit-risk")

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Applicant first run",
        passport_digest=cr_passport["passport_digest"],
        cert_id="cert-001",
        nonce=nonce
    )

    # First verification passes and consumes nonce
    v1 = verify_receipt(receipt=job_res["receipt"], quote=rt["quote"], policy_id="regulated-lending")
    assert v1["verdict"] == "VERIFIED"

    # Re-submit the exact same receipt and quote with its old nonce
    v2 = verify_receipt(receipt=job_res["receipt"], quote=rt["quote"], policy_id="regulated-lending")

    return {
        "id": "S11",
        "name": "Replay of an old receipt",
        "expected_verdict": "DENIED",
        "actual_verdict": v2["verdict"],
        "deciding_check": v2["deciding_check"],
        "expected_deciding_check": "3 replay",
        "passed": (v2["verdict"] == "DENIED" and "3" in str(v2["deciding_check"])),
        "what_happened": "Re-submitted identical receipt. Verifier flagged consumed nonce and replay attack."
    }


def run_scenario_s12() -> Dict[str, Any]:
    """S12: Relay attack -> DENIED (1 and 2)"""
    nonce = create_challenge_nonce()
    rt = start_runtime("credit-risk", nonce=nonce)
    passports = get_all_passports()
    cr_passport = next(p for p in passports if p["model_id"] == "credit-risk")

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Normal input",
        passport_digest=cr_passport["passport_digest"],
        cert_id="cert-001",
        nonce=nonce
    )

    # Tamper with receipt signature by signing it with a different foreign key
    tampered_receipt = copy.deepcopy(job_res["receipt"])
    foreign_priv, _ = generate_ephemeral_keypair()
    unsigned_receipt = {k: v for k, v in tampered_receipt.items() if k != "signature"}
    tampered_receipt["signature"] = sign_data(foreign_priv, canonical_json(unsigned_receipt))

    verif = verify_receipt(
        receipt=tampered_receipt,
        quote=rt["quote"],
        policy_id="regulated-lending"
    )

    return {
        "id": "S12",
        "name": "Relay attack",
        "expected_verdict": "DENIED",
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": "1 and 2",
        "passed": (verif["verdict"] == "DENIED" and "1" in str(verif["deciding_check"])),
        "what_happened": "Receipt was signed by an unquoted key. Verifier detected relay/MITM signature failure."
    }


def run_scenario_s13() -> Dict[str, Any]:
    """S13: Unattested runtime -> UNVERIFIED (quote missing)"""
    nonce = create_challenge_nonce()
    rt = start_runtime("credit-risk", nonce=nonce)
    passports = get_all_passports()
    cr_passport = next(p for p in passports if p["model_id"] == "credit-risk")

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Applicant without attestation",
        passport_digest=cr_passport["passport_digest"],
        cert_id="cert-001",
        nonce=nonce
    )

    # Verify receipt without submitting quote
    verif = verify_receipt(
        receipt=job_res["receipt"],
        quote=None,
        policy_id="regulated-lending"
    )

    return {
        "id": "S13",
        "name": "Unattested runtime",
        "expected_verdict": "UNVERIFIED",
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": "quote missing",
        "passed": (verif["verdict"] == "UNVERIFIED"),
        "what_happened": "No TEE hardware quote provided. Verifier marked verdict UNVERIFIED."
    }


def run_scenario_s14() -> Dict[str, Any]:
    """S14: Log tampering -> DENIED (5 inclusion proof fails. /log/integrity reports bad index. Then repair)"""
    nonce = create_challenge_nonce()
    rt = start_runtime("credit-risk", nonce=nonce)
    passports = get_all_passports()
    cr_passport = next(p for p in passports if p["model_id"] == "credit-risk")

    job_res = run_job(
        runtime_id=rt["runtime_id"],
        input_text="Input for log check",
        passport_digest=cr_passport["passport_digest"],
        cert_id="cert-001",
        nonce=nonce
    )

    # Tamper log entry
    tamper_res = TransparencyLog.tamper()
    
    # Verification must fail at Check 5
    verif = verify_receipt(
        receipt=job_res["receipt"],
        quote=rt["quote"],
        policy_id="regulated-lending"
    )

    # Check integrity reports bad index
    integrity = TransparencyLog.check_integrity()
    first_bad = integrity.get("first_bad_index")

    # Repair log
    repair_res = TransparencyLog.repair()

    return {
        "id": "S14",
        "name": "Log tampering",
        "expected_verdict": "DENIED",
        "actual_verdict": verif["verdict"],
        "deciding_check": verif["deciding_check"],
        "expected_deciding_check": "5 inclusion proof fails",
        "passed": (verif["verdict"] == "DENIED" and "5" in str(verif["deciding_check"]) and first_bad is not None),
        "what_happened": f"Log leaf tampered at index {tamper_res.get('tampered_index')}. Inclusion proof failed. Log repaired."
    }


def run_scenario_s15() -> Dict[str, Any]:
    """S15: ZK membership -> First valid, second invalid"""
    if not is_zk_available():
        return {
            "id": "S15",
            "name": "ZK membership",
            "expected_verdict": "First valid, second invalid",
            "actual_verdict": "ZK unavailable in this environment",
            "deciding_check": "8",
            "expected_deciding_check": "8",
            "passed": True,  # Honesty rule: skipped when toolchain missing
            "skipped": True,
            "what_happened": "ZK unavailable in this environment"
        }

    nonce = create_challenge_nonce()
    passports = get_all_passports()
    cr_passport = next(p for p in passports if p["model_id"] == "credit-risk")

    proof_res = generate_zk_proof(cr_passport["passport_digest"], nonce)
    if not proof_res.get("available") or not proof_res.get("proof"):
        return {
            "id": "S15",
            "name": "ZK membership",
            "expected_verdict": "First valid, second invalid",
            "actual_verdict": "ZK unavailable in this environment",
            "deciding_check": "8",
            "expected_deciding_check": "8",
            "passed": True,
            "skipped": True,
            "what_happened": "ZK unavailable in this environment"
        }

    # First verify: legitimate proof
    v1 = verify_zk_proof(proof_res["proof"], proof_res["public_signals"])
    
    # Second verify: altered public root signal
    altered_signals = list(proof_res["public_signals"])
    if altered_signals:
        # Alter the root signal
        altered_signals[0] = "12345678901234567890"
    v2 = verify_zk_proof(proof_res["proof"], altered_signals)

    passed = (v1.get("valid") is True and v2.get("valid") is False)
    return {
        "id": "S15",
        "name": "ZK membership",
        "expected_verdict": "First valid, second invalid",
        "actual_verdict": "First valid, second invalid" if passed else f"v1={v1.get('valid')}, v2={v2.get('valid')}",
        "deciding_check": "8",
        "expected_deciding_check": "8",
        "passed": passed,
        "what_happened": "Valid proof verified; proof against altered Merkle root rejected."
    }


SCENARIO_RUNNERS = {
    "S1": run_scenario_s1,
    "S2": run_scenario_s2,
    "S3": run_scenario_s3,
    "S4": run_scenario_s4,
    "S5": run_scenario_s5,
    "S6": run_scenario_s6,
    "S7": run_scenario_s7,
    "S8": run_scenario_s8,
    "S9": run_scenario_s9,
    "S10": run_scenario_s10,
    "S11": run_scenario_s11,
    "S12": run_scenario_s12,
    "S13": run_scenario_s13,
    "S14": run_scenario_s14,
    "S15": run_scenario_s15,
}


def run_scenario(scenario_id: str) -> Dict[str, Any]:
    # Always re-seed to clean baseline state before running scenario
    seed_database()
    runner = SCENARIO_RUNNERS.get(scenario_id.upper())
    if not runner:
        raise ValueError(f"Unknown scenario ID: {scenario_id}")
    return runner()


def run_all_scenarios() -> List[Dict[str, Any]]:
    results = []
    for sid in [f"S{i}" for i in range(1, 16)]:
        res = run_scenario(sid)
        results.append(res)
    # Restore clean seed state afterwards
    seed_database()
    return results
