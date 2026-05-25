import React, { useState, useEffect, useRef } from 'react';
import { getTransactions, getStats } from '../api';
import {
  Activity, ShieldAlert, CheckCircle, AlertTriangle,
  ShieldCheck, AlertOctagon,
} from 'lucide-react';

/* ── Risk tier icon map (a11y: icon + color, never color alone) ── */
const TIER_CONFIG = {
  LOW:      { bg: 'var(--accent-green-dim)',      col: 'var(--accent-green)',  Icon: ShieldCheck,  label: 'LOW' },
  MEDIUM:   { bg: 'rgba(167,139,250,0.12)',        col: 'var(--accent-purple)', Icon: ShieldAlert,  label: 'MEDIUM' },
  HIGH:     { bg: 'var(--warning-dim)',            col: 'var(--warning)',       Icon: AlertTriangle, label: 'HIGH' },
  CRITICAL: { bg: 'var(--danger-dim)',             col: 'var(--danger)',        Icon: AlertOctagon,  label: 'CRITICAL' },
};

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

/* ── a11y: icon + label badge so color is never the only signifier ── */
function TierBadge({ tier }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.LOW;
  const { bg, col, Icon, label } = cfg;
  return (
    <span
      className="badge-text px-2.5 py-1 rounded-[20px] inline-flex items-center gap-1"
      style={{ backgroundColor: bg, color: col }}
      aria-label={`Risk tier: ${label}`}
    >
      <Icon size={11} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}

/* ── Stacked Horizontal Bar Chart (replaces donut) ── */
function RiskStackedBar({ stats }) {
  if (!stats) return (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => <div key={i} className="skeleton w-full h-5 rounded" />)}
    </div>
  );

  const total = Math.max(stats.total || 1, 1);
  const critical = stats.critical_count || 0;
  const high = Math.max((stats.flagged_count || 0) - critical, 0);
  const safe = Math.max(total - (stats.flagged_count || 0), 0);

  const tiers = [
    { label: 'Critical', count: critical, color: 'var(--danger)',        bg: 'var(--danger-dim)' },
    { label: 'High',     count: high,     color: 'var(--warning)',       bg: 'var(--warning-dim)' },
    { label: 'Safe',     count: safe,     color: 'var(--accent-green)',  bg: 'var(--accent-green-dim)' },
  ];

  return (
    <div className="space-y-2.5">
      {/* Stacked bar */}
      <div className="w-full h-6 flex rounded-[6px] overflow-hidden gap-[2px]" role="img" aria-label="Risk tier distribution bar chart">
        {tiers.map(({ label, count, color }) => {
          const pct = (count / total) * 100;
          return pct > 0 ? (
            <div
              key={label}
              className="risk-bar-segment h-full flex items-center justify-center"
              style={{ width: `${pct}%`, backgroundColor: color, minWidth: count > 0 ? 4 : 0 }}
              title={`${label}: ${count} (${pct.toFixed(1)}%)`}
            />
          ) : null;
        })}
      </div>

      {/* Per-tier rows */}
      {tiers.map(({ label, count, color, bg }) => {
        const pct = ((count / total) * 100).toFixed(1);
        return (
          <div key={label} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
            <span className="text-xs text-[var(--text-secondary)] w-14">{label}</span>
            <div className="flex-1 h-1.5 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="risk-bar-segment h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="mono text-xs" style={{ color }}>{count}</span>
            <span className="text-[10px] text-[var(--text-tertiary)] w-10 text-right">{pct}%</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Dashboard({ compact = false }) {
  const [stats, setStats] = useState(null);
  const [transactions, setTransactions] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const pollRef = useRef(null);

  // Table row py driven by CSS custom property via compact mode
  const rowPy = compact ? 'py-[10px]' : 'py-4';

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

  return (
    <div className="space-y-6">
      {/* ── TOP STAT CARDS ── */}
      <div className="grid grid-cols-4 gap-6">
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <span className="caption">Total Transactions</span>
            <Activity size={16} className="text-[var(--text-secondary)]" aria-hidden="true" />
          </div>
          {stats ? <div className="stat-number">{stats.total}</div> : <div className="skeleton w-16 h-8" />}
        </div>
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <span className="caption">Flagged</span>
            <AlertTriangle size={16} className="text-[var(--text-secondary)]" aria-hidden="true" />
          </div>
          {stats ? <div className="stat-number" style={{color: 'var(--danger)'}}>{stats.flagged_count}</div> : <div className="skeleton w-12 h-8" />}
        </div>
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <span className="caption">Critical</span>
            <ShieldAlert size={16} className="text-[var(--text-secondary)]" aria-hidden="true" />
          </div>
          {stats ? <div className="stat-number" style={{color: 'var(--warning)'}}>{stats.critical_count}</div> : <div className="skeleton w-10 h-8" />}
        </div>
        <div className="premium-card">
          <div className="flex items-center justify-between mb-4">
            <span className="caption">Safe</span>
            <CheckCircle size={16} className="text-[var(--text-secondary)]" aria-hidden="true" />
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
              <div className="live-dot" aria-hidden="true" />
              <span className="caption font-bold text-[var(--accent-green)]" aria-live="polite">LIVE</span>
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
                    <th className="table-header py-3 px-6" scope="col">Time</th>
                    <th className="table-header py-3 px-6" scope="col">Payer</th>
                    <th className="table-header py-3 px-6 text-right" scope="col">Amount</th>
                    <th className="table-header py-3 px-6" scope="col">Risk Score</th>
                    <th className="table-header py-3 px-6" scope="col">Tier</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {transactions.map((txn, idx) => (
                    <React.Fragment key={txn.txn_id || idx}>
                      <tr 
                        onClick={() => setExpandedId(expandedId === txn.txn_id ? null : txn.txn_id)}
                        className={`cursor-pointer hover:bg-[var(--bg-card-hover)] transition-colors animate-row-enter ${idx !== 0 ? 'border-t border-[var(--border)] border-opacity-30' : ''}`}
                        aria-expanded={expandedId === txn.txn_id}
                      >
                        <td className={`${rowPy} px-6 text-[var(--text-secondary)] whitespace-nowrap transition-all duration-200`}>
                          {new Date(txn.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                        </td>
                        <td className={`${rowPy} px-6 font-medium transition-all duration-200`}>{txn.payer_id}</td>
                        <td className={`${rowPy} px-6 amount text-right transition-all duration-200`}>₹{Number(txn.amount).toLocaleString('en-IN')}</td>
                        <td className={`${rowPy} px-6 transition-all duration-200`}><RiskBar score={txn.risk_score} /></td>
                        <td className={`${rowPy} px-6 transition-all duration-200`}><TierBadge tier={txn.risk_tier} /></td>
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
                      <td colSpan="5" className="p-6 text-center caption">No transactions yet. Use the Simulator to generate data.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── SIGNAL HEATMAP + STACKED BAR ── */}
        <div className="w-[40%] premium-card flex flex-col">
          <h3 className="card-title mb-6">Signal Activity</h3>
          
          {/* Top rules */}
          <div className="space-y-4 mb-8 flex-1">
            {!stats ? (
              [...Array(5)].map((_, i) => <div key={i} className="skeleton w-full h-6" />)
            ) : (
              stats.top_rules?.map((ruleObj, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 truncate text-[var(--text-secondary)]">{ruleObj.rule}</span>
                  <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500" 
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

          {/* ── STACKED BAR CHART (replaces donut) ── */}
          <div className="border-t border-[var(--border)] pt-5">
            <p className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] mb-4">Risk Distribution</p>
            <RiskStackedBar stats={stats} />
          </div>
        </div>
      </div>
    </div>
  );
}
