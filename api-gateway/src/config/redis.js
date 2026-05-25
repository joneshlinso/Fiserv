const redis = require('redis');

let client = null;

async function connectRedis() {
  const redisUrl = process.env.REDIS_URL;
  
  if (!redisUrl) {
    console.warn('⚠️ WARNING: REDIS_URL not set. Running in-memory Redis simulation.');
    return;
  }

  try {
    client = redis.createClient({ url: redisUrl });
    client.on('error', (err) => console.error('Redis Client Error:', err));
    await client.connect();
    console.log('✅ Connected to Redis cache');
  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.warn('⚠️ Running in fallback mock-in-memory mode for Redis caching/rate-limiting.');
    client = null;
  }
}

// In-memory cache fallback simulation
const mockCache = {};

async function get(key) {
  if (!client) {
    return mockCache[key] || null;
  }
  return client.get(key);
}

async function setEx(key, seconds, value) {
  if (!client) {
    mockCache[key] = value;
    setTimeout(() => {
      delete mockCache[key];
    }, seconds * 1000);
    return 'OK';
  }
  return client.setEx(key, seconds, value);
}

async function keys(pattern) {
  if (!client) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return Object.keys(mockCache).filter(key => regex.test(key));
  }
  return client.keys(pattern);
}

module.exports = {
  connectRedis,
  get,
  setEx,
  keys,
  getClient: () => client
};
