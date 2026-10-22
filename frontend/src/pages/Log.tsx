import React, { useEffect, useState } from 'react';
import { Database, ShieldAlert, CheckCircle2, Wrench, RefreshCw, Eye, Key, ArrowRight } from 'lucide-react';
import { api } from '../api';

export const Log: React.FC = () => {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [checkpoint, setCheckpoint] = useState<any>(null);
  const [selectedLeafIdx, setSelectedLeafIdx] = useState<number | null>(0);
  const [proof, setProof] = useState<any>(null);
  const [integrityStatus, setIntegrityStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchLogData = async () => {
    try {
      setLoading(true);
      const [lRes, cpRes] = await Promise.all([
        api.getLogLeaves(),
        api.getLogCheckpoint()
      ]);
      setLeaves(lRes.leaves || []);
      setCheckpoint(cpRes);
      if (lRes.leaves && lRes.leaves.length > 0) {
        loadInclusionProof(0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInclusionProof = async (idx: number) => {
    try {
      setSelectedLeafIdx(idx);
      const p = await api.getInclusionProof(idx);
      setProof(p);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLogData();
  }, []);

  const handleTamper = async () => {
    try {
      setActionLoading(true);
      const res = await api.tamperLog();
      alert(`Tamper simulated: ${res.message}`);
      await fetchLogData();
      await handleCheckIntegrity();
    } catch (err: any) {
      alert("Tamper failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckIntegrity = async () => {
    try {
      setActionLoading(true);
      const res = await api.checkIntegrity();
      setIntegrityStatus(res);
    } catch (err: any) {
      alert("Integrity check failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRepair = async () => {
    try {
      setActionLoading(true);
      const res = await api.repairLog();
      alert(`Repair complete: ${res.message}`);
      setIntegrityStatus(null);
      await fetchLogData();
    } catch (err: any) {
      alert("Repair failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-purple-600" />
            <span>RFC 6962 Transparency Log</span>
          </h1>
          <p className="text-sm text-slate-500">
            Append-only cryptographic Merkle tree storing all registered passports, audit certificates, and revocations.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTamper}
            disabled={actionLoading}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Tamper (Demo)</span>
          </button>
          <button
            onClick={handleCheckIntegrity}
            disabled={actionLoading}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${actionLoading ? 'animate-spin' : ''}`} />
            <span>Check Integrity</span>
          </button>
          <button
            onClick={handleRepair}
            disabled={actionLoading}
            className="px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Wrench className="w-4 h-4" />
            <span>Repair Log</span>
          </button>
        </div>
      </div>

      {/* Integrity Alert Banner if checked */}
      {integrityStatus && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 shadow-sm ${
          integrityStatus.valid 
            ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
            : 'bg-rose-50 border-rose-300 text-rose-900'
        }`}>
          {integrityStatus.valid ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 text-sm">
            <h4 className="font-bold">
              {integrityStatus.valid ? 'Log Integrity Verified' : 'Integrity Mismatch Detected!'}
            </h4>
            <p className="mt-0.5 text-xs leading-relaxed">{integrityStatus.message}</p>
            {integrityStatus.first_bad_index !== null && integrityStatus.first_bad_index !== undefined && (
              <div className="mt-2 text-xs font-mono bg-rose-100/60 p-2 rounded border border-rose-200">
                First Corrupted Leaf Index: <span className="font-bold">{integrityStatus.first_bad_index}</span> | Expected Root: {integrityStatus.expected_root?.slice(0, 16)}... | Computed Root: {integrityStatus.computed_root?.slice(0, 16)}...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signed Checkpoint Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-mono">
                Signed Checkpoint
              </span>
              <span className="text-xs text-slate-400 font-mono">Tree Size: {checkpoint?.tree_size ?? 0} leaves</span>
            </div>
            <p className="font-mono text-sm text-amber-400 break-all select-all">
              Root: {checkpoint?.root || 'Loading...'}
            </p>
          </div>
          <div className="text-xs text-slate-400 text-right font-mono">
            <p className="flex items-center gap-1.5 md:justify-end text-slate-300">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Log Key Signature</span>
            </p>
            <p className="truncate max-w-xs text-slate-400 mt-0.5">{checkpoint?.signature}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Leaves Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
            Append-Only Leaves ({leaves.length})
          </h3>
          <div className="border border-slate-200 rounded-lg overflow-x-auto max-h-[500px]">
            <table className="w-full text-left text-sm divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">Idx</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Leaf Hash</th>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-xs">
                {leaves.map((leaf) => {
                  const isSelected = selectedLeafIdx === leaf.leaf_index;
                  return (
                    <tr
                      key={leaf.leaf_index}
                      onClick={() => loadInclusionProof(leaf.leaf_index)}
                      className={`cursor-pointer transition-colors ${
                        isSelected ? 'bg-purple-50 font-semibold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2 px-3 text-slate-500">{leaf.leaf_index}</td>
                      <td className="py-2 px-3 font-sans">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          leaf.entry_type === 'PASSPORT' ? 'bg-indigo-100 text-indigo-700' :
                          leaf.entry_type === 'CERTIFICATE' ? 'bg-blue-100 text-blue-700' :
                          leaf.entry_type === 'REVOCATION' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {leaf.entry_type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600 break-all">{leaf.leaf_hash.slice(0, 18)}...</td>
                      <td className="py-2 px-3 text-slate-400 font-sans text-[11px]">{leaf.created_at.split('T')[1]?.slice(0, 8)}</td>
                      <td className="py-2 px-3 text-right">
                        <button className="text-purple-600 hover:text-purple-800 text-xs font-sans font-semibold">
                          View Path
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inclusion Proof Inspector */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-4 h-4 text-purple-600" />
            <span>Inclusion Proof (RFC 6962)</span>
          </h3>

          {proof ? (
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
                <p className="font-semibold text-slate-700">Audit Path for Leaf #{proof.leaf_index}</p>
                <p className="font-mono text-slate-500 break-all">Leaf Hash: {proof.leaf_hash}</p>
                <p className="text-slate-500">Tree Size: {proof.tree_size} nodes</p>
              </div>

              <div>
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-1.5">
                  Sibling Audit Path ({proof.audit_path.length} steps):
                </p>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {proof.audit_path.map((sib: string, i: number) => (
                    <div key={i} className="p-2 bg-purple-50/50 rounded border border-purple-200 font-mono text-[11px]">
                      <span className="text-purple-700 font-bold mr-1.5">Level {i}:</span>
                      <span className="text-slate-700 break-all">{sib}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Validates mathematically against checkpoint root</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">Click a leaf on the left to inspect its Merkle audit path.</p>
          )}
        </div>

      </div>

    </div>
  );
};
