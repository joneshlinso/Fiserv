/**
 * api.js — Centralised fetch calls for the Fiserv Fraud Detector frontend.
 * All endpoints go through the Vite proxy (/api → localhost:8000).
 */

const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

/** POST /api/transaction — evaluate a single transaction */
export async function evaluateTransaction(txn) {
  return request('/transaction', {
    method: 'POST',
    body: JSON.stringify(txn),
  });
}

/** POST /api/transactions/bulk — evaluate an array of transactions */
export async function evaluateBulk(txns) {
  return request('/transactions/bulk', {
    method: 'POST',
    body: JSON.stringify(txns),
  });
}

/** GET /api/transactions — fetch all scored transactions */
export async function getTransactions() {
  return request('/transactions');
}

/** GET /api/graph — fetch fraud ring graph data */
export async function getGraph() {
  return request('/graph');
}

/** GET /api/stats — fetch summary stats */
export async function getStats() {
  return request('/stats');
}

/** GET /api/config/weights — current weights */
export async function getWeights() {
  return request('/config/weights');
}

/** POST /api/config/weights — update weights and rescore */
export async function setWeights(weights) {
  return request('/config/weights', {
    method: 'POST',
    body: JSON.stringify(weights),
  });
}

/** POST /api/upload/csv — upload CSV file for bulk scoring */
export async function uploadCSV(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${BASE}/upload/csv`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error(`CSV upload error: ${res.status}`);
  return res.json();
}

/** GET /api/export/csv — download flagged transactions as CSV */
export function getExportCSVUrl() {
  return `${BASE}/export/csv`;
}
