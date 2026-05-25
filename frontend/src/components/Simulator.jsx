import React, { useState, useCallback } from 'react';
import { evaluateTransaction, getExportCSVUrl } from '../api';
import {
  ShieldAlert, AlertTriangle, CheckCircle, Network, Download,
  ShieldCheck, AlertOctagon, AlertCircle,
} from 'lucide-react';

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

/* ── a11y: icon + label tier badge ── */
const TIER_CONFIG = {
  LOW:      { bg: 'var(--accent-green-dim)',   col: 'var(--accent-green)',  Icon: ShieldCheck,   label: 'LOW' },
  MEDIUM:   { bg: 'rgba(167,139,250,0.12)',     col: 'var(--accent-purple)', Icon: ShieldAlert,   label: 'MEDIUM' },
  HIGH:     { bg: 'var(--warning-dim)',         col: 'var(--warning)',       Icon: AlertTriangle, label: 'HIGH' },
  CRITICAL: { bg: 'var(--danger-dim)',          col: 'var(--danger)',        Icon: AlertOctagon,  label: 'CRITICAL' },
};

function TierBadge({ tier, large = false }) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.LOW;
  const { bg, col, Icon, label } = cfg;
  return (
    <span
      className={`badge-text inline-flex items-center gap-1.5 rounded-[20px] ${large ? 'px-4 py-1.5 text-[13px]' : 'px-2.5 py-1'}`}
      style={{ backgroundColor: bg, color: col }}
      aria-label={`Risk tier: ${label}`}
    >
      <Icon size={large ? 14 : 11} strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}

function AnimatedScore({ value, tier }) {
  const [displayValue, setDisplayValue] = useState(0);
  
  React.useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 600;
    const startTime = performance.now();

    const animate = (time) => {
      const elapsed = time - startTime;
      const progress = Math.min(elapsed / duration, 1);
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

/* ── Inline Validation ── */
const VALIDATORS = {
  payer_id:  v => !v.trim() ? 'Payer ID is required' : v.includes(' ') ? 'No spaces allowed' : '',
  payee_id:  v => !v.trim() ? 'Payee ID is required' : v.includes(' ') ? 'No spaces allowed' : '',
  device_id: v => !v.trim() ? 'Device ID is required' : v.includes(' ') ? 'No spaces allowed' : '',
  location:  v => !v.trim() ? 'Location is required' : '',
  amount:    v => {
    const n = parseFloat(v);
    if (!v.trim()) return 'Amount is required';
    if (isNaN(n)) return 'Must be a valid number';
    if (n <= 0) return 'Must be greater than ₹0';
    return '';
  },
  timestamp: v => {
    if (!v) return 'Timestamp is required';
    const d = new Date(v);
    return isNaN(d.getTime()) ? 'Invalid date/time' : '';
  },
};

function FieldWrapper({ label, name, children, error, touched }) {
  const isError = touched && error;
  const isValid = touched && !error;
  return (
    <div>
      <label className="block caption mb-1" htmlFor={`field-${name}`}>{label}</label>
      {children}
      {isError && (
        <p className="field-error-msg" role="alert">
          <AlertCircle size={11} aria-hidden="true" />
          {error}
        </p>
      )}
      {isValid && !isError && (
        <p className="flex items-center gap-1 mt-1" style={{ fontSize: 11, color: 'var(--accent-green)' }}>
          <CheckCircle size={11} aria-hidden="true" />
          Looks good
        </p>
      )}
    </div>
  );
}

const INPUT_BASE =
  'w-full bg-[#0D0D0F] border rounded-[var(--radius-sm)] text-[var(--text-primary)] px-[14px] py-[10px] font-sans text-sm focus:outline-none transition-all duration-150';

export default function Simulator() {
  const [form, setForm] = useState({ ...PRESETS.safe.data });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  /* Validate a single field */
  const validateField = useCallback((name, value) => {
    const validator = VALIDATORS[name];
    return validator ? validator(value) : '';
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    // Re-validate on change if already touched
    if (touched[name]) {
      setErrors(err => ({ ...err, [name]: validateField(name, value) }));
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(t => ({ ...t, [name]: true }));
    setErrors(err => ({ ...err, [name]: validateField(name, value) }));
  };

  /* Border class per field state */
  const fieldBorderClass = (name) => {
    if (!touched[name]) return 'border-[var(--border)] focus:border-[var(--accent-purple)]';
    if (errors[name])   return 'field-invalid';
    return 'field-valid';
  };

  /* Validate all on submit */
  const validateAll = () => {
    const newErrors = {};
    const newTouched = {};
    Object.keys(VALIDATORS).forEach(name => {
      newTouched[name] = true;
      newErrors[name] = validateField(name, form[name] || '');
    });
    setTouched(newTouched);
    setErrors(newErrors);
    return Object.values(newErrors).every(e => !e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAll()) return;
    setLoading(true);
    setResult(null);
    try {
      const payload = { ...form, amount: parseFloat(form.amount) };
      const res = await evaluateTransaction(payload);
      setTimeout(() => setResult(res), 100);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyPreset = (presetKey) => {
    setForm({ ...PRESETS[presetKey].data });
    setErrors({});
    setTouched({});
    setResult(null);
  };

  return (
    <div className="flex gap-6">
      {/* ── LEFT: FORM ── */}
      <div className="w-1/2 premium-card flex flex-col">
        <h3 className="card-title mb-6">Evaluate Transaction</h3>
        
        {/* Preset buttons */}
        <div className="flex gap-3 mb-6">
          {Object.entries(PRESETS).map(([k, p]) => (
            <button
              key={k}
              type="button"
              onClick={() => applyPreset(k)}
              className="px-3 py-1.5 rounded-[var(--radius-sm)] text-xs font-medium bg-transparent border transition-colors hover:bg-[var(--bg-card-hover)]"
              style={{ borderColor: p.color, color: p.color }}
            >
              {p.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="Payer ID" name="payer_id" error={errors.payer_id} touched={touched.payer_id}>
              <input
                id="field-payer_id"
                name="payer_id"
                value={form.payer_id}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${INPUT_BASE} ${fieldBorderClass('payer_id')}`}
                aria-invalid={touched.payer_id && !!errors.payer_id}
                aria-describedby={errors.payer_id ? 'err-payer_id' : undefined}
              />
            </FieldWrapper>

            <FieldWrapper label="Payee ID" name="payee_id" error={errors.payee_id} touched={touched.payee_id}>
              <input
                id="field-payee_id"
                name="payee_id"
                value={form.payee_id}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${INPUT_BASE} ${fieldBorderClass('payee_id')}`}
                aria-invalid={touched.payee_id && !!errors.payee_id}
              />
            </FieldWrapper>

            <FieldWrapper label="Amount (₹)" name="amount" error={errors.amount} touched={touched.amount}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] text-sm font-medium pointer-events-none">₹</span>
                <input
                  id="field-amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="any"
                  value={form.amount}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`${INPUT_BASE} pl-7 mono ${fieldBorderClass('amount')}`}
                  aria-invalid={touched.amount && !!errors.amount}
                />
              </div>
            </FieldWrapper>

            <FieldWrapper label="Location" name="location" error={errors.location} touched={touched.location}>
              <input
                id="field-location"
                name="location"
                value={form.location}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${INPUT_BASE} ${fieldBorderClass('location')}`}
                aria-invalid={touched.location && !!errors.location}
              />
            </FieldWrapper>

            <FieldWrapper label="Timestamp" name="timestamp" error={errors.timestamp} touched={touched.timestamp}>
              <input
                id="field-timestamp"
                name="timestamp"
                type="datetime-local"
                value={form.timestamp}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${INPUT_BASE} ${fieldBorderClass('timestamp')}`}
                aria-invalid={touched.timestamp && !!errors.timestamp}
              />
            </FieldWrapper>

            <FieldWrapper label="Device ID" name="device_id" error={errors.device_id} touched={touched.device_id}>
              <input
                id="field-device_id"
                name="device_id"
                value={form.device_id}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`${INPUT_BASE} ${fieldBorderClass('device_id')}`}
                aria-invalid={touched.device_id && !!errors.device_id}
              />
            </FieldWrapper>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-[var(--accent-purple)] text-[#0D0D0F] font-semibold text-[15px] py-[12px] rounded-[var(--radius-sm)] hover:brightness-110 transition-all disabled:opacity-50"
          >
            {loading ? 'Evaluating…' : 'Evaluate'}
          </button>
        </form>

        {/* CSV batch */}
        <div className="mt-8">
          <label className="block caption mb-2">Batch Processing</label>
          <div className="border-2 border-dashed border-[var(--border)] rounded-[var(--radius-md)] p-5 text-center transition-colors hover:border-[var(--accent-purple)] hover:bg-[var(--accent-purple-dim)] cursor-pointer relative">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept=".csv" aria-label="Upload CSV for batch processing" />
            <span className="text-[var(--text-secondary)] text-sm font-medium">Drop CSV or click to upload</span>
          </div>
          <div className="mt-3 flex justify-end">
            <a href={getExportCSVUrl()} download className="flex items-center gap-1.5 text-xs text-[var(--accent-purple)] hover:underline">
              <Download size={14} aria-hidden="true" /> Download Flagged
            </a>
          </div>
        </div>
      </div>

      {/* ── RIGHT: RESULT ── */}
      <div className="w-1/2">
        {result && (
          <div className="premium-card flex flex-col items-center animate-slide-up-fade">
            <TierBadge tier={result.risk_tier} large />
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
                      className="h-full bg-[var(--accent-purple)] rounded-full transition-all duration-500"
                      style={{ width: `${sig.sub_score}%` }} 
                    />
                  </div>
                  {sig.reason !== 'SAFE' && (
                    <span className="flex items-center gap-1 text-[10px] text-[var(--warning)] mt-0.5">
                      <AlertTriangle size={9} aria-hidden="true" />
                      {sig.reason}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="w-full mt-8 p-3 rounded-[var(--radius-sm)] border border-[var(--border)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network size={16} className="text-[var(--text-secondary)]" aria-hidden="true" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">Linked to flagged node</span>
              </div>
              <span className={`text-sm font-bold ${result.top_reasons?.includes('LINKED_TO_FRAUD_NODE') ? 'text-[var(--danger)]' : 'text-[var(--accent-green)]'}`}>
                {result.top_reasons?.includes('LINKED_TO_FRAUD_NODE') ? 'YES' : 'NO'}
              </span>
            </div>
          </div>
        )}
        {!result && (
          <div className="premium-card h-full flex flex-col items-center justify-center text-center gap-3 opacity-40">
            <ShieldAlert size={40} className="text-[var(--text-tertiary)]" />
            <p className="text-sm text-[var(--text-secondary)]">Fill the form and hit <strong>Evaluate</strong> to analyse a transaction.</p>
          </div>
        )}
      </div>
    </div>
  );
}
