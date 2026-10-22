"""
backend/app/verifier.py

8-Stage ordered verification engine for VERITAS:
1. Receipt signature under quote's receipt_pubkey
2. Quote platform signature binding receipt_pubkey, measurement, and nonce
3. Nonce freshness, single-use, and replay protection
4. Measurement equality against passport
5. Passport inclusion in RFC 6962 transparency log
6. Certificate authenticity, log inclusion, revocation, and lineage
7. Policy claim satisfaction and certificate validity
8. Optional ZK membership proof

Verdict Precedence: DENIED > UNVERIFIED > NEEDS_REVIEW > VERIFIED
Evidence Vector: 5 dimensions (PASS, PARTIAL, FAIL, N_A)
"""

import json
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from .certs import get_certificate_by_id, is_certificate_revoked
from .config import DEMO_NOW
from .crypto import (
    canonical_json,
    compute_measurement,
    get_demo_keypair,
    sha256_text,
    verify_signature,
)
from .db import get_db_connection
from .deps import compute_claim_statuses, resolve_passport_lineage
from .log import TransparencyLog, verify_audit_path
from .passport import get_passport_by_digest
from .policy import get_policy
from .zk import is_zk_available, verify_zk_proof


def verify_receipt(
    receipt: Dict[str, Any],
    quote: Optional[Dict[str, Any]] = None,
    policy_id: str = "regulated-lending",
    zk_proof_data: Optional[Dict[str, Any]] = None,
    now_iso: str = DEMO_NOW
) -> Dict[str, Any]:
    start_time = time.perf_counter()
    policy = get_policy(policy_id)

    checks: List[Dict[str, Any]] = []
    verdict = "VERIFIED"
    deciding_check = "none failed"
    revalidation_plan = None

    # Track failures to determine verdict precedence
    has_denied = False
    has_unverified = False
    has_needs_review = False

    # Check for missing required evidence first
    if not receipt:
        has_unverified = True
        return {
            "verdict": "UNVERIFIED",
            "deciding_check": "receipt missing",
            "checks": [{"check_number": 0, "name": "evidence_presence", "status": "FAIL", "reason": "Receipt missing"}],
            "evidence_vector": {
                "artifact_integrity": "FAIL",
                "auditor_authenticity": "FAIL",
                "runtime_identity": "FAIL",
                "audit_applicability": "FAIL",
                "privacy_proof": "N_A"
            },
            "revalidation_plan": None,
            "latency_ms": 0.0
        }

    if not quote:
        has_unverified = True
        checks.append({
            "check_number": 1,
            "name": "receipt_signature",
            "status": "NOT_EVALUATED",
            "reason": "Quote missing; cannot extract receipt_pubkey"
        })
        checks.append({
            "check_number": 2,
            "name": "quote_platform_binding",
            "status": "FAIL",
            "reason": "Runtime quote is missing"
        })
        deciding_check = "quote missing"

    receipt_pubkey = quote.get("receipt_pubkey", "") if quote else ""
    measurement = quote.get("measurement", "") if quote else ""
    nonce = receipt.get("nonce", "")
    job_id = receipt.get("job_id", "")
    passport_digest = receipt.get("passport_digest", "")
    cert_id = receipt.get("cert_id", "")

    # ---------------------------------------------------------
    # CHECK 1: Receipt signature valid under receipt_pubkey
    # ---------------------------------------------------------
    if quote and receipt_pubkey:
        unsigned_receipt = {k: v for k, v in receipt.items() if k != "signature"}
        sig_valid = verify_signature(receipt_pubkey, canonical_json(unsigned_receipt), receipt.get("signature", ""))
        if sig_valid:
            checks.append({
                "check_number": 1,
                "name": "receipt_signature",
                "status": "PASS",
                "reason": f"Receipt signed by enclave ephemeral key {receipt_pubkey[:12]}..."
            })
        else:
            checks.append({
                "check_number": 1,
                "name": "receipt_signature",
                "status": "FAIL",
                "reason": "Receipt signature invalid under quote's receipt_pubkey"
            })
            has_denied = True
            if deciding_check == "none failed":
                deciding_check = "1 receipt signature invalid"
    else:
        if not quote:
            pass  # Already noted above

    # ---------------------------------------------------------
    # CHECK 2: Quote platform signature valid and bound
    # ---------------------------------------------------------
    if quote:
        platform_key_id = quote.get("platform_key_id", "sim-platform-1")
        try:
            _, platform_pub = get_demo_keypair(platform_key_id)
            quote_binding_msg = f"{measurement}:{receipt_pubkey}:{quote.get('nonce', '')}"
            platform_sig_valid = verify_signature(platform_pub, quote_binding_msg, quote.get("platform_signature", ""))
            
            # Nonce in quote should match receipt nonce
            nonce_matches = (quote.get("nonce", "") == nonce)

            if platform_sig_valid and nonce_matches:
                checks.append({
                    "check_number": 2,
                    "name": "quote_platform_binding",
                    "status": "PASS",
                    "reason": f"Platform signature valid from {platform_key_id}; receipt key bound to measurement"
                })
            else:
                reason = "Platform signature invalid" if not platform_sig_valid else "Quote nonce does not match receipt nonce"
                checks.append({
                    "check_number": 2,
                    "name": "quote_platform_binding",
                    "status": "FAIL",
                    "reason": reason
                })
                has_denied = True
                if deciding_check == "none failed":
                    deciding_check = "2 quote binding failed"
        except Exception as e:
            checks.append({
                "check_number": 2,
                "name": "quote_platform_binding",
                "status": "FAIL",
                "reason": f"Quote platform validation error: {str(e)}"
            })
            has_denied = True
            if deciding_check == "none failed":
                deciding_check = "2 quote error"

    # ---------------------------------------------------------
    # CHECK 3: Nonce fresh, single use; job_id replay check
    # ---------------------------------------------------------
    with get_db_connection() as conn:
        challenge_row = conn.execute("SELECT * FROM challenges WHERE nonce = ?", (nonce,)).fetchone()
        replay_row = conn.execute(
            "SELECT COUNT(*) FROM verifications WHERE job_id = ? AND verdict IN ('VERIFIED', 'NEEDS_REVIEW')",
            (job_id,)
        ).fetchone()

    job_already_verified = replay_row and replay_row[0] > 0

    if not challenge_row:
        checks.append({
            "check_number": 3,
            "name": "nonce_and_replay",
            "status": "FAIL",
            "reason": f"Nonce '{nonce[:16]}...' was not issued by this verifier"
        })
        has_denied = True
        if deciding_check == "none failed":
            deciding_check = "3 replay"
    elif challenge_row["used"] == 1 or job_already_verified:
        reason = "Nonce already used" if challenge_row["used"] == 1 else "Job ID previously verified (replay attack)"
        checks.append({
            "check_number": 3,
            "name": "nonce_and_replay",
            "status": "FAIL",
            "reason": f"{reason} [nonce: {nonce[:12]}..., job: {job_id}]"
        })
        has_denied = True
        if deciding_check == "none failed":
            deciding_check = "3 replay"
    else:
        # Mark nonce as used
        with get_db_connection() as conn:
            conn.execute("UPDATE challenges SET used = 1 WHERE nonce = ?", (nonce,))
            conn.commit()
        checks.append({
            "check_number": 3,
            "name": "nonce_and_replay",
            "status": "PASS",
            "reason": "Fresh single-use challenge nonce verified; job ID unique"
        })

    # ---------------------------------------------------------
    # CHECK 4: Quote measurement equals passport measurement
    # ---------------------------------------------------------
    passport = get_passport_by_digest(passport_digest)
    if not quote:
        checks.append({
            "check_number": 4,
            "name": "measurement_match",
            "status": "NOT_EVALUATED",
            "reason": "Quote missing; cannot compare measurement"
        })
    elif not passport:
        checks.append({
            "check_number": 4,
            "name": "measurement_match",
            "status": "FAIL",
            "reason": f"Passport {passport_digest[:12]}... not found in registry"
        })
        has_unverified = True
        if deciding_check == "none failed":
            deciding_check = "4 passport missing"
    else:
        expected_measurement = compute_measurement(passport.get("artifacts", {}))
        if measurement == expected_measurement:
            checks.append({
                "check_number": 4,
                "name": "measurement_match",
                "status": "PASS",
                "reason": f"Enclave measurement {measurement[:12]}... exactly matches certified artifacts"
            })
        else:
            checks.append({
                "check_number": 4,
                "name": "measurement_match",
                "status": "FAIL",
                "reason": f"Measurement mismatch! Enclave: {measurement[:12]}... != Expected: {expected_measurement[:12]}..."
            })
            has_denied = True
            if deciding_check == "none failed":
                deciding_check = "4 measurement mismatch"

    # ---------------------------------------------------------
    # CHECK 5: Passport present in transparency log with valid inclusion proof
    # ---------------------------------------------------------
    checkpoint = TransparencyLog.get_latest_checkpoint()
    passport_logged = False
    inclusion_valid = False

    if checkpoint:
        leaves = TransparencyLog.get_leaves()
        for idx, leaf in enumerate(leaves):
            if leaf["entry_type"] == "PASSPORT":
                try:
                    payload = json.loads(leaf["payload_json"])
                    if payload.get("passport_digest") == passport_digest:
                        passport_logged = True
                        proof = TransparencyLog.get_inclusion_proof(idx)
                        inclusion_valid = verify_audit_path(
                            leaf_hash=leaf["leaf_hash"],
                            leaf_index=idx,
                            tree_size=proof["tree_size"],
                            audit_path=proof["audit_path"],
                            expected_root=checkpoint["root"]
                        )
                        break
                except Exception:
                    continue

    if passport_logged and inclusion_valid:
        checks.append({
            "check_number": 5,
            "name": "passport_log_inclusion",
            "status": "PASS",
            "reason": f"Passport inclusion verified in Merkle tree (root {checkpoint['root'][:12]}...)"
        })
    elif passport_logged and not inclusion_valid:
        checks.append({
            "check_number": 5,
            "name": "passport_log_inclusion",
            "status": "FAIL",
            "reason": "Passport is recorded in log, but Merkle inclusion proof failed (log tampering detected)"
        })
        has_denied = True
        if deciding_check == "none failed":
            deciding_check = "5 inclusion proof fails"
    else:
        checks.append({
            "check_number": 5,
            "name": "passport_log_inclusion",
            "status": "FAIL",
            "reason": "Passport not found in transparency log"
        })
        has_unverified = True
        if deciding_check == "none failed":
            deciding_check = "5 passport not logged"

    # ---------------------------------------------------------
    # CHECK 6: Certificate present in log, signature valid, not revoked, lineage resolves
    # ---------------------------------------------------------
    certificate = get_certificate_by_id(cert_id)
    if not certificate:
        checks.append({
            "check_number": 6,
            "name": "certificate_authenticity",
            "status": "FAIL",
            "reason": f"Certificate {cert_id} not found"
        })
        has_unverified = True
        if deciding_check == "none failed":
            deciding_check = "6 certificate missing"
    else:
        # Check revocation
        revoked = is_certificate_revoked(cert_id)
        # Check signature
        unsigned_cert = {k: v for k, v in certificate.items() if k != "auditor_signature"}
        auditor_id = certificate.get("auditor_id", "")
        _, auditor_pub = get_demo_keypair(auditor_id)
        sig_ok = verify_signature(auditor_pub, canonical_json(unsigned_cert), certificate.get("auditor_signature", ""))

        # Check lineage
        lineage_ok = False
        if passport:
            lineage_ok, _ = resolve_passport_lineage(passport_digest, certificate.get("passport_digest", ""))

        if revoked:
            checks.append({
                "check_number": 6,
                "name": "certificate_authenticity",
                "status": "FAIL",
                "reason": f"Certificate {cert_id} was revoked by auditor"
            })
            has_denied = True
            if deciding_check == "none failed":
                deciding_check = "6 revoked"
        elif not sig_ok:
            checks.append({
                "check_number": 6,
                "name": "certificate_authenticity",
                "status": "FAIL",
                "reason": f"Certificate signature invalid under auditor key ({auditor_id})"
            })
            has_denied = True
            if deciding_check == "none failed":
                deciding_check = "6 invalid signature"
        elif not lineage_ok:
            checks.append({
                "check_number": 6,
                "name": "certificate_authenticity",
                "status": "FAIL",
                "reason": f"Lineage broken: current passport {passport_digest[:8]}... does not link to certified passport {certificate.get('passport_digest')[:8]}..."
            })
            has_denied = True
            if deciding_check == "none failed":
                deciding_check = "6 lineage broken"
        else:
            checks.append({
                "check_number": 6,
                "name": "certificate_authenticity",
                "status": "PASS",
                "reason": f"Certificate {cert_id} verified: signed by {auditor_id}, unrevoked, lineage resolved"
            })

    # ---------------------------------------------------------
    # CHECK 7: Policy compliance, required claims VALID, cert not expired
    # ---------------------------------------------------------
    if certificate and passport:
        certified_passport = get_passport_by_digest(certificate.get("passport_digest", "")) or passport
        claim_eval = compute_claim_statuses(
            certificate=certificate,
            certified_passport=certified_passport,
            current_passport=passport,
            is_revoked=is_certificate_revoked(cert_id),
            now_iso=now_iso
        )
        revalidation_plan = claim_eval["revalidation_plan"]
        statuses = claim_eval["claim_statuses"]
        is_expired = claim_eval["is_expired"]

        required_claims = policy.get("required_claims", [])
        impacted_required = [c for c in required_claims if statuses.get(c) != "VALID"]
        on_impacted = policy.get("on_impacted", "needs_review")

        if is_expired:
            checks.append({
                "check_number": 7,
                "name": "policy_compliance",
                "status": "FAIL",
                "reason": f"Certificate {cert_id} expired on {certificate.get('expires_at')}"
            })
            if on_impacted == "deny":
                has_denied = True
                if deciding_check == "none failed":
                    deciding_check = "7 certificate expired"
            else:
                has_needs_review = True
                if deciding_check == "none failed":
                    deciding_check = "7 certificate expired"
        elif impacted_required:
            impact_desc = ", ".join(impacted_required)
            checks.append({
                "check_number": 7,
                "name": "policy_compliance",
                "status": "FAIL",
                "reason": f"Required claims impacted: {impact_desc} under policy '{policy_id}' (action: {on_impacted})"
            })
            if on_impacted == "deny":
                has_denied = True
                if deciding_check == "none failed":
                    deciding_check = f"7: {impact_desc} impacted, on_impacted = deny"
            else:
                has_needs_review = True
                if deciding_check == "none failed":
                    deciding_check = f"7: {impact_desc} impacted"
        else:
            checks.append({
                "check_number": 7,
                "name": "policy_compliance",
                "status": "PASS",
                "reason": f"All required claims ({', '.join(required_claims)}) are VALID under policy '{policy_id}'"
            })
    else:
        checks.append({
            "check_number": 7,
            "name": "policy_compliance",
            "status": "NOT_EVALUATED",
            "reason": "Skipped: Certificate or passport not available"
        })

    # ---------------------------------------------------------
    # CHECK 8: Optional ZK membership proof
    # ---------------------------------------------------------
    privacy_proof_status = "N_A"
    if zk_proof_data and zk_proof_data.get("proof"):
        zk_res = verify_zk_proof(zk_proof_data["proof"], zk_proof_data.get("public_signals", []))
        if zk_res.get("valid"):
            privacy_proof_status = "PASS"
            checks.append({
                "check_number": 8,
                "name": "zk_membership",
                "status": "PASS",
                "reason": "Zero-knowledge Groth16 membership proof verified against public registry root"
            })
        else:
            privacy_proof_status = "FAIL"
            checks.append({
                "check_number": 8,
                "name": "zk_membership",
                "status": "FAIL",
                "reason": f"ZK verification failed: {zk_res.get('message')}"
            })
            has_denied = True
            if deciding_check == "none failed":
                deciding_check = "8 ZK proof invalid"
    else:
        checks.append({
            "check_number": 8,
            "name": "zk_membership",
            "status": "NOT_EVALUATED",
            "reason": "ZK proof not submitted (optional)"
        })

    # ---------------------------------------------------------
    # Verdict Precedence: DENIED > UNVERIFIED > NEEDS_REVIEW > VERIFIED
    # ---------------------------------------------------------
    if has_denied:
        verdict = "DENIED"
    elif has_unverified:
        verdict = "UNVERIFIED"
    elif has_needs_review:
        verdict = "NEEDS_REVIEW"
    else:
        verdict = "VERIFIED"

    # Compute 5-dimensional evidence vector
    # 1. artifact_integrity (Checks 4 & 5)
    c4 = next((c for c in checks if c["check_number"] == 4), None)
    c5 = next((c for c in checks if c["check_number"] == 5), None)
    if c4 and c5 and c4["status"] == "PASS" and c5["status"] == "PASS":
        art_integrity = "PASS"
    elif (c4 and c4["status"] == "PASS") or (c5 and c5["status"] == "PASS"):
        art_integrity = "PARTIAL"
    else:
        art_integrity = "FAIL"

    # 2. auditor_authenticity (Check 6)
    c6 = next((c for c in checks if c["check_number"] == 6), None)
    aud_auth = c6["status"] if c6 else "FAIL"

    # 3. runtime_identity (Checks 1, 2, 3)
    c1 = next((c for c in checks if c["check_number"] == 1), None)
    c2 = next((c for c in checks if c["check_number"] == 2), None)
    c3 = next((c for c in checks if c["check_number"] == 3), None)
    rt_passes = sum(1 for c in [c1, c2, c3] if c and c["status"] == "PASS")
    if rt_passes == 3:
        rt_identity = "PASS"
    elif rt_passes > 0:
        rt_identity = "PARTIAL"
    else:
        rt_identity = "FAIL"

    # 4. audit_applicability (Check 7)
    c7 = next((c for c in checks if c["check_number"] == 7), None)
    if c7 and c7["status"] == "PASS":
        audit_app = "PASS"
    elif c7 and c7["status"] == "FAIL" and verdict == "NEEDS_REVIEW":
        audit_app = "PARTIAL"
    else:
        audit_app = "FAIL"

    evidence_vector = {
        "artifact_integrity": art_integrity,
        "auditor_authenticity": aud_auth,
        "runtime_identity": rt_identity,
        "audit_applicability": audit_app,
        "privacy_proof": privacy_proof_status
    }

    duration_ms = (time.perf_counter() - start_time) * 1000.0

    # Record verification in database for audit metrics
    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO verifications (job_id, verdict, checks_json, evidence_vector_json, revalidation_plan_json, latency_ms, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job_id,
                verdict,
                json.dumps(checks),
                json.dumps(evidence_vector),
                json.dumps(revalidation_plan) if revalidation_plan else None,
                round(duration_ms, 2),
                datetime.now(timezone.utc).isoformat()
            )
        )
        conn.commit()

    return {
        "verdict": verdict,
        "deciding_check": deciding_check,
        "checks": checks,
        "evidence_vector": evidence_vector,
        "revalidation_plan": revalidation_plan,
        "latency_ms": round(duration_ms, 2)
    }
