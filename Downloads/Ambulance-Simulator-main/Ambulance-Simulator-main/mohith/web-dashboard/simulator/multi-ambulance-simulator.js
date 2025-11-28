// Multi-Ambulance Simulator - Simple tracking without collision avoidance
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

// Multiple ambulances with different starting positions in Koramangala
// Routes designed to pass through multiple traffic light intersections
const ambulances = [
  {
    id: 'AMB001',
    name: 'Ambulance Alpha',
    startLat: 12.9318, // Koramangala Water Tank (INT006)
    startLng: 77.6135,
    // Route: Water Tank -> Jyoti Nivas -> Sony World -> 6th Block -> 5th Block
    waypoints: [
      { lat: 12.9318, lng: 77.6135, name: 'Water Tank Junction' },      // INT006
      { lat: 12.9344, lng: 77.6124, name: 'Jyoti Nivas Junction' },     // INT005
      { lat: 12.9358, lng: 77.6153, name: 'Sony World Junction' },      // INT003
      { lat: 12.9373, lng: 77.6269, name: '6th Block Junction' },       // INT002
      { lat: 12.9385, lng: 77.6327, name: '5th Block Junction' }        // INT001
    ],
    color: '#e74c3c'
  },
  {
    id: 'AMB002',
    name: 'Ambulance Beta',
    startLat: 12.9344, // Koramangala 7th Block (INT004)
    startLng: 77.6297,
    // Route: 7th Block -> 5th Block -> 6th Block
    waypoints: [
      { lat: 12.9344, lng: 77.6297, name: '7th Block Junction' },       // INT004
      { lat: 12.9385, lng: 77.6327, name: '5th Block Junction' },       // INT001
      { lat: 12.9373, lng: 77.6269, name: '6th Block Junction' }        // INT002
    ],
    color: '#3498db'
  },
  {
    id: 'AMB003',
    name: 'Ambulance Gamma',
    startLat: 12.9385, // Koramangala 5th Block (INT001)
    startLng: 77.6327,
    // Route: 5th Block -> 6th Block -> Sony World -> Jyoti Nivas
    waypoints: [
      { lat: 12.9385, lng: 77.6327, name: '5th Block Junction' },       // INT001
      { lat: 12.9373, lng: 77.6269, name: '6th Block Junction' },       // INT002
      { lat: 12.9358, lng: 77.6153, name: 'Sony World Junction' },      // INT003
      { lat: 12.9344, lng: 77.6124, name: 'Jyoti Nivas Junction' }      // INT005
    ],
    color: '#2ecc71'
  }
];

// Ambulance states
const ambulanceStates = new Map();

// Movement parameters
const SPEED = 0.0001;
const UPDATE_INTERVAL = 2000; // Update every 2 seconds for faster response

// Initialize ambulance states
ambulances.forEach(amb => {
  ambulanceStates.set(amb.id, {
    ...amb,
    currentLat: amb.startLat,
    currentLng: amb.startLng,
    prevLat: amb.startLat,
    prevLng: amb.startLng,
    currentWaypointIndex: 0,
    currentHospital: null,
    currentRouteCoords: [],
    routeIndex: 0
  });
});

// Calculate direction based on movement
function calculateDirection(currentLat, currentLng, prevLat, prevLng) {
  const latDiff = currentLat - prevLat;
  const lngDiff = currentLng - prevLng;
  
  if (Math.abs(latDiff) < 0.00001 && Math.abs(lngDiff) < 0.00001) {
    return 'N';
  }
  
  if (Math.abs(latDiff) > Math.abs(lngDiff)) {
    return latDiff > 0 ? 'N' : 'S';
  } else {
    return lngDiff > 0 ? 'E' : 'W';
  }
}

// Get OSRM route
async function getOSRMRoute(startLat, startLng, endLat, endLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await axios.get(url);
    
    if (response.data.routes && response.data.routes.length > 0) {
      const coords = response.data.routes[0].geometry.coordinates;
      return coords.map(c => ({ lat: c[1], lng: c[0] }));
    }
  } catch (error) {
    console.error(`Failed to get OSRM route: ${error.message}`);
  }
  return [];
}

// Update single ambulance
async function updateAmbulance(ambulanceId) {
  const state = ambulanceStates.get(ambulanceId);
  
  const direction = calculateDirection(
    state.currentLat, state.currentLng,
    state.prevLat, state.prevLng
  );
  
  const payload = {
    id: ambulanceId,
    lat: state.currentLat,
    lng: state.currentLng,
    emergency: true,
    direction: direction,
    timestamp: new Date().toISOString(),
    waypointPath: state.waypoints.map(wp => ({ lat: wp.lat, lng: wp.lng, name: wp.name }))
  };

  try {
    const response = await axios.post(`${SERVER_URL}/api/ambulance`, payload);
    
    // Use waypoint navigation instead of direct hospital routing
    const currentWaypoint = state.waypoints[state.currentWaypointIndex];
    
    console.log(`🚑 ${ambulanceId} → ${state.currentLat.toFixed(6)}, ${state.currentLng.toFixed(6)} [${direction}]`);
    console.log(`   📍 Target: ${currentWaypoint.name} (${state.currentWaypointIndex + 1}/${state.waypoints.length})`);
    
    // Get route to next waypoint if needed
    if (state.currentRouteCoords.length === 0 || state.routeIndex >= state.currentRouteCoords.length) {
      console.log(`   🗺️  Calculating route to ${currentWaypoint.name}...`);
      
      state.currentRouteCoords = await getOSRMRoute(
        state.currentLat, state.currentLng,
        currentWaypoint.lat, currentWaypoint.lng
      );
      
      state.routeIndex = 0;
      console.log(`   ✓ Route: ${state.currentRouteCoords.length} points\n`);
    }

    // Move along route
    if (state.currentRouteCoords.length > state.routeIndex) {
      const nextPoint = state.currentRouteCoords[state.routeIndex];
      const distance = Math.sqrt(
        Math.pow(nextPoint.lat - state.currentLat, 2) +
        Math.pow(nextPoint.lng - state.currentLng, 2)
      );
      
      if (distance < 0.0001) {
        state.routeIndex++;
        if (state.routeIndex % 20 === 0) {
          console.log(`   📍 ${ambulanceId} Progress: ${Math.round((state.routeIndex / state.currentRouteCoords.length) * 100)}%`);
        }
      } else {
        // Calculate next position
        const latDiff = nextPoint.lat - state.currentLat;
        const lngDiff = nextPoint.lng - state.currentLng;
        const norm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        const nextLat = state.currentLat + (latDiff / norm) * SPEED;
        const nextLng = state.currentLng + (lngDiff / norm) * SPEED;
        
        // Move to next position
        state.prevLat = state.currentLat;
        state.prevLng = state.currentLng;
        state.currentLat = nextLat;
        state.currentLng = nextLng;
      }
    } else {
      // Check if reached current waypoint
      const distToWaypoint = Math.sqrt(
        Math.pow(currentWaypoint.lat - state.currentLat, 2) +
        Math.pow(currentWaypoint.lng - state.currentLng, 2)
      );
      
      if (distToWaypoint < 0.0005) {
        console.log(`\n🏁 ${ambulanceId} reached ${currentWaypoint.name}!\n`);
        
        // Move to next waypoint
        state.currentWaypointIndex++;
        
        if (state.currentWaypointIndex >= state.waypoints.length) {
          // Completed all waypoints, reset to start
          console.log(`\n✅ ${ambulanceId} completed full route! Resetting...\n`);
          state.currentLat = state.startLat;
          state.currentLng = state.startLng;
          state.prevLat = state.startLat;
          state.prevLng = state.startLng;
          state.currentWaypointIndex = 0;
        }
        
        state.currentRouteCoords = [];
        state.routeIndex = 0;
      }
    }
    
  } catch (error) {
    console.error(`❌ ${ambulanceId} update failed:`, error.message);
  }
}

// Main simulation loop
async function simulate() {
  for (const ambulanceId of ambulanceStates.keys()) {
    await updateAmbulance(ambulanceId);
  }
}

console.log('🚑 Multi-Ambulance Simulator Started');
console.log(`   ${ambulances.length} ambulances active in Koramangala:`);
ambulances.forEach(amb => {
  console.log(`   - ${amb.id} (${amb.name}): Starting at ${amb.startLat.toFixed(4)}, ${amb.startLng.toFixed(4)}`);
});
console.log(`   Update interval: ${UPDATE_INTERVAL/1000}s\n`);

// Send initial updates
(async () => {
  for (const ambulanceId of ambulanceStates.keys()) {
    await updateAmbulance(ambulanceId);
    await new Promise(resolve => setTimeout(resolve, 500));
  }
})();

// Run simulation
setInterval(simulate, UPDATE_INTERVAL);
