// Physics and movement utilities

// Calculate distance between two points
export const distance = (x1, y1, x2, y2) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
};

// Calculate angle between two points (in radians)
export const angleBetween = (x1, y1, x2, y2) => {
  return Math.atan2(y2 - y1, x2 - x1);
};

// Move point towards target with given speed
export const moveTowards = (currentX, currentY, targetX, targetY, speed) => {
  const dist = distance(currentX, currentY, targetX, targetY);
  
  if (dist <= speed) {
    return { x: targetX, y: targetY, reached: true };
  }
  
  const angle = angleBetween(currentX, currentY, targetX, targetY);
  
  return {
    x: currentX + Math.cos(angle) * speed,
    y: currentY + Math.sin(angle) * speed,
    reached: false
  };
};

// Interpolate between waypoints for smooth movement
export const interpolatePosition = (waypoints, progress) => {
  if (waypoints.length === 0) return null;
  if (waypoints.length === 1) return waypoints[0];
  
  const totalSegments = waypoints.length - 1;
  const segmentIndex = Math.min(Math.floor(progress * totalSegments), totalSegments - 1);
  const segmentProgress = (progress * totalSegments) - segmentIndex;
  
  const start = waypoints[segmentIndex];
  const end = waypoints[segmentIndex + 1];
  
  return {
    x: start.x + (end.x - start.x) * segmentProgress,
    y: start.y + (end.y - start.y) * segmentProgress,
    segmentIndex
  };
};

// Check if point is near another point
export const isNear = (x1, y1, x2, y2, threshold = 50) => {
  return distance(x1, y1, x2, y2) <= threshold;
};

// Calculate velocity with acceleration and deceleration
export const calculateVelocity = (currentSpeed, targetSpeed, acceleration = 0.1) => {
  if (currentSpeed < targetSpeed) {
    return Math.min(currentSpeed + acceleration, targetSpeed);
  } else if (currentSpeed > targetSpeed) {
    return Math.max(currentSpeed - acceleration, targetSpeed);
  }
  return currentSpeed;
};

// Convert radians to degrees
export const toDegrees = (radians) => {
  return radians * (180 / Math.PI);
};

// Convert degrees to radians
export const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

export default {
  distance,
  angleBetween,
  moveTowards,
  interpolatePosition,
  isNear,
  calculateVelocity,
  toDegrees,
  toRadians
};
