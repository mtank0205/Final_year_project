// Server-side map helper: haversine and ETA calculations
function toRad(deg) {
  return deg * Math.PI / 180;
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

function calculateETAMeters(distanceMeters, speedKmph = 40) {
  // speed in m/s
  const speedMs = (speedKmph * 1000) / 3600;
  if (speedMs <= 0) return Infinity;
  const seconds = distanceMeters / speedMs;
  return seconds; // seconds until arrival
}

module.exports = {
  haversineDistance,
  calculateETAMeters
};
