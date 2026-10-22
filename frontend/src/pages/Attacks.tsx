import React, { useState } from 'react';
import { 
  AlertTriangle, 
  Play, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  ChevronDown, 
  FileCode, 
  Cpu, 
  KeyRound, 
  Database, 
  Layers,
  Fingerprint,
  RefreshCw,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import { api } from '../api';

interface ScenarioDetail {
  id: string;
  name: string;
  category: string;
  expected_verdict: string;
  actual_verdict: string | null;
  passed: boolean | null;
  deciding_check?: string;
  failed_check_num: number | null; // 1 to 8, or null for honest
  adversary_goal: string;
  certified_state: string;
  tampered_state: string;
  parameter_diff: string;
  detection_mechanism: string;
  business_impact: string;
  what_happened: string;
}

const INITIAL_SCENARIOS: ScenarioDetail[] = [
  {
    id: 'S1',
    name: 'Honest run, credit-risk',
    category: 'Baseline Integrity',
    expected_verdict: 'VERIFIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: null,
    adversary_goal: 'Normal production credit underwriting without tampering or malicious intervention.',
    certified_state: 'Model: credit-risk:1.0.0 | Weights: c7a4... | Config: cfca... | Active cert: cert-001',
    tampered_state: 'Identical: Model loaded inside TEE matches certified passport exactly.',
    parameter_diff: '0 bytes drifted. Measurement matches registered passport.',
    detection_mechanism: 'All 8 VERITAS pipeline checks evaluate PASS. Enclave signature and platform binding valid.',
    business_impact: 'Instant automated loan decision approved under FCRA & Reg B compliance (<1.4ms latency).',
    what_happened: 'Model matches certified passport; valid enclave quote and claims.'
  },
  {
    id: 'S2',
    name: 'Honest run, med-triage',
    category: 'Baseline Integrity',
    expected_verdict: 'VERIFIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: null,
    adversary_goal: 'Normal clinical triage inference evaluating ER patient priority under strict medical policy.',
    certified_state: 'Model: med-triage-llm:1.0.0 | Claims: M1 (Hypotension), M2 (Sepsis), M3 (Triage accuracy)',
    tampered_state: 'Identical: Clinical model executed in isolated hardware enclave.',
    parameter_diff: '0 bytes drifted. All clinical safety claims verified active.',
    detection_mechanism: 'All 8 checks pass. Hardware quote verified against health department root keys.',
    business_impact: 'Clinical triage score certified compliant with HIPAA & hospital clinical governance.',
    what_happened: 'Clinical model matches passport; valid quote and clinical safety claims.'
  },
  {
    id: 'S3',
    name: 'Model swap (Shadow Model Substitution)',
    category: 'Supply Chain Attack',
    expected_verdict: 'DENIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: 4,
    adversary_goal: 'Adversary deploys an unauthorized, un-audited "shadow model" to approve high-risk subprime loans while falsely presenting the certified credit-risk passport and cert-001.',
    certified_state: 'Certified Passport Digest: cfca58a4224f... (Registered with financial regulator)',
    tampered_state: 'Enclave Hardware Measurement: 9b1c72ea8401... (Un-audited rogue model weights)',
    parameter_diff: 'Measurement mismatch: Hardware enclave was booted on uncertified code/weights.',
    detection_mechanism: 'CHECK 4 (Measurement Match) fails immediately. The cryptographic hardware quote proves the executed code does not match the certified passport digest.',
    business_impact: 'Fraudulent loan origination blocked instantly. Tampering logged to immutable transparency registry.',
    what_happened: 'Operator claimed credit-risk but executed shadow-model. Check 4 measurement mismatch caught it.'
  },
  {
    id: 'S4',
    name: 'Config changed after audit',
    category: 'Artifact Drift',
    expected_verdict: 'NEEDS_REVIEW',
    actual_verdict: null,
    passed: null,
    failed_check_num: 7,
    adversary_goal: 'Operator modifies lending policy hyperparameter (max_leverage: 3.0 -> 5.0) in config.json after auditor sign-off without re-auditing.',
    certified_state: 'config.json SHA256: a3f890... (Leverage cap 3.0x signed by compliance)',
    tampered_state: 'config.json SHA256: ffff90... (Leverage cap modified to 5.0x post-audit)',
    parameter_diff: 'max_leverage: 3.0 -> 5.0. Dependency graph flags Claims C1 (Fair Lending) and C3 (Docs) as impacted.',
    detection_mechanism: 'CHECK 7 (Dependency Diff Engine) calculates exact dependency tree. It isolates affected claims and outputs a selective revalidation plan.',
    business_impact: 'Selective re-audit requires re-running only 2 of 4 suites — SAVING 50% re-testing compute and auditor fees.',
    what_happened: 'Config mutated. C1 & C3 impacted. Selective plan reruns 2 of 4 suites (50% saved).'
  },
  {
    id: 'S5',
    name: 'Tokenizer changed',
    category: 'Artifact Drift',
    expected_verdict: 'NEEDS_REVIEW',
    actual_verdict: null,
    passed: null,
    failed_check_num: 7,
    adversary_goal: 'MLOps engineers swap the BPE tokenizer dictionary to accommodate slang/emojis without informing compliance.',
    certified_state: 'tokenizer.json SHA256: b81c4e... (Certified against adversarial jailbreaks)',
    tampered_state: 'tokenizer.json SHA256: ffff4e... (Updated vocabulary file)',
    parameter_diff: 'tokenizer.json mutated. Impacted claims: C2 (Adversarial Robustness) & C4 (Prompt Injection Safety).',
    detection_mechanism: 'CHECK 7 (Dependency Engine) detects tokenizer hash mutation. Generates targeted plan for suites 2 and 4.',
    business_impact: '2 of 4 test suites re-evaluated (50% compute and time saved compared to full re-certification).',
    what_happened: 'Tokenizer mutated. C2 & C4 impacted. Selective plan reruns 2 of 4 suites (50% saved).'
  },
  {
    id: 'S6',
    name: 'Prompt template changed',
    category: 'Artifact Drift',
    expected_verdict: 'NEEDS_REVIEW',
    actual_verdict: null,
    passed: null,
    failed_check_num: 7,
    adversary_goal: 'Frontend developer re-words the internal reasoning prompt wrapper in prompt_template.txt.',
    certified_state: 'prompt_template.txt SHA256: 7e92aa... (Audited guardrail system prompt)',
    tampered_state: 'prompt_template.txt SHA256: ffffaa... (Modified system prompt formatting)',
    parameter_diff: 'prompt_template.txt mutated. Only Claim C4 (Prompt Safety) depends on this file.',
    detection_mechanism: 'CHECK 7 (Dependency Engine) isolates single claim impact. Formulates plan re-running only Suite 4.',
    business_impact: 'Only 1 of 4 test suites rerun — SAVING 75% audit turnaround time and computational cost.',
    what_happened: 'Prompt template mutated. Only C4 impacted. 1 of 4 suites rerun (75% saved).'
  },
  {
    id: 'S7',
    name: 'Weights changed (fine-tune)',
    category: 'Artifact Drift',
    expected_verdict: 'NEEDS_REVIEW',
    actual_verdict: null,
    passed: null,
    failed_check_num: 7,
    adversary_goal: 'Data science team fine-tunes model weights (weights.bin) on recent customer transaction data.',
    certified_state: 'weights.bin SHA256: 5d120a... (Audited neural network weights)',
    tampered_state: 'weights.bin SHA256: ffff0a... (Fine-tuned neural network checkpoint)',
    parameter_diff: 'Core neural network weights modified. Invariant: Modifying weights destroys all behavioral guarantees.',
    detection_mechanism: 'CHECK 7 (Honesty Rule): System enforces that weight mutation invalidates all claims (C1, C2, C3, C4).',
    business_impact: 'Forces mandatory full re-audit (0% saved, 4 of 4 suites). Prevents silent model drift in production.',
    what_happened: 'Weights modified. All behavioral claims invalidated. Full re-audit required (0% saved).'
  },
  {
    id: 'S8',
    name: 'Adapter changed under strict policy',
    category: 'Policy Enforcement',
    expected_verdict: 'DENIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: 7,
    adversary_goal: 'Operator attaches a LoRA adapter (adapter.bin) to an emergency clinical triage model governed by strict clinical policy.',
    certified_state: 'No adapter allowed under clinical-triage policy (on_impacted = deny)',
    tampered_state: 'adapter.bin mounted in runtime directory (adapter SHA256: 9c8b...)',
    parameter_diff: 'Adapter added to clinical pipeline. Policy mandates immediate rejection on any claim impact.',
    detection_mechanism: 'CHECK 7 (Strict Policy Evaluator) observes impacted claims M1, M2, M3 and enforces on_impacted=deny rule.',
    business_impact: 'Zero-tolerance safety gate blocks unverified medical AI model execution immediately.',
    what_happened: 'Adapter changed. Clinical policy has on_impacted=deny; request denied immediately.'
  },
  {
    id: 'S9',
    name: 'Certificate revoked',
    category: 'Governance & Revocation',
    expected_verdict: 'DENIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: 6,
    adversary_goal: 'Model owner attempts to use cert-002 after the certifying auditor issued a cryptographic revocation due to post-audit non-compliance.',
    certified_state: 'Certificate cert-002 originally active in registry',
    tampered_state: 'Auditor committed signed revocation leaf to Merkle Transparency Log at index #5',
    parameter_diff: 'Certificate status: REVOKED in immutable log (Reason: "Safety non-compliance detected")',
    detection_mechanism: 'CHECK 6 (Transparency Log Query) checks the latest Merkle checkpoint. Discovers revocation record and rejects certificate.',
    business_impact: 'Instant revocation propagation: No relying party can accept inferences from a decommissioned certificate.',
    what_happened: 'Auditor revoked certificate. Check 6 caught revocation in transparency log.'
  },
  {
    id: 'S10',
    name: 'Certificate expired',
    category: 'Governance & Revocation',
    expected_verdict: 'NEEDS_REVIEW',
    actual_verdict: null,
    passed: null,
    failed_check_num: 7,
    adversary_goal: 'System continues serving credit scores using cert-003 past its contractual expiration date (June 1, 2026).',
    certified_state: 'cert-003 valid window: 2025-06-01 to 2026-06-01',
    tampered_state: 'Inference evaluated on 2026-10-21 (4+ months expired)',
    parameter_diff: 'System evaluation timestamp > expires_at timestamp.',
    detection_mechanism: 'CHECK 7 (Policy Validity Check) flags stale certification window even though underlying crypto keys remain valid.',
    business_impact: 'Flags decision as NEEDS_REVIEW, alerting compliance and blocking automated high-risk transactions.',
    what_happened: 'cert-003 expired at demo_now. Cryptography valid, but policy triggers review.'
  },
  {
    id: 'S11',
    name: 'Replay of an old receipt',
    category: 'Anti-Replay Attack',
    expected_verdict: 'DENIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: 3,
    adversary_goal: 'Adversary intercepts a previously approved $500,000 transaction receipt and re-submits it to execute duplicate wire transfer.',
    certified_state: 'Challenge nonce issued with 60-second TTL and single-use constraint (consumed = 0)',
    tampered_state: 'Identical receipt re-submitted with previously spent nonce (consumed = 1 in database ledger)',
    parameter_diff: 'Nonce nonce-7a89... was already marked used in database verifications ledger.',
    detection_mechanism: 'CHECK 3 (Anti-Replay Nonce Check) queries the challenge registry. Flags nonce as previously consumed & terminates verification.',
    business_impact: 'Prevents duplicate transaction execution and financial replay theft.',
    what_happened: 'Re-submitted previously verified receipt. Verifier flagged consumed nonce / replay.'
  },
  {
    id: 'S12',
    name: 'Relay attack (Man-in-the-Middle)',
    category: 'Key Isolation Attack',
    expected_verdict: 'DENIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: 1,
    adversary_goal: 'Attacker intercepts inference traffic, runs model on unauthorized cloud GPU, signs with an external key, and attempts to attach a foreign enclave quote.',
    certified_state: 'Receipt must be signed by the ephemeral key pair (receipt_pubkey) attested in the enclave quote.',
    tampered_state: 'Receipt was signed by external attacker keypair: foreign_privkey != quote.receipt_pubkey.',
    parameter_diff: 'Digital signature verification fails against public key published in the platform quote.',
    detection_mechanism: 'CHECK 1 (Receipt Signature Check) and CHECK 2 (Platform Quote Binding) fail Ed25519 verification mathematically.',
    business_impact: 'Defeats MITM relays, API spoofing, and key substitution attacks.',
    what_happened: 'Receipt signed by key not bound to enclave quote. Check 1 signature check failed.'
  },
  {
    id: 'S13',
    name: 'Unattested runtime (Bypass TEE)',
    category: 'Hardware Attestation Bypass',
    expected_verdict: 'UNVERIFIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: 2,
    adversary_goal: 'Cost-cutting operator attempts to run workloads on cheap un-isolated virtual machines without hardware TEE attestation.',
    certified_state: 'Verification requires hardware-signed attestation quote (simulated TEE / Intel SGX / AMD SEV).',
    tampered_state: 'Inference receipt submitted with quote: null (un-attested bare metal).',
    parameter_diff: 'Platform quote completely missing from verification payload.',
    detection_mechanism: 'CHECK 2 (Quote Check) detects missing hardware quote. Verifier downgrades verdict to UNVERIFIED.',
    business_impact: 'Strict regulatory policies reject UNVERIFIED outputs, preventing un-monitored AI from executing enterprise actions.',
    what_happened: 'Hardware quote omitted. Verifier marked verdict UNVERIFIED.'
  },
  {
    id: 'S14',
    name: 'Log tampering (Rogue DB Admin)',
    category: 'Ledger Tamper Resistance',
    expected_verdict: 'DENIED',
    actual_verdict: null,
    passed: null,
    failed_check_num: 5,
    adversary_goal: 'Rogue database administrator with SQL root privileges alters historical audit records in database tables to conceal past infractions.',
    certified_state: 'Signed Merkle Tree Checkpoint Root: 0x239007d5... (Signed by independent transparency log key)',
    tampered_state: 'Attacker executes direct SQL UPDATE on leaf #3, modifying audit payload.',
    parameter_diff: 'Calculated Merkle root from modified leaves (0x89fa...) does not match signed checkpoint root (0x2390...).',
    detection_mechanism: 'CHECK 5 (Merkle Inclusion Proof) fails. System runs /log/integrity, pinpoints exact corrupted leaf index (#3), and repairs from backup.',
    business_impact: 'Database administrators cannot rewrite history. Cryptographic immutability guarantees tamper evidence.',
    what_happened: 'Log leaf tampered. Merkle inclusion proof failed; integrity checker located bad index.'
  },
  {
    id: 'S15',
    name: 'ZK membership proof tampering',
    category: 'Zero-Knowledge Privacy',
    expected_verdict: 'First valid, second invalid',
    actual_verdict: null,
    passed: null,
    failed_check_num: 8,
    adversary_goal: 'Adversary tries to submit a forged Groth16 zk-SNARK proof or present a valid proof against an unauthorized/tampered public Merkle root.',
    certified_state: 'Legitimate Groth16 zk-SNARK proof over certified models tree on BN128 elliptic curve.',
    tampered_state: 'Public signal modified: root_signal changed to bogus hash ("1234567890...").',
    parameter_diff: 'Pairing equation e(A, B) != e(alpha, beta) * e(x, gamma). Circuit constraint evaluation fails.',
    detection_mechanism: 'CHECK 8 (Groth16 ZK Verifier) evaluates bilinear pairings on BN128 curve in under 2ms; mathematically rejects altered root.',
    business_impact: 'Guarantees privacy-preserving verification while maintaining zero-tolerance against forged mathematical claims.',
    what_happened: 'Groth16 membership proof verified; proof against altered root rejected.'
  }
];

export const Attacks: React.FC = () => {
  const [scenarios, setScenarios] = useState<ScenarioDetail[]>(INITIAL_SCENARIOS);
  const [selectedId, setSelectedId] = useState<string>('S3'); // Default to model swap
  const [runningAll, setRunningAll] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  const selectedScenario = scenarios.find((s) => s.id === selectedId) || scenarios[0];

  const handleRunAll = async () => {
    try {
      setRunningAll(true);
      const res = await api.runAllScenarios();
      const resultsMap = new Map<string, any>(res.scenarios.map((s: any) => [s.id, s]));

      setScenarios((prev) =>
        prev.map((item) => {
          const runRes = resultsMap.get(item.id);
          if (runRes) {
            return {
              ...item,
              actual_verdict: runRes.actual_verdict,
              passed: runRes.passed,
              what_happened: runRes.what_happened || item.what_happened,
              deciding_check: runRes.deciding_check
            };
          }
          return item;
        })
      );
    } catch (err: any) {
      alert("Failed to run all scenarios: " + err.message);
    } finally {
      setRunningAll(false);
    }
  };

  const handleRunSingle = async (scenarioId: string) => {
    try {
      setRunningId(scenarioId);
      const runRes = await api.runScenario(scenarioId);
      setScenarios((prev) =>
        prev.map((item) => {
          if (item.id === scenarioId) {
            return {
              ...item,
              actual_verdict: runRes.actual_verdict,
              passed: runRes.passed,
              what_happened: runRes.what_happened || item.what_happened,
              deciding_check: runRes.deciding_check
            };
          }
          return item;
        })
      );
    } catch (err: any) {
      alert(`Scenario ${scenarioId} failed: ` + err.message);
    } finally {
      setRunningId(null);
    }
  };

  const getVerdictBadge = (verdict: string | null) => {
    if (!verdict) return <span className="text-slate-400 font-mono text-xs">Not run</span>;
    switch (verdict) {
      case 'VERIFIED':
        return <span className="px-2.5 py-1 rounded text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">VERIFIED</span>;
      case 'NEEDS_REVIEW':
        return <span className="px-2.5 py-1 rounded text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">NEEDS_REVIEW</span>;
      case 'UNVERIFIED':
        return <span className="px-2.5 py-1 rounded text-xs font-black bg-slate-200 text-slate-800 border border-slate-300">UNVERIFIED</span>;
      case 'DENIED':
        return <span className="px-2.5 py-1 rounded text-xs font-black bg-rose-100 text-rose-800 border border-rose-300">DENIED</span>;
      default:
        return <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-purple-100 text-purple-800 border border-purple-300">{verdict}</span>;
    }
  };

  const categories = ['ALL', 'Baseline Integrity', 'Supply Chain Attack', 'Artifact Drift', 'Governance & Revocation', 'Anti-Replay Attack', 'Ledger Tamper Resistance'];

  const filteredScenarios = categoryFilter === 'ALL' 
    ? scenarios 
    : scenarios.filter(s => s.category.toLowerCase().includes(categoryFilter.toLowerCase()) || (categoryFilter === 'Artifact Drift' && s.category === 'Policy Enforcement'));

  const completedCount = scenarios.filter((s) => s.actual_verdict !== null).length;
  const passedCount = scenarios.filter((s) => s.passed === true).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg border border-slate-700">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-amber-400/20 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2 border border-amber-400/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Adversary Defense Suite</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Attack Scenarios & Stress Tests</span>
            <span className="text-amber-400 text-xl font-normal font-mono">(S1 – S15)</span>
          </h1>
          <p className="text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
            Select any attack from the dropdown to inspect the exact payload diff, which cryptographic check detected the tampering, and the enterprise remediation action.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <span className="text-xs font-mono font-bold px-3 py-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{passedCount} / {scenarios.length} Defended</span>
            </span>
          )}
          <button
            onClick={handleRunAll}
            disabled={runningAll}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl shadow-lg text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${runningAll ? 'animate-spin' : ''}`} />
            <span>{runningAll ? 'Running S1–S15...' : 'Run All 15 Scenarios'}</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE ATTACK INSPECTOR (DROPDOWN + DEEP DIVE) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border-2 border-slate-300 shadow-md p-6 space-y-6">
        
        {/* Dropdown Selector Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex-1 max-w-2xl">
            <label htmlFor="scenario-select" className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span>Select Attack / Tamper Scenario to Inspect:</span>
              <span className="text-[11px] text-amber-600 font-normal">(Click dropdown or select row in table below)</span>
            </label>
            <div className="relative">
              <select
                id="scenario-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-900 font-bold text-base py-3 pl-4 pr-10 rounded-xl border-2 border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer appearance-none shadow-sm"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id} className="text-slate-900 font-medium py-1">
                    {s.id}: {s.name} [{s.expected_verdict}] — {s.category}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-5 h-5 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Action on selected scenario */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-[11px] text-slate-500 font-semibold uppercase">Expected Verdict</div>
              <div className="mt-0.5">{getVerdictBadge(selectedScenario.expected_verdict)}</div>
            </div>
            <button
              onClick={() => handleRunSingle(selectedScenario.id)}
              disabled={runningAll || runningId === selectedScenario.id}
              className="px-5 py-3 bg-[#0F172A] hover:bg-blue-600 text-white font-bold rounded-xl shadow-md text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Play className={`w-4 h-4 fill-current ${runningId === selectedScenario.id ? 'animate-spin' : ''}`} />
              <span>{runningId === selectedScenario.id ? `Executing ${selectedScenario.id}...` : `Execute ${selectedScenario.id} Live`}</span>
            </button>
          </div>
        </div>

        {/* Selected Scenario Headline */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-slate-900 text-amber-400 font-mono font-black text-lg flex items-center justify-center shadow-inner">
              {selectedScenario.id}
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <span>{selectedScenario.name}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-700">
                  {selectedScenario.category}
                </span>
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-3xl leading-relaxed">
                <strong>Adversary Goal:</strong> {selectedScenario.adversary_goal}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Live Result:</span>
            {selectedScenario.actual_verdict ? (
              <div className="flex items-center gap-2">
                {getVerdictBadge(selectedScenario.actual_verdict)}
                {selectedScenario.passed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Defended
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    <XCircle className="w-3.5 h-3.5 text-rose-600" /> Failed
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded">Click "Execute Live"</span>
            )}
          </div>
        </div>

        {/* 3-Column Visual Inspector Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Card 1: What is Different (The Payload Diff) */}
          <div className="bg-rose-50/40 rounded-xl border-2 border-rose-200 p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-rose-200 pb-2 mb-3">
                <span className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-1.5">
                  <FileCode className="w-4 h-4 text-rose-600" />
                  <span>1. What Is Different (Tamper Payload)</span>
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="font-bold text-slate-700 block mb-0.5">Certified / Expected State:</span>
                  <div className="bg-white p-2.5 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 break-words leading-relaxed">
                    {selectedScenario.certified_state}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-rose-800 block mb-0.5">Tampered / Executed State:</span>
                  <div className="bg-rose-100/70 p-2.5 rounded-lg border border-rose-300 font-mono text-[11px] text-rose-950 font-semibold break-words leading-relaxed">
                    {selectedScenario.tampered_state}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 p-2.5 rounded-lg border border-rose-200 mt-2">
              <span className="text-[11px] font-bold text-slate-600 block uppercase">Root-Cause Diff:</span>
              <p className="text-xs text-rose-900 font-semibold mt-0.5">{selectedScenario.parameter_diff}</p>
            </div>
          </div>

          {/* Card 2: How It Is Detected (Cryptographic Check Trace) */}
          <div className="bg-blue-50/40 rounded-xl border-2 border-blue-200 p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-blue-200 pb-2 mb-3">
                <span className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-blue-600" />
                  <span>2. How VERITAS Detected It</span>
                </span>
                {selectedScenario.failed_check_num ? (
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-rose-600 text-white">
                    Check {selectedScenario.failed_check_num} Caught It
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded text-[11px] font-black bg-emerald-600 text-white">
                    All Checks Pass
                  </span>
                )}
              </div>

              {/* 8 Pipeline Checks Micro-Grid */}
              <div className="space-y-1.5 text-xs mb-3">
                <span className="font-bold text-slate-700 block text-[11px] uppercase">8-Point Verification Pipeline:</span>
                <div className="grid grid-cols-2 gap-1 text-[11px] font-mono">
                  {[
                    { n: 1, name: 'Receipt Sig' },
                    { n: 2, name: 'Quote Binding' },
                    { n: 3, name: 'Anti-Replay' },
                    { n: 4, name: 'Measurement' },
                    { n: 5, name: 'Merkle Log' },
                    { n: 6, name: 'Cert Revoke' },
                    { n: 7, name: 'Policy & Deps' },
                    { n: 8, name: 'ZK Proof' },
                  ].map((chk) => {
                    const isFailing = selectedScenario.failed_check_num === chk.n;
                    return (
                      <div
                        key={chk.n}
                        className={`px-2 py-1 rounded border flex items-center justify-between ${
                          isFailing
                            ? 'bg-rose-600 text-white font-bold border-rose-700 shadow-sm animate-pulse'
                            : selectedScenario.failed_check_num === null
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-white text-slate-600 border-slate-200'
                        }`}
                      >
                        <span>{chk.n}. {chk.name}</span>
                        <span>{isFailing ? 'FAIL' : 'OK'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white p-2.5 rounded-lg border border-blue-200 text-xs text-slate-700 leading-relaxed">
                <span className="font-bold text-blue-900 block mb-0.5">Verification Mechanism:</span>
                <p>{selectedScenario.detection_mechanism}</p>
              </div>
            </div>

            {selectedScenario.deciding_check && (
              <div className="bg-slate-100 p-2 rounded border border-slate-300 font-mono text-[11px] text-slate-800">
                <strong>Deciding check:</strong> {selectedScenario.deciding_check}
              </div>
            )}
          </div>

          {/* Card 3: Business Impact & Remediation */}
          <div className="bg-emerald-50/40 rounded-xl border-2 border-emerald-200 p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-emerald-200 pb-2 mb-3">
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>3. Enterprise Defense & Remediation</span>
                </span>
                <span className="text-xs font-bold text-slate-500">RegTech Impact</span>
              </div>

              <div className="space-y-3 text-xs leading-relaxed text-slate-700">
                <div className="bg-white p-3 rounded-lg border border-emerald-200 space-y-1.5">
                  <span className="font-bold text-emerald-900 block text-xs">Compliance Consequence:</span>
                  <p>{selectedScenario.business_impact}</p>
                </div>

                <div className="bg-emerald-100/60 p-3 rounded-lg border border-emerald-300">
                  <span className="font-bold text-emerald-950 block text-[11px] uppercase tracking-wider">
                    {selectedScenario.expected_verdict === 'NEEDS_REVIEW' 
                      ? 'Revalidation Savings' 
                      : selectedScenario.expected_verdict === 'DENIED' 
                      ? 'Security Defense' 
                      : 'Operational SLA'}
                  </span>
                  <p className="text-xs text-emerald-900 font-semibold mt-0.5">
                    {selectedScenario.expected_verdict === 'NEEDS_REVIEW'
                      ? 'Selective re-audit only runs affected test suites (50% to 75% savings in auditor time and GPU testing).'
                      : selectedScenario.expected_verdict === 'DENIED'
                      ? 'Hard transaction abort: Malicious inference never touches loan disbursement or medical record.'
                      : 'Sub-millisecond verification (<1.4ms) certified against SEC/EU AI Act transparency standards.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => handleRunSingle(selectedScenario.id)}
                disabled={runningAll || runningId === selectedScenario.id}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs shadow transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${runningId === selectedScenario.id ? 'animate-spin' : ''}`} />
                <span>Test Live In Enclave</span>
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 15 SCENARIOS COMPLETE TABLE (INTERACTIVE ROW SELECTION) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* Table Filter Tabs */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Complete Attack Evaluation Matrix (Click row to inspect)
            </h3>
            <p className="text-xs text-slate-500">15 security stress scenarios executed across the 8-stage verifier.</p>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'Baseline Integrity', 'Supply Chain Attack', 'Artifact Drift', 'Governance & Revocation'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  categoryFilter === cat
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-300'
                }`}
              >
                {cat === 'ALL' ? 'All (15)' : cat}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-bold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Scenario Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Expected Verdict</th>
                <th className="py-3 px-3">Actual Verdict</th>
                <th className="py-3 px-3 text-center">Defended</th>
                <th className="py-3 px-4">What Happened & Deciding Check</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredScenarios.map((s) => {
                const isSelected = s.id === selectedId;
                return (
                  <tr 
                    key={s.id} 
                    onClick={() => setSelectedId(s.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-50/80 font-medium border-l-4 border-l-blue-600' 
                        : 'hover:bg-slate-50/90'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.id}</td>
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span>{s.name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-600 text-white">Active</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 font-medium">{s.category}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{getVerdictBadge(s.expected_verdict)}</td>
                    <td className="py-3 px-3 whitespace-nowrap">{getVerdictBadge(s.actual_verdict)}</td>
                    <td className="py-3 px-3 text-center">
                      {s.passed === true ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-700">
                          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      ) : s.passed === false ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-100 text-rose-700">
                          <XCircle className="w-4 h-4 stroke-[2.5]" />
                        </span>
                      ) : (
                        <span className="text-slate-300">―</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-md font-sans">
                      <p className="leading-relaxed">{s.what_happened}</p>
                      {s.deciding_check && (
                        <p className="text-[11px] font-mono text-slate-500 font-semibold mt-0.5">
                          Deciding check: {s.deciding_check}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleRunSingle(s.id)}
                        disabled={runningAll || runningId === s.id}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-[#0E1726] hover:text-amber-400 text-slate-700 font-bold rounded text-xs transition-all active:scale-95 disabled:opacity-50"
                      >
                        {runningId === s.id ? 'Running...' : 'Run'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
