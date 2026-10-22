import React, { useEffect, useState } from 'react';
import { 
  FileCheck2, 
  FileText, 
  Cpu, 
  Receipt, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  HelpCircle,
  Database
} from 'lucide-react';
import { api } from '../api';

interface OverviewProps {
  onNavigate: (tab: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ onNavigate }) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error("Failed to load metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const steps = [
    {
      num: '1',
      title: 'Audit',
      desc: 'Independent auditor tests safety & behavioral claims. Enforces weights soundness rule.',
      icon: FileText,
      target: 'audits',
      color: 'border-blue-500 text-blue-600 bg-blue-50'
    },
    {
      num: '2',
      title: 'Passport',
      desc: 'Model artifacts hashed. Canonical digest computed, signed by operator, logged to Merkle tree.',
      icon: FileCheck2,
      target: 'passports',
      color: 'border-indigo-500 text-indigo-600 bg-indigo-50'
    },
    {
      num: '3',
      title: 'Attest',
      desc: 'Simulated TEE measures files, generates ephemeral receipt keypair, and produces signed Quote.',
      icon: Cpu,
      target: 'runtime',
      color: 'border-purple-500 text-purple-600 bg-purple-50'
    },
    {
      num: '4',
      title: 'Receipt',
      desc: 'Model runs request. Enclave signs nonce-bound Receipt containing output hash and quote reference.',
      icon: Receipt,
      target: 'runtime',
      color: 'border-amber-500 text-amber-600 bg-amber-50'
    },
    {
      num: '5',
      title: 'Verify',
      desc: 'Verifier executes 8 ordered cryptographic & policy checks, emitting a 5-field Evidence Vector.',
      icon: ShieldCheck,
      target: 'verify',
      color: 'border-emerald-500 text-emerald-600 bg-emerald-50'
    }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#0E1726] to-[#1E293B] rounded-xl p-8 text-white shadow-lg border border-slate-700/60">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-xs font-semibold mb-4">
            <span>Core Guarantee</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
            Prove the model that served a request is the model that was audited.
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed mb-6">
            VERITAS bridges the gap between static model audits and production inference through cryptographic receipts, 
            hardware attestation quotes, and transparency log inclusion proofs.
          </p>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => onNavigate('attacks')}
              className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              <span>Explore Attacks (S1–S15)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('verify')}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg border border-slate-600 transition-all flex items-center gap-2"
            >
              <span>Run Verification Pipeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Live State Counts */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
          <span>Live Platform State</span>
          <span className="text-xs font-normal text-slate-500">(computed from database)</span>
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Passports</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : metrics?.passports_count ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Signed manifests</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificates</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : metrics?.certificates_count ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Issued audits</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Log Size</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{loading ? '...' : metrics?.log_tree_size ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Merkle leaves</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">Verified</p>
            </div>
            <p className="text-2xl font-black text-emerald-600 mt-1">{loading ? '...' : metrics?.verdict_distribution?.VERIFIED ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Cryptographically sound</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 text-amber-600">
              <AlertCircle className="w-4 h-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">Needs Review</p>
            </div>
            <p className="text-2xl font-black text-amber-600 mt-1">{loading ? '...' : metrics?.verdict_distribution?.NEEDS_REVIEW ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Impacted or expired</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 text-rose-600">
              <XCircle className="w-4 h-4" />
              <p className="text-xs font-semibold uppercase tracking-wider">Denied</p>
            </div>
            <p className="text-2xl font-black text-rose-600 mt-1">{loading ? '...' : metrics?.verdict_distribution?.DENIED ?? 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Attacks & mismatches</p>
          </div>

        </div>
      </div>

      {/* 5-Step Pipeline Flow */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Five-Step Verification Pipeline</h2>
            <p className="text-sm text-slate-500">The end-to-end lifecycle from laboratory safety certification to verifiable deployment</p>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 bg-slate-100 border border-slate-200 rounded text-slate-600">
            Interactive Architecture
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div
                key={step.num}
                onClick={() => onNavigate(step.target)}
                className="group p-5 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between bg-slate-50/50 hover:bg-white"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded bg-slate-200 group-hover:bg-amber-400 group-hover:text-slate-950 text-slate-700 transition-colors">
                      STEP {step.num}
                    </span>
                    <div className={`p-2 rounded-lg border ${step.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-900 group-hover:text-amber-600 transition-colors text-base mb-1">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-semibold text-slate-500 group-hover:text-amber-600">
                  <span>Open {step.title}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
};
