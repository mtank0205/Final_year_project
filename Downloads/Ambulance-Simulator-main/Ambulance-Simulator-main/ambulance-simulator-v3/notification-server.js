// Socket.io server for real-time ambulance proximity notifications
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Store connected clients
const ambulances = new Map(); // socketId => {lat, lng, timestamp}
const civilians = new Map();  // socketId => {lat, lng, timestamp}

io.on('connection', (socket) => {
  console.log('📱 Client connected:', socket.id);

  // Ambulance registers and sends location
  socket.on('ambulance:register', (data) => {
    console.log('🚑 Ambulance registered:', socket.id);
    socket.ambulanceId = data.id || socket.id;
    socket.clientType = 'ambulance';
  });

  // Ambulance location update
  socket.on('ambulance:location', (data) => {
    const { lat, lng } = data;
    ambulances.set(socket.id, { lat, lng, timestamp: Date.now() });
    
    // Broadcast to all civilian devices
    socket.broadcast.emit('ambulance:proximity', {
      ambulanceId: socket.ambulanceId,
      lat,
      lng,
      timestamp: Date.now()
    });
    
    console.log(`🚑 Ambulance location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  });

  // Civilian device registers
  socket.on('civilian:register', (data) => {
    console.log('📱 Civilian device registered:', socket.id);
    socket.clientType = 'civilian';
  });

  // Civilian location update (optional, for tracking)
  socket.on('civilian:location', (data) => {
    const { lat, lng } = data;
    civilians.set(socket.id, { lat, lng, timestamp: Date.now() });
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    ambulances.delete(socket.id);
    civilians.delete(socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🚀 Notification server running on http://localhost:${PORT}`);
  console.log(`📡 Socket.io server ready for ambulance proximity alerts`);
});
