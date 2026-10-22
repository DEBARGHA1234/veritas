# VERITAS demo build — paste everything below into Antigravity

Use Planning mode. Produce a task list and implementation plan first, then build. Do not ask clarifying questions; make reasonable assumptions and list them in README.md.

---

# Build: VERITAS demo prototype

## 1. Goal
Build a working, demo-ready prototype of **VERITAS** for a live project review with technical reviewers and investors present.

**Core goal (never let anything displace it):** prove that the model that served a request is the model that was audited. Every feature below exists to support that. Do not add features that are not listed.

VERITAS = Verifiable Evidence & Registry for Integrity of Trusted AI Systems.

## 2. Honesty rules (non-negotiable)
1. Runtime attestation is **SIMULATED** in this build. Show a persistent amber banner on every page: `Attestation: SIMULATED (no hardware TEE)`. Every receipt and quote contains `"attestation_mode": "simulated"`.
2. Every number shown on screen must come from real computation in the running app or from a real test run. Never hard-code results, latencies or counts.
3. Zero-knowledge: use real Circom + snarkjs (Groth16). If the toolchain is missing, the UI shows `ZK proof unavailable in this environment`. Never fake or mock a proof.
4. The Business page shows only user-editable assumptions and is labelled `Illustrative, not a forecast`.
5. No blockchain. Use only the synthetic names in this prompt. Demo keys are derived from fixed seeds and labelled `DEMO KEYS ONLY`.

## 3. Stack
- Backend: Python 3.11, FastAPI, SQLite (sqlite3 or SQLAlchemy), pydantic v2, `cryptography` (Ed25519), `hashlib` (SHA-256), pytest.
- Frontend: React + Vite + TypeScript + Tailwind. Clean light UI, navy `#0E1726` header, amber `#F2B84B` accent, readable at projector resolution (min body size 16px).
- ZK: Circom 2, snarkjs (Groth16, BN254), circomlibjs (Poseidon), Node 20 helper scripts in `/zk`.
- Commands that must work: `make setup`, `make seed`, `make dev` (starts backend on :8000 and frontend on :5173), `make test`, `make scenarios`, `make zk-build`.

## 4. Repository layout
```
veritas/
  backend/app/ main.py config.py db.py crypto.py passport.py certs.py
               log.py deps.py runtime_sim.py receipts.py verifier.py
               policy.py zk.py metrics.py seed.py schemas.py
  backend/tests/
  frontend/src/pages/ Overview Passports Audits Log Runtime Verify Attacks Metrics Business
  zk/ membership.circom build.sh tree.js prove.js verify.js
  data/ seed.json   (artifacts are generated into data/artifacts/)
  scripts/ make_artifacts.py run_scenarios.py
  Makefile  README.md
```

## 5. Domain model and rules

### 5.1 Artifacts and passport
- Artifact types: `weights`, `adapter`, `tokenizer`, `config`, `prompt_template`.
- Passport: `model_id`, `version`, `operator_id`, `artifacts` (type → `{file, sha256, size}`), optional `parent_digest`, `created_at`, `passport_digest = SHA-256(canonical JSON of artifacts sorted by type)`, operator Ed25519 signature.

### 5.2 Certificate and claims
- Certificate: `cert_id`, `auditor_id`, `model_id`, `passport_digest` (the passport it was issued against), `issued_at`, `expires_at`, `claims[]`, auditor Ed25519 signature.
- Claim: `claim_id`, `statement`, `suite`, `result`, `threshold`, `behavioral` (bool), `depends_on` (list of artifact types).
- **Soundness rule at issuance:** every claim with `behavioral = true` must list `weights` in `depends_on`; otherwise reject the certificate with a clear error.
- **Claim status** against a current passport (computed, never stored): `VALID` if every artifact type in `depends_on` has an identical sha256 in the certified passport and the current passport; else `IMPACTED`. Overlay `EXPIRED` if the certificate is past `expires_at` and `REVOKED` if listed in the revocation list. Resolve lineage by following `parent_digest` links to the certified passport.

### 5.3 Transparency log
- Append-only Merkle tree in RFC 6962 style: leaf hash = `SHA-256(0x00 || entry_bytes)`, node hash = `SHA-256(0x01 || left || right)`.
- Entry types: `PASSPORT`, `CERTIFICATE`, `REVOCATION`, `ZK_REGISTRY_ROOT`.
- API: append, inclusion proof, signed checkpoint `{tree_size, root, timestamp, signature}` by the log key, simple consistency check between two checkpoints.
- Integrity check: recompute the root from stored leaves and compare with the latest checkpoint. Return the first mismatching index.

### 5.4 Simulated runtime (`runtime_sim.py`)
- Loads a model directory and hashes its artifacts. `measurement = SHA-256(sorted artifact digests)`.
- Generates a fresh **receipt key pair inside the simulated runtime**. Produces a **quote**: `{quote_id, measurement, receipt_pubkey, nonce, attestation_mode: "simulated", platform_key_id: "sim-platform-1", platform_signature}`. The platform signature covers measurement, receipt_pubkey and nonce.
- `run_job(input)` returns `{output, output_hash}` (output can be a deterministic mock inference result) and a signed receipt.

### 5.5 Receipt
`{job_id, nonce, passport_digest, cert_id, output_hash, policy_decision, issued_at, quote_id, attestation_mode, signature}` signed by the receipt key from the quote. Receipts never contain raw prompts or outputs, only hashes.

### 5.6 Verifier (`verifier.py`)
Verifier issues nonces via `GET /verifier/challenge` (valid 60 seconds, single use). Checks run in this order and each returns `PASS`, `FAIL` or `NOT_EVALUATED` with a human-readable reason:
1. Receipt signature valid under `receipt_pubkey` from the quote.
2. Quote platform signature valid and `receipt_pubkey` bound to the measurement.
3. Nonce issued by this verifier, fresh and unused; `job_id` not seen before (replay protection).
4. Quote `measurement` equals the measurement derived from the passport referenced by `passport_digest`.
5. Passport present in the log, inclusion proof valid against the latest checkpoint.
6. Certificate present in the log, signature valid, not revoked, matches the model, lineage resolves.
7. Required claims (per policy) are `VALID`; certificate not expired.
8. Optional: ZK membership proof valid.

**Verdict precedence: DENIED > UNVERIFIED > NEEDS_REVIEW > VERIFIED.**
- `DENIED`: any failure in checks 1 to 4, a failed inclusion proof, a bad or revoked certificate, a replay or nonce failure, or an impacted required claim under a policy with `on_impacted = deny`.
- `UNVERIFIED`: required evidence missing (no quote, no receipt, passport or certificate not in the log).
- `NEEDS_REVIEW`: all cryptographic checks pass but a required claim is `IMPACTED`, or the certificate is expired, under a policy with `on_impacted = needs_review`.
- `VERIFIED`: everything passes.

**Evidence vector (never a single trust score).** Return five statuses, each `PASS`, `PARTIAL`, `FAIL` or `N_A`: `artifact_integrity`, `auditor_authenticity`, `runtime_identity`, `audit_applicability`, `privacy_proof`.

### 5.7 Dependency engine (`deps.py`)
Input: certified passport and current passport. Output: changed artifact types, claim statuses, and a **revalidation plan**: impacted claims, the suites to re-run, and `suites_rerun / suites_total` plus the percentage saved versus a full re-audit. If the weights changed the plan must honestly show a full re-audit (0% saved).

### 5.8 Policies (`policy.py`)
- `regulated-lending` (credit-risk): required claims `C1, C2, C4`, `on_impacted = needs_review`.
- `clinical-triage` (med-triage-llm): required claims `M1, M2, M3`, `on_impacted = deny`.
- `standard` (fraud-detector): required claims `F1`, `on_impacted = needs_review`.

### 5.9 Zero-knowledge membership (`/zk`)
- Circuit: prove knowledge of a leaf `Poseidon(passport_digest_as_field, salt)` that is a member of a depth-8 Poseidon Merkle tree with public `root`, with a public `nonce_hash` input so the proof is bound to a fresh nonce.
- `tree.js` builds the Poseidon registry tree from registered passports. The root is appended to the log as `ZK_REGISTRY_ROOT`.
- `build.sh` compiles the circuit, runs a local Groth16 setup (clearly labelled `demo ceremony, not production`), exports the verification key.
- Backend: `POST /zk/prove`, `POST /zk/verify` call the Node scripts. Report proof generation time, verification time and proof size from real measurements.
- Caveat to show in the UI next to the proof: `Membership proof does not by itself prove execution. It is bound to the nonce and checked together with the receipt.`

## 6. API (FastAPI, JSON)
```
POST /models/register          body: model dir name        -> passport (signed, logged)
POST /certificates/issue       body: cert payload          -> certificate (signed, logged)
POST /certificates/{id}/revoke                             -> revocation entry (logged)
GET  /log/checkpoint           GET /log/proof/{entry_id}   GET /log/integrity
POST /log/tamper               (demo only; flips one stored leaf)  POST /log/repair
POST /runtime/start            body: model dir name        -> quote
POST /runtime/run              body: runtime_id, input     -> output_hash + receipt
GET  /verifier/challenge       -> nonce
POST /verify                   body: receipt, quote, policy, optional zk proof -> verdict, checks[], evidence_vector, revalidation_plan
POST /deps/diff                body: certified digest, current digest -> claim statuses + plan
POST /zk/prove  POST /zk/verify
POST /scenarios/run/{id}       POST /scenarios/run-all
GET  /metrics
POST /demo/reset               (clears DB, re-seeds, regenerates artifacts)
```

## 7. Frontend pages
Persistent header with the amber `Attestation: SIMULATED` banner and a `Reset demo` button.
1. **Overview:** five-step pipeline (Audit, Passport, Attest, Receipt, Verify) with live counts of passports, certificates, receipts, verdicts.
2. **Passports:** pick a model folder, register, show each artifact digest and the passport digest.
3. **Audits:** issue a certificate; show a matrix of claims (rows) by artifact types (columns) with dots where a claim depends on a type.
4. **Log:** tree size, root, checkpoints, inclusion proof viewer; `Tamper` then `Check integrity` shows detection at the first bad index; `Repair` restores.
5. **Runtime:** start the simulated runtime for a model, show the quote, run a job, show the receipt.
6. **Verify:** choose a receipt, choose a policy, run the verifier. Show the 8 checks as an ordered checklist with reasons, a large verdict badge (VERIFIED green, NEEDS_REVIEW amber, UNVERIFIED grey, DENIED red), the five-field evidence vector, and the revalidation plan.
7. **Attacks:** one button per scenario S1 to S15 plus `Run all`. Each row shows expected verdict, actual verdict and a green tick only when they match. Include a short plain-English `what happened` line.
8. **Metrics:** values computed live: verify latency p50 and p95 over 200 runs, receipt size in bytes, Merkle inclusion proof size, log size, ZK proof generation time, proof size and verification time, scenarios passed, verdict distribution chart, tests re-triggered versus full re-audit per change type.
9. **Business:** editable inputs (customers, models per customer, jobs per day per model, price per model per month, price per million receipts, infrastructure cost per million receipts). Compute monthly and annual revenue, gross margin and receipts per second. Label: `Illustrative, not a forecast`. Defaults: 10 customers, 5 models each, 50,000 jobs per day per model, 400 per model per month, 25 per million receipts, 4 infrastructure cost per million receipts.

## 8. Test data

### 8.1 Seed file `data/seed.json` (create exactly)
```json
{
  "demo_now": "2026-10-21T12:00:00Z",
  "operators": [
    {"id": "op-finlend", "name": "FinLend Analytics (synthetic)"},
    {"id": "op-medcore", "name": "MedCore Health AI (synthetic)"}
  ],
  "auditors": [
    {"id": "aud-acme", "name": "Acme Assurance Ltd (synthetic)"},
    {"id": "aud-northwind", "name": "Northwind Audit Lab (synthetic)"}
  ],
  "models": [
    {"dir": "credit-risk", "model_id": "credit-risk", "version": "1.0.0", "operator_id": "op-finlend",
     "artifacts": {
       "weights": {"file": "weights.bin", "seed": 101, "size": 262144},
       "tokenizer": {"file": "tokenizer.json", "seed": 102, "size": 4096},
       "config": {"file": "config.yaml", "seed": 103, "size": 1024},
       "prompt_template": {"file": "prompt.txt", "seed": 104, "size": 512}}},
    {"dir": "med-triage-llm", "model_id": "med-triage-llm", "version": "2.1.0", "operator_id": "op-medcore",
     "artifacts": {
       "weights": {"file": "weights.bin", "seed": 201, "size": 524288},
       "adapter": {"file": "adapter.safetensors", "seed": 202, "size": 65536},
       "tokenizer": {"file": "tokenizer.json", "seed": 203, "size": 4096},
       "config": {"file": "config.yaml", "seed": 204, "size": 1024},
       "prompt_template": {"file": "prompt.txt", "seed": 205, "size": 512}}},
    {"dir": "fraud-detector", "model_id": "fraud-detector", "version": "3.4.2", "operator_id": "op-finlend",
     "artifacts": {
       "weights": {"file": "weights.bin", "seed": 301, "size": 131072},
       "config": {"file": "config.yaml", "seed": 302, "size": 1024}}},
    {"dir": "shadow-model", "model_id": "shadow-model", "version": "0.0.1", "operator_id": "op-finlend",
     "artifacts": {
       "weights": {"file": "weights.bin", "seed": 999, "size": 262144},
       "tokenizer": {"file": "tokenizer.json", "seed": 102, "size": 4096},
       "config": {"file": "config.yaml", "seed": 103, "size": 1024},
       "prompt_template": {"file": "prompt.txt", "seed": 104, "size": 512}}}
  ],
  "certificates": [
    {"cert_id": "cert-001", "auditor_id": "aud-acme", "model_dir": "credit-risk",
     "issued_at": "2026-09-15T09:00:00Z", "expires_at": "2027-03-15T09:00:00Z",
     "claims": [
       {"claim_id": "C1", "statement": "Demographic parity gap is at most 0.05", "suite": "fairness-v1.2", "result": 0.031, "threshold": 0.05, "behavioral": true, "depends_on": ["weights", "config"]},
       {"claim_id": "C2", "statement": "Robustness pass rate is at least 0.95 under perturbation", "suite": "robust-v2.0", "result": 0.968, "threshold": 0.95, "behavioral": true, "depends_on": ["weights", "tokenizer"]},
       {"claim_id": "C3", "statement": "Documentation completeness checklist is complete", "suite": "docs-v1.0", "result": 1.0, "threshold": 1.0, "behavioral": false, "depends_on": ["config"]},
       {"claim_id": "C4", "statement": "Prompt safety pass rate is at least 0.98", "suite": "promptsafe-v1.1", "result": 0.987, "threshold": 0.98, "behavioral": true, "depends_on": ["weights", "tokenizer", "prompt_template"]}]},
    {"cert_id": "cert-002", "auditor_id": "aud-northwind", "model_dir": "med-triage-llm",
     "issued_at": "2026-10-01T09:00:00Z", "expires_at": "2027-04-01T09:00:00Z",
     "claims": [
       {"claim_id": "M1", "statement": "Clinical triage accuracy is at least 0.90", "suite": "triage-acc-v3.0", "result": 0.923, "threshold": 0.90, "behavioral": true, "depends_on": ["weights", "adapter", "tokenizer", "prompt_template"]},
       {"claim_id": "M2", "statement": "Toxic output rate is at most 0.01", "suite": "toxicity-v2.1", "result": 0.004, "threshold": 0.01, "behavioral": true, "depends_on": ["weights", "adapter"]},
       {"claim_id": "M3", "statement": "PII leakage rate is at most 0.001", "suite": "pii-leak-v1.3", "result": 0.0004, "threshold": 0.001, "behavioral": true, "depends_on": ["weights", "adapter", "tokenizer"]},
       {"claim_id": "M4", "statement": "Documentation completeness checklist is complete", "suite": "docs-v1.0", "result": 1.0, "threshold": 1.0, "behavioral": false, "depends_on": ["config"]}]},
    {"cert_id": "cert-003", "auditor_id": "aud-acme", "model_dir": "fraud-detector",
     "issued_at": "2025-12-01T09:00:00Z", "expires_at": "2026-06-01T09:00:00Z",
     "claims": [
       {"claim_id": "F1", "statement": "AUC is at least 0.92 on the holdout set", "suite": "auc-holdout-v1.0", "result": 0.941, "threshold": 0.92, "behavioral": true, "depends_on": ["weights", "config"]}]}
  ]
}
```

### 8.2 Artifact generator `scripts/make_artifacts.py`
Generate every artifact file deterministically: bytes from `random.Random(seed).randbytes(size)` (or an equivalent seeded PRNG), written to `data/artifacts/<dir>/<file>`. Re-running must produce identical files. Provide a helper `mutate(dir, type, mode)` used by scenarios, which appends 16 deterministic bytes to a copy of that artifact in a scratch directory `data/scratch/<dir>/`, never touching the originals.

### 8.3 Scenarios (`scripts/run_scenarios.py` and the Attacks page)
Seed state before each run: all three real models registered, all three certificates issued and logged, runtime started where needed. `S` means scenario. The runner prints a table and exits non-zero if any actual verdict differs from the expected one.

| ID | Scenario | How to produce it | Expected verdict | Deciding check |
|----|----------|-------------------|------------------|----------------|
| S1 | Honest run, credit-risk | Start runtime on `credit-risk`, run job, verify with `regulated-lending` | VERIFIED | none failed |
| S2 | Honest run, med-triage | Same for `med-triage-llm` with `clinical-triage` | VERIFIED | none failed |
| S3 | Model swap | Operator claims the `credit-risk` passport but starts the runtime on `shadow-model` files | DENIED | 4 measurement mismatch |
| S4 | Config changed after audit | Mutate `config` of credit-risk, register new passport with `parent_digest`, run, verify | NEEDS_REVIEW | 7: C1 and C3 impacted. Plan: 2 of 4 suites, 50% saved |
| S5 | Tokenizer changed | Mutate `tokenizer` of credit-risk, same flow | NEEDS_REVIEW | 7: C2 and C4 impacted. Plan: 2 of 4 suites, 50% saved |
| S6 | Prompt template changed | Mutate `prompt_template` of credit-risk | NEEDS_REVIEW | 7: C4 impacted. Plan: 1 of 4 suites, 75% saved |
| S7 | Weights changed (fine-tune) | Mutate `weights` of credit-risk | NEEDS_REVIEW | 7: all 4 claims impacted. Plan: 4 of 4, 0% saved |
| S8 | Adapter changed under strict policy | Mutate `adapter` of med-triage-llm, verify with `clinical-triage` | DENIED | 7: M1, M2, M3 impacted, `on_impacted = deny` |
| S9 | Certificate revoked | Revoke `cert-002`, then verify an S2-style receipt | DENIED | 6 revoked |
| S10 | Certificate expired | Run `fraud-detector`, verify with `standard` (cert-003 expired at demo_now) | NEEDS_REVIEW | 7 certificate expired |
| S11 | Replay of an old receipt | Re-submit the receipt from S1 with its old nonce | DENIED | 3 replay |
| S12 | Relay attack | Receipt for `credit-risk` signed by a different key than the quote's `receipt_pubkey` | DENIED | 1 and 2 |
| S13 | Unattested runtime | Submit a receipt with no quote | UNVERIFIED | quote missing |
| S14 | Log tampering | `POST /log/tamper` on the credit-risk passport entry, then verify an S1-style receipt | DENIED | 5 inclusion proof fails. `/log/integrity` reports the first bad index. Then `/log/repair` |
| S15 | ZK membership | Prove credit-risk membership with a fresh nonce, verify; then alter the public root and verify again | First valid, second invalid | 8 |

S15 is skipped with the message `ZK unavailable in this environment` only if the toolchain is missing.

## 9. Tests (`backend/tests`, pytest)
- Unit: canonical JSON and passport digest stability, Merkle root and inclusion proof, checkpoint signature, claim status computation, soundness rule rejection, nonce single-use, each verifier check in isolation.
- Integration: every scenario S1 to S15 asserts the expected verdict.
- `make test` must pass from a clean checkout after `make setup && make seed`.

## 10. Acceptance criteria
1. `make setup && make seed && make dev` brings the full app up with no manual steps beyond installing Node and Python.
2. `make scenarios` prints 15 rows and exits 0.
3. Every page in section 7 works, and the amber banner is visible on all of them.
4. Metrics are computed from real runs and change when re-run.
5. `README.md` contains: how to run, architecture in 10 lines, the list of assumptions, and a **5-minute demo script** that walks through: Overview, register and audit credit-risk, honest run (VERIFIED), model swap (DENIED), config change (NEEDS_REVIEW with 50% saving), weights change (full re-audit, 0% saving), replay (DENIED), log tamper detection, ZK proof, Metrics page, Business page.
6. No feature outside this prompt. No placeholder text, no TODOs in the UI.

## 11. Workflow for you (Antigravity)
1. Write the implementation plan and task list, then wait for no input and proceed.
2. Build backend, then tests, then ZK, then frontend.
3. Run `make test` and `make scenarios` and fix failures.
4. Launch the app, open every page in the browser, and capture a screenshot of each page and of the Attacks page after `Run all`. Fix any page that is broken or unreadable.
5. Finish with a short summary of what works, what is simulated, and any assumptions.
