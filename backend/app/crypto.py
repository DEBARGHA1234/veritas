"""
backend/app/crypto.py

Cryptographic primitives for VERITAS:
- Ed25519 signature generation and verification
- Canonical JSON serialization
- SHA-256 hashing
- Measurement computation for model artifacts
"""

import hashlib
import json
from typing import Any, Dict, Tuple
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.exceptions import InvalidSignature

from .config import DEMO_KEY_SEEDS


def canonical_json(obj: Any) -> str:
    """Returns canonical JSON string with sorted keys and no whitespace."""
    return json.dumps(obj, separators=(",", ":"), sort_keys=True)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_measurement(artifacts: Dict[str, Dict[str, Any]]) -> str:
    """
    Computes measurement of a model's artifacts:
    SHA-256 over alphabetically sorted artifact digests.
    Format: 'type1:sha256:type2:sha256...'
    """
    sorted_types = sorted(artifacts.keys())
    digest_tokens = [f"{t}:{artifacts[t]['sha256']}" for t in sorted_types]
    combined_str = ":".join(digest_tokens)
    return sha256_text(combined_str)


def compute_passport_digest(artifacts: Dict[str, Dict[str, Any]]) -> str:
    """
    passport_digest = SHA-256(canonical JSON of artifacts sorted by type)
    """
    sorted_artifacts = {k: artifacts[k] for k in sorted(artifacts.keys())}
    canonical = canonical_json(sorted_artifacts)
    return sha256_text(canonical)


def get_demo_keypair(key_id: str) -> Tuple[ed25519.Ed25519PrivateKey, str]:
    """
    Derives deterministic Ed25519 keypair from seed for demo identities.
    Returns (private_key, public_key_hex).
    """
    seed = DEMO_KEY_SEEDS.get(key_id)
    if not seed:
        raise ValueError(f"Unknown demo key identity: {key_id}")
    seed_bytes = hashlib.sha256(seed).digest()
    priv_key = ed25519.Ed25519PrivateKey.from_private_bytes(seed_bytes)
    pub_bytes = priv_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    return priv_key, pub_bytes.hex()


def generate_ephemeral_keypair() -> Tuple[ed25519.Ed25519PrivateKey, str]:
    """Generates fresh ephemeral Ed25519 keypair for simulated runtime."""
    priv_key = ed25519.Ed25519PrivateKey.generate()
    pub_bytes = priv_key.public_key().public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    return priv_key, pub_bytes.hex()


def sign_data(priv_key: ed25519.Ed25519PrivateKey, message: str) -> str:
    """Signs utf-8 message and returns signature as hex string."""
    sig_bytes = priv_key.sign(message.encode("utf-8"))
    return sig_bytes.hex()


def verify_signature(pub_key_hex: str, message: str, sig_hex: str) -> bool:
    """Verifies Ed25519 signature over message string."""
    try:
        pub_bytes = bytes.fromhex(pub_key_hex)
        sig_bytes = bytes.fromhex(sig_hex)
        pub_key = ed25519.Ed25519PublicKey.from_public_bytes(pub_bytes)
        pub_key.verify(sig_bytes, message.encode("utf-8"))
        return True
    except (InvalidSignature, ValueError, Exception):
        return False
