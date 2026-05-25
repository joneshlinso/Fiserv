import React from 'react';
import { Activity, ShieldAlert, ShieldCheck, ShieldAlert as MediumIcon, IndianRupee } from 'lucide-react';

export default function FraudMetrics({ metrics }) {
  const { totalTransactions, alertCounts, fraudRate, totalVolume } = metrics;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {/* Total Volume */}
      <div className="glass-panel rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Volume</p>
            <h3 className="text-2xl font-bold mt-1 text-white flex items-center">
              <IndianRupee className="w-5 h-5 text-indigo-400" />
              {totalVolume.toLocaleString('en-IN')}
            </h3>
          </div>
          <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
            <IndianRupee className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 text-xs text-indigo-300 font-medium">Evaluated pipeline volume</div>
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
      </div>

      {/* Total Transactions */}
      <div className="glass-panel rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Transactions</p>
            <h3 className="text-2xl font-bold mt-1 text-white">{totalTransactions}</h3>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Activity className="w-5 h-5 animate-pulse-slow" />
          </div>
        </div>
        <div className="mt-4 text-xs text-blue-300 font-medium">Active streaming requests</div>
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl"></div>
      </div>

      {/* Low Risk */}
      <div className="glass-panel rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Low Risk</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-400">{alertCounts.LOW}</h3>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 text-xs text-emerald-300 font-medium">
          {totalTransactions > 0 ? ((alertCounts.LOW / totalTransactions) * 100).toFixed(0) : 0}% of transactions
        </div>
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl"></div>
      </div>

      {/* Medium Risk */}
      <div className="glass-panel rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Medium Risk</p>
            <h3 className="text-2xl font-bold mt-1 text-amber-400">{alertCounts.MEDIUM}</h3>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
            <MediumIcon className="w-5 h-5" />
          </div>
        </div>
        <div className="mt-4 text-xs text-amber-300 font-medium">
          {totalTransactions > 0 ? ((alertCounts.MEDIUM / totalTransactions) * 100).toFixed(0) : 0}% of transactions
        </div>
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl"></div>
      </div>

      {/* High Risk (Fraud) */}
      <div className="glass-panel rounded-2xl p-5 shadow-lg border border-white/5 relative overflow-hidden flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">High Risk Alerts</p>
            <h3 className="text-2xl font-bold mt-1 text-rose-500">{alertCounts.HIGH}</h3>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
          </div>
        </div>
        <div className="mt-4 text-xs text-rose-400 font-medium">
          Fraud Rate: <span className="font-bold">{fraudRate}%</span>
        </div>
        <div className="absolute right-0 bottom-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl"></div>
      </div>
    </div>
  );
}
