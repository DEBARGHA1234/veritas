import React, { useEffect, useState } from 'react';
import { BarChart3, Zap, HardDrive, Database, ShieldCheck, Play, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { api } from '../api';

export const Metrics: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [benchmarking, setBenchmarking] = useState(false);
  const [benchmarkProgress, setBenchmarkProgress] = useState(0);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const data = await api.getMetrics();
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  // Run live 200-run verification benchmark
  const runLiveBenchmark = async () => {
    try {
      setBenchmarking(true);
      setBenchmarkProgress(10);

      // Execute live benchmark suite across 200 operational evaluations
      for (let p = 20; p <= 90; p += 20) {
        await new Promise((r) => setTimeout(r, 80));
        setBenchmarkProgress(p);
      }

      await api.runBenchmark(200);
      setBenchmarkProgress(100);

      await fetchMetrics();
    } catch (err: any) {
      alert("Benchmark failed: " + err.message);
    } finally {
      setBenchmarking(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
            <span>Cryptographic & Performance Metrics</span>
          </h1>
          <p className="text-sm text-slate-500">
            Real performance measurements computed live from database verifications and cryptographic proofs.
          </p>
        </div>

        {/* Benchmark Button */}
        <button
          onClick={runLiveBenchmark}
          disabled={benchmarking}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
        >
          <Zap className={`w-4 h-4 ${benchmarking ? 'animate-bounce text-amber-300' : ''}`} />
          <span>{benchmarking ? `Benchmarking (${benchmarkProgress}%)...` : 'Run 200-Run Latency Benchmark'}</span>
        </button>
      </div>

      {/* Latency & Size Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Verify Latency (p50)</span>
            <Zap className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {loading ? '...' : `${metrics?.verify_latency_p50_ms ?? 0} ms`}
          </p>
          <p className="text-xs text-slate-500 mt-1">Median 8-stage verification</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Verify Latency (p95)</span>
            <Zap className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {loading ? '...' : `${metrics?.verify_latency_p95_ms ?? 0} ms`}
          </p>
          <p className="text-xs text-slate-500 mt-1">95th percentile latency</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Receipt Size</span>
            <HardDrive className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {loading ? '...' : `${metrics?.receipt_size_bytes ?? 0} B`}
          </p>
          <p className="text-xs text-slate-500 mt-1">Compact verifiable token</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Merkle Proof Size</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <p className="text-3xl font-black text-slate-900 mt-2 font-mono">
            {loading ? '...' : `${metrics?.inclusion_proof_size_bytes ?? 0} B`}
          </p>
          <p className="text-xs text-slate-500 mt-1">Log tree inclusion proof</p>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Re-validation Savings Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Selective Re-Validation vs Full Re-Audit</span>
          </h2>
          <p className="text-xs text-slate-500">
            Real test suite savings calculated dynamically by the dependency engine across artifact changes:
          </p>

          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-left text-sm divide-y divide-slate-200 font-mono text-xs">
              <thead className="bg-slate-50 text-slate-700 font-semibold uppercase tracking-wider text-[11px] font-sans">
                <tr>
                  <th className="py-2.5 px-3">Modified Artifact</th>
                  <th className="py-2.5 px-3 text-center">Suites Rerun</th>
                  <th className="py-2.5 px-3 text-center">Suites Total</th>
                  <th className="py-2.5 px-3 text-right">Saving (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.audit_savings_table?.map((row: any) => (
                  <tr key={row.change_type} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-sans font-bold text-slate-800 capitalize">
                      {row.change_type.replace('_', ' ')}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{row.suites_rerun}</td>
                    <td className="py-2.5 px-3 text-center text-slate-600">{row.suites_total}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      <span className={`px-2 py-0.5 rounded ${
                        row.pct_saved > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}>
                        {row.pct_saved}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 font-sans italic">
            *Honesty rule: modifying weights invalidates all behavioral claims and forces a full re-audit (0% saved).
          </p>
        </div>

        {/* Verdict Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Verdict Distribution ({metrics?.total_verifications_count ?? 0} Total Evaluated)
          </h2>
          
          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>VERIFIED</span>
                </span>
                <span className="font-mono text-slate-700">{metrics?.verdict_distribution?.VERIFIED ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${metrics?.total_verifications_count ? ((metrics.verdict_distribution.VERIFIED / metrics.total_verifications_count) * 100) : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-amber-700">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>NEEDS_REVIEW</span>
                </span>
                <span className="font-mono text-slate-700">{metrics?.verdict_distribution?.NEEDS_REVIEW ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all"
                  style={{
                    width: `${metrics?.total_verifications_count ? ((metrics.verdict_distribution.NEEDS_REVIEW / metrics.total_verifications_count) * 100) : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="flex items-center gap-1.5 text-rose-700">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>DENIED</span>
                </span>
                <span className="font-mono text-slate-700">{metrics?.verdict_distribution?.DENIED ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{
                    width: `${metrics?.total_verifications_count ? ((metrics.verdict_distribution.DENIED / metrics.total_verifications_count) * 100) : 0}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span className="text-slate-500">UNVERIFIED</span>
                <span className="font-mono text-slate-700">{metrics?.verdict_distribution?.UNVERIFIED ?? 0}</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div
                  className="bg-slate-400 h-full rounded-full transition-all"
                  style={{
                    width: `${metrics?.total_verifications_count ? ((metrics.verdict_distribution.UNVERIFIED / metrics.total_verifications_count) * 100) : 0}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span className="font-semibold text-slate-700">Zero-Knowledge Module: </span>
            <span>{metrics?.zk_available ? 'Available (Groth16 BN254 compiled)' : 'ZK proof unavailable in this environment (Honest Fallback)'}</span>
          </div>
        </div>

      </div>

    </div>
  );
};
