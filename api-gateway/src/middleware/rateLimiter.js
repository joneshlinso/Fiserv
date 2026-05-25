const redis = require('../config/redis');

// In-memory rate limiting map for when Redis is unavailable
const localLimiter = {};

async function transactionRateLimiter(req, res, next) {
  const { payer_id } = req.body;

  if (!payer_id) {
    return res.status(400).json({ success: false, error: 'payer_id is required' });
  }

  const key = `rate:${payer_id}`;
  const limit = 10; // Allow maximum 10 submissions per minute
  const expirySeconds = 60;

  try {
    const isRedisConnected = !!redis.getClient();

    if (isRedisConnected) {
      const client = redis.getClient();
      const current = await client.incr(key);

      if (current === 1) {
        await client.expire(key, expirySeconds);
      }

      if (current > limit) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many transactions submitted in a short duration. Please wait before retrying.'
        });
      }
    } else {
      // In-memory rate limiting fallback
      const now = Date.now();
      if (!localLimiter[payer_id]) {
        localLimiter[payer_id] = [];
      }

      // Filter events in the last 60 seconds
      localLimiter[payer_id] = localLimiter[payer_id].filter(timestamp => now - timestamp < expirySeconds * 1000);

      if (localLimiter[payer_id].length >= limit) {
        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many transactions submitted in a short duration. Please wait before retrying.'
        });
      }

      localLimiter[payer_id].push(now);
    }

    next();
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Gracefully bypass rate limiter to ensure system availability
    next();
  }
}

module.exports = {
  transactionRateLimiter
};
