import axios from 'axios';

// In development, Vite configuration proxies /api requests to http://localhost:5000.
// In production, configure fallback domain endpoints.
const API_BASE = '/api';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const submitTransaction = async (data) => {
  const response = await apiClient.post('/transactions', data);
  return response.data;
};

export const getTransactionHistory = async (limit = 50) => {
  const response = await apiClient.get(`/transactions/history?limit=${limit}`);
  return response.data;
};

export const getSystemMetrics = async () => {
  const response = await apiClient.get('/transactions/metrics');
  return response.data;
};

export default apiClient;
