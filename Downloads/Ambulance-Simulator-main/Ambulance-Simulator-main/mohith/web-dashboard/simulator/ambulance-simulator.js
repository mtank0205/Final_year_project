// Ambulance GPS Simulator - simulates moving ambulance sending location updates
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000/api/ambulance';
const AMBULANCE_ID = 'AMB001';

// Starting position (Koramangala 5th Block Junction)
let currentLat = 12.9385;
let currentLng = 77.6327;
let prevLat = currentLat;
let prevLng = currentLng;

// Movement parameters
const SPEED = 0.0001; // Slower, more realistic speed
const UPDATE_INTERVAL = 2000; // Update every 2 seconds for faster response

let currentHospital = null;
let currentRouteCoords = [];
let routeIndex = 0;

// Calculate direction based on movement
function calculateDirection(currentLat, currentLng, prevLat, prevLng) {
  const latDiff = currentLat - prevLat;
  const lngDiff = currentLng - prevLng;
  
  if (Math.abs(latDiff) < 0.00001 && Math.abs(lngDiff) < 0.00001) {
    return 'N'; // Default if not moving
  }
  
  // Determine primary direction based on largest difference
  if (Math.abs(latDiff) > Math.abs(lngDiff)) {
    return latDiff > 0 ? 'N' : 'S';
  } else {
    return lngDiff > 0 ? 'E' : 'W';
  }
}

async function getOSRMRoute(startLat, startLng, endLat, endLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
    const response = await axios.get(url);
    
    if (response.data.routes && response.data.routes.length > 0) {
      const coords = response.data.routes[0].geometry.coordinates;
      // Convert [lng, lat] to [lat, lng]
      return coords.map(c => ({ lat: c[1], lng: c[0] }));
    }
  } catch (error) {
    console.error('Failed to get OSRM route:', error.message);
  }
  return [];
}

async function sendLocationUpdate() {
  // Calculate direction before updating position
  const direction = calculateDirection(currentLat, currentLng, prevLat, prevLng);
  
  const payload = {
    id: AMBULANCE_ID,
    lat: currentLat,
    lng: currentLng,
    emergency: true,
    direction: direction,
    timestamp: new Date().toISOString()
  };

  try {
    const response = await axios.post(SERVER_URL, payload);
    const { hospital } = response.data;
    
    console.log(`🚑 ${AMBULANCE_ID} → ${currentLat.toFixed(6)}, ${currentLng.toFixed(6)} [${direction}]`);
    console.log(`   🏥 Target: ${hospital.name} (${(response.data.nearbyLights?.length || 0)} intersections in emergency)`);
    
    // Get OSRM route if hospital changed
    if (!currentHospital || currentHospital.id !== hospital.id) {
      currentHospital = hospital;
      console.log(`   🗺️  Fetching road route to ${hospital.name}...`);
      
      currentRouteCoords = await getOSRMRoute(
        currentLat, currentLng,
        hospital.lat, hospital.lng
      );
      
      routeIndex = 0;
      console.log(`   ✓ Route calculated: ${currentRouteCoords.length} road points\n`);
    }

    // Move ambulance along route
    if (currentRouteCoords.length > routeIndex) {
      const nextPoint = currentRouteCoords[routeIndex];
      const distance = Math.sqrt(
        Math.pow(nextPoint.lat - currentLat, 2) +
        Math.pow(nextPoint.lng - currentLng, 2)
      );
      
      if (distance < 0.0001) {
        // Reached next point, move to following point
        routeIndex++;
        if (routeIndex % 20 === 0) {
          console.log(`   📍 Progress: ${Math.round((routeIndex / currentRouteCoords.length) * 100)}%`);
        }
      } else {
        // Move towards next point
        const latDiff = nextPoint.lat - currentLat;
        const lngDiff = nextPoint.lng - currentLng;
        const norm = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        // Store previous position
        prevLat = currentLat;
        prevLng = currentLng;
        
        currentLat += (latDiff / norm) * SPEED;
        currentLng += (lngDiff / norm) * SPEED;
      }
    } else if (currentHospital) {
      // Reached hospital
      const distToHospital = Math.sqrt(
        Math.pow(currentHospital.lat - currentLat, 2) +
        Math.pow(currentHospital.lng - currentLng, 2)
      );
      
      if (distToHospital < 0.0005) {
        console.log(`\n🏁 Reached ${currentHospital.name}! Resetting to start...\n`);
        currentLat = 12.9385;  // Koramangala 5th Block
        currentLng = 77.6327;
        currentHospital = null;
        currentRouteCoords = [];
        routeIndex = 0;
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to send update:', error.message);
  }
}

console.log('🚑 Ambulance Simulator Started (OSRM Road Routing)');
console.log(`   Sending updates every ${UPDATE_INTERVAL/1000}s to ${SERVER_URL}`);
console.log(`   Starting position: Koramangala 5th Block, Bangalore (${currentLat}, ${currentLng})\n`);

// Send initial update immediately
sendLocationUpdate();

// Then send updates at regular intervals
setInterval(sendLocationUpdate, UPDATE_INTERVAL);
