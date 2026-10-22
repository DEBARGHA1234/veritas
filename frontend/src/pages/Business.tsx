import React, { useState } from 'react';
import { TrendingUp, DollarSign, Users, Cpu, Activity, Calculator, AlertCircle } from 'lucide-react';

export const Business: React.FC = () => {
  // Editable Assumptions with mandated defaults
  const [customers, setCustomers] = useState(10);
  const [modelsPerCustomer, setModelsPerCustomer] = useState(5);
  const [jobsPerDayPerModel, setJobsPerDayPerModel] = useState(50000);
  const [pricePerModelPerMonth, setPricePerModelPerMonth] = useState(400);
  const [pricePerMillionReceipts, setPricePerMillionReceipts] = useState(25);
  const [infraCostPerMillionReceipts, setInfraCostPerMillionReceipts] = useState(4);

  // Computed values
  const totalModels = customers * modelsPerCustomer;
  const receiptsPerDay = totalModels * jobsPerDayPerModel;
  const receiptsPerSecond = receiptsPerDay / 86400;
  const receiptsPerMonth = receiptsPerDay * 30; // 30-day billing month

  // Revenue
  const modelSubRevenueMonthly = totalModels * pricePerModelPerMonth;
  const receiptUsageRevenueMonthly = (receiptsPerMonth / 1_000_000) * pricePerMillionReceipts;
  const totalMonthlyRevenue = modelSubRevenueMonthly + receiptUsageRevenueMonthly;
  const annualRevenue = totalMonthlyRevenue * 12;

  // Costs & Margins
  const monthlyInfraCost = (receiptsPerMonth / 1_000_000) * infraCostPerMillionReceipts;
  const monthlyGrossProfit = totalMonthlyRevenue - monthlyInfraCost;
  const grossMarginPct = totalMonthlyRevenue > 0 ? (monthlyGrossProfit / totalMonthlyRevenue) * 100 : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto py-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-amber-500" />
            <span>Economic & Unit Economics Model</span>
          </h1>
          <p className="text-sm text-slate-500">
            Interactive financial modeling based on registry subscription and cryptographic verification throughput.
          </p>
        </div>

        {/* Mandatory Honesty Label (Rule 4) */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold shadow-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span>Illustrative, not a forecast</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* User-Editable Assumptions (5 Cols) */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-slate-700" />
              <span>User-Editable Assumptions</span>
            </h2>
            <button
              onClick={() => {
                setCustomers(10);
                setModelsPerCustomer(5);
                setJobsPerDayPerModel(50000);
                setPricePerModelPerMonth(400);
                setPricePerMillionReceipts(25);
                setInfraCostPerMillionReceipts(4);
              }}
              className="text-xs text-blue-600 hover:underline font-semibold"
            >
              Reset Defaults
            </button>
          </div>

          <div className="space-y-4 text-xs font-semibold text-slate-700">
            <div>
              <div className="flex justify-between mb-1">
                <span>Enterprise Customers</span>
                <span className="font-mono text-slate-900 font-bold">{customers}</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={customers}
                onChange={(e) => setCustomers(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Models per Customer</span>
                <span className="font-mono text-slate-900 font-bold">{modelsPerCustomer}</span>
              </div>
              <input
                type="range"
                min="1"
                max="25"
                value={modelsPerCustomer}
                onChange={(e) => setModelsPerCustomer(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Jobs / Day / Model</span>
                <span className="font-mono text-slate-900 font-bold">{jobsPerDayPerModel.toLocaleString()}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="200000"
                step="5000"
                value={jobsPerDayPerModel}
                onChange={(e) => setJobsPerDayPerModel(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Price per Model per Month ($)</span>
                <span className="font-mono text-slate-900 font-bold">${pricePerModelPerMonth}</span>
              </div>
              <input
                type="number"
                min="50"
                max="2000"
                step="50"
                value={pricePerModelPerMonth}
                onChange={(e) => setPricePerModelPerMonth(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Price per Million Receipts ($)</span>
                <span className="font-mono text-slate-900 font-bold">${pricePerMillionReceipts}</span>
              </div>
              <input
                type="number"
                min="5"
                max="100"
                step="5"
                value={pricePerMillionReceipts}
                onChange={(e) => setPricePerMillionReceipts(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded font-mono"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Infra Cost per Million Receipts ($)</span>
                <span className="font-mono text-slate-900 font-bold">${infraCostPerMillionReceipts}</span>
              </div>
              <input
                type="number"
                min="1"
                max="20"
                step="1"
                value={infraCostPerMillionReceipts}
                onChange={(e) => setInfraCostPerMillionReceipts(Number(e.target.value))}
                className="w-full p-2 border border-slate-300 rounded font-mono"
              />
            </div>
          </div>
        </div>

        {/* Calculated Financials Column (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Top Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0E1726] text-white p-5 rounded-xl border border-slate-800 shadow-sm">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Annual Revenue</span>
              <p className="text-3xl font-black mt-2 font-mono">
                ${Math.round(annualRevenue).toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">ARR at current scale</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Margin</span>
              <p className="text-3xl font-black text-emerald-600 mt-2 font-mono">
                {grossMarginPct.toFixed(1)}%
              </p>
              <p className="text-xs text-slate-500 mt-1">Low verification compute overhead</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Throughput</span>
              <p className="text-3xl font-black text-purple-600 mt-2 font-mono">
                {receiptsPerSecond.toFixed(1)} <span className="text-sm font-sans font-bold text-slate-500">req/s</span>
              </p>
              <p className="text-xs text-slate-500 mt-1">{(receiptsPerDay / 1_000_000).toFixed(2)}M receipts / day</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Monthly Financial Breakdown
            </h3>
            
            <div className="divide-y divide-slate-100 text-sm">
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Model Registry Subscriptions ({totalModels} models @ ${pricePerModelPerMonth}/mo):</span>
                <span className="font-mono font-bold text-slate-900">${Math.round(modelSubRevenueMonthly).toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between">
                <span className="text-slate-600">Receipt Verification Usage ({(receiptsPerMonth / 1_000_000).toFixed(1)}M receipts @ ${pricePerMillionReceipts}/M):</span>
                <span className="font-mono font-bold text-slate-900">${Math.round(receiptUsageRevenueMonthly).toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between font-bold text-slate-900 bg-slate-50 px-3 rounded">
                <span>Total Monthly Revenue (MRR):</span>
                <span className="font-mono text-emerald-600">${Math.round(totalMonthlyRevenue).toLocaleString()}</span>
              </div>
              <div className="py-2.5 flex justify-between text-rose-700">
                <span>Infrastructure & Log Verification Cost (@ ${infraCostPerMillionReceipts}/M):</span>
                <span className="font-mono font-bold">-${Math.round(monthlyInfraCost).toLocaleString()}</span>
              </div>
              <div className="py-3 flex justify-between font-extrabold text-base border-t-2 border-slate-800">
                <span className="text-slate-900">Monthly Gross Profit:</span>
                <span className="font-mono text-slate-900">${Math.round(monthlyGrossProfit).toLocaleString()}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
