"""
backend/app/schemas.py

Pydantic schemas for VERITAS API requests and responses.
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ArtifactInfo(BaseModel):
    file: str
    sha256: str
    size: int


class PassportRegisterRequest(BaseModel):
    dir_name: str
    operator_id: Optional[str] = None
    parent_digest: Optional[str] = None
    version: Optional[str] = None


class PassportModel(BaseModel):
    model_id: str
    version: str
    operator_id: str
    artifacts: Dict[str, ArtifactInfo]
    parent_digest: Optional[str] = None
    created_at: str
    passport_digest: str
    operator_signature: str


class ClaimModel(BaseModel):
    claim_id: str
    statement: str
    suite: str
    result: float
    threshold: float
    behavioral: bool
    depends_on: List[str]


class CertificateIssueRequest(BaseModel):
    cert_id: str
    auditor_id: str
    model_id: str
    passport_digest: str
    issued_at: str
    expires_at: str
    claims: List[ClaimModel]


class CertificateModel(BaseModel):
    cert_id: str
    auditor_id: str
    model_id: str
    passport_digest: str
    issued_at: str
    expires_at: str
    claims: List[ClaimModel]
    auditor_signature: str


class RevocationRequest(BaseModel):
    reason: Optional[str] = "Revoked by auditor"


class RuntimeStartRequest(BaseModel):
    model_dir: str
    nonce: Optional[str] = None


class QuoteModel(BaseModel):
    quote_id: str
    measurement: str
    receipt_pubkey: str
    nonce: str
    attestation_mode: str = "simulated"
    platform_key_id: str = "sim-platform-1"
    platform_signature: str


class RuntimeRunRequest(BaseModel):
    runtime_id: str
    input: str
    passport_digest: str
    cert_id: str
    nonce: str


class ReceiptModel(BaseModel):
    job_id: str
    nonce: str
    passport_digest: str
    cert_id: str
    output_hash: str
    policy_decision: str = "PASS"
    issued_at: str
    quote_id: str
    attestation_mode: str = "simulated"
    signature: str


class VerifyRequest(BaseModel):
    receipt: Dict[str, Any]
    quote: Optional[Dict[str, Any]] = None
    policy: str = "regulated-lending"
    zk_proof: Optional[Dict[str, Any]] = None


class CheckResult(BaseModel):
    check_number: int
    name: str
    status: str  # "PASS" | "FAIL" | "NOT_EVALUATED"
    reason: str


class EvidenceVector(BaseModel):
    artifact_integrity: str   # "PASS" | "PARTIAL" | "FAIL" | "N_A"
    auditor_authenticity: str
    runtime_identity: str
    audit_applicability: str
    privacy_proof: str


class RevalidationPlan(BaseModel):
    impacted_claims: List[str]
    suites_rerun: List[str]
    suites_rerun_count: int
    suites_total: int
    pct_saved: float


class VerifyResponse(BaseModel):
    verdict: str  # "VERIFIED" | "NEEDS_REVIEW" | "UNVERIFIED" | "DENIED"
    deciding_check: Optional[str] = None
    checks: List[CheckResult]
    evidence_vector: EvidenceVector
    revalidation_plan: Optional[RevalidationPlan] = None
    latency_ms: float = 0.0


class DepsDiffRequest(BaseModel):
    certified_digest: str
    current_digest: str


class ZKProveRequest(BaseModel):
    passport_digest: str
    nonce: str


class ZKVerifyRequest(BaseModel):
    proof: Dict[str, Any]
    public_signals: List[str]
