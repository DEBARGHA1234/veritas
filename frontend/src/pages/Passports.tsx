import React, { useEffect, useState } from 'react';
import { FileCheck2, Folder, HardDrive, Key, Check, Copy, ArrowUpRight } from 'lucide-react';
import { api } from '../api';

export const Passports: React.FC = () => {
  const [passports, setPassports] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('credit-risk');
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [selectedPassport, setSelectedPassport] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const modelFolders = ['credit-risk', 'med-triage-llm', 'fraud-detector', 'shadow-model'];

  const fetchPassports = async () => {
    try {
      setLoading(true);
      const res = await api.getModels();
      setPassports(res.passports || []);
      if (res.passports && res.passports.length > 0 && !selectedPassport) {
        setSelectedPassport(res.passports[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPassports();
  }, []);

  const handleRegister = async () => {
    try {
      setRegistering(true);
      const newPassport = await api.registerModel(selectedFolder);
      await fetchPassports();
      setSelectedPassport(newPassport);
    } catch (err: any) {
      alert("Registration failed: " + err.message);
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-indigo-600" />
            <span>Model Passports Registry</span>
          </h1>
          <p className="text-sm text-slate-500">
            Cryptographic manifests binding every model artifact to an immutable SHA-256 passport digest signed by the operator.
          </p>
        </div>

        {/* Register Controls */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 px-2 text-sm text-slate-600">
            <Folder className="w-4 h-4 text-slate-400" />
            <span>Folder:</span>
          </div>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="text-sm font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {modelFolders.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          <button
            onClick={handleRegister}
            disabled={registering}
            className="px-4 py-1.5 text-sm font-bold bg-[#0E1726] hover:bg-slate-800 text-amber-400 rounded-md transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            {registering ? 'Scanning & Registering...' : 'Register Passport'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Passports List */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 divide-y divide-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 px-1">
            Registered Passports ({passports.length})
          </h2>
          <div className="space-y-2 pt-2 max-h-[600px] overflow-y-auto">
            {passports.map((p) => {
              const isSelected = selectedPassport?.passport_digest === p.passport_digest;
              return (
                <div
                  key={p.passport_digest}
                  onClick={() => setSelectedPassport(p)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">{p.model_id}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      v{p.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-mono truncate mb-2">
                    {p.passport_digest}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Op: {p.operator_id}</span>
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Passport Detail Viewer */}
        <div className="lg:col-span-2 space-y-6">
          {selectedPassport ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              
              {/* Header meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">{selectedPassport.model_id}</h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                      Version {selectedPassport.version}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Registered by <span className="font-semibold text-slate-700">{selectedPassport.operator_id}</span> on {selectedPassport.created_at}
                  </p>
                </div>

                {selectedPassport.parent_digest && (
                  <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg text-xs">
                    <span className="text-amber-800 font-semibold">Derived from Parent: </span>
                    <span className="font-mono text-amber-900">{selectedPassport.parent_digest.slice(0, 12)}...</span>
                  </div>
                )}
              </div>

              {/* Passport Digest Card */}
              <div className="bg-slate-900 rounded-lg p-4 text-white">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                    Passport Digest (SHA-256 of Canonical Artifact Manifest)
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedPassport.passport_digest, 'digest')}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                  >
                    {copiedKey === 'digest' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'digest' ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <p className="font-mono text-sm text-slate-200 break-all select-all">
                  {selectedPassport.passport_digest}
                </p>
                <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Operator Ed25519 Signature</span>
                  </span>
                  <span className="font-mono text-slate-300">{selectedPassport.operator_signature.slice(0, 24)}...</span>
                </div>
              </div>

              {/* Artifacts Table */}
              <div>
                <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-600" />
                  <span>Model Artifacts ({Object.keys(selectedPassport.artifacts).length})</span>
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Type</th>
                        <th className="py-2.5 px-3">File</th>
                        <th className="py-2.5 px-3">SHA-256 Digest</th>
                        <th className="py-2.5 px-3 text-right">Size</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {Object.entries(selectedPassport.artifacts).map(([type, info]: [string, any]) => (
                        <tr key={type} className="hover:bg-slate-50/80">
                          <td className="py-2 px-3 font-sans font-bold text-slate-900 capitalize">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                              {type.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700">{info.file}</td>
                          <td className="py-2 px-3 text-slate-500 break-all">{info.sha256}</td>
                          <td className="py-2 px-3 text-right text-slate-600">{info.size.toLocaleString()} B</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Select a passport on the left to inspect its cryptographic manifest.
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
