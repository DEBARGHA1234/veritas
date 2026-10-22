import React, { useEffect, useState } from 'react';
import { FileText, ShieldAlert, CheckCircle, AlertTriangle, Key, Plus, Ban } from 'lucide-react';
import { api } from '../api';

export const Audits: React.FC = () => {
  const [certificates, setCertificates] = useState<any[]>([]);
  const [selectedCert, setSelectedCert] = useState<any>(null);
  const [revoking, setRevoking] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // New certificate form state
  const [newCertId, setNewCertId] = useState('cert-004');
  const [newAuditor, setNewAuditor] = useState('aud-acme');
  const [newModel, setNewModel] = useState('credit-risk');
  const [newPassportDigest, setNewPassportDigest] = useState('');
  const [passports, setPassports] = useState<any[]>([]);

  const fetchCerts = async () => {
    try {
      const res = await api.getCertificates();
      setCertificates(res.certificates || []);
      if (res.certificates && res.certificates.length > 0 && !selectedCert) {
        setSelectedCert(res.certificates[0]);
      }
      const pRes = await api.getModels();
      setPassports(pRes.passports || []);
      if (pRes.passports && pRes.passports.length > 0) {
        setNewPassportDigest(pRes.passports[0].passport_digest);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCerts();
  }, []);

  const handleRevoke = async (certId: string) => {
    if (confirm(`Revoke certificate ${certId}? This will be recorded on the transparency log.`)) {
      try {
        setRevoking(true);
        await api.revokeCertificate(certId, "Revoked by operator for audit test");
        await fetchCerts();
        alert(`Certificate ${certId} revoked successfully.`);
      } catch (err: any) {
        alert("Revocation failed: " + err.message);
      } finally {
        setRevoking(false);
      }
    }
  };

  const handleIssueCert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        cert_id: newCertId,
        auditor_id: newAuditor,
        model_id: newModel,
        passport_digest: newPassportDigest,
        issued_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
        claims: [
          {
            claim_id: "X1",
            statement: "Adversarial test pass rate is at least 0.95",
            suite: "adv-v1.0",
            result: 0.97,
            threshold: 0.95,
            behavioral: true,
            depends_on: ["weights", "config"]
          }
        ]
      };
      const issued = await api.issueCertificate(payload);
      setShowIssueModal(false);
      await fetchCerts();
      setSelectedCert(issued);
      alert("Certificate issued and appended to Transparency Log!");
    } catch (err: any) {
      alert("Issuance failed: " + err.message);
    }
  };

  const artifactColumns = ["weights", "adapter", "tokenizer", "config", "prompt_template"];

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Auditor Certificates & Claims Matrix</span>
          </h1>
          <p className="text-sm text-slate-500">
            Certified safety benchmarks bound to model artifacts. Every behavioral claim strictly requires a dependency on weights.
          </p>
        </div>

        <button
          onClick={() => setShowIssueModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm text-sm transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>Issue New Certificate</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Certificate selector */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 divide-y divide-slate-100">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 px-1">
            Auditor Certificates ({certificates.length})
          </h2>
          <div className="space-y-2 pt-2">
            {certificates.map((c) => {
              const isSelected = selectedCert?.cert_id === c.cert_id;
              return (
                <div
                  key={c.cert_id}
                  onClick={() => setSelectedCert(c)}
                  className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 text-sm">{c.cert_id}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                      {c.model_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">
                    Auditor: <span className="font-semibold text-slate-700">{c.auditor_id}</span>
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Expires: {c.expires_at.split('T')[0]}</span>
                    <span>{c.claims.length} claims</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Certificate Detail & Claims Matrix */}
        <div className="lg:col-span-2 space-y-6">
          {selectedCert ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6">
              
              {/* Header meta */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-black text-slate-900">{selectedCert.cert_id}</h3>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      Model: {selectedCert.model_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Audited by <span className="font-semibold text-slate-700">{selectedCert.auditor_id}</span> | Issued {selectedCert.issued_at.split('T')[0]} | Expires {selectedCert.expires_at.split('T')[0]}
                  </p>
                </div>

                <button
                  onClick={() => handleRevoke(selectedCert.cert_id)}
                  disabled={revoking}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Revoke Certificate</span>
                </button>
              </div>

              {/* Passport Digest Binding & Auditor Signature */}
              <div className="bg-slate-900 rounded-lg p-4 text-white text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-amber-400 font-semibold">Certified Passport Digest</span>
                  <span className="font-mono text-slate-300">{selectedCert.passport_digest.slice(0, 20)}...</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <Key className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auditor Ed25519 Signature ({selectedCert.auditor_id})</span>
                  </span>
                  <span className="font-mono text-slate-300">{selectedCert.auditor_signature.slice(0, 20)}...</span>
                </div>
              </div>

              {/* Claims by Artifact Dependency Matrix */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Claims Dependency Matrix (Auditor Soundness Rule)
                  </h4>
                  <span className="text-xs text-slate-500">
                    ● indicates claim depends on that artifact
                  </span>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-sm divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-700 font-semibold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-3">ID</th>
                        <th className="py-3 px-3">Statement & Suite</th>
                        <th className="py-3 px-2 text-center">Type</th>
                        <th className="py-3 px-2 text-center">Result</th>
                        {artifactColumns.map((col) => (
                          <th key={col} className="py-3 px-2 text-center capitalize text-slate-600">
                            {col.replace('_', ' ')}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {selectedCert.claims.map((claim: any) => (
                        <tr key={claim.claim_id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-mono font-bold text-blue-600">
                            {claim.claim_id}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs">
                            <p className="font-medium text-slate-800">{claim.statement}</p>
                            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Suite: {claim.suite}</p>
                          </td>
                          <td className="py-2.5 px-2 text-center">
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              claim.behavioral 
                                ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {claim.behavioral ? 'Behavioral' : 'Checklist'}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-700">
                            {claim.result} (≥{claim.threshold})
                          </td>
                          {artifactColumns.map((col) => {
                            const hasDep = claim.depends_on.includes(col);
                            return (
                              <td key={col} className="py-2.5 px-2 text-center">
                                {hasDep ? (
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white font-black text-xs shadow-sm">
                                    ●
                                  </span>
                                ) : (
                                  <span className="text-slate-300">―</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
              Select an auditor certificate on the left to inspect its claims matrix.
            </div>
          )}
        </div>

      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Issue New Auditor Certificate</h3>
            <form onSubmit={handleIssueCert} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate ID</label>
                <input
                  type="text"
                  value={newCertId}
                  onChange={(e) => setNewCertId(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Auditor Identity</label>
                <select
                  value={newAuditor}
                  onChange={(e) => setNewAuditor(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="aud-acme">Acme Assurance Ltd (aud-acme)</option>
                  <option value="aud-northwind">Northwind Audit Lab (aud-northwind)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Model</label>
                <select
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="credit-risk">credit-risk</option>
                  <option value="med-triage-llm">med-triage-llm</option>
                  <option value="fraud-detector">fraud-detector</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Passport Digest</label>
                <select
                  value={newPassportDigest}
                  onChange={(e) => setNewPassportDigest(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md font-mono text-xs"
                >
                  {passports.map((p) => (
                    <option key={p.passport_digest} value={p.passport_digest}>
                      {p.model_id} ({p.passport_digest.slice(0, 16)}...)
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border rounded-md text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-md"
                >
                  Sign & Append to Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
