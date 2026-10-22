import React from 'react';
import { 
  ShieldCheck, 
  RotateCcw, 
  Layers, 
  FileCheck2, 
  FileText, 
  Database, 
  Cpu, 
  CheckCircle, 
  AlertTriangle, 
  BarChart3, 
  TrendingUp,
  Presentation
} from 'lucide-react';
import { api } from '../api';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onReset }) => {
  const [resetting, setResetting] = React.useState(false);

  const handleReset = async () => {
    if (confirm("Reset demo database and restore fresh seed state?")) {
      try {
        setResetting(true);
        await api.resetDemo();
        onReset();
      } catch (err: any) {
        alert("Reset failed: " + err.message);
      } finally {
        setResetting(false);
      }
    }
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'passports', label: 'Passports', icon: FileCheck2 },
    { id: 'audits', label: 'Audits', icon: FileText },
    { id: 'log', label: 'Log', icon: Database },
    { id: 'runtime', label: 'Runtime', icon: Cpu },
    { id: 'verify', label: 'Verify', icon: CheckCircle },
    { id: 'attacks', label: 'Attacks', icon: AlertTriangle },
    { id: 'metrics', label: 'Metrics', icon: BarChart3 },
    { id: 'pitch', label: 'Pitch Deck', icon: Presentation },
  ];

  return (
    <header className="sticky top-0 z-50 shadow-md">
      {/* Non-negotiable Persistent Amber Banner (Rule 1) */}
      <div className="bg-amber-400 text-slate-900 px-4 py-1.5 text-center text-sm font-semibold tracking-wide flex items-center justify-center gap-2 border-b border-amber-500 shadow-inner">
        <AlertTriangle className="w-4 h-4 text-slate-900 animate-pulse" />
        <span>Attestation: SIMULATED (no hardware TEE)</span>
        <span className="text-xs px-2 py-0.5 bg-amber-500/40 rounded border border-amber-600/40 font-mono">DEMO KEYS ONLY</span>
      </div>

      {/* Main Header Bar */}
      <div className="bg-[#0E1726] border-b border-slate-800 text-white px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-400 flex items-center justify-center shadow-lg shadow-amber-400/20 text-[#0E1726]">
              <ShieldCheck className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-white font-mono">VERITAS</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-amber-400 border border-slate-700 font-mono">
                  PROTOTYPE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Verifiable Evidence & Registry for Integrity of Trusted AI Systems
              </p>
            </div>
          </div>

          {/* Reset Demo Button */}
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-300 border border-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${resetting ? 'animate-spin text-amber-400' : ''}`} />
            <span>{resetting ? 'Resetting...' : 'Reset demo'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-[#152238] border-b border-slate-800 px-6">
        <div className="max-w-7xl mx-auto flex overflow-x-auto scrollbar-none gap-1 py-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-400 text-slate-950 font-bold shadow-md shadow-amber-400/10'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
