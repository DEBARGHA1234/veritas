import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  ShieldCheck, 
  AlertCircle, 
  XCircle, 
  HelpCircle, 
  RefreshCw, 
  FileCheck2, 
  Clock, 
  ShieldAlert, 
  Layers, 
  Info 
} from 'lucide-react';
import { api } from '../api';

interface VerifyProps {
  initialReceipt?: any;
  initialQuote?: any;
}

export const Verify: React.FC<VerifyProps> = ({ initialReceipt, initialQuote }) => {
  const [policies, setPolicies] = useState<any[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState('regulated-lending');
  const [receiptJson, setReceiptJson] = useState('');
  const [quoteJson, setQuoteJson] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Load policies and initial receipt/quote
  useEffect(() => {
    async function init() {
      try {
        const pRes = await api.getPolicies();
        setPolicies(pRes.policies || []);
      } catch (err) {
        console.error(err);
      }

      if (initialReceipt) {
        setReceiptJson(JSON.stringify(initialReceipt, null, 2));
      }
      if (initialQuote) {
        setQuoteJson(JSON.stringify(initialQuote, null, 2));
      }
    }
    init();
  }, [initialReceipt, initialQuote]);

  // Load a quick sample honest receipt if empty
  const loadSample = async (modelType: string) => {
    try {
      const nonceRes = await api.getChallengeNonce();
      const rtRes = await api.startRuntime(modelType, nonceRes.nonce);
      const pRes = await api.getModels();
      const passport = pRes.passports.find((p: any) => p.model_id === modelType) || pRes.passports[0];
      const certId = modelType === 'credit-risk' ? 'cert-001' : modelType === 'med-triage-llm' ? 'cert-002' : 'cert-003';

      const jobRes = await api.runJob({
        runtime_id: rtRes.runtime_id,
        input: `Sample verification input for ${modelType}`,
        passport_digest: passport.passport_digest,
        cert_id: certId,
        nonce: nonceRes.nonce
      });

      setReceiptJson(JSON.stringify(jobRes.receipt, null, 2));
      setQuoteJson(JSON.stringify(rtRes.quote, null, 2));
      if (modelType === 'credit-risk') setSelectedPolicy('regulated-lending');
      if (modelType === 'med-triage-llm') setSelectedPolicy('clinical-triage');
      if (modelType === 'fraud-detector') setSelectedPolicy('standard');
      setResult(null);
    } catch (err: any) {
      alert("Failed to load sample: " + err.message);
    }
  };

  const handleVerify = async () => {
    try {
      setVerifying(true);
      const receipt = receiptJson ? JSON.parse(receiptJson) : null;
      const quote = quoteJson ? JSON.parse(quoteJson) : null;

      const res = await api.verify(receipt, quote, selectedPolicy);
      setResult(res);
    } catch (err: any) {
      alert("Verification error: " + err.message);
    } finally {
      setVerifying(false);
    }
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'VERIFIED':
        return {
          bg: 'bg-emerald-500',
          border: 'border-emerald-600',
          text: 'text-white',
          label: 'VERIFIED',
          icon: CheckCircle,
          desc: 'Cryptographically proven. Model measurement, attestation quote, and claims fully valid.'
        };
      case 'NEEDS_REVIEW':
        return {
          bg: 'bg-amber-500',
          border: 'border-amber-600',
          text: 'text-slate-950',
          label: 'NEEDS_REVIEW',
          icon: AlertCircle,
          desc: 'Cryptographic identity valid, but policy claims are impacted or certificate is expired.'
        };
      case 'UNVERIFIED':
        return {
          bg: 'bg-slate-500',
          border: 'border-slate-600',
          text: 'text-white',
          label: 'UNVERIFIED',
          icon: HelpCircle,
          desc: 'Essential evidence missing (missing hardware quote, unlogged passport or cert).'
        };
      case 'DENIED':
      default:
        return {
          bg: 'bg-rose-600',
          border: 'border-rose-700',
          text: 'text-white',
          label: 'DENIED',
          icon: XCircle,
          desc: 'Cryptographic mismatch, signature failure, revoked certificate, or strict policy denial.'
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'PARTIAL':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'FAIL':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'N_A':
      case 'NOT_EVALUATED':
      default:
        return 'bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            <span>Cryptographic & Policy Verification</span>
          </h1>
          <p className="text-sm text-slate-500">
            Executes the 8-stage verification pipeline with strict verdict precedence (DENIED &gt; UNVERIFIED &gt; NEEDS_REVIEW &gt; VERIFIED).
          </p>
        </div>

        {/* Quick Sample Fill */}
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-slate-500">Quick Samples:</span>
          <button
            onClick={() => loadSample('credit-risk')}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 font-medium"
          >
            Credit-Risk
          </button>
          <button
            onClick={() => loadSample('med-triage-llm')}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 font-medium"
          >
            Med-Triage
          </button>
          <button
            onClick={() => loadSample('fraud-detector')}
            className="px-2.5 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 font-medium"
          >
            Fraud-Detector
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Configuration Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Evaluation Policy</label>
              <select
                value={selectedPolicy}
                onChange={(e) => setSelectedPolicy(e.target.value)}
                className="w-full text-sm font-semibold p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-400"
              >
                {policies.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (on_impacted: {p.on_impacted})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {policies.find((p) => p.id === selectedPolicy)?.description}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Receipt JSON</label>
              <textarea
                value={receiptJson}
                onChange={(e) => setReceiptJson(e.target.value)}
                rows={7}
                placeholder="Paste Execution Receipt JSON..."
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Platform Quote JSON</label>
              <textarea
                value={quoteJson}
                onChange={(e) => setQuoteJson(e.target.value)}
                rows={6}
                placeholder="Paste Platform Quote JSON (or leave empty to test UNVERIFIED)..."
                className="w-full text-xs font-mono p-3 border border-slate-300 rounded-lg bg-slate-50 focus:bg-white"
              />
            </div>

            <button
              onClick={handleVerify}
              disabled={verifying}
              className="w-full py-3 bg-[#0E1726] hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-sm shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className={`w-5 h-5 ${verifying ? 'animate-spin' : ''}`} />
              <span>{verifying ? 'Evaluating 8 Checks...' : 'Verify Receipt'}</span>
            </button>
          </div>
        </div>

        {/* Verification Results Column */}
        <div className="lg:col-span-7 space-y-6">
          {result ? (
            <div className="space-y-6">
              
              {/* Verdict Header Badge */}
              {(() => {
                const style = getVerdictStyle(result.verdict);
                const Icon = style.icon;
                return (
                  <div className={`p-6 rounded-xl border ${style.border} ${style.bg} ${style.text} shadow-lg space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="w-8 h-8 stroke-[2.5]" />
                        <h2 className="text-3xl font-black tracking-tight">{style.label}</h2>
                      </div>
                      <div className="text-right text-xs opacity-90 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{result.latency_ms} ms</span>
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-medium leading-relaxed opacity-95">
                      {style.desc}
                    </p>
                    {result.deciding_check && (
                      <p className="text-xs font-mono pt-2 border-t border-white/20">
                        Deciding check: <span className="font-bold underline">{result.deciding_check}</span>
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* 5-Field Evidence Vector */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-slate-700" />
                  <span>Five-Dimensional Evidence Vector (Honesty Rule: Never a Single Score)</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {Object.entries(result.evidence_vector).map(([field, status]: [string, any]) => (
                    <div key={field} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                      <p className="text-[11px] font-semibold text-slate-500 capitalize">
                        {field.replace('_', ' ')}
                      </p>
                      <span className={`inline-block mt-1 text-xs font-black px-2 py-0.5 rounded border ${getStatusBadge(status)}`}>
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Revalidation Plan (if present) */}
              {result.revalidation_plan && (
                <div className="bg-amber-50 rounded-xl border border-amber-200 p-5 text-amber-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      <span>Dynamic Revalidation Plan</span>
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-200 text-amber-900 border border-amber-300">
                      {result.revalidation_plan.pct_saved}% Saved vs Full Re-audit
                    </span>
                  </div>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Selective re-validation calculated by dependency engine:
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-white/70 p-3 rounded-lg border border-amber-200">
                    <div>
                      <span className="text-slate-500">Impacted Claims:</span>
                      <p className="font-bold text-amber-900">{result.revalidation_plan.impacted_claims.join(', ') || 'None'}</p>
                    </div>
                    <div>
                      <span className="text-slate-500">Test Suites to Rerun:</span>
                      <p className="font-bold text-amber-900">{result.revalidation_plan.suites_rerun_count} of {result.revalidation_plan.suites_total} suites</p>
                    </div>
                  </div>
                </div>
              )}

              {/* 8-Stage Checklist */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                  8-Stage Verification Checklist
                </h3>
                <div className="space-y-2">
                  {result.checks.map((c: any) => (
                    <div
                      key={c.check_number}
                      className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">Check {c.check_number}:</span>
                          <span className="font-medium text-slate-900 capitalize">{c.name.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-slate-500 leading-relaxed font-sans">{c.reason}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-black border uppercase tracking-wider flex-shrink-0 ${getStatusBadge(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-16 text-center text-slate-400 space-y-2">
              <ShieldCheck className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-medium text-slate-600">No verification executed yet.</p>
              <p className="text-xs">Paste or load sample receipts and click "Verify Receipt" to run the 8-stage verifier.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
