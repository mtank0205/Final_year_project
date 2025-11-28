// Simple notification helper for server to emit driver alerts
function sendDriverAlerts(io, driverSocketIds, payload) {
  driverSocketIds.forEach(socketId => {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) {
      sock.emit('driver:alert', payload);
    }
  });
}

module.exports = { sendDriverAlerts };
