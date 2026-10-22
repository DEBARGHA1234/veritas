"""
backend/app/db.py

SQLite storage layer for VERITAS registry, transparency log, runtimes, and audit records.
"""

import json
import sqlite3
from typing import Any, Dict, List, Optional
from .config import DB_PATH


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with get_db_connection() as conn:
        conn.execute("PRAGMA journal_mode=WAL;")
        
        # Passports
        conn.execute("""
            CREATE TABLE IF NOT EXISTS passports (
                passport_digest TEXT PRIMARY KEY,
                model_id TEXT NOT NULL,
                version TEXT NOT NULL,
                operator_id TEXT NOT NULL,
                parent_digest TEXT,
                artifacts_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                operator_signature TEXT NOT NULL,
                raw_json TEXT NOT NULL
            );
        """)

        # Certificates
        conn.execute("""
            CREATE TABLE IF NOT EXISTS certificates (
                cert_id TEXT PRIMARY KEY,
                auditor_id TEXT NOT NULL,
                model_id TEXT NOT NULL,
                passport_digest TEXT NOT NULL,
                issued_at TEXT NOT NULL,
                expires_at TEXT NOT NULL,
                claims_json TEXT NOT NULL,
                auditor_signature TEXT NOT NULL,
                raw_json TEXT NOT NULL
            );
        """)

        # Revocations
        conn.execute("""
            CREATE TABLE IF NOT EXISTS revocations (
                cert_id TEXT PRIMARY KEY,
                revoked_at TEXT NOT NULL,
                reason TEXT NOT NULL
            );
        """)

        # Transparency Log Leaves
        conn.execute("""
            CREATE TABLE IF NOT EXISTS log_leaves (
                leaf_index INTEGER PRIMARY KEY,
                entry_type TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                leaf_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # Transparency Log Checkpoints
        conn.execute("""
            CREATE TABLE IF NOT EXISTS log_checkpoints (
                tree_size INTEGER PRIMARY KEY,
                root TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                signature TEXT NOT NULL
            );
        """)

        # Simulated Runtimes & Quotes
        conn.execute("""
            CREATE TABLE IF NOT EXISTS runtimes (
                runtime_id TEXT PRIMARY KEY,
                model_dir TEXT NOT NULL,
                measurement TEXT NOT NULL,
                receipt_pubkey TEXT NOT NULL,
                receipt_privkey TEXT NOT NULL,
                quote_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # Challenges (Nonces for Replay Protection)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS challenges (
                nonce TEXT PRIMARY KEY,
                issued_at TEXT NOT NULL,
                used INTEGER NOT NULL DEFAULT 0,
                expires_at TEXT NOT NULL
            );
        """)

        # Jobs & Receipts
        conn.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                runtime_id TEXT NOT NULL,
                nonce TEXT NOT NULL,
                passport_digest TEXT NOT NULL,
                cert_id TEXT NOT NULL,
                input_data TEXT NOT NULL,
                output_data TEXT NOT NULL,
                output_hash TEXT NOT NULL,
                receipt_json TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # Verifications history
        conn.execute("""
            CREATE TABLE IF NOT EXISTS verifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT,
                verdict TEXT NOT NULL,
                checks_json TEXT NOT NULL,
                evidence_vector_json TEXT NOT NULL,
                revalidation_plan_json TEXT,
                latency_ms REAL NOT NULL,
                created_at TEXT NOT NULL
            );
        """)

        # Backup table for log repair
        conn.execute("""
            CREATE TABLE IF NOT EXISTS log_leaves_backup (
                leaf_index INTEGER PRIMARY KEY,
                entry_type TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                leaf_hash TEXT NOT NULL,
                created_at TEXT NOT NULL
            );
        """)
        conn.commit()


def reset_db():
    """Cleans all tables and ensures schema is initialized."""
    init_db()
    with get_db_connection() as conn:
        conn.execute("DELETE FROM passports;")
        conn.execute("DELETE FROM certificates;")
        conn.execute("DELETE FROM revocations;")
        conn.execute("DELETE FROM log_leaves;")
        conn.execute("DELETE FROM log_checkpoints;")
        conn.execute("DELETE FROM runtimes;")
        conn.execute("DELETE FROM challenges;")
        conn.execute("DELETE FROM jobs;")
        conn.execute("DELETE FROM verifications;")
        conn.execute("DELETE FROM log_leaves_backup;")
        conn.commit()
