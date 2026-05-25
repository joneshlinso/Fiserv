import React, { useState, useEffect } from 'react';
import { getWeights, setWeights, getTransactions } from '../api';

const SIGNAL_LABELS = {
  velocity: 'Velocity',
  merchant_trust: 'Merchant Trust',
  device_entropy: 'Device Entropy',
  geo_jump: 'Geo Jump',
  time_anomaly: 'Time Anomaly',
};

function TierBadge({ tier }) {
  let bg = 'var(--accent-green-dim)'; let col = 'var(--accent-green)';
  if (tier === 'MEDIUM') { bg = 'rgba(167,139,250,0.12)'; col = 'var(--accent-purple)'; }
  else if (tier === 'HIGH') { bg = 'var(--warning-dim)'; col = 'var(--warning)'; }
  else if (tier === 'CRITICAL') { bg = 'var(--danger-dim)'; col = 'var(--danger)'; }
  return <span className="badge-text px-2 py-0.5 rounded-[10px] text-[10px]" style={{ backgroundColor: bg, color: col }}>{tier}</span>;
}

export default function RuleTuner() {
  const [sliders, setSliders] = useState({
    velocity: 30, merchant_trust: 25, device_entropy: 20, geo_jump: 15, time_anomaly: 10,
  });
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    getWeights().then((w) => {
      setSliders({
        velocity: Math.round(w.velocity * 100),
        merchant_trust: Math.round(w.merchant_trust * 100),
        device_entropy: Math.round(w.device_entropy * 100),
        geo_jump: Math.round(w.geo_jump * 100),
        time_anomaly: Math.round(w.time_anomaly * 100),
      });
    }).catch(() => {});
    getTransactions().then(txns => setPreview(txns.slice(0, 5))).catch(() => {});
  }, []);

  const total = Object.values(sliders).reduce((a, b) => a + b, 0) || 1;

  const handleSlider = (key, value) => {
    setSliders({ ...sliders, [key]: parseInt(value) });
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const normalised = {};
      for (const key of Object.keys(sliders)) {
        normalised[key] = sliders[key] / total;
      }
      await setWeights(normalised);
      const txns = await getTransactions();
      setPreview(txns.slice(0, 5));
      
      // trigger flash
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
      
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* ── LEFT: Config ── */}
      <div className="w-1/2 premium-card">
        <h3 className="card-title">Signal Weights</h3>
        <p className="caption mt-1 mb-8">Weights auto-normalise to 100%</p>

        <div className="space-y-6">
          {Object.entries(SIGNAL_LABELS).map(([key, label]) => {
            const pct = total > 0 ? ((sliders[key] / total) * 100).toFixed(1) : '0.0';
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
                  <span className="mono text-sm text-[var(--text-secondary)]">{pct}%</span>
                </div>
                <input
                  type="range"
                  min="0" max="100"
                  value={sliders[key]}
                  onChange={(e) => handleSlider(key, e.target.value)}
                  className="custom-slider"
                  style={{ '--val': `${sliders[key]}%`, background: `linear-gradient(to right, var(--accent-purple) ${sliders[key]}%, var(--border) ${sliders[key]}%)` }}
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={handleApply}
          disabled={loading}
          className="w-full mt-10 bg-[var(--accent-green)] text-[#0D0D0F] font-semibold text-[15px] py-[12px] rounded-[var(--radius-sm)] hover:brightness-110 transition-all disabled:opacity-50"
        >
          {loading ? 'Rescoring...' : 'Apply & Rescore'}
        </button>
      </div>

      {/* ── RIGHT: Preview ── */}
      <div className="w-1/2 premium-card">
        <h3 className="card-title">Live Rescore Preview</h3>
        <p className="caption mt-1 mb-6">Last 5 transactions with current weights applied</p>

        <div className={`space-y-3 transition-colors duration-300 ${flash ? 'bg-white/5 rounded-lg' : ''}`}>
          {preview.map((txn, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[#0D0D0F]">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--text-primary)]">{txn.payer_id.slice(0,10)}...</span>
                <span className="mono text-[10px] text-[var(--text-tertiary)]">{txn.txn_id.slice(0,8)}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="mono text-[15px] font-bold text-[var(--text-primary)]">{txn.risk_score}</span>
                <TierBadge tier={txn.risk_tier} />
              </div>
            </div>
          ))}
          {preview.length === 0 && <p className="caption text-center">No transactions available.</p>}
        </div>
      </div>
    </div>
  );
}
