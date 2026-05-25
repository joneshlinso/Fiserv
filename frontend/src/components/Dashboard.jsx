import React, { useState, useEffect, useRef } from 'react';
import { getTransactions, getStats } from '../api';
import { Activity, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';

function RiskBar({ score }) {
  let color = 'var(--accent-green)';
  if (score >= 40) color = 'var(--accent-purple)';
  if (score >= 70) color = 'var(--warning)';
  if (score >= 90) color = 'var(--danger)';

  const pct = Math.min((score / 100) * 100, 100);

  return (
    <div className="flex items-center gap-2">
      <span className="mono">{score}</span>
      <div className="w-16 h-1 bg-[var(--border)] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function TierBadge({ tier }) {
  let bg = 'var(--accent-green-dim)';
  let col = 'var(--accent-green)';
  
  if (tier === 'MEDIUM') {
    bg = 'rgba(167,139,250,0.12)';
    col = 'var(--accent-purple)';
  } else if (tier === 'HIGH') {
    bg = 'var(--warning-dim)';
    col = 'var(--warning)';
  } else if (tier === 'CRITICAL') {
    bg = 'var(--danger-dim)';
    col = 'var(--danger)';
  }

  return (
    <span 
      className="badge-text px-3 py-1 rounded-[20px]" 
      style={{ backgroundColor: bg, color: col }}
    >
      {tier}
    </span>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [s, t] = await Promise.all([getStats(), getTransactions()]);
        setStats(s);
        setTransactions(t);
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
    pollRef.current = setInterval(fetchData, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  const safeCount = stats ? Math.max(0, stats.total - stats.flagged_count) : 0;

  // Render signal heatmap donut (simplified)
  const renderDonut = () => {
    if (!stats) return null;
    const total = stats.total || 1;
    const crit = stats.critical_count || 0;
    const high = (stats.flagged_count || 0) - crit;
    const safe = safeCount;
    
    // Convert to percentages
    const critPct = (crit / total) * 100;
    const highPct = (high / total) * 100;
    // safe is remainder

    // Circle circumference = 2 * PI * r = ~251.2 for r=40
    const C = 251.2;
    const critDash = (critPct / 100) * C;
    const highDash = (highPct / 100) * C;

    return (
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        {/* Safe base */}
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--accent-green)" strokeWidth="8" />
        {/* High / Amber */}
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--warning)" strokeWidth="8" 
                strokeDasharray={`${highDash + critDash} ${C}`} strokeDashoffset="0" />
        {/* Critical / Red */}
        <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--danger)" strokeWidth="8" 
                strokeDasharray={`${critDash} ${C}`} strokeDashoffset="0" />
      </svg>
    );
  };

  return (
    <div className="space-y-6">
      {/* ── TOP STAT CARDS ── */}
      <div className="grid grid-cols-4 gap-6">
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <span className="caption">Total Transactions</span>
            <Activity size={16} className="text-[var(--text-secondary)]" />
          </div>
          {stats ? <div className="stat-number">{stats.total}</div> : <div className="skeleton w-16 h-8" />}
        </div>
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <span className="caption">Flagged</span>
            <AlertTriangle size={16} className="text-[var(--text-secondary)]" />
          </div>
          {stats ? <div className="stat-number" style={{color: 'var(--danger)'}}>{stats.flagged_count}</div> : <div className="skeleton w-12 h-8" />}
        </div>
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <span className="caption">Critical</span>
            <ShieldAlert size={16} className="text-[var(--text-secondary)]" />
          </div>
          {stats ? <div className="stat-number" style={{color: 'var(--warning)'}}>{stats.critical_count}</div> : <div className="skeleton w-10 h-8" />}
        </div>
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <span className="caption">Safe</span>
            <CheckCircle size={16} className="text-[var(--text-secondary)]" />
          </div>
          {stats ? <div className="stat-number" style={{color: 'var(--accent-green)'}}>{safeCount}</div> : <div className="skeleton w-16 h-8" />}
        </div>
      </div>

      <div className="flex gap-6">
        {/* ── LIVE FEED ── */}
        <div className="w-[60%] premium-card flex flex-col p-0 overflow-hidden h-[600px]">
          <div className="p-6 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="card-title">Live Feed</h3>
            <div className="flex items-center gap-2">
              <div className="live-dot" />
              <span className="caption font-bold text-[var(--accent-green)]">LIVE</span>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {!transactions ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => <div key={i} className="skeleton w-full h-10" />)}
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-[var(--bg-card)] border-b border-[var(--border)]">
                  <tr>
                    <th className="table-header py-3 px-6">Time</th>
                    <th className="table-header py-3 px-6">Payer</th>
                    <th className="table-header py-3 px-6 text-right">Amount</th>
                    <th className="table-header py-3 px-6">Risk Score</th>
                    <th className="table-header py-3 px-6">Tier</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {transactions.map((txn, idx) => (
                    <React.Fragment key={txn.txn_id || idx}>
                      <tr 
                        onClick={() => setExpandedId(expandedId === txn.txn_id ? null : txn.txn_id)}
                        className={`cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors animate-row-enter ${idx !== 0 ? 'border-t border-[var(--border)] border-opacity-30' : ''}`}
                      >
                        <td className="py-4 px-6 text-[var(--text-secondary)] whitespace-nowrap">
                          {new Date(txn.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                        </td>
                        <td className="py-4 px-6 font-medium">{txn.payer_id}</td>
                        <td className="py-4 px-6 amount text-right">₹{Number(txn.amount).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6"><RiskBar score={txn.risk_score} /></td>
                        <td className="py-4 px-6"><TierBadge tier={txn.risk_tier} /></td>
                      </tr>
                      
                      {expandedId === txn.txn_id && (
                        <tr className="bg-[var(--bg-base)] border-t border-[var(--border)]">
                          <td colSpan="5" className="p-6">
                            <div className="space-y-4 animate-slide-up-fade">
                              <div className="space-y-2">
                                {txn.signals.map((sig, i) => (
                                  <div key={i} className="flex items-center gap-4 text-xs">
                                    <span className="w-32 font-medium text-[var(--text-secondary)]">{sig.name}</span>
                                    <div className="flex-1 max-w-[200px] flex items-center gap-2">
                                      <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-[var(--accent-purple)] rounded-full transition-all duration-300"
                                          style={{ width: `${sig.sub_score}%` }} 
                                        />
                                      </div>
                                    </div>
                                    <span className="mono w-8">{sig.sub_score}</span>
                                    {sig.reason !== 'SAFE' && (
                                      <span className="bg-[var(--warning-dim)] text-[var(--warning)] px-2 py-0.5 rounded text-[10px]">
                                        {sig.reason}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                              <div 
                                className="mt-4 p-3 font-serif italic text-sm text-[var(--text-primary)]"
                                style={{
                                  background: 'rgba(167,139,250,0.08)',
                                  borderLeft: '2px solid var(--accent-purple)',
                                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0'
                                }}
                              >
                                {txn.verdict}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-6 text-center caption">No transactions.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── SIGNAL HEATMAP ── */}
        <div className="w-[40%] premium-card flex flex-col">
          <h3 className="card-title mb-6">Signal Activity</h3>
          
          <div className="space-y-4 mb-8 flex-1">
            {!stats ? (
              [...Array(5)].map((_, i) => <div key={i} className="skeleton w-full h-6" />)
            ) : (
              stats.top_rules?.map((ruleObj, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 truncate">{ruleObj.rule}</span>
                  <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full" 
                      style={{ 
                        width: `${Math.min((ruleObj.count / (stats.flagged_count || 1)) * 100, 100)}%`,
                        background: 'var(--accent-purple)'
                      }} 
                    />
                  </div>
                  <span className="mono text-xs">{ruleObj.count}</span>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-[var(--border)] pt-6 flex items-center justify-center gap-8">
            {renderDonut()}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[var(--danger)]"></span>
                <span className="text-[var(--text-secondary)]">Critical Risk</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[var(--warning)]"></span>
                <span className="text-[var(--text-secondary)]">High Risk</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]"></span>
                <span className="text-[var(--text-secondary)]">Safe</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
