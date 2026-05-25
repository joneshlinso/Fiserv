import React, { useState, useEffect } from 'react';
import { RotateCcw, Send } from 'lucide-react';
import { evaluateTransaction, getWeights, setWeights, getTransactions } from '../api';

const SIGNAL_LABELS = {
  velocity: 'Velocity',
  merchant_trust: 'Merchant Trust',
  device_entropy: 'Device Entropy',
  geo_jump: 'Geo Jump',
  time_anomaly: 'Time Anomaly',
  ml_anomaly: 'ML Anomaly',
};

const DEFAULT_LOG = {
  payer_id: 'USER_TEST',
  payee_id: 'MERCHANT_UNKNOWN',
  amount: '25000',
  timestamp: new Date().toISOString().slice(0, 16),
  location: 'Pune',
  device_id: 'DEV_TEST_NEW',
};

const INPUT_CLASS = 'w-full bg-[#0D0D0F] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-purple)] transition-colors';

function TierBadge({ tier }) {
  let bg = 'var(--accent-green-dim)';
  let col = 'var(--accent-green)';
  if (tier === 'MEDIUM') { bg = 'rgba(167,139,250,0.12)'; col = 'var(--accent-purple)'; }
  else if (tier === 'HIGH') { bg = 'var(--warning-dim)'; col = 'var(--warning)'; }
  else if (tier === 'CRITICAL') { bg = 'var(--danger-dim)'; col = 'var(--danger)'; }
  return <span className="badge-text px-2 py-0.5 rounded-[10px] text-[10px]" style={{ backgroundColor: bg, color: col }}>{tier}</span>;
}

export default function RuleTuner() {
  const [sliders, setSliders] = useState({
    velocity: 25, merchant_trust: 20, device_entropy: 15, geo_jump: 10, time_anomaly: 10, ml_anomaly: 20,
  });
  const [logForm, setLogForm] = useState(DEFAULT_LOG);
  const [logResult, setLogResult] = useState(null);
  const [logError, setLogError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingLog, setSubmittingLog] = useState(false);
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
        ml_anomaly: Math.round((w.ml_anomaly ?? 0) * 100),
      });
    }).catch(() => {});
    getTransactions().then(txns => setPreview(txns.slice(0, 5))).catch(() => {});
  }, []);

  const total = Object.values(sliders).reduce((a, b) => a + b, 0) || 1;

  const handleSlider = (key, value) => {
    setSliders({ ...sliders, [key]: parseInt(value, 10) });
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
      setFlash(true);
      setTimeout(() => setFlash(false), 300);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogChange = (field, value) => {
    setLogForm({ ...logForm, [field]: value });
    setLogError('');
  };

  const handleSubmitLog = async (e) => {
    e.preventDefault();
    if (!logForm.payer_id.trim() || !logForm.payee_id.trim() || !logForm.location.trim() || !logForm.device_id.trim() || !logForm.timestamp) {
      setLogError('All transaction log fields are required.');
      return;
    }

    const amount = Number(logForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setLogError('Amount must be greater than zero.');
      return;
    }

    setSubmittingLog(true);
    setLogError('');
    try {
      const result = await evaluateTransaction({ ...logForm, amount });
      setLogResult(result);
      const txns = await getTransactions();
      setPreview(txns.slice(0, 5));
    } catch (err) {
      console.error(err);
      setLogError('Could not evaluate this transaction log.');
    } finally {
      setSubmittingLog(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div className="premium-card">
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
                  min="0"
                  max="100"
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

      <div className="premium-card">
        <h3 className="card-title">Live Rescore Preview</h3>
        <p className="caption mt-1 mb-6">Last 5 transactions with current weights applied</p>

        <div className={`space-y-3 transition-colors duration-300 ${flash ? 'bg-white/5 rounded-lg' : ''}`}>
          {preview.map((txn, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[#0D0D0F]">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-[var(--text-primary)]">{txn.payer_id.slice(0, 10)}...</span>
                <span className="mono text-[10px] text-[var(--text-tertiary)]">{txn.txn_id.slice(0, 8)}</span>
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

      <div className="premium-card xl:col-span-2">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <form onSubmit={handleSubmitLog} className="flex-1">
            <h3 className="card-title">Transaction Log Input</h3>
            <p className="caption mt-1 mb-6">Run a manual transaction through the weighted rules and ML anomaly signal.</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="space-y-2">
                <span className="caption">Payer ID</span>
                <input className={INPUT_CLASS} value={logForm.payer_id} onChange={(e) => handleLogChange('payer_id', e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="caption">Payee ID</span>
                <input className={INPUT_CLASS} value={logForm.payee_id} onChange={(e) => handleLogChange('payee_id', e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="caption">Amount</span>
                <input type="number" min="1" step="0.01" className={`${INPUT_CLASS} mono`} value={logForm.amount} onChange={(e) => handleLogChange('amount', e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="caption">Timestamp</span>
                <input type="datetime-local" className={INPUT_CLASS} value={logForm.timestamp} onChange={(e) => handleLogChange('timestamp', e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="caption">Location</span>
                <input className={INPUT_CLASS} value={logForm.location} onChange={(e) => handleLogChange('location', e.target.value)} />
              </label>
              <label className="space-y-2">
                <span className="caption">Device ID</span>
                <input className={INPUT_CLASS} value={logForm.device_id} onChange={(e) => handleLogChange('device_id', e.target.value)} />
              </label>
            </div>

            {logError && <p className="mt-4 text-sm text-[var(--danger)]">{logError}</p>}

            <div className="flex flex-wrap gap-3 mt-6">
              <button
                type="submit"
                disabled={submittingLog}
                className="inline-flex items-center gap-2 bg-[var(--accent-green)] text-[#0D0D0F] font-semibold text-sm px-4 py-2 rounded-[var(--radius-sm)] hover:brightness-110 transition-all disabled:opacity-50"
              >
                <Send size={16} /> {submittingLog ? 'Evaluating...' : 'Evaluate Log'}
              </button>
              <button
                type="button"
                onClick={() => { setLogForm(DEFAULT_LOG); setLogResult(null); setLogError(''); }}
                className="inline-flex items-center gap-2 border border-[var(--border)] text-[var(--text-secondary)] text-sm px-4 py-2 rounded-[var(--radius-sm)] hover:text-[var(--text-primary)] transition-colors"
              >
                <RotateCcw size={16} /> Reset
              </button>
            </div>
          </form>

          <div className="w-full lg:w-[320px] border border-[var(--border)] rounded-[var(--radius-sm)] bg-[#0D0D0F] p-4">
            <p className="caption mb-3">Latest Evaluation</p>
            {logResult ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="mono text-4xl font-bold text-[var(--text-primary)]">{logResult.risk_score}</span>
                  <TierBadge tier={logResult.risk_tier} />
                </div>
                <div className="space-y-2">
                  {logResult.signals?.map((sig) => (
                    <div key={sig.name} className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-[var(--text-secondary)] truncate">{sig.name}</span>
                      <span className="mono text-[var(--text-primary)]">{sig.sub_score}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="caption">No manual log evaluated yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
