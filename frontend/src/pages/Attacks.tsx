import React, { useState } from 'react';
import { AlertTriangle, Play, CheckCircle2, XCircle, RefreshCw, Sparkles } from 'lucide-react';
import { api } from '../api';

export const Attacks: React.FC = () => {
  const [scenarios, setScenarios] = useState<any[]>([
    { id: 'S1', name: 'Honest run, credit-risk', expected_verdict: 'VERIFIED', actual_verdict: null, passed: null, what_happened: 'Model matches certified passport; valid enclave quote and claims.' },
    { id: 'S2', name: 'Honest run, med-triage', expected_verdict: 'VERIFIED', actual_verdict: null, passed: null, what_happened: 'Clinical model matches passport; valid quote and clinical safety claims.' },
    { id: 'S3', name: 'Model swap', expected_verdict: 'DENIED', actual_verdict: null, passed: null, what_happened: 'Operator claimed credit-risk but executed shadow-model. Check 4 measurement mismatch.' },
    { id: 'S4', name: 'Config changed after audit', expected_verdict: 'NEEDS_REVIEW', actual_verdict: null, passed: null, what_happened: 'Config mutated. C1 & C3 impacted. Selective plan reruns 2 of 4 suites (50% saved).' },
    { id: 'S5', name: 'Tokenizer changed', expected_verdict: 'NEEDS_REVIEW', actual_verdict: null, passed: null, what_happened: 'Tokenizer mutated. C2 & C4 impacted. Selective plan reruns 2 of 4 suites (50% saved).' },
    { id: 'S6', name: 'Prompt template changed', expected_verdict: 'NEEDS_REVIEW', actual_verdict: null, passed: null, what_happened: 'Prompt template mutated. Only C4 impacted. 1 of 4 suites rerun (75% saved).' },
    { id: 'S7', name: 'Weights changed (fine-tune)', expected_verdict: 'NEEDS_REVIEW', actual_verdict: null, passed: null, what_happened: 'Weights modified. All behavioral claims invalidated. Full re-audit required (0% saved).' },
    { id: 'S8', name: 'Adapter changed under strict policy', expected_verdict: 'DENIED', actual_verdict: null, passed: null, what_happened: 'Adapter changed. Clinical policy has on_impacted=deny; request denied immediately.' },
    { id: 'S9', name: 'Certificate revoked', expected_verdict: 'DENIED', actual_verdict: null, passed: null, what_happened: 'Auditor revoked certificate. Check 6 caught revocation in transparency log.' },
    { id: 'S10', name: 'Certificate expired', expected_verdict: 'NEEDS_REVIEW', actual_verdict: null, passed: null, what_happened: 'cert-003 expired at demo_now. Cryptography valid, but policy triggers review.' },
    { id: 'S11', name: 'Replay of an old receipt', expected_verdict: 'DENIED', actual_verdict: null, passed: null, what_happened: 'Re-submitted previously verified receipt. Verifier flagged consumed nonce / replay.' },
    { id: 'S12', name: 'Relay attack', expected_verdict: 'DENIED', actual_verdict: null, passed: null, what_happened: 'Receipt signed by key not bound to enclave quote. Check 1 signature check failed.' },
    { id: 'S13', name: 'Unattested runtime', expected_verdict: 'UNVERIFIED', actual_verdict: null, passed: null, what_happened: 'Hardware quote omitted. Verifier marked verdict UNVERIFIED.' },
    { id: 'S14', name: 'Log tampering', expected_verdict: 'DENIED', actual_verdict: null, passed: null, what_happened: 'Log leaf tampered. Merkle inclusion proof failed; integrity checker located bad index.' },
    { id: 'S15', name: 'ZK membership', expected_verdict: 'First valid, second invalid', actual_verdict: null, passed: null, what_happened: 'Groth16 membership proof verified; proof against altered root rejected.' },
  ]);

  const [runningAll, setRunningAll] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);

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
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">VERIFIED</span>;
      case 'NEEDS_REVIEW':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">NEEDS_REVIEW</span>;
      case 'UNVERIFIED':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-slate-200 text-slate-800 border border-slate-300">UNVERIFIED</span>;
      case 'DENIED':
        return <span className="px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">DENIED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-xs font-mono bg-purple-100 text-purple-800">{verdict}</span>;
    }
  };

  const completedCount = scenarios.filter((s) => s.actual_verdict !== null).length;
  const passedCount = scenarios.filter((s) => s.passed === true).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span>Attack Scenarios & Stress Tests (S1 – S15)</span>
          </h1>
          <p className="text-sm text-slate-500">
            Interactive suite demonstrating security against model swaps, drift attacks, unauthorized adapters, replay attacks, and log tampering.
          </p>
        </div>

        {/* Run All Button */}
        <div className="flex items-center gap-3">
          {completedCount > 0 && (
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
              {passedCount} / {scenarios.length} Passed
            </span>
          )}
          <button
            onClick={handleRunAll}
            disabled={runningAll}
            className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg shadow-md text-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className={`w-4 h-4 ${runningAll ? 'animate-spin' : ''}`} />
            <span>{runningAll ? 'Executing S1–S15...' : 'Run All Scenarios'}</span>
          </button>
        </div>
      </div>

      {/* Scenarios Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm divide-y divide-slate-200">
            <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Scenario</th>
                <th className="py-3 px-3">Expected Verdict</th>
                <th className="py-3 px-3">Actual Verdict</th>
                <th className="py-3 px-3 text-center">Match</th>
                <th className="py-3 px-4">What Happened</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {scenarios.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{s.id}</td>
                  <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">{s.name}</td>
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
                      <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                        Deciding check: {s.deciding_check}
                      </p>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => handleRunSingle(s.id)}
                      disabled={runningAll || runningId === s.id}
                      className="px-3 py-1 bg-slate-100 hover:bg-[#0E1726] hover:text-amber-400 text-slate-700 font-bold rounded text-xs transition-all active:scale-95 disabled:opacity-50"
                    >
                      {runningId === s.id ? 'Running...' : 'Run'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
