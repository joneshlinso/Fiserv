const axios = require('axios');

const FRAUD_ENGINE_URL = process.env.FRAUD_ENGINE_URL || 'http://localhost:8000';

async function evaluateTransaction(transactionData) {
  try {
    const response = await axios.post(`${FRAUD_ENGINE_URL}/api/v1/fraud/evaluate`, transactionData, {
      timeout: 2000 // 2 seconds timeout
    });
    return response.data;
  } catch (error) {
    console.error('⚠️ Fraud engine request failed or timed out:', error.message);
    console.warn('⚙️ Using Node-side local rule evaluator fallback for demo continuity.');
    return calculateLocalScore(transactionData);
  }
}

/**
 * Fallback score evaluator if the FastAPI service is not reachable.
 * Matches the core logic of Python fraud rules.
 */
function calculateLocalScore(data) {
  let score = 0;
  const reasons = [];
  const amount = parseFloat(data.amount) || 0;

  // 1. High Amount Rule
  if (amount > 10000) {
    score += 30;
    reasons.push('High transaction amount');
  }

  // 2. Midnight Rule
  if (data.timestamp) {
    const txHour = new Date(data.timestamp).getHours();
    if (txHour >= 0 && txHour < 4) {
      score += 20;
      reasons.push('Midnight transaction');
    }
  }

  // 3. New Device Rule (Mocked - always logs alert for device_id starting with 'dev_new')
  if (data.device_id && data.device_id.startsWith('dev_new')) {
    score += 25;
    reasons.push('New device detected');
  }

  // 4. New Beneficiary Rule (Mocked - always logs alert for payee_id starting with 'pay_new')
  if (data.payee_id && data.payee_id.startsWith('pay_new')) {
    score += 25;
    reasons.push('New beneficiary payee');
  }

  // 5. Unusual Location Rule (Mocked - always logs alert for location starting with 'loc_new')
  if (data.location && data.location.startsWith('loc_new')) {
    score += 20;
    reasons.push('Unusual transaction location');
  }

  // Cap score at 100
  score = Math.min(score, 100);

  let status = 'LOW';
  if (score > 60) {
    status = 'HIGH';
  } else if (score > 30) {
    status = 'MEDIUM';
  }

  return {
    risk_score: score,
    status,
    reasons
  };
}

module.exports = {
  evaluateTransaction
};
