"""
backend/app/config.py

Configuration constants, paths, and demo identities.
Honesty Rule: All demo keys are derived from fixed seeds and labelled DEMO KEYS ONLY.
"""

from pathlib import Path

# Paths
APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
ROOT_DIR = BACKEND_DIR.parent

DATA_DIR = ROOT_DIR / "data"
SEED_FILE = DATA_DIR / "seed.json"
ARTIFACTS_DIR = DATA_DIR / "artifacts"
SCRATCH_DIR = DATA_DIR / "scratch"
DB_PATH = DATA_DIR / "veritas.db"
ZK_DIR = ROOT_DIR / "zk"

# Demo Constants
DEMO_NOW = "2026-10-21T12:00:00Z"
ATTESTATION_MODE = "simulated"
ATTESTATION_BANNER = "Attestation: SIMULATED (no hardware TEE)"

# Deterministic key seeds (32 bytes each) - DEMO KEYS ONLY
DEMO_KEY_SEEDS = {
    # Operators
    "op-finlend": b"DEMO_KEY_FINLEND_ANALYTICS_OP_01",
    "op-medcore": b"DEMO_KEY_MEDCORE_HEALTH_AI_OP_02",
    # Auditors
    "aud-acme": b"DEMO_KEY_ACME_ASSURANCE_AUDIT_01",
    "aud-northwind": b"DEMO_KEY_NORTHWIND_AUDIT_LAB_02",
    # Log Authority
    "log-authority": b"DEMO_KEY_VERITAS_TRANSPARENCY_LOG",
    # Simulated TEE Platform
    "sim-platform-1": b"DEMO_KEY_SIM_TEE_PLATFORM_KEY_01",
    # Verifier Authority
    "verifier-authority": b"DEMO_KEY_VERITAS_VERIFIER_AUTH_01"
}
