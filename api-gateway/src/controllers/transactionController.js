const db = require('../config/db');
const engineService = require('../services/engineService');
const websocketService = require('../services/websocketService');

// Submit and process UPI transaction
async function processTransaction(req, res) {
  try {
    const {
      payer_id,
      payee_id,
      amount,
      location,
      device_id,
      timestamp
    } = req.body;

    // Basic Validation
    if (!payer_id || !payee_id || !amount || !location || !device_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: payer_id, payee_id, amount, location, device_id'
      });
    }

    const txId = `TXN-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const txTime = timestamp || new Date().toISOString();

    // Call Fraud Engine service to get risk score
    const payload = {
      txn_id: txId,
      payer_id,
      payee_id,
      amount: parseFloat(amount),
      location,
      device_id,
      timestamp: txTime
    };

    const evaluation = await engineService.evaluateTransaction(payload);

    // Save transaction to DB
    const insertQuery = `
      INSERT INTO transactions (id, payer_id, payee_id, amount, location, device_id, risk_score, status, reasons, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      txId,
      payer_id,
      payee_id,
      parseFloat(amount),
      location,
      device_id,
      evaluation.risk_score,
      evaluation.status,
      evaluation.reasons || [],
      txTime
    ];

    const result = await db.query(insertQuery, values);
    const savedTx = result.rows[0];

    // Broadcast in real-time to dashboard clients
    websocketService.broadcastAlert(savedTx);

    // Fetch and broadcast fresh metrics
    const stats = await compileStats();
    websocketService.broadcastMetricsUpdate(stats);

    return res.status(201).json({
      success: true,
      transaction: savedTx
    });

  } catch (error) {
    console.error('Error processing transaction:', error);
    return res.status(500).json({
      success: false,
      error: 'Error evaluating or saving transaction'
    });
  }
}

// Get transaction history
async function getHistory(req, res) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const historyQuery = `
      SELECT * FROM transactions
      ORDER BY timestamp DESC
      LIMIT $1
    `;
    const result = await db.query(historyQuery, [limit]);
    return res.status(200).json({
      success: true,
      count: result.rows.length,
      transactions: result.rows
    });
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({
      success: false,
      error: 'Error loading history logs'
    });
  }
}

// Get metrics
async function getMetrics(req, res) {
  try {
    const stats = await compileStats();
    return res.status(200).json({
      success: true,
      metrics: stats
    });
  } catch (error) {
    console.error('Error fetching system metrics:', error);
    return res.status(500).json({
      success: false,
      error: 'Error fetching metrics counts'
    });
  }
}

// Helper to compile general stats
async function compileStats() {
  const countQuery = `
    SELECT status, COUNT(*) as count 
    FROM transactions 
    GROUP BY status
  `;
  
  const result = await db.query(countQuery);
  const rows = result.rows;

  const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
  rows.forEach(row => {
    counts[row.status.toUpperCase()] = parseInt(row.count);
  });

  const total = counts.LOW + counts.MEDIUM + counts.HIGH;
  const fraudRate = total > 0 ? ((counts.HIGH / total) * 100).toFixed(1) : 0;

  // Recent transactions to build mock graphs or statistics
  const recentResult = await db.query('SELECT * FROM transactions ORDER BY timestamp DESC LIMIT 100');
  const recent = recentResult.rows;

  const volume = recent.reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

  return {
    totalTransactions: total,
    alertCounts: counts,
    fraudRate: parseFloat(fraudRate),
    totalVolume: parseFloat(volume.toFixed(2))
  };
}

module.exports = {
  processTransaction,
  getHistory,
  getMetrics
};
