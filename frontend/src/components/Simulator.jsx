import React, { useState, useEffect, useRef } from 'react';
import { evaluateTransaction, uploadCSV, getExportCSVUrl } from '../api';
import { ShieldAlert, AlertTriangle, CheckCircle, Network, Download } from 'lucide-react';

const PRESETS = {
  safe: {
    label: 'Safe Transaction',
    color: 'var(--accent-green)',
    data: {
      payer_id: 'USER_ALICE', payee_id: 'MERCHANT_GROCERY', amount: '350',
      timestamp: new Date().toISOString().slice(0, 16), location: 'Mumbai', device_id: 'DEV_ALICE_PHONE',
    },
  },
  suspicious: {
    label: 'Suspicious',
    color: 'var(--warning)',
    data: {
      payer_id: 'USER_BOB', payee_id: 'MERCHANT_NEW_SHOP', amount: '7500',
      timestamp: new Date().toISOString().slice(0, 16), location: 'Delhi', device_id: 'DEV_BOB_NEW',
    },
  },
  critical: {
    label: 'Critical Scenario',
    color: 'var(--danger)',
    data: {
      payer_id: 'USER_CHARLIE', payee_id: 'MERCHANT_UNKNOWN_X', amount: '18000',
      timestamp: (() => { const d = new Date(); d.setHours(2, 14, 0); return d.toISOString().slice(0, 16); })(),
      location: 'Unknown_City', device_id: 'DEV_BRAND_NEW',
    },
  },
};

function TierBadge({ tier }) {
  let bg = 'var(--accent-green-dim)';
  let col = 'var(--accent-green)';
  if (tier === 'MEDIUM') { bg = 'rgba(167,139,250,0.12)'; col = 'var(--accent-purple)'; } 
  else if (tier === 'HIGH') { bg = 'var(--warning-dim)'; col = 'var(--warning)'; } 
  else if (tier === 'CRITICAL') { bg = 'var(--danger-dim)'; col = 'var(--danger)'; }

  return <span className="badge-text px-4 py-1.5 rounded-[20px]" style={{ backgroundColor: bg, color: col }}>{tier}</span>;
}

function AnimatedScore({ value, tier }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(end * ease));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);

  let col = 'var(--accent-green)';
  if (tier === 'MEDIUM') col = 'var(--accent-purple)';
  if (tier === 'HIGH') col = 'var(--warning)';
  if (tier === 'CRITICAL') col = 'var(--danger)';

  return <div className="mono text-[60px] leading-none mb-4" style={{ color: col }}>{displayValue}</div>;
}

export default function Simulator() {
  const [form, setForm] = useState({ ...PRESETS.safe.data });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef(null);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = await evaluateTransaction(payload);
      setTimeout(() => setResult(res), 100); // slight delay for re-triggering animation
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* ── LEFT: FORM ── */}
      <div className="w-1/2 premium-card flex flex-col">
        <h3 className="card-title mb-6">Evaluate Transaction</h3>
        
        <div className="flex gap-3 mb-6">
          {Object.entries(PRESETS).map(([k, p]) => (
            <button
              key={k}
              type="button"
              onClick={() => { setForm({...p.data}); setResult(null); }}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-transparent border transition-colors hover:bg-[var(--bg-card-hover)]"
              style={{ borderColor: p.color, color: p.color }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block caption mb-1">Payer ID</label>
              <input name="payer_id" value={form.payer_id} onChange={handleChange} required
                className="w-full bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] px-[14px] py-[10px] font-sans text-sm focus:border-[var(--accent-purple)] focus:outline-none" />
            </div>
            <div>
              <label className="block caption mb-1">Payee ID</label>
              <input name="payee_id" value={form.payee_id} onChange={handleChange} required
                className="w-full bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] px-[14px] py-[10px] font-sans text-sm focus:border-[var(--accent-purple)] focus:outline-none" />
            </div>
            <div>
              <label className="block caption mb-1">Amount</label>
              <input name="amount" type="number" value={form.amount} onChange={handleChange} required
                className="w-full bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] px-[14px] py-[10px] font-sans text-sm focus:border-[var(--accent-purple)] focus:outline-none mono" />
            </div>
            <div>
              <label className="block caption mb-1">Location</label>
              <input name="location" value={form.location} onChange={handleChange} required
                className="w-full bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] px-[14px] py-[10px] font-sans text-sm focus:border-[var(--accent-purple)] focus:outline-none" />
            </div>
            <div>
              <label className="block caption mb-1">Timestamp</label>
              <input name="timestamp" type="datetime-local" value={form.timestamp} onChange={handleChange} required
                className="w-full bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] px-[14px] py-[10px] font-sans text-sm focus:border-[var(--accent-purple)] focus:outline-none" />
            </div>
            <div>
              <label className="block caption mb-1">Device ID</label>
              <input name="device_id" value={form.device_id} onChange={handleChange} required
                className="w-full bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] text-[var(--text-primary)] px-[14px] py-[10px] font-sans text-sm focus:border-[var(--accent-purple)] focus:outline-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-[var(--accent-purple)] text-[#0D0D0F] font-semibold text-[15px] py-[12px] rounded-[var(--radius-sm)] hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Evaluating...' : 'Evaluate'}
          </button>
        </form>

        <div className="mt-8">
          <label className="block caption mb-2">Batch Processing</label>
          <div className="border-2 border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-5 text-center transition-colors hover:border-[var(--accent-purple)] hover:bg-[var(--accent-purple-dim)] cursor-pointer relative">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".csv" />
            <span className="text-[var(--text-secondary)] text-sm font-medium">Drop CSV or click to upload</span>
          </div>
          <div className="mt-3 flex justify-end">
            <a href={getExportCSVUrl()} download className="flex items-center gap-1.5 text-xs text-[var(--accent-purple)] hover:underline">
              <Download size={14} /> Download Flagged
            </a>
          </div>
        </div>
      </div>

      {/* ── RIGHT: RESULT ── */}
      <div className="w-1/2">
        {result && (
          <div className="premium-card flex flex-col items-center animate-slide-up-fade">
            <TierBadge tier={result.risk_tier} />
            <div className="mt-4" />
            <AnimatedScore value={result.risk_score} tier={result.risk_tier} />
            
            <div 
              className="w-full p-4 mt-2 font-serif italic text-sm text-[var(--text-primary)] text-center rounded-[var(--radius-sm)]"
              style={{ background: 'rgba(167,139,250,0.08)', borderLeft: '2px solid var(--accent-purple)' }}
            >
              {result.verdict}
            </div>

            <div className="w-full mt-8 space-y-3">
              <h4 className="caption mb-4 uppercase tracking-wider text-[var(--text-tertiary)]">Signal Breakdown</h4>
              {result.signals.map((sig, i) => (
                <div key={i} className="flex flex-col gap-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{sig.name}</span>
                    <span className="mono">{sig.sub_score}/100</span>
                  </div>
                  <div className="w-full h-1 bg-[var(--border)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--text-secondary)] rounded-full"
                      style={{ width: `${sig.sub_score}%` }} 
                    />
                  </div>
                  {sig.reason !== 'SAFE' && (
                    <span className="text-[10px] text-[var(--warning)] mt-0.5">{sig.reason}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="w-full mt-8 p-3 rounded-[var(--radius-sm)] border border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network size={16} className="text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">Linked to flagged node</span>
              </div>
              <span className={`text-sm font-bold ${result.top_reasons?.includes('LINKED_TO_FRAUD_NODE') ? 'text-[var(--danger)]' : 'text-[var(--accent-green)]'}`}>
                {result.top_reasons?.includes('LINKED_TO_FRAUD_NODE') ? 'YES' : 'NO'}
              </span>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
