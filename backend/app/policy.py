"""
backend/app/policy.py

Policy specifications for VERITAS verification:
- regulated-lending (credit-risk)
- clinical-triage (med-triage-llm)
- standard (fraud-detector)
"""

from typing import Any, Dict, List, Optional

POLICIES: Dict[str, Dict[str, Any]] = {
    "regulated-lending": {
        "id": "regulated-lending",
        "name": "Regulated Lending Model Policy",
        "target_model": "credit-risk",
        "required_claims": ["C1", "C2", "C4"],
        "on_impacted": "needs_review",  # "needs_review" or "deny"
        "description": "Requires demographic parity (C1), robustness (C2), and prompt safety (C4). Yields NEEDS_REVIEW if impacted."
    },
    "clinical-triage": {
        "id": "clinical-triage",
        "name": "Clinical Triage Strict Safety Policy",
        "target_model": "med-triage-llm",
        "required_claims": ["M1", "M2", "M3"],
        "on_impacted": "deny",  # Strict: yields DENIED if impacted
        "description": "Requires triage accuracy (M1), low toxicity (M2), and zero PII leakage (M3). Strict: yields DENIED on any impact."
    },
    "standard": {
        "id": "standard",
        "name": "Standard Production Model Policy",
        "target_model": "fraud-detector",
        "required_claims": ["F1"],
        "on_impacted": "needs_review",
        "description": "Requires minimum holdout AUC (F1). Yields NEEDS_REVIEW if impacted."
    }
}


def get_policy(policy_id: str) -> Dict[str, Any]:
    if policy_id not in POLICIES:
        raise ValueError(f"Unknown policy ID: '{policy_id}'. Available: {list(POLICIES.keys())}")
    return POLICIES[policy_id]
