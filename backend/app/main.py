"""
backend/app/main.py

FastAPI backend application for VERITAS.
Exposes all endpoints specified in Section 6 of VERITAS architecture.
"""

from contextlib import asynccontextmanager
from typing import Any, Dict, List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .certs import (
    get_all_certificates,
    get_certificate_by_id,
    issue_certificate,
    revoke_certificate,
)
from .config import ATTESTATION_BANNER, ATTESTATION_MODE, DEMO_NOW
from .deps import compute_claim_statuses
from .log import TransparencyLog
from .metrics import get_live_metrics
from .passport import (
    get_all_passports,
    get_passport_by_digest,
    register_passport,
)
from .policy import POLICIES, get_policy
from .runtime_sim import create_challenge_nonce, run_job, start_runtime
from .scenarios import run_all_scenarios, run_scenario
from .schemas import (
    CertificateIssueRequest,
    DepsDiffRequest,
    PassportRegisterRequest,
    RevocationRequest,
    RuntimeRunRequest,
    RuntimeStartRequest,
    VerifyRequest,
    ZKProveRequest,
    ZKVerifyRequest,
)
from .seed import seed_database
from .verifier import verify_receipt
from .zk import generate_zk_proof, verify_zk_proof


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database is seeded on startup if empty
    check = TransparencyLog.get_latest_checkpoint()
    if not check:
        seed_database()
    yield


app = FastAPI(
    title="VERITAS API",
    description="Verifiable Evidence & Registry for Integrity of Trusted AI Systems",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {
        "service": "VERITAS",
        "attestation_banner": ATTESTATION_BANNER,
        "attestation_mode": ATTESTATION_MODE,
        "demo_now": DEMO_NOW,
        "status": "operational"
    }


# -------------------------------------------------------------
# Passports & Models
# -------------------------------------------------------------
@app.get("/models")
def list_models():
    passports = get_all_passports()
    return {"passports": passports}


@app.post("/models/register")
def register_model_passport(req: PassportRegisterRequest):
    try:
        passport = register_passport(
            model_id=req.dir_name,
            dir_name=req.dir_name,
            version=req.version or "1.0.0",
            operator_id=req.operator_id or "op-finlend",
            parent_digest=req.parent_digest
        )
        return passport
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/models/{digest}")
def get_model_passport(digest: str):
    p = get_passport_by_digest(digest)
    if not p:
        raise HTTPException(status_code=404, detail="Passport not found")
    return p


# -------------------------------------------------------------
# Certificates & Audits
# -------------------------------------------------------------
@app.get("/certificates")
def list_certificates():
    certs = get_all_certificates()
    return {"certificates": certs}


@app.post("/certificates/issue")
def issue_cert_endpoint(req: CertificateIssueRequest):
    try:
        cert = issue_certificate(
            cert_id=req.cert_id,
            auditor_id=req.auditor_id,
            model_id=req.model_id,
            passport_digest=req.passport_digest,
            issued_at=req.issued_at,
            expires_at=req.expires_at,
            claims=[c.model_dump() for c in req.claims]
        )
        return cert
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/certificates/{cert_id}/revoke")
def revoke_cert_endpoint(cert_id: str, req: Optional[RevocationRequest] = None):
    reason = req.reason if req and req.reason else "Revoked by auditor"
    try:
        revocation = revoke_certificate(cert_id, reason=reason)
        return revocation
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------
# Transparency Log
# -------------------------------------------------------------
@app.get("/log/leaves")
def get_log_leaves():
    leaves = TransparencyLog.get_leaves()
    return {"leaves": leaves}


@app.get("/log/checkpoint")
def get_log_checkpoint():
    cp = TransparencyLog.get_latest_checkpoint()
    if not cp:
        cp = TransparencyLog.create_checkpoint()
    return cp


@app.get("/log/proof/{entry_id}")
def get_log_inclusion_proof(entry_id: int):
    try:
        proof = TransparencyLog.get_inclusion_proof(entry_id)
        return proof
    except IndexError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/log/integrity")
def check_log_integrity():
    return TransparencyLog.check_integrity()


@app.post("/log/tamper")
def tamper_log():
    return TransparencyLog.tamper()


@app.post("/log/repair")
def repair_log():
    return TransparencyLog.repair()


# -------------------------------------------------------------
# Simulated Runtime & Jobs
# -------------------------------------------------------------
@app.post("/runtime/start")
def start_model_runtime(req: RuntimeStartRequest):
    try:
        res = start_runtime(req.model_dir, nonce=req.nonce)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/runtime/run")
def execute_runtime_job(req: RuntimeRunRequest):
    try:
        res = run_job(
            runtime_id=req.runtime_id,
            input_text=req.input,
            passport_digest=req.passport_digest,
            cert_id=req.cert_id,
            nonce=req.nonce
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------
# Verifier
# -------------------------------------------------------------
@app.get("/verifier/challenge")
def get_verifier_challenge():
    nonce = create_challenge_nonce()
    return {"nonce": nonce, "expires_in_seconds": 60}


@app.get("/policies")
def list_policies():
    return {"policies": list(POLICIES.values())}


@app.post("/verify")
def verify_receipt_endpoint(req: VerifyRequest):
    try:
        res = verify_receipt(
            receipt=req.receipt,
            quote=req.quote,
            policy_id=req.policy,
            zk_proof_data=req.zk_proof
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------
# Dependency Diff Engine
# -------------------------------------------------------------
@app.post("/deps/diff")
def diff_dependencies(req: DepsDiffRequest):
    cert_passport = get_passport_by_digest(req.certified_digest)
    curr_passport = get_passport_by_digest(req.current_digest)
    if not cert_passport or not curr_passport:
        raise HTTPException(status_code=404, detail="One or both passports not found")

    # Find certificate issued for certified passport
    certs = get_all_certificates()
    matching_cert = next((c for c in certs if c["passport_digest"] == req.certified_digest), None)
    if not matching_cert:
        matching_cert = certs[0] if certs else {"claims": []}

    res = compute_claim_statuses(
        certificate=matching_cert,
        certified_passport=cert_passport,
        current_passport=curr_passport
    )
    return res


# -------------------------------------------------------------
# Zero-Knowledge
# -------------------------------------------------------------
@app.post("/zk/prove")
def zk_prove_endpoint(req: ZKProveRequest):
    return generate_zk_proof(req.passport_digest, req.nonce)


@app.post("/zk/verify")
def zk_verify_endpoint(req: ZKVerifyRequest):
    return verify_zk_proof(req.proof, req.public_signals)


# -------------------------------------------------------------
# Scenarios (S1 - S15)
# -------------------------------------------------------------
@app.post("/scenarios/run/{scenario_id}")
def run_scenario_endpoint(scenario_id: str):
    try:
        res = run_scenario(scenario_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/scenarios/run-all")
def run_all_scenarios_endpoint():
    try:
        results = run_all_scenarios()
        return {"scenarios": results, "all_passed": all(r["passed"] for r in results)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# -------------------------------------------------------------
# Metrics & Demo Reset
# -------------------------------------------------------------
@app.get("/metrics")
def get_metrics_endpoint():
    return get_live_metrics()


@app.post("/demo/reset")
def reset_demo_endpoint():
    res = seed_database()
    return res
