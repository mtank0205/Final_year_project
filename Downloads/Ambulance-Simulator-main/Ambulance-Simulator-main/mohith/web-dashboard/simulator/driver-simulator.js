// Driver Location Simulator - simulates drivers getting notifications
const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

// Simulate 5 drivers at different locations in Koramangala
const drivers = [
  { id: 'Driver1', lat: 12.9350, lng: 77.6250, name: 'Alice' },
  { id: 'Driver2', lat: 12.9360, lng: 77.6270, name: 'Bob' },
  { id: 'Driver3', lat: 12.9370, lng: 77.6290, name: 'Charlie' },
  { id: 'Driver4', lat: 12.9340, lng: 77.6230, name: 'Diana' },
  { id: 'Driver5', lat: 12.9380, lng: 77.6310, name: 'Eve' }
];

drivers.forEach(driver => {
  const socket = io(SERVER_URL);
  
  socket.on('connect', () => {
    console.log(`👤 ${driver.name} connected`);
    socket.emit('driver:register', { lat: driver.lat, lng: driver.lng });
  });

  socket.on('registered', () => {
    console.log(`✅ ${driver.name} registered at ${driver.lat}, ${driver.lng}`);
  });

  socket.on('driver:alert', (payload) => {
    console.log(`🔔 ALERT for ${driver.name}:`);
    console.log(`   ${payload.title}`);
    console.log(`   ${payload.body}\n`);
  });

  socket.on('disconnect', () => {
    console.log(`👋 ${driver.name} disconnected`);
  });

  // Simulate slight movement every 10 seconds
  setInterval(() => {
    driver.lat += (Math.random() - 0.5) * 0.0001;
    driver.lng += (Math.random() - 0.5) * 0.0001;
    socket.emit('driver:location', { lat: driver.lat, lng: driver.lng });
  }, 10000);
});

console.log('👥 Driver Simulator Started');
console.log(`   Simulating ${drivers.length} drivers receiving notifications\n`);
