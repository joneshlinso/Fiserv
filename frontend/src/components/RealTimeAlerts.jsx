import React from 'react';
import { ShieldAlert, ShieldCheck, Info } from 'lucide-react';

export default function RealTimeAlerts({ transactions }) {
  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return 'N/A';
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'HIGH':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-full w-fit">
            <ShieldAlert className="w-3.5 h-3.5" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-full w-fit">
            <Info className="w-3.5 h-3.5" />
            MEDIUM
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full w-fit">
            <ShieldCheck className="w-3.5 h-3.5" />
            LOW
          </span>
        );
    }
  };

  const getScoreColor = (score) => {
    if (score > 60) return 'text-rose-500 font-bold';
    if (score > 30) return 'text-amber-500 font-semibold';
    return 'text-emerald-400';
  };

  return (
    <div className="glass-panel rounded-2xl border border-white/5 overflow-hidden shadow-xl h-full flex flex-col">
      <div className="px-6 py-5 border-b border-white/5 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Live Transactions Feed</h2>
          <p className="text-xs text-gray-400">Incoming UPI transactions & evaluation logs</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[11px] font-medium text-emerald-400 uppercase tracking-wider">Streaming Live</span>
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-[380px] max-h-[500px]">
        {transactions.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <ShieldCheck className="w-12 h-12 text-gray-600 mb-3 animate-pulse" />
            <p className="text-sm font-semibold text-gray-400">Waiting for transaction streams...</p>
            <p className="text-xs text-gray-500 mt-1">Use the simulator to trigger payments</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[11px] font-bold text-gray-400 uppercase bg-dark-lighter/25">
                <th className="px-6 py-3.5">Time</th>
                <th className="px-6 py-3.5">Transaction ID</th>
                <th className="px-6 py-3.5">Participants</th>
                <th className="px-6 py-3.5 text-right">Amount</th>
                <th className="px-6 py-3.5 text-center">Score</th>
                <th className="px-6 py-3.5">Risk Rating</th>
                <th className="px-6 py-3.5">Flagged Violations</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-gray-300">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group animate-fade-in">
                  <td className="px-6 py-4 text-xs font-medium text-gray-400 whitespace-nowrap">
                    {formatTime(tx.timestamp)}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-indigo-300 group-hover:text-indigo-400 transition-colors whitespace-nowrap">
                    {tx.id}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-0.5 max-w-[150px] truncate">
                      <span className="text-xs text-white truncate font-medium"><span className="text-[10px] text-gray-500 mr-1">FROM:</span>{tx.payer_id}</span>
                      <span className="text-xs text-gray-400 truncate"><span className="text-[10px] text-gray-500 mr-1">TO:</span>{tx.payee_id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-white whitespace-nowrap">
                    ₹{parseFloat(tx.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`px-6 py-4 text-center font-mono ${getScoreColor(tx.risk_score)}`}>
                    {tx.risk_score}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(tx.status)}
                  </td>
                  <td className="px-6 py-4">
                    {tx.reasons && tx.reasons.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                        {tx.reasons.map((reason, idx) => (
                          <span
                            key={idx}
                            className="text-[9px] font-semibold px-2 py-0.5 bg-dark-lighter text-gray-400 border border-white/5 rounded"
                          >
                            {reason}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-emerald-500/80 font-medium">Standard behavior</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
