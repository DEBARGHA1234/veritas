# VERITAS — Verifiable Evidence & Registry for Integrity of Trusted AI Systems

> **Core Guarantee**: Prove that the model that served an inference request is the exact model that was audited.

---

## 1. Architecture in 10 Lines

1. **Model Passport**: Hashes model artifacts (`weights`, `adapter`, `tokenizer`, `config`, `prompt_template`), computes a canonical `passport_digest`, and operator signs it.
2. **Transparency Log**: Appends passports, certificates, and revocations into an RFC 6962 Merkle tree with signed checkpoints and cryptographic inclusion proofs.
3. **Auditor Certificate**: Independent auditors evaluate behavioral and checklist safety claims; strictly enforces that behavioral claims must depend on `weights`.
4. **Simulated TEE Enclave**: Hardware runtime measures loaded model artifacts and produces a platform quote binding the enclave's ephemeral keypair to the measurement and a verifier challenge nonce.
5. **Execution Receipt**: Enclave executes the request, returns the hash of the output (never raw inputs or outputs), and signs the execution receipt.
6. **Dependency Engine**: Dynamically evaluates claim validity; detects modified artifacts and computes a selective revalidation plan (% of test suites saved vs full re-audit).
7. **Soundness Invariant**: If weights change, all behavioral claims are impacted and 0% is saved (forcing a full re-audit).
8. **Replay Protection**: Verifier issues single-use 60s nonces; tracks and rejects replayed receipts or reused nonces.
9. **8-Stage Verifier**: Sequentially evaluates signatures, platform quote binding, replay, measurement match, log inclusion, certificate validity, policy compliance, and optional ZK membership.
10. **Verdict Precedence**: Strict order `DENIED > UNVERIFIED > NEEDS_REVIEW > VERIFIED` paired with a 5-dimensional evidence vector.

---

## 2. How to Run

### Prerequisites
- Python 3.11+
- Node.js 20+

### One-Command Setup & Launch
```bash
# Setup dependencies
make setup

# Generate deterministic artifacts and seed database
make seed

# Run automated test suites (pytest unit & integration)
make test

# Run all 15 attack and verification scenarios
make scenarios

# Start local dev servers (Backend on :8000, Frontend on :5173)
make dev
```
*(On Windows systems without GNU Make, running `make <target>` or `.\make.bat <target>` or `.\make.ps1 <target>` works identically).*

---

## 3. Assumptions & Honest Declarations

1. **Simulated Runtime (Rule 1)**: Hardware TEE attestation (Intel SGX / AMD SEV) is **SIMULATED** in this build. A persistent amber banner `Attestation: SIMULATED (no hardware TEE)` is displayed on every screen, and every receipt and quote explicitly carries `"attestation_mode": "simulated"`.
2. **Real Computation (Rule 2)**: Every number, latency, hash, Merkle root, and status on screen is computed live from the running database or live cryptographic execution. Nothing is hard-coded.
3. **Zero-Knowledge Proofs (Rule 3)**: Implements Groth16 with BN254 curve and Poseidon hashing. When the full compiler toolchain is missing in the host environment, the system displays `ZK proof unavailable in this environment` and marks the proof optional/skipped. Mock proofs are strictly prohibited.
4. **Business Modeling (Rule 4)**: The Business page is an interactive calculator based on user-editable assumptions and is clearly labeled `Illustrative, not a forecast`.
5. **Key Management (Rule 5)**: All demo keys for operators, auditors, and platform roots are derived from fixed deterministic seeds and labeled `DEMO KEYS ONLY`. No blockchain is used.

---

## 4. 5-Minute Live Demo Walkthrough Script

### Minute 1: Overview & Pipeline
1. Open the UI at `http://localhost:5173`.
2. Point out the persistent amber banner: `Attestation: SIMULATED (no hardware TEE)` and the `DEMO KEYS ONLY` tag.
3. Review the **Overview** page: highlight the 5-step lifecycle (Audit &rarr; Passport &rarr; Attest &rarr; Receipt &rarr; Verify) and the live database counts.

### Minute 2: Passports & Audits
1. Click **Passports**: Select `credit-risk` folder and view the individual artifact hashes (`weights.bin`, `tokenizer.json`, `config.yaml`, `prompt.txt`) and the canonical `passport_digest`.
2. Click **Audits**: View `cert-001` for `credit-risk`. Show the **Claims Dependency Matrix**: notice the dots showing that behavioral claims C1, C2, and C4 depend on `weights`, enforcing the auditor soundness rule.

### Minute 3: Honest Run (VERIFIED) & Model Swap (DENIED)
1. Click **Runtime**: Select `credit-risk`, click **Start Runtime**. Inspect the generated platform **Quote** with its hardware measurement and ephemeral receipt public key.
2. Click **Run Job & Generate Receipt**: Point out that the receipt only contains the output hash (preserving confidentiality). Click **Verify This Receipt**.
3. On the **Verify** page: Select policy `regulated-lending` and click **Verify Receipt**.
   - Show the large green **VERIFIED** badge.
   - Walk through the 8 green checks and the 5-field evidence vector (`artifact_integrity: PASS`, `auditor_authenticity: PASS`, etc.).
4. Test **Model Swap Attack (S3)**: Go to **Attacks**, run **S3 (Model Swap)**.
   - Explain: Operator claimed the `credit-risk` passport but executed `shadow-model`.
   - Result: **DENIED** at Check 4 (Measurement mismatch).

### Minute 4: Drift & Selective Revalidation vs Full Re-Audit
1. In **Attacks**, run **S4 (Config Changed)**:
   - Result: **NEEDS_REVIEW**. Check 7 caught that claims C1 & C3 were impacted by the config change.
   - Show the **Dynamic Revalidation Plan**: Only 2 of 4 suites need re-running &rarr; **50% saved** versus a full re-audit!
2. In **Attacks**, run **S7 (Weights Changed)**:
   - Result: **NEEDS_REVIEW**. Weights fine-tune invalidated all behavioral claims.
   - Point out the honesty rule: The revalidation plan shows 4 of 4 suites re-run &rarr; **0% saved** (requiring full re-audit).
3. In **Attacks**, run **S11 (Replay Attack)**:
   - Result: **DENIED** at Check 3 (Nonce consumed, replay detected).

### Minute 5: Log Tampering, Metrics & Business Calculator
1. Click **Log**: Show tree size and the latest signed checkpoint.
   - Click **Tamper (Demo)**, then **Check Integrity**: Red alert triggers showing integrity violation at leaf #0!
   - Run **S14** in Attacks: Result is **DENIED** (Inclusion proof fails).
   - Go back to **Log**, click **Repair Log**: Log restores from backup and integrity checks pass again.
2. Click **Metrics**:
   - Show the live p50/p95 latency and average receipt size (~450 bytes).
   - Click **Run 200-Run Latency Benchmark** to demonstrate live real-time measurement.
3. Click **Business**:
   - Point out the label `Illustrative, not a forecast`.
   - Adjust the sliders (e.g. increase enterprise customers to 25).
   - Show live recalculation of ARR, gross margins (>98%), and requests/second.
