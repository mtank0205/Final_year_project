// Utility functions for the simulation

/**
 * Calculate distance between two lat/lng points in meters
 */
export const getDistance = (pos1, pos2) => {
  const R = 6371000; // Earth's radius in meters
  const lat1 = pos1[0] * Math.PI / 180;
  const lat2 = pos2[0] * Math.PI / 180;
  const deltaLat = (pos2[0] - pos1[0]) * Math.PI / 180;
  const deltaLng = (pos2[1] - pos1[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * Move a position towards a target by a given speed
 */
export const moveTowards = (currentPos, targetPos, speed) => {
  const dx = targetPos[1] - currentPos[1];
  const dy = targetPos[0] - currentPos[0];
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < speed) {
    return { position: targetPos, reached: true };
  }

  const ratio = speed / distance;
  const newLat = currentPos[0] + dy * ratio;
  const newLng = currentPos[1] + dx * ratio;

  return { position: [newLat, newLng], reached: false };
};

/**
 * Calculate bearing/heading between two points (for rotation)
 */
export const getBearing = (pos1, pos2) => {
  const lat1 = pos1[0] * Math.PI / 180;
  const lat2 = pos2[0] * Math.PI / 180;
  const deltaLng = (pos2[1] - pos1[1]) * Math.PI / 180;

  const y = Math.sin(deltaLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLng);

  const bearing = Math.atan2(y, x) * 180 / Math.PI;
  return (bearing + 360) % 360;
};

/**
 * Check if an ambulance is within proximity of a signal
 */
export const isNearSignal = (ambulancePos, signalPos, thresholdMeters = 100) => {
  return getDistance(ambulancePos, signalPos) <= thresholdMeters;
};

/**
 * Generate a simple route between two points (straight line with waypoints)
 * In a real app, you'd use OSRM API for actual road routing
 */
export const generateRoute = (start, end, numWaypoints = 10) => {
  const route = [];
  for (let i = 0; i <= numWaypoints; i++) {
    const ratio = i / numWaypoints;
    const lat = start[0] + (end[0] - start[0]) * ratio;
    const lng = start[1] + (end[1] - start[1]) * ratio;
    route.push([lat, lng]);
  }
  return route;
};

/**
 * Format time for display
 */
export const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
};
