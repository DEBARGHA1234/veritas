/**
 * frontend/src/api.ts
 * API client library for VERITAS backend.
 */

const API_BASE = "http://localhost:8000";

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  if (!res.ok) {
    let errorDetail = "API Error";
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = await res.text();
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Models & Passports
  getModels: () => request("/models"),
  registerModel: (dirName: string, version?: string, operatorId?: string, parentDigest?: string) =>
    request("/models/register", {
      method: "POST",
      body: JSON.stringify({ dir_name: dirName, version, operator_id: operatorId, parent_digest: parentDigest })
    }),
  getPassport: (digest: string) => request(`/models/${digest}`),

  // Certificates & Audits
  getCertificates: () => request("/certificates"),
  issueCertificate: (payload: any) =>
    request("/certificates/issue", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  revokeCertificate: (certId: string, reason?: string) =>
    request(`/certificates/${certId}/revoke`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }),

  // Transparency Log
  getLogLeaves: () => request("/log/leaves"),
  getLogCheckpoint: () => request("/log/checkpoint"),
  getInclusionProof: (entryId: number) => request(`/log/proof/${entryId}`),
  checkIntegrity: () => request("/log/integrity"),
  tamperLog: () => request("/log/tamper", { method: "POST" }),
  repairLog: () => request("/log/repair", { method: "POST" }),

  // Runtime
  startRuntime: (modelDir: string, nonce?: string) =>
    request("/runtime/start", {
      method: "POST",
      body: JSON.stringify({ model_dir: modelDir, nonce })
    }),
  runJob: (payload: { runtime_id: string; input: string; passport_digest: string; cert_id: string; nonce: string }) =>
    request("/runtime/run", {
      method: "POST",
      body: JSON.stringify(payload)
    }),

  // Verifier
  getChallengeNonce: () => request("/verifier/challenge"),
  getPolicies: () => request("/policies"),
  verify: (receipt: any, quote?: any, policy: string = "regulated-lending", zkProof?: any) =>
    request("/verify", {
      method: "POST",
      body: JSON.stringify({ receipt, quote, policy, zk_proof: zkProof })
    }),

  // Dependency Engine Diff
  diffDeps: (certifiedDigest: string, currentDigest: string) =>
    request("/deps/diff", {
      method: "POST",
      body: JSON.stringify({ certified_digest: certifiedDigest, current_digest: currentDigest })
    }),

  // Zero-Knowledge
  zkProve: (passportDigest: string, nonce: string) =>
    request("/zk/prove", {
      method: "POST",
      body: JSON.stringify({ passport_digest: passportDigest, nonce })
    }),
  zkVerify: (proof: any, publicSignals: string[]) =>
    request("/zk/verify", {
      method: "POST",
      body: JSON.stringify({ proof, public_signals: publicSignals })
    }),

  // Scenarios
  runScenario: (scenarioId: string) => request(`/scenarios/run/${scenarioId}`, { method: "POST" }),
  runAllScenarios: () => request("/scenarios/run-all", { method: "POST" }),

  // Metrics & Demo Reset
  getMetrics: () => request("/metrics"),
  resetDemo: () => request("/demo/reset", { method: "POST" })
};
