import React, { useState } from 'react';
import { Header } from './components/Header';
import { Overview } from './pages/Overview';
import { Passports } from './pages/Passports';
import { Audits } from './pages/Audits';
import { Log } from './pages/Log';
import { Runtime } from './pages/Runtime';
import { Verify } from './pages/Verify';
import { Attacks } from './pages/Attacks';
import { Metrics } from './pages/Metrics';
import { Business } from './pages/Business';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeReceiptForVerify, setActiveReceiptForVerify] = useState<any>(null);
  const [activeQuoteForVerify, setActiveQuoteForVerify] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNavigateToVerify = (receipt: any, quote: any) => {
    setActiveReceiptForVerify(receipt);
    setActiveQuoteForVerify(quote);
    setActiveTab('verify');
  };

  const handleReset = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onReset={handleReset}
      />

      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6" key={refreshKey}>
        {activeTab === 'overview' && <Overview onNavigate={setActiveTab} />}
        {activeTab === 'passports' && <Passports />}
        {activeTab === 'audits' && <Audits />}
        {activeTab === 'log' && <Log />}
        {activeTab === 'runtime' && <Runtime onNavigateToVerify={handleNavigateToVerify} />}
        {activeTab === 'verify' && (
          <Verify
            initialReceipt={activeReceiptForVerify}
            initialQuote={activeQuoteForVerify}
          />
        )}
        {activeTab === 'attacks' && <Attacks />}
        {activeTab === 'metrics' && <Metrics />}
        {activeTab === 'business' && <Business />}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>VERITAS — Verifiable Evidence & Registry for Integrity of Trusted AI Systems</span>
          <span className="font-mono text-amber-600 font-semibold">Attestation: SIMULATED (no hardware TEE)</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
