const { Server } = require('socket.io');

let io = null;

function init(server) {
  io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for dev/hackathon setup
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`🔌 Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

function broadcastAlert(transaction) {
  if (io) {
    io.emit('new-transaction', transaction);
  }
}

function broadcastMetricsUpdate(metrics) {
  if (io) {
    io.emit('metrics-update', metrics);
  }
}

module.exports = {
  init,
  broadcastAlert,
  broadcastMetricsUpdate,
  getIO: () => io
};
