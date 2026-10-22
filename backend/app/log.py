"""
backend/app/log.py

RFC 6962 append-only Merkle transparency log.
Supports:
- Leaf hashing (0x00 || entry_bytes)
- Internal node hashing (0x01 || left || right)
- Inclusion proofs and verification
- Signed checkpoints
- Tamper simulation and integrity verification with repair
"""

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from .config import DEMO_NOW
from .crypto import (
    canonical_json,
    get_demo_keypair,
    sha256_bytes,
    sha256_text,
    sign_data,
    verify_signature,
)
from .db import get_db_connection


def leaf_hash_bytes(data: bytes) -> str:
    """RFC 6962 leaf hash: SHA-256(0x00 || data)"""
    return sha256_bytes(b"\x00" + data)


def node_hash_hex(left_hex: str, right_hex: str) -> str:
    """RFC 6962 internal node hash: SHA-256(0x01 || left || right)"""
    left_b = bytes.fromhex(left_hex)
    right_b = bytes.fromhex(right_hex)
    return sha256_bytes(b"\x01" + left_b + right_b)


def largest_power_of_2_less_than(n: int) -> int:
    """Returns largest power of 2 strictly less than n (for n >= 2)."""
    if n < 2:
        return 0
    k = 1
    while (k << 1) < n:
        k <<= 1
    return k


def compute_mth(leaf_hashes: List[str]) -> str:
    """
    Computes RFC 6962 Merkle Tree Hash over a list of leaf hashes (in hex).
    """
    n = len(leaf_hashes)
    if n == 0:
        return sha256_bytes(b"")
    if n == 1:
        return leaf_hashes[0]

    k = largest_power_of_2_less_than(n)
    left_root = compute_mth(leaf_hashes[:k])
    right_root = compute_mth(leaf_hashes[k:])
    return node_hash_hex(left_root, right_root)


def generate_audit_path(leaf_index: int, leaf_hashes: List[str]) -> List[str]:
    """
    Generates RFC 6962 inclusion proof (audit path) for leaf at leaf_index in leaf_hashes.
    Returns list of sibling hashes in bottom-up order.
    """
    n = len(leaf_hashes)
    if n <= 1:
        return []

    k = largest_power_of_2_less_than(n)
    if leaf_index < k:
        sub_path = generate_audit_path(leaf_index, leaf_hashes[:k])
        sibling = compute_mth(leaf_hashes[k:])
        return sub_path + [sibling]
    else:
        sub_path = generate_audit_path(leaf_index - k, leaf_hashes[k:])
        sibling = compute_mth(leaf_hashes[:k])
        return sub_path + [sibling]


def verify_audit_path(leaf_hash: str, leaf_index: int, tree_size: int, audit_path: List[str], expected_root: str) -> bool:
    """
    Verifies RFC 6962 audit path for a leaf in a tree of size tree_size against expected_root.
    audit_path is ordered bottom-up: [sib_smallest, ..., sib_root].
    """
    def _reconstruct(m: int, n: int, path: List[str]) -> Tuple[str, List[str]]:
        if n == 1:
            return leaf_hash, path

        k = largest_power_of_2_less_than(n)
        sibling = path[-1]
        sub_path = path[:-1]
        if m < k:
            left, leftover = _reconstruct(m, k, sub_path)
            return node_hash_hex(left, sibling), leftover
        else:
            right, leftover = _reconstruct(m - k, n - k, sub_path)
            return node_hash_hex(sibling, right), leftover

    try:
        if tree_size == 0 or leaf_index >= tree_size:
            return False
        if tree_size == 1:
            return len(audit_path) == 0 and leaf_hash == expected_root

        calculated_root, leftover = _reconstruct(leaf_index, tree_size, audit_path)
        return calculated_root == expected_root and len(leftover) == 0
    except Exception:
        return False


class TransparencyLog:
    @staticmethod
    def append_entry(entry_type: str, payload: Dict[str, Any]) -> int:
        """
        Appends entry to transparency log. Returns leaf_index.
        Generates and signs updated checkpoint.
        """
        canonical_bytes = canonical_json(payload).encode("utf-8")
        leaf_h = leaf_hash_bytes(canonical_bytes)
        now_ts = datetime.now(timezone.utc).isoformat()

        with get_db_connection() as conn:
            cursor = conn.execute("SELECT COUNT(*) FROM log_leaves")
            new_index = cursor.fetchone()[0]

            conn.execute(
                """
                INSERT INTO log_leaves (leaf_index, entry_type, payload_json, leaf_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (new_index, entry_type, canonical_json(payload), leaf_h, now_ts)
            )

            # Also maintain backup table for clean repair
            conn.execute(
                """
                INSERT OR REPLACE INTO log_leaves_backup (leaf_index, entry_type, payload_json, leaf_hash, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (new_index, entry_type, canonical_json(payload), leaf_h, now_ts)
            )
            conn.commit()

        # Update checkpoint
        TransparencyLog.create_checkpoint()
        return new_index

    @staticmethod
    def get_leaves() -> List[Dict[str, Any]]:
        with get_db_connection() as conn:
            rows = conn.execute("SELECT * FROM log_leaves ORDER BY leaf_index ASC").fetchall()
            return [dict(r) for r in rows]

    @staticmethod
    def create_checkpoint() -> Dict[str, Any]:
        """Calculates root from all leaves and signs checkpoint with log authority key."""
        leaves = TransparencyLog.get_leaves()
        leaf_hashes = [r["leaf_hash"] for r in leaves]
        tree_size = len(leaf_hashes)
        root = compute_mth(leaf_hashes)
        now_ts = datetime.now(timezone.utc).isoformat()

        priv_key, pub_key_hex = get_demo_keypair("log-authority")
        checkpoint_msg = f"{tree_size}:{root}:{now_ts}"
        signature = sign_data(priv_key, checkpoint_msg)

        checkpoint = {
            "tree_size": tree_size,
            "root": root,
            "timestamp": now_ts,
            "signature": signature
        }

        with get_db_connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO log_checkpoints (tree_size, root, timestamp, signature)
                VALUES (?, ?, ?, ?)
                """,
                (tree_size, root, now_ts, signature)
            )
            conn.commit()

        return checkpoint

    @staticmethod
    def get_latest_checkpoint() -> Optional[Dict[str, Any]]:
        with get_db_connection() as conn:
            row = conn.execute(
                "SELECT * FROM log_checkpoints ORDER BY tree_size DESC LIMIT 1"
            ).fetchone()
            if row:
                return dict(row)
        return None

    @staticmethod
    def get_inclusion_proof(entry_id: int) -> Dict[str, Any]:
        """Returns inclusion proof for leaf at index entry_id."""
        leaves = TransparencyLog.get_leaves()
        if entry_id < 0 or entry_id >= len(leaves):
            raise IndexError(f"Leaf index {entry_id} out of bounds (tree size {len(leaves)})")

        leaf_hashes = [r["leaf_hash"] for r in leaves]
        audit_path = generate_audit_path(entry_id, leaf_hashes)
        checkpoint = TransparencyLog.get_latest_checkpoint() or TransparencyLog.create_checkpoint()

        return {
            "leaf_index": entry_id,
            "entry_type": leaves[entry_id]["entry_type"],
            "leaf_hash": leaves[entry_id]["leaf_hash"],
            "tree_size": len(leaves),
            "root": checkpoint["root"],
            "audit_path": audit_path
        }

    @staticmethod
    def check_integrity() -> Dict[str, Any]:
        """
        Recomputes root from stored leaves and compares with latest checkpoint.
        Returns first mismatching index if corrupted.
        """
        checkpoint = TransparencyLog.get_latest_checkpoint()
        if not checkpoint:
            return {"valid": True, "tree_size": 0, "root": "", "message": "Log is empty"}

        leaves = TransparencyLog.get_leaves()
        leaf_hashes = [r["leaf_hash"] for r in leaves]
        actual_root = compute_mth(leaf_hashes)

        # Also check leaf hash matches payload
        bad_index = None
        for r in leaves:
            computed_h = leaf_hash_bytes(r["payload_json"].encode("utf-8"))
            if computed_h != r["leaf_hash"]:
                bad_index = r["leaf_index"]
                break

        if actual_root != checkpoint["root"] or bad_index is not None:
            if bad_index is None:
                # If leaf hashes matched payload but tree root mismatched
                bad_index = 0
            return {
                "valid": False,
                "first_bad_index": bad_index,
                "expected_root": checkpoint["root"],
                "computed_root": actual_root,
                "tree_size": len(leaves),
                "message": f"Log integrity violation detected at leaf index {bad_index}"
            }

        return {
            "valid": True,
            "first_bad_index": None,
            "tree_size": len(leaves),
            "root": checkpoint["root"],
            "message": "Log integrity verified. Checkpoint matches all stored leaves."
        }

    @staticmethod
    def tamper() -> Dict[str, Any]:
        """
        Demo only: Flips bits/data of one stored leaf (prefers credit-risk passport entry, or index 0).
        Does NOT update the checkpoint so integrity check will catch it.
        """
        leaves = TransparencyLog.get_leaves()
        if not leaves:
            return {"status": "error", "message": "Log is empty"}

        target_idx = 0
        target_leaf = None
        for l in leaves:
            if "credit-risk" in l["payload_json"]:
                target_idx = l["leaf_index"]
                target_leaf = l
                break

        if target_leaf:
            payload = json.loads(target_leaf["payload_json"])
            payload["tampered_attack"] = True
            payload["version"] = "9.9.9-tampered"
            tampered_payload = json.dumps(payload)
        else:
            tampered_payload = json.dumps({"tampered": True, "original_index": target_idx})

        tampered_hash = sha256_text("TAMPERED_LEAF_DATA_SIMULATION")

        with get_db_connection() as conn:
            conn.execute(
                """
                UPDATE log_leaves
                SET leaf_hash = ?, payload_json = ?
                WHERE leaf_index = ?
                """,
                (tampered_hash, tampered_payload, target_idx)
            )
            conn.commit()

        return {
            "status": "tampered",
            "tampered_index": target_idx,
            "message": f"Flipped leaf at index {target_idx}. Checkpoint root remains unchanged."
        }

    @staticmethod
    def repair() -> Dict[str, Any]:
        """
        Restores leaves from the backup table and re-verifies checkpoint.
        """
        with get_db_connection() as conn:
            conn.execute("DELETE FROM log_leaves")
            conn.execute(
                """
                INSERT INTO log_leaves (leaf_index, entry_type, payload_json, leaf_hash, created_at)
                SELECT leaf_index, entry_type, payload_json, leaf_hash, created_at
                FROM log_leaves_backup
                ORDER BY leaf_index ASC
                """
            )
            conn.commit()

        TransparencyLog.create_checkpoint()
        return {
            "status": "repaired",
            "message": "Transparency log restored from genuine records. Root re-signed."
        }
