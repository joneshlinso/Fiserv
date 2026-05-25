const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { transactionRateLimiter } = require('../middleware/rateLimiter');

// Submit transaction (Rate limited by payer_id velocity filter)
router.post('/', transactionRateLimiter, transactionController.processTransaction);

// Get past transactions
router.get('/history', transactionController.getHistory);

// Get real-time compiled metrics
router.get('/metrics', transactionController.getMetrics);

module.exports = router;
