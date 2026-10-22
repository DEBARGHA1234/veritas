"""
backend/app/deps.py

Dependency analysis engine for VERITAS:
- Lineage resolution
- Changed artifact types detection
- Dynamic claim status evaluation (VALID, IMPACTED, EXPIRED, REVOKED)
- Revalidation plan calculation (rerun suites, total suites, percentage saved)
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple

from .config import DEMO_NOW
from .db import get_db_connection


def resolve_passport_lineage(start_digest: str, target_certified_digest: str) -> Tuple[bool, List[str]]:
    """
    Follows parent_digest links from start_digest up the chain to target_certified_digest.
    Returns (found: bool, path: List[str]).
    """
    curr = start_digest
    path = [curr]
    visited = set()

    with get_db_connection() as conn:
        while curr:
            if curr == target_certified_digest:
                return True, path
            if curr in visited:
                break
            visited.add(curr)

            row = conn.execute("SELECT parent_digest FROM passports WHERE passport_digest = ?", (curr,)).fetchone()
            if not row or not row["parent_digest"]:
                break
            curr = row["parent_digest"]
            path.append(curr)

    return (curr == target_certified_digest), path


def compute_claim_statuses(
    certificate: Dict[str, Any],
    certified_passport: Dict[str, Any],
    current_passport: Dict[str, Any],
    is_revoked: bool = False,
    now_iso: str = DEMO_NOW
) -> Dict[str, Any]:
    """
    Evaluates claim status against the current passport.
    Status is dynamically computed, never stored:
    - VALID: all artifact types in depends_on have identical sha256 in certified and current passports
    - IMPACTED: at least one artifact type in depends_on has different sha256 (or missing)
    - EXPIRED: overlay if now_iso > expires_at
    - REVOKED: overlay if certificate is revoked
    """
    cert_artifacts = certified_passport.get("artifacts", {})
    curr_artifacts = current_passport.get("artifacts", {})

    # Detect changed artifact types
    all_types = set(cert_artifacts.keys()) | set(curr_artifacts.keys())
    changed_types = []
    for t in sorted(all_types):
        cert_hash = cert_artifacts.get(t, {}).get("sha256")
        curr_hash = curr_artifacts.get(t, {}).get("sha256")
        if cert_hash != curr_hash:
            changed_types.append(t)

    # Check expiration
    expires_at = certificate.get("expires_at", "")
    is_expired = False
    if expires_at and now_iso > expires_at:
        is_expired = True

    claims = certificate.get("claims", [])
    claim_statuses = {}
    impacted_claims = []
    impacted_suites = set()
    all_suites = set()

    for c in claims:
        cid = c["claim_id"]
        suite = c.get("suite", cid)
        all_suites.add(suite)
        deps = c.get("depends_on", [])

        # Check if any dependency changed
        is_impacted = any(dep in changed_types for dep in deps)

        if is_revoked:
            status = "REVOKED"
        elif is_expired:
            status = "EXPIRED"
        elif is_impacted:
            status = "IMPACTED"
        else:
            status = "VALID"

        claim_statuses[cid] = status

        if is_impacted or is_expired or is_revoked:
            impacted_claims.append(cid)
            impacted_suites.add(suite)

    # Calculate revalidation plan
    suites_total = len(all_suites)
    if "weights" in changed_types:
        # Honesty rule: if weights changed, plan must honestly show full re-audit (0% saved)
        suites_rerun = sorted(list(all_suites))
        suites_rerun_count = suites_total
        pct_saved = 0.0
    else:
        suites_rerun = sorted(list(impacted_suites))
        suites_rerun_count = len(suites_rerun)
        if suites_total > 0:
            pct_saved = round((1.0 - (suites_rerun_count / suites_total)) * 100.0, 1)
        else:
            pct_saved = 0.0

    return {
        "changed_artifact_types": changed_types,
        "is_expired": is_expired,
        "is_revoked": is_revoked,
        "claim_statuses": claim_statuses,
        "revalidation_plan": {
            "impacted_claims": impacted_claims,
            "suites_rerun": suites_rerun,
            "suites_rerun_count": suites_rerun_count,
            "suites_total": suites_total,
            "pct_saved": pct_saved
        }
    }
