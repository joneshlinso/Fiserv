const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const transactionRoutes = require('./src/routes/transactionRoutes');
const websocketService = require('./src/services/websocketService');
const { connectDB } = require('./src/config/db');
const { connectRedis } = require('./src/config/redis');

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
websocketService.init(server);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/transactions', transactionRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'API Gateway' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

const PORT = process.env.PORT || 5000;

async function bootstrap() {
  try {
    // Connect database & cache
    await connectDB();
    await connectRedis();

    server.listen(PORT, () => {
      console.log(`🚀 API Gateway running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
}

bootstrap();
