const { Pool } = require('pg');

let pool;

async function connectDB() {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.warn('⚠️ WARNING: DATABASE_URL not set. Running in-memory database simulation.');
    return;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Test connection
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL database');
    
    // Create initial table if it does not exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id VARCHAR(50) PRIMARY KEY,
        payer_id VARCHAR(50) NOT NULL,
        payee_id VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        location VARCHAR(100) NOT NULL,
        device_id VARCHAR(50) NOT NULL,
        risk_score INT NOT NULL,
        status VARCHAR(20) NOT NULL,
        reasons TEXT[] NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.warn('⚠️ Running in fallback mock-in-memory mode for database stores.');
    pool = null;
  }
}

const mockDbStore = [];

async function query(text, params) {
  if (!pool) {
    // In-memory simulation fallback
    if (text.trim().startsWith('INSERT INTO transactions')) {
      const row = {
        id: params[0],
        payer_id: params[1],
        payee_id: params[2],
        amount: params[3],
        location: params[4],
        device_id: params[5],
        risk_score: params[6],
        status: params[7],
        reasons: params[8],
        timestamp: new Date()
      };
      mockDbStore.unshift(row);
      return { rows: [row] };
    }
    
    if (text.trim().startsWith('SELECT * FROM transactions ORDER BY timestamp DESC')) {
      const limit = params && params[0] ? params[0] : 50;
      return { rows: mockDbStore.slice(0, limit) };
    }

    if (text.trim().startsWith('SELECT status, COUNT(*)')) {
      const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
      mockDbStore.forEach(t => {
        if (counts[t.status] !== undefined) counts[t.status]++;
      });
      return {
        rows: Object.entries(counts).map(([status, count]) => ({ status, count }))
      };
    }
    
    return { rows: [] };
  }
  return pool.query(text, params);
}

module.exports = {
  connectDB,
  query
};
