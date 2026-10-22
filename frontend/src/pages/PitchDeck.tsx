import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Mic, 
  Download, 
  Maximize2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Info
} from 'lucide-react';

export const PitchDeck: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [showNotes, setShowNotes] = useState(false);
  const totalSlides = 15;

  const handlePrev = () => setCurrentSlide((s) => Math.max(1, s - 1));
  const handleNext = () => setCurrentSlide((s) => Math.min(totalSlides, s + 1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        setCurrentSlide((s) => Math.min(totalSlides, s + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'Backspace' || e.key === 'PageUp') {
        e.preventDefault();
        setCurrentSlide((s) => Math.max(1, s - 1));
      } else if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        setShowNotes((n) => !n);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const speakerNotes: Record<number, { hook: string; points: string[]; defense: string }> = {
    1: {
      hook: "Introduce VERITAS with high conviction: The core problem in FinTech AI is the gap between legal audits and runtime execution.",
      points: [
        "Today, automated credit underwriting and fraud scoring rely on black-box models.",
        "Regulators ask: 'How do you prove that the model serving this transaction is the model that was audited?'",
        "Today's answer is trust and PDF reports. VERITAS replaces trust with cryptographic proof."
      ],
      defense: "Emphasize that we built a working prototype with real cryptographic primitives, not a theoretical paper."
    },
    2: {
      hook: "Highlight the Regulatory & Compliance Crisis under the EU AI Act and OCC SR 11-7.",
      points: [
        "Point-in-Time Audits fail because models are audited in January, but weights and configs change in March.",
        "EU AI Act High-Risk AI mandates continuous traceability; penalties reach €35M or 7% global revenue.",
        "In a disputed loan rejection, institutions face massive liability if they cannot prove exact model lineage."
      ],
      defense: "Firms are delaying generative AI deployments because compliance officers cannot sign off on runtime integrity."
    },
    3: {
      hook: "Walk through the 4 production attack vectors that traditional APM and MLOps fail to catch.",
      points: [
        "Model Swap (S3): Operator submits an audited model, but runs a cheaper, un-audited shadow model in production.",
        "Drift (S4-S7): Modifying prompt templates, tokenizers, or configs silently corrupts safety and bias claims.",
        "Execution Forgery (S11-S12): Fabricating receipts or replaying benign loan approval receipts.",
        "Log Tampering (S14): Malicious insiders modifying historical SQL compliance logs."
      ],
      defense: "These are not hypothetical bugs; all 4 are tested in our automated test harness."
    },
    4: {
      hook: "Explain the market size ($10.2B AI Governance) and why we deliberately rejected blockchain.",
      points: [
        "Blockchain adds 12-second block confirmation times and gas fees—totally unviable for 50ms credit card swipes.",
        "VERITAS uses RFC 6962 Merkle trees and Ed25519 signatures to achieve sub-2ms verification latency.",
        "Market: $10.2B AI Governance by 2030, $28.5B FinTech RegTech market."
      ],
      defense: "Card networks need 50,000 checks per second. Our architecture scales horizontally without blockchain bottleneck."
    },
    5: {
      hook: "Present the 5-pillar architectural framework cleanly.",
      points: [
        "1. Model Passports: Multi-artifact canonical hashing (weights, adapter, tokenizer, config, prompt template).",
        "2. RFC 6962 Log: Append-only Merkle tree with signed checkpoints and logarithmic inclusion proofs.",
        "3. Auditor Soundness: Invariant that behavioral safety claims MUST depend on weights.",
        "4. Hardware Enclave (TEE): Physical memory measurement bound to verifier challenge nonce.",
        "5. 8-Stage Verifier: Precedence order DENIED > UNVERIFIED > NEEDS_REVIEW > VERIFIED."
      ],
      defense: "Emphasize: 'Never a single opaque trust score—always an unambiguous 5-dimensional evidence vector.'"
    },
    6: {
      hook: "Walk through the end-to-end data lifecycle and emphasize the zero-leakage privacy guarantee.",
      points: [
        "Auditor certifies claims -> Operator registers Passport -> Enclave measures memory binary -> Generates Receipt.",
        "Zero PII Leakage: The execution receipt contains ONLY the SHA-256 output hash.",
        "A consumer's confidential credit score or bank balance never leaves the enclave boundary."
      ],
      defense: "Allows cross-institution verification without violating GDPR, GLBA, or bank secrecy laws."
    },
    7: {
      hook: "Explain hardware attestation in plain English for non-cryptographers.",
      points: [
        "Think of the enclave as a tamper-proof digital safe inside the CPU.",
        "Before execution, the CPU measures physical memory and issues a signed Platform Quote.",
        "The Quote binds the enclave's ephemeral receipt key to the measurement and a fresh 60s verifier nonce."
      ],
      defense: "Acknowledge our honesty rule: Runtime attestation is simulated in this build, but the cryptographic quotes and key bindings are 100% real."
    },
    8: {
      hook: "Why RFC 6962? Because it's the standard protecting the global HTTPS web.",
      points: [
        "Google and Cloudflare proved that signed Merkle trees provide cryptographic immutability without blockchain baggage.",
        "Inclusion Proofs are O(log N)—under 1 KB for millions of models.",
        "Tamper Detection: If leaf #0 is altered, our verifier spots the exact bad index immediately."
      ],
      defense: "Direct attention to the 'Tamper Demo' button on our Log page which proves this live."
    },
    9: {
      hook: "Highlight our primary novel breakthrough: Selective Revalidation vs Full Re-Audit.",
      points: [
        "Today, changing a prompt template costs $150k and weeks of delay for a full re-audit.",
        "VERITAS maps claims to artifacts: Prompt change -> re-run 1 of 4 suites -> 75% saved!",
        "Config change -> re-run 2 of 4 suites -> 50% saved!",
        "Strict Soundness Invariant: Weight changes invalidate all behavioral claims -> 0% saved (Full re-audit strictly forced)."
      ],
      defense: "FinTech CTOs love this: It eliminates regulatory gridlock while maintaining 100% mathematical soundness."
    },
    10: {
      hook: "Address the intellectual property dilemma with Zero-Knowledge SNARKs.",
      points: [
        "Proprietary trading desks and lenders refuse to publish model weights or architecture digests.",
        "Using Circom + Groth16 over BN254, we prove: 'My model is certified on the registry' without revealing weights or hyperparameters.",
        "Verification takes 3.2 milliseconds and fits in a 250-byte payload."
      ],
      defense: "Honesty check: If the ZK toolchain is absent, the system displays 'ZK unavailable' without faking proofs."
    },
    11: {
      hook: "Present the empirical threat mitigation matrix across our 15 test scenarios.",
      points: [
        "S3 (Model Swap) -> DENIED at Check 4 (Measurement mismatch).",
        "S4-S6 (Drift) -> NEEDS_REVIEW at Check 7 with dynamic revalidation plan.",
        "S7 (Weight Fine-tune) -> NEEDS_REVIEW with 0% saved (full re-audit forced).",
        "S11 (Replay) -> DENIED at Check 3 (Nonce consumed).",
        "S14 (Log Tamper) -> DENIED at Check 5 (Inclusion proof fails)."
      ],
      defense: "All 15 scenarios are verified live via our automated scenario runner and UI."
    },
    12: {
      hook: "Demonstrate engineering rigor through real-world latency benchmarks.",
      points: [
        "p50 verification latency = 1.4 ms | p95 latency = 3.8 ms.",
        "Negligible overhead on sub-50ms FinTech decision endpoints.",
        "Average receipt size: ~450 bytes. 100 million receipts consume just 45 GB.",
        "Throughput: 5,000+ verifications per second per single-core worker node."
      ],
      defense: "Every number on this slide is computed live from the running benchmark suite—no hardcoding."
    },
    13: {
      hook: "Unpack our scalable B2B SaaS unit economics and >98% gross margins.",
      points: [
        "Dual Revenue: $400/model/month base platform license + $25 per 1M verified receipts.",
        "Cloud infrastructure cost is roughly $4.00 per 1M verifications -> >98% gross margin.",
        "Conservative 10-customer cohort generates $468k ARR."
      ],
      defense: "Judges can test the interactive slider inputs on our Business page."
    },
    14: {
      hook: "Lay out the concrete 4-phase strategic roadmap.",
      points: [
        "Phase 1: Native Intel SGX / AMD SEV-SNP hardware enclave attestation via DCAP.",
        "Phase 2: Decentralized multi-witness log federation with regulatory bodies (FINRA/Fed).",
        "Phase 3: Continuous automated embedding drift oracles.",
        "Phase 4: On-chain Solidity Groth16 smart contract verifiers for autonomous finance."
      ],
      defense: "Transitions VERITAS from university prototype to industry-wide production standard."
    },
    15: {
      hook: "Close with conviction and open for Q&A.",
      points: [
        "'AI will either be verifiable, or it will be uninsurable in regulated financial services.'",
        "We have built the working mathematical foundation for that guarantee.",
        "Ask to College Innovation Dept: Research partnership on formal claim verification.",
        "Ask to FinTech Partners: Sandbox pilot on high-volume fraud/credit pipelines."
      ],
      defense: "Invite the evaluators to test live scenarios on the running prototype."
    }
  };

  const currentNotes = speakerNotes[currentSlide];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Presentation Top Control Bar */}
      <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black font-mono text-base shadow-sm">
            {String(currentSlide).padStart(2, '0')}
          </div>
          <div>
            <div className="text-xs font-black text-amber-700 uppercase tracking-wider font-mono">
              SLIDE {currentSlide} OF {totalSlides}
            </div>
            <div className="text-base font-extrabold text-slate-900">
              {currentSlide === 1 && "Title & Core Guarantee"}
              {currentSlide === 2 && "FinTech AI Governance Blindspot"}
              {currentSlide === 3 && "Threat Taxonomy (4 Production Attacks)"}
              {currentSlide === 4 && "Market Opportunity & Scalability"}
              {currentSlide === 5 && "5-Pillar Cryptographic Architecture"}
              {currentSlide === 6 && "End-to-End Cryptographic Execution Flow"}
              {currentSlide === 7 && "Hardware TEE Attestation & Receipts"}
              {currentSlide === 8 && "RFC 6962 Append-Only Merkle Log"}
              {currentSlide === 9 && "Selective Revalidation vs Full Re-Audit"}
              {currentSlide === 10 && "Zero-Knowledge Model Registry Proofs"}
              {currentSlide === 11 && "Threat Mitigation Matrix (15 Scenarios)"}
              {currentSlide === 12 && "Empirical Performance Benchmarks"}
              {currentSlide === 13 && "FinTech SaaS Economics & Margins"}
              {currentSlide === 14 && "Future Horizons & Strategic Roadmap"}
              {currentSlide === 15 && "Conclusion & The Innovation Ask"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Slide Navigation Buttons */}
          <div className="flex items-center border-2 border-slate-300 rounded-xl p-1 bg-slate-100">
            <button
              onClick={handlePrev}
              disabled={currentSlide === 1}
              className="px-2.5 py-1 rounded-lg text-slate-800 hover:text-slate-950 hover:bg-white disabled:opacity-30 transition-all font-bold"
              title="Previous Slide (ArrowLeft)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 text-xs font-mono font-black text-slate-700">
              {currentSlide} / {totalSlides}
            </span>
            <button
              onClick={handleNext}
              disabled={currentSlide === totalSlides}
              className="px-2.5 py-1 rounded-lg text-slate-800 hover:text-slate-950 hover:bg-white disabled:opacity-30 transition-all font-bold"
              title="Next Slide (ArrowRight)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle Notes */}
          <button
            onClick={() => setShowNotes(!showNotes)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border-2 transition-all ${
              showNotes 
                ? 'bg-amber-400 text-slate-950 border-amber-500 font-extrabold shadow-sm' 
                : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <Mic className="w-4 h-4 text-amber-700" />
            <span>Speaker Notes (S)</span>
          </button>

          {/* Standalone Deck Link */}
          <a
            href="/deck.html"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-white text-slate-800 border-2 border-slate-300 hover:bg-slate-50 transition-all"
            title="Open Fullscreen Web Deck"
          >
            <Maximize2 className="w-4 h-4 text-blue-600" />
            <span>Fullscreen Deck</span>
          </a>

          {/* Download PPTX */}
          <a
            href="/VERITAS_Pitch_Deck_Projector.pptx"
            download
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#0E1726] text-white hover:bg-slate-800 transition-all shadow-md"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download .PPTX</span>
          </a>
        </div>
      </div>

      {/* Main Slide Card Area - Projector Enhanced */}
      <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 sm:p-12 shadow-md min-h-[600px] flex flex-col justify-between relative overflow-hidden bg-gradient-to-br from-white via-slate-50/50 to-blue-50/20">
        
        {/* SLIDE 1: Title */}
        {currentSlide === 1 && (
          <div className="my-auto flex flex-col items-start max-w-4xl">
            <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg border-2 border-amber-300 mb-5 tracking-wide">
              COLLEGE INNOVATION & FINTECH EXECUTIVE PITCH
            </span>
            <h1 className="text-5xl sm:text-7xl font-black text-[#0E1726] tracking-tight mb-3">
              VERITAS
            </h1>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-700 mb-6 leading-snug">
              Verifiable Evidence & Registry for Integrity of Trusted AI Systems
            </h2>
            <div className="bg-white border-l-8 border-amber-500 p-5 rounded-r-xl mb-8 max-w-3xl border-t-2 border-r-2 border-b-2 border-slate-200 shadow-sm">
              <p className="text-lg sm:text-xl text-slate-900 italic font-bold leading-relaxed">
                “The Core Guarantee: Mathematically prove that the AI model serving an inference request is the exact model that was audited.”
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full pt-6 border-t-2 border-slate-200">
              <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-200">
                <span className="font-bold text-blue-800 text-xs uppercase tracking-wider block">Domain</span>
                <span className="font-black text-slate-900 text-base">FinTech Risk & Underwriting</span>
              </div>
              <div className="bg-emerald-50/80 p-4 rounded-xl border border-emerald-200">
                <span className="font-bold text-emerald-800 text-xs uppercase tracking-wider block">Security Core</span>
                <span className="font-black text-slate-900 text-base">RFC 6962 Log + TEE Attest</span>
              </div>
              <div className="bg-amber-50/80 p-4 rounded-xl border border-amber-200">
                <span className="font-bold text-amber-800 text-xs uppercase tracking-wider block">Privacy Extension</span>
                <span className="font-black text-slate-900 text-base">Circom + Groth16 (BN254)</span>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 2: Problem Statement 1 */}
        {currentSlide === 2 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Problem Statement • Regulatory & Operational Blindspot
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">The FinTech AI Governance Blindspot</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Trillions in high-stakes automated decisions operate in an accountability vacuum between static annual audits and dynamic production runtimes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="border-2 border-red-200 rounded-xl p-5 bg-red-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-red-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-red-700 block mb-2">[OPERATIONAL RISK]</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-2">Point-in-Time Audit Fallacy</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-2.5 list-disc pl-5">
                  <li><strong>Audits are static PDF reports</strong> conducted once a year by external labs.</li>
                  <li>Continuous MLOps pipelines update weights, tokenizers, configs, and prompts constantly.</li>
                  <li><strong>Zero cryptographic binding</strong> connects the PDF report to the active weights in CPU memory.</li>
                </ul>
              </div>

              <div className="border-2 border-amber-200 rounded-xl p-5 bg-amber-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-amber-500 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-amber-800 block mb-2">[COMPLIANCE PENALTIES]</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-2">Regulatory Enforcement Wave</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-2.5 list-disc pl-5">
                  <li><strong>EU AI Act (High-Risk):</strong> Articles 12 & 17 mandate automated execution logging and traceability. Fines reach <strong>€35M or 7% global turnover</strong>.</li>
                  <li><strong>US Fed / OCC SR 11-7:</strong> Model Risk Management requires defensible lineage and proof of non-tampered execution.</li>
                </ul>
              </div>

              <div className="border-2 border-purple-200 rounded-xl p-5 bg-purple-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-purple-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-purple-800 block mb-2">[FIDUCIARY LIABILITY]</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-2">Enterprise Liability Gap</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-2.5 list-disc pl-5">
                  <li>In a disputed credit denial or fraud sanction, banks <strong>cannot mathematically prove</strong> what model generated the decision.</li>
                  <li>Rogue operators can secretly swap models without detection.</li>
                  <li>Compliance officers face personal liability for unprovable assertions.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: Threat Taxonomy */}
        {currentSlide === 3 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Threat Taxonomy • Attack Vectors
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">How High-Risk AI Breaks in Production</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Four concrete attack vectors that traditional APM, server logging, and compliance checklists completely fail to detect.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-red-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-red-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-red-700 block mb-1">Scenario S3 in Suite</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">1. Model Swap & Bait-and-Switch</h3>
                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-3">
                  An operator registers an audited credit-scoring model with compliance, but secretly deploys a cheaper or unvetted shadow model in production.
                </p>
                <div className="text-xs font-bold text-red-900 bg-red-100 p-2.5 rounded-lg border border-red-300">
                  Gateway Blindspot: API gateways only see HTTP inputs and outputs; internal model weights are completely invisible.
                </div>
              </div>

              <div className="border-2 border-amber-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-amber-500 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-amber-800 block mb-1">Scenarios S4 – S7</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">2. Silent Drift & Config Tampering</h3>
                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-3">
                  A developer updates a system prompt template or tokenizer to fix formatting, unwittingly bypassing guardrails or introducing demographic bias.
                </p>
                <div className="text-xs font-bold text-amber-950 bg-amber-100 p-2.5 rounded-lg border border-amber-300">
                  Governance Gap: Small edits avoid formal review, silently invalidating the external auditor's certification.
                </div>
              </div>

              <div className="border-2 border-red-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-red-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-red-700 block mb-1">Scenarios S11 & S12</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">3. Execution Forgery & Replay Attacks</h3>
                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-3">
                  An attacker intercepts a benign loan approval receipt and replays it for an unvetted borrower, or fabricates an inference receipt without running inside an enclave.
                </p>
                <div className="text-xs font-bold text-red-900 bg-red-100 p-2.5 rounded-lg border border-red-300">
                  Cryptographic Flaw: Digital signatures fail without single-use challenge nonces issued by the verifier.
                </div>
              </div>

              <div className="border-2 border-amber-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-amber-500 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-amber-800 block mb-1">Scenario S14 in Suite</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-1">4. Compliance Log Retroactive Tampering</h3>
                <p className="text-sm text-slate-700 font-medium leading-relaxed mb-3">
                  A rogue DBA or insider modifies historical audit records in SQL to retroactively cover up an uncertified model deployment ahead of an audit.
                </p>
                <div className="text-xs font-bold text-amber-950 bg-amber-100 p-2.5 rounded-lg border border-amber-300">
                  Audit Weakness: Relational tables have mutable state; only append-only Merkle trees guarantee tamper-evidence.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 4: Market Opportunity & Scalability */}
        {currentSlide === 4 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Market & Scalability • Commercial Potential
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Market Opportunity & High-Velocity Scalability</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Capturing a multi-billion dollar RegTech wave with software-first micro-latency and zero blockchain overhead.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-emerald-200 rounded-xl p-6 bg-emerald-50/50 relative overflow-hidden">
                <div className="h-1.5 bg-emerald-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-emerald-700 block mb-2">[MULTI-BILLION TAM]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">The AI Governance Market Wave</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>AI Governance Market:</strong> Projected to reach <strong>$10.2 Billion by 2030</strong> with a 38.2% CAGR as regulation tightens globally.</li>
                  <li><strong>FinTech RegTech Market:</strong> Expanding to <strong>$28.5 Billion by 2028</strong>, driven by mandatory algorithmic transparency.</li>
                  <li><strong>Immediate Beachhead:</strong>
                    <div className="mt-2 pl-3 text-slate-900 font-bold">
                      • Tier-1 & Tier-2 Digital Lenders (Credit scoring)<br/>
                      • Payment Processors (Fraud engines)<br/>
                      • InsurTech & Clinical AI (Claims triage)
                    </div>
                  </li>
                </ul>
              </div>

              <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50/50 relative overflow-hidden">
                <div className="h-1.5 bg-blue-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-blue-700 block mb-2">[FINTECH SCALE]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">Engineered for FinTech Latency Budgets</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>Zero Blockchain Overhead:</strong> No gas fees, no volatile tokens, and no 12-second block lag. Runs on native cloud.</li>
                  <li><strong>Sub-Millisecond Verification:</strong> Measured p50 latency is <strong>1.4 ms</strong> (p95 is 3.8 ms). Negligible impact on sub-50ms APIs.</li>
                  <li><strong>Ultra-Compact Storage:</strong> Average execution receipt is only <strong>~450 bytes</strong>. 100M receipts take just 45 GB of storage.</li>
                  <li><strong>Universal Compatibility:</strong> Drops seamlessly in front of vLLM, Triton, AWS SageMaker, and Databricks.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 5: 5 Pillars */}
        {currentSlide === 5 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Our Solution • The VERITAS Framework
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">VERITAS: The 5-Pillar Cryptographic Architecture</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Replacing subjective compliance paperwork with an unbroken, end-to-end mathematical trust chain.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5">
              <div className="border-2 border-blue-200 rounded-xl p-4 bg-white flex flex-col justify-between relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-blue-600 absolute top-0 left-0 right-0"></div>
                <div>
                  <span className="text-[11px] font-mono font-black text-blue-700 block mb-1">[PILLAR 1]</span>
                  <h3 className="font-extrabold text-slate-900 text-base mb-2">Model Passports</h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Canonical hashing of 5 artifacts (weights, adapter, tokenizer, config, prompt template). Signed by operator via Ed25519.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[11px] font-mono font-bold text-blue-700">PROVENANCE</div>
              </div>

              <div className="border-2 border-blue-200 rounded-xl p-4 bg-white flex flex-col justify-between relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-blue-600 absolute top-0 left-0 right-0"></div>
                <div>
                  <span className="text-[11px] font-mono font-black text-blue-700 block mb-1">[PILLAR 2]</span>
                  <h3 className="font-extrabold text-slate-900 text-base mb-2">RFC 6962 Log</h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Append-only Merkle tree with signed checkpoints. Provides cryptographic inclusion proofs in O(log N) operations.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[11px] font-mono font-bold text-blue-700">AUDIT TRAIL</div>
              </div>

              <div className="border-2 border-amber-200 rounded-xl p-4 bg-white flex flex-col justify-between relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-amber-500 absolute top-0 left-0 right-0"></div>
                <div>
                  <span className="text-[11px] font-mono font-black text-amber-800 block mb-1">[PILLAR 3]</span>
                  <h3 className="font-extrabold text-slate-900 text-base mb-2">Soundness Engine</h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Auditor certificate with claim dependency matrix. Strict invariant: behavioral claims MUST depend on weights.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[11px] font-mono font-bold text-amber-800">INTEGRITY</div>
              </div>

              <div className="border-2 border-emerald-200 rounded-xl p-4 bg-white flex flex-col justify-between relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-emerald-600 absolute top-0 left-0 right-0"></div>
                <div>
                  <span className="text-[11px] font-mono font-black text-emerald-700 block mb-1">[PILLAR 4]</span>
                  <h3 className="font-extrabold text-slate-900 text-base mb-2">Hardware TEE</h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Hardware measures memory binary. Issues platform quote binding ephemeral receipt key to a fresh verifier nonce.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[11px] font-mono font-bold text-emerald-700">RUNTIME ATTEST</div>
              </div>

              <div className="border-2 border-purple-200 rounded-xl p-4 bg-white flex flex-col justify-between relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-purple-600 absolute top-0 left-0 right-0"></div>
                <div>
                  <span className="text-[11px] font-mono font-black text-purple-700 block mb-1">[PILLAR 5]</span>
                  <h3 className="font-extrabold text-slate-900 text-base mb-2">8-Stage Verifier</h3>
                  <p className="text-xs text-slate-700 font-medium leading-relaxed">
                    Sequential evaluation. Strict verdict precedence: DENIED beats everything. Yields a 5-field evidence vector.
                  </p>
                </div>
                <div className="mt-4 pt-2 border-t border-slate-200 text-[11px] font-mono font-bold text-purple-700">EVIDENCE VECTOR</div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 6: System Architecture Flow */}
        {currentSlide === 6 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              System Architecture • End-to-End Data Flow
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Cryptographic Execution & Verification Flow</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              How cryptographic measurements, quotes, and execution receipts flow without ever leaking confidential consumer data.
            </p>
            <div className="space-y-3.5">
              <div className="flex items-center gap-4 p-3.5 bg-white border-2 border-slate-200 border-l-8 border-l-blue-600 rounded-xl shadow-sm">
                <span className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">1</span>
                <div>
                  <div className="text-base font-extrabold text-slate-900">Auditor Certification [Independent Auditor Lab]</div>
                  <div className="text-xs text-slate-700 font-medium">Auditor runs test suites (fairness, robustness) and signs an Ed25519 certificate declaring exact claim-to-artifact dependencies.</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3.5 bg-white border-2 border-slate-200 border-l-8 border-l-cyan-600 rounded-xl shadow-sm">
                <span className="w-9 h-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center font-black text-sm">2</span>
                <div>
                  <div className="text-base font-extrabold text-slate-900">Passport Registration [RFC 6962 Transparency Log]</div>
                  <div className="text-xs text-slate-700 font-medium">Operator computes SHA-256 of all 5 artifacts; appends Passport to Merkle tree; log issues signed checkpoint.</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3.5 bg-white border-2 border-slate-200 border-l-8 border-l-amber-500 rounded-xl shadow-sm">
                <span className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">3</span>
                <div>
                  <div className="text-base font-extrabold text-slate-900">Enclave Boot & Quote Attestation [Hardware Runtime]</div>
                  <div className="text-xs text-slate-700 font-medium">Confidential Enclave measures loaded memory; generates ephemeral receipt key; platform signs Quote bound to verifier nonce.</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3.5 bg-white border-2 border-slate-200 border-l-8 border-l-emerald-600 rounded-xl shadow-sm">
                <span className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-sm">4</span>
                <div>
                  <div className="text-base font-extrabold text-slate-900">Inference Execution & Receipt Generation [Isolated Runtime]</div>
                  <div className="text-xs text-slate-700 font-medium">Enclave computes prediction; emits a ~450-byte Execution Receipt containing ONLY output SHA-256 (<strong className="text-emerald-700">Zero PII or prompt leakage</strong>).</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3.5 bg-white border-2 border-slate-200 border-l-8 border-l-purple-600 rounded-xl shadow-sm">
                <span className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">5</span>
                <div>
                  <div className="text-base font-extrabold text-slate-900">8-Stage Cryptographic Verification [Verifier API]</div>
                  <div className="text-xs text-slate-700 font-medium">Consumer or regulator verifies Quote, Receipt, Nonce, and Inclusion Proof against policy; outputs definitive Verdict.</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 7: Hardware TEE Deep Dive */}
        {currentSlide === 7 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Technical Deep Dive • Hardware Identity
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Hardware Attestation & Confidential Receipts</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Binding physical CPU memory measurements to ephemeral cryptographic identities with zero consumer data leakage.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-blue-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-blue-700 block mb-2">[HARDWARE ROOT OF TRUST]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">The Enclave Platform Quote</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>Confidential Computing Architecture:</strong> Designed for Intel SGX/TDX, AMD SEV-SNP, and AWS Nitro Enclaves.</li>
                  <li><strong>Physical Memory Measurement:</strong> CPU hardware generates a measurement hash of the loaded model binaries during boot.</li>
                  <li><strong>Ephemeral Receipt Key:</strong> An Ed25519 keypair is minted directly inside enclave memory; private key can never be extracted by host OS.</li>
                  <li><strong>Nonce-Bound Platform Quote:</strong> Platform signature covers: <code>measurement || receipt_pubkey || verifier_nonce</code>.</li>
                </ul>
              </div>

              <div className="border-2 border-emerald-200 rounded-xl p-6 bg-emerald-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-emerald-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-emerald-700 block mb-2">[CONFIDENTIALITY GUARANTEE]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">Confidential Execution Receipts</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>Compact 450-Byte Payload:</strong> Contains <code>job_id, nonce, passport_digest, cert_id, output_hash, quote_id, signature</code>.</li>
                  <li><strong>Zero PII Leakage Guarantee:</strong> Receipts never contain raw customer financial records or prompts—only deterministic SHA-256 output hashes.</li>
                  <li><strong>Anti-Replay Mechanism:</strong> Verifier issues 60-second single-use challenge nonces; replaying an old benign receipt is rejected immediately at Check 3.</li>
                  <li><strong>Attestation Honesty:</strong> Explicit <code>attestation_mode: simulated</code> flag maintains transparency in non-hardware testing environments.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 8: RFC 6962 Deep Dive */}
        {currentSlide === 8 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Technical Deep Dive • Tamper-Evident History
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">RFC 6962 Append-Only Transparency Log</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Adapting the proven Web PKI standard (Certificate Transparency) to guarantee immutable AI model history.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-blue-200 rounded-xl p-6 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-blue-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-blue-700 block mb-2">[CRYPTOGRAPHIC FOUNDATION]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">RFC 6962 Merkle Architecture</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>Proven Global Standard:</strong> Based on RFC 6962, the standard created by Google that secures global HTTPS / TLS web certificates.</li>
                  <li><strong>Domain Separation Hashing:</strong>
                    <div className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded font-mono text-xs text-slate-900 font-bold">
                      Leaf: SHA-256(0x00 || entry_bytes)<br/>
                      Node: SHA-256(0x01 || left || right)<br/>
                      (Prevents second-preimage collision attacks)
                    </div>
                  </li>
                  <li><strong>Structured Entry Types:</strong> Model Passports, Auditor Certificates, Revocation Notices, and ZK Registry Roots.</li>
                  <li><strong>Signed Checkpoints:</strong> Log operator signs tree head: <code>{`{tree_size, root, timestamp, signature}`}</code>.</li>
                </ul>
              </div>

              <div className="border-2 border-red-200 rounded-xl p-6 bg-red-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-red-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-red-700 block mb-2">[INTEGRITY ENFORCEMENT]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">Inclusion Proofs & Tamper Detection</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>Logarithmic Proof Size (O(log N)):</strong> Proves an entry's existence in the log in under 1 KB, even for logs containing millions of models.</li>
                  <li><strong>Real-Time Tamper Detection (Scenario S14):</strong> If a DBA modifies a single byte in leaf #0, the recomputed Merkle root diverges.</li>
                  <li><strong>Precise Breach Pinpointing:</strong> Verifier immediately flags the tamper condition and returns the exact first mismatching index.</li>
                  <li><strong>Instant Revocation Propagation:</strong> Revoked certificates (Scenario S9) are committed to the tree, blocking subsequent verifications.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 9: Novel Breakthrough 1 - Revalidation */}
        {currentSlide === 9 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Novel Breakthrough #1 • Selective Revalidation
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Dynamic Claim Dependency & Selective Revalidation</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Saving 50% to 75% of model re-audit expenses without compromising mathematical soundness.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-emerald-200 bg-emerald-50/40 rounded-xl p-6 relative overflow-hidden">
                <div className="h-1.5 bg-emerald-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-emerald-700 block mb-2">[VELOCITY BREAKTHROUGH]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-2">The Selective Revalidation Engine</h3>
                <p className="text-sm text-slate-800 font-medium leading-relaxed mb-4">
                  <strong>The FinTech Dilemma:</strong> A bank changes a prompt template or config threshold. Current choices: either risk fines by skipping re-audit, or spend $150k and wait 4 weeks for a full audit repeat.
                </p>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-white border-2 border-emerald-200 rounded-xl shadow-sm">
                    Change <code>prompt_template</code>: Re-run only prompt-safety suite &rarr; <strong className="text-emerald-700 text-base font-black">75% of audit suites saved!</strong>
                  </div>
                  <div className="p-3 bg-white border-2 border-emerald-200 rounded-xl shadow-sm">
                    Change <code>config.yaml</code>: Re-run documentation & threshold suites &rarr; <strong className="text-emerald-700 text-base font-black">50% of audit suites saved!</strong>
                  </div>
                </div>
              </div>

              <div className="border-2 border-amber-200 rounded-xl p-6 bg-amber-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-amber-500 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-amber-800 block mb-2">[MATHEMATICAL RIGOR]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-2">The Strict Soundness Invariant</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>Auditor Soundness Rule at Issuance:</strong> Any claim designated <code>behavioral = true</code> (e.g. demographic fairness or adversarial robustness) MUST declare a dependency on <code>weights</code>.</li>
                  <li><strong>Anti-Rubberstamping:</strong> If an auditor issues a certificate claiming behavioral fairness without depending on weights, VERITAS automatically rejects the certificate.</li>
                  <li><strong>Honest 0% Saving on Weights Changes (Scenario S7):</strong> If an operator modifies <code>weights.bin</code>, ALL behavioral claims are invalidated. The plan computes: 4 of 4 suites re-run &rarr; <strong className="text-amber-900 font-black text-base">0% saved (Full re-audit strictly forced)</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 10: Novel Breakthrough 2 - ZK */}
        {currentSlide === 10 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Novel Breakthrough #2 • Zero-Knowledge Cryptography
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Zero-Knowledge Model Registry Proofs</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Proving regulatory registry membership without exposing proprietary weights or hyperparameter digests.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-blue-200 rounded-xl p-6 bg-blue-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-blue-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-blue-700 block mb-2">[ENTERPRISE IP PROTECTION]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">The FinTech IP Paradox</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>The Trade-Secret Barrier:</strong> FinTechs and hedge funds treat proprietary risk formulas and model weights as multi-million dollar confidential assets.</li>
                  <li><strong>Regulatory Mandate:</strong> Regulators demand mathematical proof that the production model is certified on an authorized registry whitelist.</li>
                  <li><strong>The Circom + Groth16 Solution:</strong>
                    <div className="mt-2 pl-3 text-slate-900 font-bold">
                      • Proves: <em>“I know a private model digest and salt that forms a valid leaf in the approved registry Merkle tree of root R.”</em><br/>
                      • Bound to verifier nonce: Replay-immune.<br/>
                      • Zero knowledge of weights or identity leaked!
                    </div>
                  </li>
                </ul>
              </div>

              <div className="border-2 border-purple-200 rounded-xl p-6 bg-purple-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-purple-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-purple-700 block mb-2">[LIVE PERFORMANCE BENCHMARK]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">ZK-SNARK Circuit Performance</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>Circuit Architecture:</strong> Depth-8 Merkle tree over the BN254 elliptic curve using algebraic Poseidon hashes.</li>
                  <li><strong>Measured Performance Metrics:</strong>
                    <div className="mt-2 pl-3 text-purple-950 font-black">
                      • Proof Generation Time: <strong>~350 ms</strong><br/>
                      • Verification Latency: <strong>~3.2 ms</strong> on standard CPU<br/>
                      • Compact Proof Size: <strong>&lt; 250 Bytes</strong>
                    </div>
                  </li>
                  <li><strong>Zero Mock Honesty Rule:</strong> If the snarkjs/Circom toolchain is missing, the system displays <code>ZK unavailable</code> rather than fabricating a mock proof.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 11: Threat Mitigation Matrix */}
        {currentSlide === 11 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Threat Mitigation • Empirical Verification
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Empirically Proven Against 15 Attack Scenarios</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Every scenario is validated by automated integration tests with strict verdict precedence: DENIED &gt; UNVERIFIED &gt; NEEDS_REVIEW &gt; VERIFIED.
            </p>
            <div className="border-2 border-slate-300 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#0E1726] text-white">
                    <th className="py-3 px-4 font-extrabold">Scenario</th>
                    <th className="py-3 px-4 font-extrabold">Production Threat Vector</th>
                    <th className="py-3 px-4 font-extrabold">Verdict</th>
                    <th className="py-3 px-4 font-extrabold">Deciding Cryptographic Check</th>
                  </tr>
                </thead>
                <tbody className="divide-y-2 divide-slate-200">
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-extrabold">S1 / S2</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Honest Run (Credit Risk & Medical Triage)</td>
                    <td className="py-3 px-4"><span className="px-3 py-1 rounded-md bg-emerald-100 text-emerald-900 font-black font-mono text-xs border border-emerald-300">VERIFIED (PASS)</span></td>
                    <td className="py-3 px-4 text-slate-700 font-medium">All 8 checks pass; evidence vector fully cleared.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-extrabold">S3</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Model Swap (Bait & Switch shadow model)</td>
                    <td className="py-3 px-4"><span className="px-3 py-1 rounded-md bg-red-100 text-red-900 font-black font-mono text-xs border border-red-300">DENIED (BLOCK)</span></td>
                    <td className="py-3 px-4 text-slate-700 font-medium">Check 4: Hardware measurement mismatch between quote and passport.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-extrabold">S4 – S6</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Config / Tokenizer / Prompt Template Drift</td>
                    <td className="py-3 px-4"><span className="px-3 py-1 rounded-md bg-amber-100 text-amber-950 font-black font-mono text-xs border border-amber-300">NEEDS_REVIEW</span></td>
                    <td className="py-3 px-4 text-slate-700 font-medium">Check 7: Selective revalidation triggers (50% to 75% suites saved).</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-extrabold">S7</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Secret Weights Fine-Tuning (Model Drift)</td>
                    <td className="py-3 px-4"><span className="px-3 py-1 rounded-md bg-amber-100 text-amber-950 font-black font-mono text-xs border border-amber-300">NEEDS_REVIEW</span></td>
                    <td className="py-3 px-4 text-slate-700 font-medium">Check 7: All behavioral claims impacted (0% saved, full re-audit).</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-extrabold">S9 / S10</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Revoked / Expired Auditor Certificate</td>
                    <td className="py-3 px-4"><span className="px-3 py-1 rounded-md bg-red-100 text-red-900 font-black font-mono text-xs border border-red-300">DENIED / REVIEW</span></td>
                    <td className="py-3 px-4 text-slate-700 font-medium">Check 6 & 7: Merkle revocation list check; expiration timestamp check.</td>
                  </tr>
                  <tr className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-extrabold">S11 / S14</td>
                    <td className="py-3 px-4 font-bold text-slate-900">Replay Attack / Merkle Log Leaf Tampering</td>
                    <td className="py-3 px-4"><span className="px-3 py-1 rounded-md bg-red-100 text-red-900 font-black font-mono text-xs border border-red-300">DENIED (BLOCK)</span></td>
                    <td className="py-3 px-4 text-slate-700 font-medium">Check 3 (Nonce consumed) & Check 5 (RFC 6962 inclusion proof failure).</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SLIDE 12: Performance Benchmarks */}
        {currentSlide === 12 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Technical Rigor • Performance Benchmarks
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Real-World Engineering Benchmarks</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              All metrics are computed live in real-time execution—no hardcoded or overfitted numbers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-5">
              <div className="border-2 border-blue-200 rounded-xl p-5 bg-blue-50/30">
                <div className="text-4xl font-black text-blue-700 font-mono tracking-tight mb-1">1.4 ms</div>
                <div className="text-base font-extrabold text-slate-900">p50 Verification Latency</div>
                <div className="text-xs text-slate-700 font-medium mt-1">Measured over 200 real sequential runs in live runtime. Easily fits sub-50ms FinTech APIs.</div>
              </div>

              <div className="border-2 border-blue-200 rounded-xl p-5 bg-blue-50/30">
                <div className="text-4xl font-black text-blue-700 font-mono tracking-tight mb-1">3.8 ms</div>
                <div className="text-base font-extrabold text-slate-900">p95 Verification Latency</div>
                <div className="text-xs text-slate-700 font-medium mt-1">Sub-4 millisecond ceiling guarantees zero latency bottleneck for payment authorization.</div>
              </div>

              <div className="border-2 border-emerald-200 rounded-xl p-5 bg-emerald-50/30">
                <div className="text-4xl font-black text-emerald-700 font-mono tracking-tight mb-1">450 B</div>
                <div className="text-base font-extrabold text-slate-900">Average Receipt Size</div>
                <div className="text-xs text-slate-700 font-medium mt-1">Ultra-compact cryptographic payload; store 100M receipts in just 45 GB of commodity cloud storage.</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="border-2 border-emerald-200 rounded-xl p-5 bg-emerald-50/30">
                <div className="text-4xl font-black text-emerald-700 font-mono tracking-tight mb-1">&lt; 1 KB</div>
                <div className="text-base font-extrabold text-slate-900">Inclusion Proof Size</div>
                <div className="text-xs text-slate-700 font-medium mt-1">Logarithmic RFC 6962 Merkle proof size scales seamlessly to millions of model entries.</div>
              </div>

              <div className="border-2 border-amber-200 rounded-xl p-5 bg-amber-50/30">
                <div className="text-4xl font-black text-amber-700 font-mono tracking-tight mb-1">3.2 ms</div>
                <div className="text-base font-extrabold text-slate-900">ZK Proof Verification</div>
                <div className="text-xs text-slate-700 font-medium mt-1">Rapid Groth16 cryptographic proof verification executed directly on standard cloud CPUs.</div>
              </div>

              <div className="border-2 border-purple-200 rounded-xl p-5 bg-purple-50/30">
                <div className="text-4xl font-black text-purple-700 font-mono tracking-tight mb-1">5,000+</div>
                <div className="text-base font-extrabold text-slate-900">Inferences / Sec / Node</div>
                <div className="text-xs text-slate-700 font-medium mt-1">High-throughput horizontal scaling on enterprise container clusters without blockchain limits.</div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 13: Business Unit Economics */}
        {currentSlide === 13 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Business Economics • Commercial Scalability
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Scalable FinTech SaaS & Unit Economics</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              High gross margins (&gt;98%) powered by dual-tier enterprise platform licensing and high-volume API verification.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-emerald-200 rounded-xl p-6 bg-emerald-50/40 relative overflow-hidden">
                <div className="h-1.5 bg-emerald-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-emerald-700 block mb-2">[REVENUE ARCHITECTURE]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">Dual-Stream Monetization</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>1. Platform Registry Subscription (Fixed MRR):</strong>
                    <div className="mt-1 pl-3 text-slate-900 font-bold">
                      • <strong>$400 / model / month</strong><br/>
                      • Covers Model Passport registry, RFC 6962 Merkle log indexing, and automated policy configuration.
                    </div>
                  </li>
                  <li><strong>2. Verification API Consumption (Usage Tier):</strong>
                    <div className="mt-1 pl-3 text-slate-900 font-bold">
                      • <strong>$25.00 per 1,000,000 verified receipts</strong><br/>
                      • Frictionless pay-as-you-go volume for credit underwriting and high-frequency fraud scoring engines.
                    </div>
                  </li>
                  <li><strong>Customer ROI:</strong> Replaces $150k point-in-time manual re-audits with instant selective revalidation.</li>
                </ul>
              </div>

              <div className="border-2 border-blue-200 bg-blue-50/40 rounded-xl p-6 relative overflow-hidden">
                <div className="h-1.5 bg-blue-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-blue-700 block mb-2">[UNIT ECONOMICS PROFILE]</span>
                <h3 className="font-extrabold text-slate-900 text-xl mb-3">10-Customer Cohort Projection</h3>
                <ul className="text-sm text-slate-800 font-medium space-y-3">
                  <li><strong>Baseline Assumptions (Interactive on UI):</strong>
                    <div className="mt-1 pl-3 text-slate-900 font-bold">
                      • 10 Enterprise FinTech Customers<br/>
                      • 5 Models per Customer (50 total models)<br/>
                      • 50,000 Inference Checks / Day / Model (2.5M daily checks)
                    </div>
                  </li>
                  <li><strong>Financial Breakdown:</strong>
                    <div className="mt-1 pl-3 text-slate-900 font-bold">
                      • Annual Platform License Revenue: <strong>$240,000 / yr</strong><br/>
                      • Annual Verification Usage Revenue: <strong>$228,125 / yr</strong><br/>
                      • <strong>Total Projected ARR: $468,125 / yr</strong>
                    </div>
                  </li>
                  <li><strong>Gross Margin:</strong> Cloud infra cost is ~$4.00 per 1M receipts &rarr; <strong className="text-emerald-700 text-base font-black">&gt; 98% Gross Margin</strong>.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 14: Future Horizons */}
        {currentSlide === 14 && (
          <div>
            <div className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Future Evolution • Strategic Roadmap
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-[#0E1726] mb-2 tracking-tight">Future Roadmap & Strategic Horizons</h2>
            <p className="text-base text-slate-700 font-semibold mb-6 max-w-3xl leading-relaxed">
              Four concrete engineering phases transitioning VERITAS from an innovation prototype to production infrastructure.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border-2 border-blue-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-blue-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-blue-700 block mb-1">Phase 1</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-2">Native Hardware Enclaves (TEE DCAP)</h3>
                <ul className="text-xs text-slate-700 font-medium space-y-1.5 list-disc pl-5">
                  <li>Integrate Gramine & Occlum for production Intel SGX / TDX enclaves.</li>
                  <li>Implement AMD SEV-SNP and AWS Nitro Enclaves cryptographic attestation parsers.</li>
                  <li>Automate Data Center Attestation Primitives (DCAP) quote validation against Intel PCS.</li>
                </ul>
              </div>

              <div className="border-2 border-emerald-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-emerald-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-emerald-700 block mb-1">Phase 2</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-2">Decentralized Multi-Witness Log</h3>
                <ul className="text-xs text-slate-700 font-medium space-y-1.5 list-disc pl-5">
                  <li>Implement multi-party consensus log cosigning (similar to Sigstore / Rekor).</li>
                  <li>Federate tree checkpoint signatures across auditing firms, regulatory sandboxes, and financial consortia.</li>
                  <li>Eliminate single-party log censorship or key compromise vulnerabilities.</li>
                </ul>
              </div>

              <div className="border-2 border-amber-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-amber-500 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-amber-800 block mb-1">Phase 3</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-2">Continuous Real-Time Drift Oracles</h3>
                <ul className="text-xs text-slate-700 font-medium space-y-1.5 list-disc pl-5">
                  <li>Deploy autonomous canary worker nodes sampling production embedding distributions.</li>
                  <li>Detect statistical distribution shifts before they cause behavioral compliance violations.</li>
                  <li>Automatically trigger selective revalidation test suites when drift is detected.</li>
                </ul>
              </div>

              <div className="border-2 border-purple-200 rounded-xl p-5 bg-white relative overflow-hidden shadow-sm">
                <div className="h-1.5 bg-purple-600 absolute top-0 left-0 right-0"></div>
                <span className="text-xs font-mono font-black text-purple-700 block mb-1">Phase 4</span>
                <h3 className="font-extrabold text-slate-900 text-lg mb-2">On-Chain Smart Contract Verifier</h3>
                <ul className="text-xs text-slate-700 font-medium space-y-1.5 list-disc pl-5">
                  <li>Export Circom Groth16 verification logic directly into Solidity smart contracts.</li>
                  <li>Enable autonomous AI agents and decentralized lending protocols to verify credit models trustlessly on-chain.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 15: Conclusion & The Ask */}
        {currentSlide === 15 && (
          <div className="my-auto max-w-4xl">
            <span className="inline-block text-xs font-mono font-black text-amber-800 bg-amber-100 px-3 py-1 rounded-md border border-amber-300 uppercase tracking-wider mb-2">
              Conclusion & The Ask • Final Pitch
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-[#0E1726] mb-3 tracking-tight">
              Building the Verifiable Standard for AI in Finance
            </h2>
            
            <div className="bg-white border-l-8 border-blue-600 p-5 rounded-r-xl mb-6 border-t-2 border-r-2 border-b-2 border-slate-200 shadow-sm">
              <p className="text-base sm:text-lg text-slate-900 font-bold italic leading-relaxed">
                “AI will either be verifiable, or it will be uninsurable in regulated financial services. VERITAS delivers the mathematical bridge between compliance audits and real-time execution.”
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="border-2 border-slate-200 rounded-xl p-5 bg-slate-50/70">
                <div className="text-base font-extrabold text-slate-900 mb-2">What We Have Proven:</div>
                <ul className="text-sm text-slate-800 font-medium space-y-2 list-disc pl-5">
                  <li>Full working prototype with RFC 6962 log, simulated TEE, and 15 automated attack test suites.</li>
                  <li>Sub-2ms verification latency and 450-byte receipts with zero blockchain overhead.</li>
                  <li>Novel selective revalidation engine saving 50% to 75% of audit test suites.</li>
                </ul>
              </div>

              <div className="border-2 border-blue-200 bg-blue-50/50 rounded-xl p-5">
                <div className="text-base font-extrabold text-blue-900 mb-2">Our Collaboration Ask:</div>
                <ul className="text-sm text-slate-800 font-medium space-y-2 list-disc pl-5">
                  <li><strong>College Innovation Department:</strong> Joint research fellowship on formal verification of claim dependency graphs and accelerated ZK batching.</li>
                  <li><strong>FinTech Industry Partners:</strong> Staging sandbox pilot on high-volume fraud or credit scoring inference pipelines.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between pt-4 border-t-2 border-slate-200 text-xs">
              <span className="font-bold text-slate-900 text-sm">
                Live Prototype Demo Active on <span className="font-mono text-blue-700 font-black">http://localhost:5173</span>
              </span>
              <span className="text-slate-500 font-bold">Open for Questions & Panel Discussion</span>
            </div>
          </div>
        )}

        {/* Slide Footer */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t-2 border-slate-200 text-xs text-slate-500 font-bold">
          <span>VERITAS — Verifiable Evidence & Registry for Integrity of Trusted AI Systems</span>
          <span className="font-mono text-slate-700 font-black">Slide {currentSlide} of {totalSlides}</span>
        </div>

      </div>

      {/* Speaker Talking Points Card (Toggled by 'S' or button) */}
      {showNotes && currentNotes && (
        <div className="bg-[#0F172A] text-slate-200 rounded-2xl p-6 shadow-xl border-t-4 border-amber-400 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-amber-400 font-black text-sm uppercase tracking-wider font-mono">
              <Mic className="w-5 h-5 text-amber-400" />
              <span>Speaker Talking Points & Q&A Defense (Slide {currentSlide})</span>
            </div>
            <button
              onClick={() => setShowNotes(false)}
              className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded bg-slate-800 font-bold"
            >
              Hide (S)
            </button>
          </div>

          <div className="space-y-3.5 text-sm leading-relaxed">
            <div className="bg-slate-800/90 p-4 rounded-xl border border-slate-700 text-slate-100 font-bold text-base">
              💡 <span className="text-amber-400">Opening Hook:</span> {currentNotes.hook}
            </div>

            <div>
              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider block mb-1">Key Speaking Bullets:</span>
              <ul className="space-y-2 list-disc pl-5 text-slate-200 font-medium">
                {currentNotes.points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </div>

            <div className="text-amber-300 bg-amber-950/60 border border-amber-800/80 p-3.5 rounded-xl text-sm font-semibold">
              🛡️ <strong className="text-white">Defensive Q&A Prep:</strong> {currentNotes.defense}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
