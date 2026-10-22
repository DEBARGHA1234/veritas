"""
backend/app/metrics.py

Live metrics calculation for VERITAS.
Honesty rule: Every number comes from real computation or live benchmarking.
Never hard-codes results.
"""

import json
import statistics
import time
from typing import Any, Dict, List

from .certs import get_all_certificates
from .db import get_db_connection
from .deps import compute_claim_statuses
from .log import TransparencyLog
from .passport import get_all_passports
from .zk import is_zk_available


def get_live_metrics() -> Dict[str, Any]:
    with get_db_connection() as conn:
        # Latencies & Verdicts
        rows = conn.execute("SELECT verdict, latency_ms FROM verifications").fetchall()
        verdicts_list = [r["verdict"] for r in rows]
        latencies = [float(r["latency_ms"]) for r in rows if r["latency_ms"] is not None and r["latency_ms"] > 0]

        # Receipts size
        receipt_rows = conn.execute("SELECT receipt_json FROM jobs ORDER BY created_at DESC LIMIT 10").fetchall()
        receipt_sizes = [len(r["receipt_json"].encode("utf-8")) for r in receipt_rows]

    # Compute p50 and p95 latency
    if latencies:
        p50 = round(statistics.median(latencies), 2)
        p95 = round(statistics.quantiles(latencies, n=20)[18] if len(latencies) >= 20 else max(latencies), 2)
    else:
        p50 = 0.0
        p95 = 0.0

    # Verdict distribution
    verdict_dist = {
        "VERIFIED": verdicts_list.count("VERIFIED"),
        "NEEDS_REVIEW": verdicts_list.count("NEEDS_REVIEW"),
        "DENIED": verdicts_list.count("DENIED"),
        "UNVERIFIED": verdicts_list.count("UNVERIFIED")
    }

    # Log tree metrics
    checkpoint = TransparencyLog.get_latest_checkpoint()
    leaves = TransparencyLog.get_leaves()
    tree_size = len(leaves)

    # Merkle inclusion proof size
    inclusion_proof_size = 0
    if tree_size > 0:
        try:
            proof = TransparencyLog.get_inclusion_proof(0)
            inclusion_proof_size = len(json.dumps(proof).encode("utf-8"))
        except Exception:
            pass

    avg_receipt_size = round(statistics.mean(receipt_sizes)) if receipt_sizes else 0

    # Counts
    passports_count = len(get_all_passports())
    certs_count = len(get_all_certificates())
    receipts_count = len(receipt_sizes)

    # Dynamic Re-audit savings table computed via deps.py
    # Compute for credit-risk model across mutations
    all_passports = {p["model_id"]: p for p in get_all_passports()}
    all_certs = {c["model_id"]: c for c in get_all_certificates()}
    
    audit_savings_table = []
    if "credit-risk" in all_passports and "credit-risk" in all_certs:
        p_base = all_passports["credit-risk"]
        c_base = all_certs["credit-risk"]

        for mod_type in ["config", "tokenizer", "prompt_template", "weights"]:
            # Synthesize modified artifacts map
            mod_artifacts = json.loads(json.dumps(p_base["artifacts"]))
            if mod_type in mod_artifacts:
                mod_artifacts[mod_type]["sha256"] = "ffff" + mod_artifacts[mod_type]["sha256"][4:]
            
            p_mod = {"artifacts": mod_artifacts}
            res = compute_claim_statuses(c_base, p_base, p_mod)
            plan = res["revalidation_plan"]
            audit_savings_table.append({
                "change_type": mod_type,
                "suites_rerun": plan["suites_rerun_count"],
                "suites_total": plan["suites_total"],
                "pct_saved": plan["pct_saved"],
                "full_reaudit_required": (mod_type == "weights")
            })

    return {
        "verify_latency_p50_ms": p50,
        "verify_latency_p95_ms": p95,
        "total_verifications_count": len(verdicts_list),
        "receipt_size_bytes": avg_receipt_size,
        "inclusion_proof_size_bytes": inclusion_proof_size,
        "log_tree_size": tree_size,
        "passports_count": passports_count,
        "certificates_count": certs_count,
        "verdict_distribution": verdict_dist,
        "audit_savings_table": audit_savings_table,
        "zk_available": is_zk_available()
    }
