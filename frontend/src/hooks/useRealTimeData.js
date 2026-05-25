import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { getTransactionHistory, getSystemMetrics } from '../services/api';

const SOCKET_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin;

export const useRealTimeData = () => {
  const [transactions, setTransactions] = useState([]);
  const [metrics, setMetrics] = useState({
    totalTransactions: 0,
    alertCounts: { LOW: 0, MEDIUM: 0, HIGH: 0 },
    fraudRate: 0,
    totalVolume: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 1. Initial Load of History & Stats
    const loadInitialData = async () => {
      try {
        const histData = await getTransactionHistory(50);
        if (histData.success) {
          setTransactions(histData.transactions);
        }

        const metricsData = await getSystemMetrics();
        if (metricsData.success) {
          setMetrics(metricsData.metrics);
        }
      } catch (err) {
        console.error('Failed to load initial metrics dashboard data:', err);
        setError('Error fetching dashboard statistics.');
      }
    };

    loadInitialData();

    // 2. Initialize WebSocket client connection
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000
    });

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setError('WebSocket connection disconnected. Falling back to HTTP.');
    });

    // 3. Listen for real-time events
    socket.on('new-transaction', (newTx) => {
      setTransactions((prev) => {
        // Prepend new transaction, keeping at max 50 items
        const updated = [newTx, ...prev];
        return updated.slice(0, 50);
      });
    });

    socket.on('metrics-update', (updatedMetrics) => {
      setMetrics(updatedMetrics);
    });

    // Cleanup on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  // Utility helper to inject mock transaction client-side for sandbox test runs
  const appendLocalTransaction = (newTx) => {
    setTransactions((prev) => [newTx, ...prev].slice(0, 50));
    setMetrics((prev) => {
      const counts = { ...prev.alertCounts };
      counts[newTx.status] = (counts[newTx.status] || 0) + 1;
      const total = prev.totalTransactions + 1;
      return {
        totalTransactions: total,
        alertCounts: counts,
        fraudRate: parseFloat(((counts.HIGH / total) * 100).toFixed(1)),
        totalVolume: parseFloat((prev.totalVolume + parseFloat(newTx.amount)).toFixed(2))
      };
    });
  };

  return {
    transactions,
    metrics,
    isConnected,
    error,
    appendLocalTransaction
  };
};
