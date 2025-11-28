require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');

const mapController = require('./map-controller');
const notificationService = require('./notification-service');
const { AStarPathfinder } = require('./astar-pathfinder');
const { HospitalDiscovery } = require('./hospital-discovery');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(bodyParser.json());

const CONFIG_PATH = path.join(__dirname, '..', '..', 'config', 'traffic-lights.json');
const HOSPITALS_PATH = path.join(__dirname, '..', '..', 'config', 'hospitals.json');
const DISCOVERED_HOSPITALS_PATH = path.join(__dirname, '..', '..', 'config', 'discovered-hospitals.json');

const intersections = require(CONFIG_PATH);
let hospitals = require(HOSPITALS_PATH);

// Initialize Hospital Discovery Service
const hospitalDiscovery = new HospitalDiscovery();

// Load previously discovered hospitals from cache
hospitalDiscovery.loadFromFile(DISCOVERED_HOSPITALS_PATH).then(() => {
  // Merge static + discovered hospitals
  hospitals = hospitalDiscovery.mergeHospitals(hospitals);
  console.log(`📍 Total hospitals available: ${hospitals.length} (static + discovered)`);
  
  // Reinitialize pathfinder with updated hospital list
  pathfinder.hospitals = hospitals;
});

// Flatten traffic lights from intersections
const trafficLights = [];
intersections.forEach(intersection => {
  intersection.signals.forEach(signal => {
    trafficLights.push({
      ...signal,
      intersection: intersection.name,
      intersectionId: intersection.id,
      intersectionLat: intersection.lat,
      intersectionLng: intersection.lng
    });
  });
});

// Initialize A* pathfinder with intersection centers
const pathfinder = new AStarPathfinder(
  intersections.map(i => ({ id: i.id, name: i.name, lat: i.lat, lng: i.lng })), 
  hospitals
);

// State
const ambulances = new Map(); // id => {id, lat, lng, emergency, timestamp}
const ambulanceTargets = new Map(); // id => { hospital, etaSeconds, lastChecked }
const trafficStatus = {}; // signalId => {mode: 'normal'|'emergency', lastUpdate, color}
const intersectionStatus = {}; // intersectionId => {activeDirection: null|'N'|'S'|'E'|'W', lastUpdate}
const trafficLightSockets = new Map(); // tlId => socketId
const driverLocations = new Map(); // socketId => {lat,lng}

// initialize trafficStatus for all signals
trafficLights.forEach(t => {
  trafficStatus[t.id] = { mode: 'normal', lastUpdate: Date.now(), color: 'green', info: t };
});

// initialize intersection status
intersections.forEach(i => {
  intersectionStatus[i.id] = { activeDirection: null, lastUpdate: Date.now() };
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/api/config', (req, res) => {
  res.json({ googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '' });
});

app.get('/api/traffic-lights', (req, res) => {
  res.json(intersections);
});

app.get('/api/traffic-signals', (req, res) => {
  res.json(trafficLights);
});

app.get('/api/hospitals', (req, res) => {
  res.json(hospitals);
});

// API endpoint to discover hospitals near a location
app.post('/api/discover-hospitals', async (req, res) => {
  const { lat, lng, radius } = req.body;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: 'lat and lng required' });
  }
  
  try {
    const discovered = await hospitalDiscovery.discoverNearbyHospitals(
      lat, 
      lng, 
      radius || 5000
    );
    
    // Merge with existing hospitals
    hospitals = hospitalDiscovery.mergeHospitals(hospitals);
    pathfinder.hospitals = hospitals;
    
    // Save to cache file
    await hospitalDiscovery.saveToFile(DISCOVERED_HOSPITALS_PATH);
    
    // Broadcast update to all clients
    io.emit('hospitals:updated', hospitals);
    
    res.json({ 
      discovered: discovered.length,
      total: hospitals.length,
      newHospitals: discovered
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/traffic-light/:id', (req, res) => {
  const id = req.params.id;
  const status = trafficStatus[id] || null;
  if (!status) return res.status(404).json({ error: 'not found' });
  res.json(status);
});

app.post('/api/ambulance', async (req, res) => {
  const data = req.body;
  if (!data || !data.id || typeof data.lat !== 'number' || typeof data.lng !== 'number') {
    return res.status(400).json({ error: 'invalid payload' });
  }

  ambulances.set(data.id, data);

  // Auto-discover hospitals near ambulance location (once per ambulance per 10km radius)
  const ambulanceKey = `${data.id}_discovery`;
  if (!global[ambulanceKey]) {
    global[ambulanceKey] = true;
    
    // Discover hospitals in background (non-blocking)
    hospitalDiscovery.discoverNearbyHospitals(data.lat, data.lng, 10000)
      .then(discovered => {
        if (discovered.length > 0) {
          hospitals = hospitalDiscovery.mergeHospitals(hospitals);
          pathfinder.hospitals = hospitals;
          hospitalDiscovery.saveToFile(DISCOVERED_HOSPITALS_PATH);
          io.emit('hospitals:updated', hospitals);
          console.log(`✨ Auto-discovered ${discovered.length} new hospitals near ${data.id}`);
        }
      })
      .catch(err => console.error('Auto-discovery failed:', err.message));
  }

  // Ensure we've at least attempted to discover nearby OSM hospitals once
  try {
    if (hospitalDiscovery.discoveredHospitals && hospitalDiscovery.discoveredHospitals.size === 0) {
      const discovered = await hospitalDiscovery.discoverNearbyHospitals(data.lat, data.lng, 3000);
      if (discovered.length > 0) {
        hospitals = hospitalDiscovery.mergeHospitals(hospitals);
        pathfinder.hospitals = hospitals;
        hospitalDiscovery.saveToFile(DISCOVERED_HOSPITALS_PATH).catch(err => console.error('Save cache failed:', err.message));
        io.emit('hospitals:updated', hospitals);
        console.log(`✨ Synced ${discovered.length} discovered hospitals before selection`);
      }
    }
  } catch (err) {
    console.error('Synchronous discovery failed (continuing):', err.message);
  }

  // Choose the fastest hospital by travel time using OSRM for a limited candidate set
  async function getRouteInfo(slat, slng, dlat, dlng) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${slng},${slat};${dlng},${dlat}?overview=false&geometries=geojson`;
      const r = await axios.get(url, { timeout: 8000 });
      if (r.data && r.data.routes && r.data.routes.length > 0) {
        return { duration: r.data.routes[0].duration, distance: r.data.routes[0].distance };
      }
    } catch (err) {
      console.debug('OSRM route error:', err.message);
    }
    return null;
  }

  const MAX_CANDIDATES = 8;
  const candidates = pathfinder.hospitals
    .map(h => ({ h, d: pathfinder.haversineDistance(data.lat, data.lng, h.lat, h.lng) }))
    .sort((a,b) => a.d - b.d)
    .slice(0, MAX_CANDIDATES)
    .map(x => x.h);

  const routePromises = candidates.map(h => getRouteInfo(data.lat, data.lng, h.lat, h.lng).then(info => ({ hospital: h, info })));
  const settled = await Promise.allSettled(routePromises);
  const successful = settled
    .filter(s => s.status === 'fulfilled' && s.value && s.value.info)
    .map(s => ({ hospital: s.value.hospital, duration: s.value.info.duration, distance: s.value.info.distance }));

  let selectedHospital = null;
  let selectedDuration = Infinity;

  if (successful.length > 0) {
    successful.forEach(s => {
      if (s.duration < selectedDuration) {
        selectedDuration = s.duration;
        selectedHospital = s.hospital;
      }
    });
  } else {
    // Fallback to geometric nearest hospital if OSRM failed for all
    const nn = pathfinder.findNearestHospital(data.lat, data.lng);
    selectedHospital = nn.hospital;
    selectedDuration = nn.distance / 13.9; // rough fallback: assume 50 km/h
  }

  // Re-evaluate previous target and switch only if benefit exceeds threshold
  const prevTarget = ambulanceTargets.get(data.id);
  const SWITCH_THRESHOLD_SECONDS = 60; // switch only if new option is faster by this many seconds
  if (prevTarget && prevTarget.hospital && prevTarget.hospital.id !== selectedHospital.id) {
    if (prevTarget.etaSeconds && selectedDuration > 0) {
      if (!(prevTarget.etaSeconds - selectedDuration > SWITCH_THRESHOLD_SECONDS)) {
        selectedHospital = prevTarget.hospital;
        selectedDuration = prevTarget.etaSeconds;
      }
    }
  }

  ambulanceTargets.set(data.id, { hospital: selectedHospital, etaSeconds: selectedDuration, lastChecked: Date.now() });

  // Calculate optimal path to selected hospital through traffic lights
  const optimalPath = pathfinder.findOptimalPath(
    data.lat, data.lng,
    selectedHospital.lat, selectedHospital.lng
  );

  // Broadcast ambulance update with route to dashboard clients
  io.emit('ambulance:update', {
    ...data,
    nearestHospital: selectedHospital,
    hospitalETASeconds: Math.round(selectedDuration),
    routePath: optimalPath
  });

  // PUBLIC BROADCAST - Send to ALL connected clients (simulates real traffic alert)
  io.emit('ambulance:public-alert', {
    id: data.id,
    lat: data.lat,
    lng: data.lng,
    speed: Math.floor(Math.random() * 60) + 40, // Simulated speed
    direction: data.direction,
    emergency: data.emergency,
    timestamp: data.timestamp
  });

  // Determine ambulance direction of travel
  const ambulanceDirection = calculateDirection(data);

  // Check each intersection for proximity
  const nearbyLights = [];
  intersections.forEach(intersection => {
    const distToIntersection = mapController.haversineDistance(
      data.lat, data.lng, 
      intersection.lat, intersection.lng
    );
    
    // Increased range to 1000m for earlier detection
    if (distToIntersection <= 1000 && data.emergency) {
      // Ambulance is near this intersection - IMMEDIATELY turn lights green
      const direction = getAmbulanceDirectionAtIntersection(data, intersection);
      
      // Update intersection status
      intersectionStatus[intersection.id] = {
        activeDirection: direction,
        lastUpdate: Date.now(),
        ambulanceId: data.id
      };

      // Set signals: green for ambulance direction, red for others - INSTANT CHANGE
      intersection.signals.forEach(signal => {
        if (signal.direction.charAt(0) === direction) {
          // Green for ambulance lane
          trafficStatus[signal.id] = {
            mode: 'emergency',
            color: 'green',
            lastUpdate: Date.now(),
            info: signal
          };
        } else {
          // Red for other lanes
          trafficStatus[signal.id] = {
            mode: 'emergency',
            color: 'red',
            lastUpdate: Date.now(),
            info: signal
          };
        }

        // Notify traffic signal socket IMMEDIATELY
        const sockId = trafficLightSockets.get(signal.id);
        if (sockId) {
          const sock = io.sockets.sockets.get(sockId);
          if (sock) {
            sock.emit('traffic:emergency', { 
              ambulance: data, 
              distance: Math.round(distToIntersection),
              color: trafficStatus[signal.id].color
            });
          }
        }
      });

      nearbyLights.push({ 
        intersectionId: intersection.id, 
        name: intersection.name,
        dist: distToIntersection,
        activeDirection: direction 
      });

      // Broadcast intersection status to all clients IMMEDIATELY
      io.emit('intersection:update', {
        intersectionId: intersection.id,
        activeDirection: direction,
        ambulanceId: data.id,
        distance: Math.round(distToIntersection)
      });
    }
  });

  // Reset intersections to normal cycle if ambulance has moved away (>800m for 6+ seconds)
  intersections.forEach(intersection => {
    const status = intersectionStatus[intersection.id];
    if (status.activeDirection !== null) {
      const distToIntersection = mapController.haversineDistance(
        data.lat, data.lng,
        intersection.lat, intersection.lng
      );
      const age = Date.now() - status.lastUpdate;
      
      if (distToIntersection > 1200 || age > 8000) {
        // Reset to normal cycle - ambulance has passed
        intersectionStatus[intersection.id] = {
          activeDirection: null,
          lastUpdate: Date.now()
        };

        intersection.signals.forEach(signal => {
          trafficStatus[signal.id] = {
            mode: 'normal',
            color: 'green', // Back to normal cycling
            lastUpdate: Date.now(),
            info: signal
          };

          // Notify socket
          const sockId = trafficLightSockets.get(signal.id);
          if (sockId) {
            const sock = io.sockets.sockets.get(sockId);
            if (sock) {
              sock.emit('traffic:normal', { color: 'green' });
            }
          }
        });

        // Broadcast intersection back to normal
        io.emit('intersection:normal', {
          intersectionId: intersection.id
        });
      }
    }
  });

  // notify drivers nearby (drivers tracked via sockets)
  const notifiedDrivers = [];
  driverLocations.forEach((loc, socketId) => {
    const d = mapController.haversineDistance(data.lat, data.lng, loc.lat, loc.lng);
    
    // Send proximity update to all drivers with distance
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.emit('proximity:update', {
        ambulanceId: data.id,
        distance: d,
        lat: data.lat,
        lng: data.lng
      });
    }
    
    if (d <= 2000) {
      notifiedDrivers.push({ socketId, dist: d });
    }
    
    // Trigger emergency notification if within 10 meters (simulating 1cm proximity)
    if (d <= 10) {
      if (socket) {
        socket.emit('driver:alert', {
          title: '🚨 EMERGENCY ALERT 🚨',
          body: `AMBULANCE ${data.id} IS DIRECTLY NEAR YOU! CLEAR THE WAY IMMEDIATELY!`,
          ambulance: data,
          distance: d,
          critical: true
        });
      }
    }
  });

  if (notifiedDrivers.length > 0) {
    notificationService.sendDriverAlerts(io, notifiedDrivers.map(d=>d.socketId), {
      title: 'Emergency vehicle approaching',
      body: `${data.id} is ${Math.round(notifiedDrivers[0]?.dist || 0)} m away. Please give way.`,
      ambulance: data
    });
  }

  res.json({ ok: true, nearbyLights, hospital: selectedHospital, etaSeconds: Math.round(selectedDuration), optimalPath });
});

// Helper function to calculate ambulance direction based on movement
function calculateDirection(ambulance) {
  // This would use previous position to determine direction
  // For now, return a default or use velocity vector if available
  return ambulance.direction || 'N';
}

// Helper function to determine which direction ambulance is traveling at intersection
function getAmbulanceDirectionAtIntersection(ambulance, intersection) {
  const latDiff = ambulance.lat - intersection.lat;
  const lngDiff = ambulance.lng - intersection.lng;
  
  // Determine primary direction based on largest difference
  if (Math.abs(latDiff) > Math.abs(lngDiff)) {
    return latDiff > 0 ? 'N' : 'S';
  } else {
    return lngDiff > 0 ? 'E' : 'W';
  }
}

io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);

  socket.on('traffic:register', (payload) => {
    // payload: { id: 'TL001' }
    if (payload && payload.id) {
      trafficLightSockets.set(payload.id, socket.id);
      console.log('Traffic light registered', payload.id, '->', socket.id);
      socket.emit('traffic:status', trafficStatus[payload.id] || { mode: 'normal' });
    }
  });

  socket.on('driver:register', (payload) => {
    // payload: { lat, lng }
    if (payload && typeof payload.lat === 'number' && typeof payload.lng === 'number') {
      driverLocations.set(socket.id, { lat: payload.lat, lng: payload.lng });
      socket.emit('registered', { ok: true });
    }
  });

  socket.on('driver:location', (payload) => {
    if (payload && typeof payload.lat === 'number' && typeof payload.lng === 'number') {
      driverLocations.set(socket.id, { lat: payload.lat, lng: payload.lng });
    }
  });

  socket.on('device:register', (payload) => {
    // Register nearby mobile devices for proximity alerts
    console.log('Device registered:', payload.id, '-', payload.name);
    socket.emit('device:registered', { success: true, deviceId: payload.id });
    
    // Broadcast to other clients that a device connected
    socket.broadcast.emit('device:connected', payload);
  });

  socket.on('ambulance:proximity-broadcast', (ambulanceData) => {
    // Broadcast ambulance position to all nearby receivers
    console.log('Broadcasting ambulance position:', ambulanceData.id);
    socket.broadcast.emit('ambulance:proximity-broadcast', ambulanceData);
  });

  // Vehicle traffic simulator events
  socket.on('vehicleSpawned', (vehicle) => {
    io.emit('vehicleSpawned', vehicle);
  });

  socket.on('vehicleUpdate', (vehicleData) => {
    io.emit('vehicleUpdate', vehicleData);
  });

  socket.on('vehicleReached', (vehicleData) => {
    io.emit('vehicleReached', vehicleData);
  });

  // Traffic light state updates from simulator
  socket.on('trafficLightUpdate', (data) => {
    io.emit('trafficLightUpdate', data);
  });

  socket.on('disconnect', () => {
    // cleanup
    [...trafficLightSockets.entries()].forEach(([k, v]) => { if (v === socket.id) trafficLightSockets.delete(k); });
    driverLocations.delete(socket.id);
    socket.broadcast.emit('device:disconnected', socket.id);
    console.log('socket disconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
