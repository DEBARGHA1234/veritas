import React, { useEffect, useState } from 'react';
import { Cpu, Play, Key, ShieldCheck, ArrowRight, CheckCircle2, FileText, Lock } from 'lucide-react';
import { api } from '../api';

interface RuntimeProps {
  onNavigateToVerify: (receipt: any, quote: any) => void;
}

export const Runtime: React.FC<RuntimeProps> = ({ onNavigateToVerify }) => {
  const [selectedModel, setSelectedModel] = useState('credit-risk');
  const [runtime, setRuntime] = useState<any>(null);
  const [starting, setStarting] = useState(false);

  // Job execution state
  const [inputText, setInputText] = useState('Loan applicant: 32yo, income $92,000, debt-to-income 0.22, FICO 750');
  const [passports, setPassports] = useState<any[]>([]);
  const [certs, setCerts] = useState<any[]>([]);
  const [selectedPassportDigest, setSelectedPassportDigest] = useState('');
  const [selectedCertId, setSelectedCertId] = useState('cert-001');
  const [runningJob, setRunningJob] = useState(false);
  const [jobResult, setJobResult] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [pRes, cRes] = await Promise.all([api.getModels(), api.getCertificates()]);
        setPassports(pRes.passports || []);
        if (pRes.passports?.length > 0) {
          setSelectedPassportDigest(pRes.passports[0].passport_digest);
        }
        setCerts(cRes.certificates || []);
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  const handleStartRuntime = async () => {
    try {
      setStarting(true);
      const res = await api.startRuntime(selectedModel);
      setRuntime(res);
      setJobResult(null);
    } catch (err: any) {
      alert("Failed to start runtime: " + err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleRunJob = async () => {
    if (!runtime) {
      alert("Please start the runtime first.");
      return;
    }
    try {
      setRunningJob(true);
      const challenge = await api.getChallengeNonce();
      const res = await api.runJob({
        runtime_id: runtime.runtime_id,
        input: inputText,
        passport_digest: selectedPassportDigest,
        cert_id: selectedCertId,
        nonce: challenge.nonce
      });
      setJobResult(res);
    } catch (err: any) {
      alert("Job execution failed: " + err.message);
    } finally {
      setRunningJob(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Cpu className="w-6 h-6 text-purple-600" />
          <span>Simulated TEE Runtime & Job Execution</span>
        </h1>
        <p className="text-sm text-slate-500">
          Enclave measures model files, binds ephemeral receipt keys with a platform quote, executes inference, and issues signed receipts.
        </p>
      </div>

      {/* Step 1: Start Runtime */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">1. Initialize Enclave & Attestation Quote</h2>
            <p className="text-xs text-slate-500">
              Generates an ephemeral Ed25519 keypair inside the enclave and signs a hardware platform quote.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="text-sm font-semibold bg-slate-50 border border-slate-300 rounded-lg px-3 py-2"
            >
              <option value="credit-risk">credit-risk</option>
              <option value="med-triage-llm">med-triage-llm</option>
              <option value="fraud-detector">fraud-detector</option>
              <option value="shadow-model">shadow-model (unauthorized)</option>
            </select>
            <button
              onClick={handleStartRuntime}
              disabled={starting}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              <Cpu className="w-4 h-4" />
              <span>{starting ? 'Measuring...' : 'Start Runtime'}</span>
            </button>
          </div>
        </div>

        {/* Quote Display */}
        {runtime && (
          <div className="mt-4 bg-slate-900 rounded-xl p-5 text-white font-mono text-xs space-y-3 border border-slate-800">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                <Lock className="w-4 h-4" />
                <span>Simulated TEE Quote ({runtime.quote.quote_id})</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px]">
                mode: {runtime.quote.attestation_mode}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
              <div>
                <span className="text-slate-400">Enclave Measurement:</span>
                <p className="text-slate-200 break-all select-all">{runtime.quote.measurement}</p>
              </div>
              <div>
                <span className="text-slate-400">Ephemeral Receipt Public Key:</span>
                <p className="text-slate-200 break-all select-all">{runtime.quote.receipt_pubkey}</p>
              </div>
              <div>
                <span className="text-slate-400">Platform Key ID:</span>
                <p className="text-slate-200">{runtime.quote.platform_key_id}</p>
              </div>
              <div>
                <span className="text-slate-400">Platform Signature:</span>
                <p className="text-slate-400 truncate">{runtime.quote.platform_signature}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Execute Job */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">2. Run Inference Job & Issue Receipt</h2>
          <p className="text-xs text-slate-500">
            Executes request inside the active enclave and produces a receipt signed by the enclave's ephemeral key.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Input Prompt / Payload</label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={3}
              className="w-full text-sm font-mono p-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Claimed Passport</label>
              <select
                value={selectedPassportDigest}
                onChange={(e) => setSelectedPassportDigest(e.target.value)}
                className="w-full text-xs font-mono p-2.5 border border-slate-300 rounded-lg"
              >
                {passports.map((p) => (
                  <option key={p.passport_digest} value={p.passport_digest}>
                    {p.model_id} (digest: {p.passport_digest.slice(0, 16)}...)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Claimed Audit Certificate</label>
              <select
                value={selectedCertId}
                onChange={(e) => setSelectedCertId(e.target.value)}
                className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-lg"
              >
                {certs.map((c) => (
                  <option key={c.cert_id} value={c.cert_id}>
                    {c.cert_id} ({c.model_id} by {c.auditor_id})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunJob}
          disabled={!runtime || runningJob}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          <Play className="w-4 h-4 fill-white" />
          <span>{runningJob ? 'Processing...' : 'Run Job & Generate Receipt'}</span>
        </button>

        {/* Receipt Display */}
        {jobResult && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Job Completed: {jobResult.job_id}</span>
                </div>
                <p className="text-xs text-emerald-800 font-mono mt-1">
                  Output Hash: {jobResult.output_hash}
                </p>
              </div>

              <button
                onClick={() => onNavigateToVerify(jobResult.receipt, runtime.quote)}
                className="px-4 py-2 bg-[#0E1726] hover:bg-slate-800 text-amber-400 font-bold rounded-lg text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
              >
                <span>Verify This Receipt</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-900 rounded-xl p-5 text-white font-mono text-xs space-y-3 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-amber-400 font-bold flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  <span>Signed Execution Receipt (Never contains raw prompts)</span>
                </span>
                <span className="text-slate-400 text-[11px]">{jobResult.receipt.issued_at}</span>
              </div>
              <pre className="text-slate-200 overflow-x-auto p-2 bg-slate-950 rounded border border-slate-800">
                {JSON.stringify(jobResult.receipt, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
