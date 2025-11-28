// Realistic Vehicle Traffic Simulator
// Simulates regular traffic flow through intersections with traffic lights
const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const intersections = require('../../config/traffic-lights.json');

const socket = io(SERVER_URL);

// Vehicle types with different speeds and behaviors
const VEHICLE_TYPES = ['car', 'bike', 'bus', 'truck', 'auto'];
const VEHICLE_SPEEDS = {
  car: 15,    // km/h - reduced for congestion (was 40)
  bike: 15,   // reduced
  bus: 12,    // reduced
  truck: 10,  // reduced
  auto: 12    // reduced
};

// Active vehicles on the road
const vehicles = new Map();
let vehicleIdCounter = 1;
let trafficLightStates = {}; // Track current state of all traffic lights

// Initialize traffic light states
intersections.forEach(intersection => {
  intersection.signals.forEach(signal => {
    trafficLightStates[signal.id] = 'red';
  });
});

// Listen to traffic light state updates from server
socket.on('trafficLightUpdate', (data) => {
  if (data && data.signals) {
    data.signals.forEach(signal => {
      trafficLightStates[signal.id] = signal.state;
    });
  }
});

socket.on('connect', () => {
  console.log('🚗 Vehicle Traffic Simulator Connected');
  console.log(`   Simulating PEAK TRAFFIC across ${intersections.length} intersections`);
  
  // Start spawning vehicles - moderate rate for smooth performance
  setInterval(spawnVehicles, 200); // Spawn vehicles every 200ms for better performance
  
  // Update vehicle positions
  setInterval(updateVehicles, 500); // Update 2 times per second for better performance
});

// Spawn new vehicles at random intersections
function spawnVehicles() {
  // Spawn 3-5 vehicles per cycle for smooth traffic
  const numVehicles = Math.floor(Math.random() * 3) + 3;
  
  for (let i = 0; i < numVehicles; i++) {
    const intersection = intersections[Math.floor(Math.random() * intersections.length)];
    const signal = intersection.signals[Math.floor(Math.random() * intersection.signals.length)];
    
    // Pick a random destination intersection (different from start)
    let destIntersection;
    do {
      destIntersection = intersections[Math.floor(Math.random() * intersections.length)];
    } while (destIntersection.id === intersection.id);
    
    const vehicleType = 'car'; // All vehicles uniform for traffic density visualization
    const vehicleId = `VEH${String(vehicleIdCounter++).padStart(4, '0')}`;
    
    const vehicle = {
      id: vehicleId,
      type: vehicleType,
      lat: signal.lat,
      lng: signal.lng,
      targetLat: destIntersection.lat,
      targetLng: destIntersection.lng,
      speed: VEHICLE_SPEEDS[vehicleType],
      currentIntersection: intersection.id,
      currentSignal: signal.id,
      state: 'waiting', // waiting, moving, stopping, stopped
      waitTime: 0,
      direction: signal.direction
    };
    
    vehicles.set(vehicleId, vehicle);
    
    // Emit new vehicle
    socket.emit('vehicleSpawned', {
      id: vehicleId,
      type: vehicleType,
      lat: vehicle.lat,
      lng: vehicle.lng,
      direction: signal.direction,
      intersection: intersection.name
    });
  }
}

// Update all vehicle positions
function updateVehicles() {
  vehicles.forEach((vehicle, vehicleId) => {
    const signal = trafficLightStates[vehicle.currentSignal];
    
    // Calculate distance to target
    const latDiff = vehicle.targetLat - vehicle.lat;
    const lngDiff = vehicle.targetLng - vehicle.lng;
    const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    
    // Check if vehicle reached destination
    if (distance < 0.0001) {
      // Vehicle reached destination, remove it
      vehicles.delete(vehicleId);
      socket.emit('vehicleReached', { id: vehicleId });
      return;
    }
    
    // Check if at intersection (within 50m of center)
    const intersectionDist = Math.sqrt(
      Math.pow(vehicle.lat - getIntersectionLat(vehicle.currentIntersection), 2) +
      Math.pow(vehicle.lng - getIntersectionLng(vehicle.currentIntersection), 2)
    );
    
    const atIntersection = intersectionDist < 0.0005; // ~50m
    
    // Traffic light logic
    if (atIntersection) {
      if (signal === 'red' || signal === 'yellow') {
        // Stop at red/yellow light
        if (vehicle.state !== 'stopped') {
          vehicle.state = 'stopped';
          vehicle.waitTime = 0;
        }
        vehicle.waitTime += 0.5; // 500ms intervals
        
        // Emit stopped vehicle update less frequently
        if (Math.floor(vehicle.waitTime * 2) % 5 === 0) {
          socket.emit('vehicleUpdate', {
            id: vehicleId,
            lat: vehicle.lat,
            lng: vehicle.lng,
            state: 'stopped',
            waitTime: vehicle.waitTime
          });
        }
        return;
      } else if (signal === 'green') {
        // Can proceed through intersection
        if (vehicle.state === 'stopped') {
          vehicle.state = 'moving';
        }
      }
    }
    
    // Move vehicle towards destination
    vehicle.state = 'moving';
    
    // Speed in degrees per second (very rough approximation)
    // 1 degree ≈ 111 km at equator, so speed km/h / 111 / 3600 = degrees per second
    const speedDegPerSec = vehicle.speed / 111 / 3600;
    const moveDistance = speedDegPerSec * 0.5; // Move per 500ms
    
    // Normalize direction
    const magnitude = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
    const dirLat = latDiff / magnitude;
    const dirLng = lngDiff / magnitude;
    
    // Update position
    vehicle.lat += dirLat * moveDistance;
    vehicle.lng += dirLng * moveDistance;
    
    // Emit position update every time for smooth movement
    socket.emit('vehicleUpdate', {
      id: vehicleId,
      lat: vehicle.lat,
      lng: vehicle.lng,
      state: vehicle.state,
      speed: vehicle.speed
    });
  });
}

// Helper to get intersection coordinates
function getIntersectionLat(intersectionId) {
  const intersection = intersections.find(i => i.id === intersectionId);
  return intersection ? intersection.lat : 0;
}

function getIntersectionLng(intersectionId) {
  const intersection = intersections.find(i => i.id === intersectionId);
  return intersection ? intersection.lng : 0;
}

// Cleanup on disconnect
socket.on('disconnect', () => {
  console.log('🚗 Vehicle Traffic Simulator Disconnected');
  vehicles.clear();
});

socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down vehicle traffic simulator...');
  socket.disconnect();
  process.exit(0);
});
