// Routing Service - Uses OSRM for road routing + Overpass API for traffic signals
// OSRM: Free routing API - ambulance follows EXACT roads
// Overpass: Gets REAL traffic signal locations from OpenStreetMap

/**
 * Fetch route with OSRM - ambulance follows EXACT roads
 */
const fetchOSRMRoute = async (startCoords, endCoords) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson&steps=true`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
      console.error('OSRM routing failed:', data);
      return null;
    }
    
    const coordinates = data.routes[0].geometry.coordinates;
    // Convert [lng, lat] to [lat, lng] for Leaflet
    const waypoints = coordinates.map(coord => [coord[1], coord[0]]);
    
    // Take every 2nd point for smooth but accurate movement
    const simplified = [];
    for (let i = 0; i < waypoints.length; i += 2) {
      simplified.push(waypoints[i]);
    }
    // Always include last point
    if (simplified[simplified.length - 1] !== waypoints[waypoints.length - 1]) {
      simplified.push(waypoints[waypoints.length - 1]);
    }
    
    console.log(`✅ OSRM Route: ${waypoints.length} points → ${simplified.length} waypoints`);
    
    return {
      waypoints: simplified,
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
    };
  } catch (error) {
    console.error('OSRM error:', error);
    return null;
  }
};

/**
 * Main route fetching function
 */
export const fetchRoadRoute = async (startCoords, endCoords) => {
  return await fetchOSRMRoute(startCoords, endCoords);
};

/**
 * Fetch REAL traffic signals from OpenStreetMap using Overpass API
 */
export const fetchTrafficSignalsAlongRoute = async (routeWaypoints) => {
  if (!routeWaypoints || routeWaypoints.length === 0) return [];

  try {
    // Calculate bounding box from route waypoints
    const lats = routeWaypoints.map(wp => wp[0]);
    const lngs = routeWaypoints.map(wp => wp[1]);
    
    const minLat = Math.min(...lats) - 0.003;
    const maxLat = Math.max(...lats) + 0.003;
    const minLng = Math.min(...lngs) - 0.003;
    const maxLng = Math.max(...lngs) + 0.003;

    // Overpass API query for traffic signals
    const query = `
      [out:json][timeout:25];
      (
        node["highway"="traffic_signals"](${minLat},${minLng},${maxLat},${maxLng});
      );
      out body;
    `;

    console.log('🚦 Fetching traffic signals from OpenStreetMap...');
    
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      console.log('⚠️ No traffic signals found, using fallback positions');
      return [];
    }

    // Convert to our format
    const signals = data.elements.map((element, index) => ({
      id: `signal-${element.id}`,
      name: element.tags?.name || `Traffic Signal ${index + 1}`,
      position: [element.lat, element.lon],
      osmId: element.id,
    }));

    console.log(`✅ Found ${signals.length} REAL traffic signals from OpenStreetMap`);
    return signals;

  } catch (error) {
    console.error('Overpass API error:', error);
    return [];
  }
};

/**
 * Fetch routes for all ambulances using OSRM
 * Also identifies which signals are ACTUALLY on each route
 */
export const fetchAmbulanceRoutes = async (ambulances, hospitals, patients) => {
  const routePromises = ambulances.map(async (amb) => {
    const hospital = hospitals.find(h => h.id === amb.hospitalId);
    const patient = patients.find(p => p.id === amb.patientId);
    
    if (!hospital || !patient) return null;
    
    console.log(`🚑 Fetching route: ${hospital.name} → ${patient.name}`);
    
    // Fetch route from hospital to patient
    const toPatient = await fetchRoadRoute(hospital.position, patient.position);
    
    // Fetch route from patient back to hospital
    const toHospital = await fetchRoadRoute(patient.position, hospital.position);
    
    return {
      ambulanceId: amb.id,
      toPatient,
      toHospital,
    };
  });
  
  const results = await Promise.all(routePromises);
  
  // Convert to object keyed by ambulance ID
  const routesById = {};
  const allWaypoints = [];
  
  results.forEach(result => {
    if (result) {
      routesById[result.ambulanceId] = {
        waypointsToPatient: result.toPatient?.waypoints || [],
        waypointsToHospital: result.toHospital?.waypoints || [],
      };
      
      // Collect waypoints for signal detection
      if (result.toPatient?.waypoints) {
        allWaypoints.push(...result.toPatient.waypoints);
      }
    }
  });

  // Fetch REAL traffic signals from OpenStreetMap
  let trafficSignals = [];
  if (allWaypoints.length > 0) {
    trafficSignals = await fetchTrafficSignalsAlongRoute(allWaypoints);
  }

  // Fallback signals if Overpass fails
  if (trafficSignals.length === 0) {
    console.log('📍 Using fallback traffic signal positions');
    trafficSignals = [
      { id: 'signal-1', name: 'Signal - East Junction', position: [12.9344, 77.6230] },
      { id: 'signal-2', name: 'Signal - Center', position: [12.9347, 77.6155] },
      { id: 'signal-3', name: 'Signal - West Junction', position: [12.9350, 77.6100] },
    ];
  }
  
  // PRE-CALCULATE which signals are on each ambulance's route
  // This is done ONCE when routes are loaded, not during simulation
  // Use flat keys like "amb1_toPatient" for easy lookup in MainDashboard
  const signalsOnRoute = {};
  
  results.forEach(result => {
    if (!result) return;
    
    const ambId = result.ambulanceId;
    const waypointsToPatient = result.toPatient?.waypoints || [];
    const waypointsToHospital = result.toHospital?.waypoints || [];
    
    // Find signals that are ACTUALLY on the toPatient route
    const signalsToPatient = findSignalsOnRoute(trafficSignals, waypointsToPatient);
    
    // Find signals that are ACTUALLY on the toHospital route  
    const signalsToHospital = findSignalsOnRoute(trafficSignals, waypointsToHospital);
    
    // Store with flat keys for easy lookup
    signalsOnRoute[`${ambId}_toPatient`] = signalsToPatient;
    signalsOnRoute[`${ambId}_toHospital`] = signalsToHospital;
    
    console.log(`🚦 Ambulance ${ambId}: ${signalsToPatient.length} signals to patient, ${signalsToHospital.length} signals to hospital`);
  });
  
  return { routes: routesById, trafficSignals, signalsOnRoute };
};

/**
 * Find signals that are ACTUALLY on a route path
 * A signal is "on route" if it's within 50m of any waypoint
 * We check perpendicular distance to the route line segments
 */
function findSignalsOnRoute(allSignals, waypoints) {
  if (!waypoints || waypoints.length < 2) return [];
  
  console.log(`   Checking ${allSignals.length} signals against route with ${waypoints.length} waypoints`);
  
  const signalsOnRoute = [];
  
  allSignals.forEach(signal => {
    let isOnRoute = false;
    let routeIndex = -1; // Which waypoint index this signal is near
    let minDistToRoute = Infinity;
    
    // Check distance to each line segment of the route
    for (let i = 0; i < waypoints.length - 1; i++) {
      const segmentStart = waypoints[i];
      const segmentEnd = waypoints[i + 1];
      
      // Calculate perpendicular distance from signal to this line segment
      const dist = pointToSegmentDistance(signal.position, segmentStart, segmentEnd);
      
      if (dist < minDistToRoute) {
        minDistToRoute = dist;
        routeIndex = i;
      }
      
      // Signal is on route if within 50 meters of the route line
      if (dist < 50) {
        isOnRoute = true;
      }
    }
    
    if (isOnRoute) {
      console.log(`   ✓ Signal ${signal.id} is ON route at waypoint ${routeIndex} (${minDistToRoute.toFixed(1)}m away)`);
      signalsOnRoute.push({
        signalId: signal.id,
        name: signal.name,
        position: signal.position,
        waypointIndex: routeIndex, // Position along the route (for ordering)
        distanceToRoute: minDistToRoute,
      });
    }
  });
  
  // Sort by position along the route (waypointIndex)
  signalsOnRoute.sort((a, b) => a.waypointIndex - b.waypointIndex);
  
  console.log(`   Found ${signalsOnRoute.length} signals on this route path`);
  
  return signalsOnRoute;
}

/**
 * Calculate perpendicular distance from a point to a line segment
 * Returns distance in meters
 */
function pointToSegmentDistance(point, segStart, segEnd) {
  const [px, py] = point;
  const [ax, ay] = segStart;
  const [bx, by] = segEnd;
  
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  
  const ab2 = abx * abx + aby * aby;
  
  if (ab2 === 0) {
    // Segment is a point
    return haversineDistance(point, segStart);
  }
  
  // Project point onto line, clamped to segment
  let t = (apx * abx + apy * aby) / ab2;
  t = Math.max(0, Math.min(1, t));
  
  const closestPoint = [ax + t * abx, ay + t * aby];
  
  return haversineDistance(point, closestPoint);
}

/**
 * Haversine distance between two [lat, lng] points in meters
 */
function haversineDistance(pos1, pos2) {
  const R = 6371000; // Earth's radius in meters
  const lat1 = pos1[0] * Math.PI / 180;
  const lat2 = pos2[0] * Math.PI / 180;
  const deltaLat = (pos2[0] - pos1[0]) * Math.PI / 180;
  const deltaLng = (pos2[1] - pos1[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

/**
 * Fetch civilian vehicle routes (simplified - no API needed for now)
 */
export const fetchCivilianRoutes = async () => {
  // Return empty for now - we'll add traffic later
  return [];
};
