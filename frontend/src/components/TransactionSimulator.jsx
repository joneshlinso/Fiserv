import React, { useState, useEffect, useRef } from 'react';
import { submitTransaction } from '../services/api';
import { Play, Square, RefreshCw, Send, Zap } from 'lucide-react';

const LOCATIONS = ['Mumbai, IN', 'Delhi, IN', 'Bengaluru, IN', 'Hyderabad, IN', 'Chennai, IN', 'Kolkata, IN', 'Pune, IN', 'Ahmedabad, IN'];
const DEVICES = ['dev_samsung_s23', 'dev_iphone_15', 'dev_oneplus_11', 'dev_pixel_8', 'dev_redmi_12', 'dev_ipad_air'];
const USERS = ['alice@okaxis', 'bob@okicici', 'charlie@oksbi', 'david@okhdfc', 'rahul@okpaytm', 'priya@okybl', 'amit@okaxis', 'sneha@okicici'];

export default function TransactionSimulator({ onLocalSubmit }) {
  const [formData, setFormData] = useState({
    payer_id: 'rahul@okpaytm',
    payee_id: 'merchant@okaxis',
    amount: '2500',
    location: 'Mumbai, IN',
    device_id: 'dev_iphone_15',
    timestamp: ''
  });

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState(null);
  const [isAutoSimulating, setIsAutoSimulating] = useState(false);
  const simIntervalRef = useRef(null);

  // Stop simulation on unmount
  useEffect(() => {
    return () => stopAutoSimulation();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRandomize = () => {
    const randomPayer = USERS[Math.floor(Math.random() * USERS.length)];
    let randomPayee = USERS[Math.floor(Math.random() * USERS.length)];
    while (randomPayee === randomPayer) {
      randomPayee = USERS[Math.floor(Math.random() * USERS.length)];
    }

    // Sometimes use a new payee to trigger New Beneficiary rule
    const useNewPayee = Math.random() < 0.25;
    const payeeId = useNewPayee ? `pay_new_${Math.floor(Math.random() * 1000)}@okaxis` : randomPayee;

    // Sometimes use a new device to trigger New Device rule
    const useNewDevice = Math.random() < 0.25;
    const deviceId = useNewDevice ? `dev_new_${Math.floor(Math.random() * 1000)}` : DEVICES[Math.floor(Math.random() * DEVICES.length)];

    // Sometimes use a new location to trigger Unusual Location rule
    const useNewLocation = Math.random() < 0.25;
    const location = useNewLocation ? `loc_new_${Math.floor(Math.random() * 1000)}, IN` : LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

    // Random amount, sometimes > 10,000 to trigger High Amount rule
    const isHighAmount = Math.random() < 0.2;
    const amount = isHighAmount 
      ? Math.floor(Math.random() * 40000) + 10500 
      : Math.floor(Math.random() * 8500) + 50;

    // Sometimes simulate midnight timestamp (12 AM - 4 AM) to trigger Midnight rule
    const isMidnight = Math.random() < 0.25;
    let timestamp = '';
    if (isMidnight) {
      const now = new Date();
      now.setHours(Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0);
      timestamp = now.toISOString();
    }

    setFormData({
      payer_id: randomPayer,
      payee_id: payeeId,
      amount: amount.toString(),
      location,
      device_id: deviceId,
      timestamp
    });
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
      timestamp: formData.timestamp || new Date().toISOString()
    };

    try {
      const response = await submitTransaction(payload);
      if (response.success) {
        setStatusMsg({
          type: 'success',
          text: `Transaction ${response.transaction.id} processed successfully. Risk Status: ${response.transaction.status} (Score: ${response.transaction.risk_score})`
        });
        // Clear message after 4s
        setTimeout(() => setStatusMsg(null), 4000);
      }
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.message || 'Error communicating with API Gateway.';
      setStatusMsg({ type: 'error', text: errMsg });

      // Fallback local evaluation if offline
      if (onLocalSubmit) {
        const mockResponse = generateLocalFallbackTx(payload);
        onLocalSubmit(mockResponse);
        setStatusMsg({
          type: 'warning',
          text: `Running OFFLINE. Locally simulated ${mockResponse.id}. Risk Status: ${mockResponse.status} (Score: ${mockResponse.risk_score})`
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Local evaluation when API is completely down
  const generateLocalFallbackTx = (payload) => {
    let score = 0;
    const reasons = [];
    const amt = parseFloat(payload.amount);
    
    if (amt > 10000) { score += 30; reasons.push('High transaction amount'); }
    if (payload.device_id.startsWith('dev_new')) { score += 25; reasons.push('New device detected'); }
    if (payload.payee_id.startsWith('pay_new')) { score += 25; reasons.push('New beneficiary payee'); }
    if (payload.location.startsWith('loc_new')) { score += 20; reasons.push('Unusual transaction location'); }
    
    const txHour = new Date(payload.timestamp).getHours();
    if (txHour >= 0 && txHour < 4) { score += 20; reasons.push('Midnight transaction'); }
    
    score = Math.min(score, 100);
    const status = score > 60 ? 'HIGH' : score > 30 ? 'MEDIUM' : 'LOW';

    return {
      id: `TXN-OFFLINE-${Date.now()}`,
      ...payload,
      risk_score: score,
      status,
      reasons,
      timestamp: payload.timestamp
    };
  };

  const startAutoSimulation = () => {
    setIsAutoSimulating(true);
    setStatusMsg({ type: 'success', text: 'Started live real-time simulation feed...' });
    
    // Immediately send first one
    handleRandomize();
    
    simIntervalRef.current = setInterval(async () => {
      // Create random values
      const randomPayer = USERS[Math.floor(Math.random() * USERS.length)];
      let randomPayee = USERS[Math.floor(Math.random() * USERS.length)];
      while (randomPayee === randomPayer) {
        randomPayee = USERS[Math.floor(Math.random() * USERS.length)];
      }

      const useNewPayee = Math.random() < 0.25;
      const payeeId = useNewPayee ? `pay_new_${Math.floor(Math.random() * 1000)}@okaxis` : randomPayee;
      const useNewDevice = Math.random() < 0.25;
      const deviceId = useNewDevice ? `dev_new_${Math.floor(Math.random() * 1000)}` : DEVICES[Math.floor(Math.random() * DEVICES.length)];
      const useNewLocation = Math.random() < 0.25;
      const location = useNewLocation ? `loc_new_${Math.floor(Math.random() * 1000)}, IN` : LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

      // Varying amounts to simulate different risk scoring rules
      const amount = Math.random() < 0.2 
        ? Math.floor(Math.random() * 35000) + 11000 
        : Math.floor(Math.random() * 9500) + 20;

      const isMidnight = Math.random() < 0.2;
      let timestamp = new Date().toISOString();
      if (isMidnight) {
        const midnight = new Date();
        midnight.setHours(1, Math.floor(Math.random() * 60), 0);
        timestamp = midnight.toISOString();
      }

      const simPayload = {
        payer_id: randomPayer,
        payee_id: payeeId,
        amount,
        location,
        device_id: deviceId,
        timestamp
      };

      try {
        await submitTransaction(simPayload);
      } catch (err) {
        if (onLocalSubmit) {
          onLocalSubmit(generateLocalFallbackTx({
            ...simPayload,
            timestamp: simPayload.timestamp
          }));
        }
      }
    }, 2500); // submission every 2.5 seconds
  };

  const stopAutoSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    setIsAutoSimulating(false);
    setStatusMsg({ type: 'error', text: 'Stopped transaction simulation feed.' });
  };

  return (
    <div className="glass-panel rounded-2xl p-6 shadow-xl border border-white/5 h-full flex flex-col justify-between">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Zap className="text-indigo-400 w-5 h-5 animate-pulse" />
            Transaction Simulator
          </h2>
          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-dark-lighter hover:bg-indigo-600/30 text-indigo-300 rounded-lg transition-colors border border-white/5"
          >
            <RefreshCw className="w-3 h-3" />
            Randomize
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Payer UPI ID</label>
            <input
              type="text"
              name="payer_id"
              value={formData.payer_id}
              onChange={handleChange}
              placeholder="e.g. user@okaxis"
              className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1.5">Payee UPI ID</label>
            <input
              type="text"
              name="payee_id"
              value={formData.payee_id}
              onChange={handleChange}
              placeholder="e.g. merchant@okicici"
              className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Amount (₹)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="2500"
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Location</label>
              <input
                type="text"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g. Delhi, IN"
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Device ID</label>
              <input
                type="text"
                name="device_id"
                value={formData.device_id}
                onChange={handleChange}
                placeholder="dev_iphone"
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5">Override Time (Optional)</label>
              <input
                type="datetime-local"
                name="timestamp"
                value={formData.timestamp ? formData.timestamp.substring(0, 16) : ''}
                onChange={(e) => setFormData({ ...formData, timestamp: e.target.value ? new Date(e.target.value).toISOString() : '' })}
                className="w-full bg-dark-bg/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || isAutoSimulating}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-medium text-sm py-3 px-4 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25"
          >
            <Send className="w-4 h-4" />
            {loading ? 'Processing...' : 'Send UPI Transaction'}
          </button>
        </form>
      </div>

      <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Automated Simulated Traffic</h3>
            <p className="text-xs text-gray-400">Generate real-time random transactions</p>
          </div>
          {isAutoSimulating ? (
            <button
              onClick={stopAutoSimulation}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Feed
            </button>
          ) : (
            <button
              onClick={startAutoSimulation}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-950/20"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Feed
            </button>
          )}
        </div>

        {statusMsg && (
          <div
            className={`text-xs p-3.5 rounded-xl border animate-fade-in ${
              statusMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : statusMsg.type === 'warning'
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}
          >
            {statusMsg.text}
          </div>
        )}
      </div>
    </div>
  );
}
