(function(){
  const socket = io();
  let map;
  let ambulanceMarkers = {}; // Multiple ambulance markers: id => marker
  let ambulanceRouteLayers = {}; // id => polyline layer for routes
  let ambulanceRouteDecorators = {}; // id => decorator layer for animated arrows
  let ambulanceConnectorLayers = {}; // id => small connector from route end to hospital marker
  let ambulanceLastHospital = {}; // id => last hospital id to track changes
  let trafficMarkers = {};
  let hospitalMarkers = {};
  let vehicleMarkers = {}; // Vehicle traffic markers
  let trafficData = [];
  let hospitalData = [];
  let routeMarkersLayer = null;
  let ambulanceLastRoutePath = {}; // id => routePath from server (A* nodes)

  // Colors for different ambulances
  const ambulanceColors = {
    'AMB001': '#e74c3c', // Red
    'AMB002': '#3498db', // Blue
    'AMB003': '#2ecc71', // Green
    'AMB004': '#f39c12', // Orange
    'AMB005': '#9b59b6'  // Purple
  };

  // Fetch route from OSRM and draw polyline
  async function fetchAndDrawRoute(ambulanceId, startLat, startLng, endLat, endLng) {
    const color = ambulanceColors[ambulanceId] || '#FF4444';
    
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates;
        // Convert [lng, lat] to [lat, lng] for Leaflet
        const latLngs = coords.map(c => [c[1], c[0]]);
        
        // Remove old route if exists
        if (ambulanceRouteLayers[ambulanceId]) {
          map.removeLayer(ambulanceRouteLayers[ambulanceId]);
        }
        if (ambulanceRouteDecorators[ambulanceId]) {
          map.removeLayer(ambulanceRouteDecorators[ambulanceId]);
        }
        
        // Calculate offset for overlapping routes (if multiple ambulances go to same hospital)
        const ambulanceIndex = Object.keys(ambulanceColors).indexOf(ambulanceId);
        const offset = ambulanceIndex * 0.00005; // Small offset in degrees
        
        // Apply slight offset to prevent exact overlap
        const offsetLatLngs = latLngs.map(coord => [
          coord[0] + (offset * Math.sin(ambulanceIndex)),
          coord[1] + (offset * Math.cos(ambulanceIndex))
        ]);
        
        // Create new polyline with thick, solid line and high visibility
        const polyline = L.polyline(offsetLatLngs, {
          color: color,
          weight: 12,
          opacity: 1,
          smoothFactor: 1,
          lineCap: 'round',
          lineJoin: 'round',
          dashArray: null, // Solid line
          className: `route-${ambulanceId}`,
          pane: 'overlayPane',
          interactive: true
        }).addTo(map);
        
        // Bring route to front
        polyline.bringToFront();
        
        // Add animated arrows along the route
        const decorator = L.polylineDecorator(polyline, {
          patterns: [
            {
              offset: 0,
              repeat: 40,
              symbol: L.Symbol.arrowHead({
                pixelSize: 15,
                polygon: false,
                pathOptions: {
                  fillOpacity: 1,
                  weight: 3,
                  color: '#ffffff',
                  stroke: true,
                  fill: true
                }
              })
            }
          ]
        }).addTo(map);
        
        // Add popup to route line
        polyline.bindPopup(`<b style="color: ${color}">🚑 ${ambulanceId} Route</b><br><strong>Destination:</strong> Hospital<br><i>This is the ambulance path</i>`);
        
        // Add pulsing effect to route
        polyline.on('mouseover', function() {
          this.setStyle({ weight: 14, opacity: 1 });
        });
        polyline.on('mouseout', function() {
          this.setStyle({ weight: 12, opacity: 1 });
        });
        
        // Remove old connector if present
        if (ambulanceConnectorLayers[ambulanceId]) {
          map.removeLayer(ambulanceConnectorLayers[ambulanceId]);
          delete ambulanceConnectorLayers[ambulanceId];
        }

        ambulanceRouteLayers[ambulanceId] = polyline;
        ambulanceRouteDecorators[ambulanceId] = decorator;

        // Draw a small dashed connector from the route endpoint (snapped to road)
        // to the actual hospital marker location (which may be inside a building)
        const lastPoint = offsetLatLngs[offsetLatLngs.length - 1];
        const hospitalPoint = [endLat, endLng];
        // Only draw connector if the endpoint is not the same as hospital location (distance > few meters)
        try {
          const dist = Math.sqrt(Math.pow((lastPoint[0] - hospitalPoint[0]), 2) + Math.pow((lastPoint[1] - hospitalPoint[1]), 2));
          if (dist > 0.000008) { // roughly > ~0.8m depending on lat (small threshold)
            const connector = L.polyline([lastPoint, hospitalPoint], {
              color: color,
              weight: 3,
              opacity: 0.8,
              dashArray: '6 6',
              className: `connector-${ambulanceId}`
            }).addTo(map);

            ambulanceConnectorLayers[ambulanceId] = connector;
          }
        } catch (err) {
          // ignore connector drawing errors
          console.debug('Connector draw skipped', err);
        }
        console.log(`✓ Route drawn for ${ambulanceId}: ${latLngs.length} points (color: ${color})`);
      }
    } catch (error) {
      console.error(`Failed to fetch route for ${ambulanceId}:`, error);
    }
  }

  // Initialize Leaflet map (OpenStreetMap)
  function initMap() {
    map = L.map('map').setView([12.9756, 77.6040], 14);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Create layer group for route markers
    routeMarkersLayer = L.layerGroup().addTo(map);

    // Load traffic lights config (intersections with multiple signals)
    fetch('/api/traffic-lights').then(r => r.json()).then(intersections => {
      trafficData = intersections;
      intersections.forEach(intersection => {
        intersection.signals.forEach(signal => {
          const icon = createTrafficLightIcon('green');
          const marker = L.marker([signal.lat, signal.lng], { icon })
            .addTo(map)
            .bindPopup(`<b>🚦 ${intersection.name}</b><br>Direction: ${signal.direction}<br>ID: ${signal.id}<br>Status: Normal`)
            .bindTooltip(`${signal.direction}`, { permanent: true, direction: 'top', offset: [0, -35], className: 'signal-label' });
          
          trafficMarkers[signal.id] = { marker, info: signal, intersection: intersection.name };
          addStatusListItem(signal.id, `${intersection.name} - ${signal.direction}`, 'Normal (Green)');
        });
      });
    });

    // Load hospitals config
    fetch('/api/hospitals').then(r => r.json()).then(list => {
      hospitalData = list;
      updateHospitalMarkers(list);
      document.getElementById('hospitalCount').textContent = list.length;
    });
  }

  function updateHospitalMarkers(list) {
    // Clear existing hospital markers
    Object.values(hospitalMarkers).forEach(h => map.removeLayer(h.marker));
    hospitalMarkers = {};
    
    list.forEach(h => {
      const icon = createHospitalIcon(h.type);
      const marker = L.marker([h.lat, h.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>🏥 ${h.name}</b><br>Type: ${h.type || 'Hospital'}<br>ID: ${h.id}<br>${h.source ? `Source: ${h.source}` : ''}`)
        .bindTooltip(h.name, { permanent: false, direction: 'top', offset: [0, -12] });
      
      hospitalMarkers[h.id] = { marker, info: h };
    });
    
    // Update hospital list in panel
    const hospitalListDiv = document.getElementById('hospitalList');
    hospitalListDiv.innerHTML = list.map(h => 
      `<div style="padding: 3px 0; border-bottom: 1px solid #eee;">
        <span style="color: ${h.type === 'major' ? '#DC143C' : '#FF6B6B'}">●</span> ${h.name}
      </div>`
    ).join('');
  }

  function createTrafficLightIcon(color) {
    // Create realistic traffic light with 3 lights stacked vertically
    const redActive = color === 'red' ? '#FF0000' : '#400000';
    const yellowActive = color === 'yellow' ? '#FFFF00' : '#404000';
    const greenActive = color === 'green' ? '#00FF00' : '#004000';
    
    const svgIcon = `
      <svg width="40" height="70" xmlns="http://www.w3.org/2000/svg">
        <!-- Traffic light pole -->
        <rect x="17" y="58" width="6" height="12" fill="#333"/>
        
        <!-- Traffic light box -->
        <rect x="8" y="2" width="24" height="56" rx="4" fill="#222" stroke="#000" stroke-width="2"/>
        
        <!-- Red light -->
        <circle cx="20" cy="12" r="7" fill="${redActive}" stroke="#000" stroke-width="1"/>
        
        <!-- Yellow light -->
        <circle cx="20" cy="30" r="7" fill="${yellowActive}" stroke="#000" stroke-width="1"/>
        
        <!-- Green light -->
        <circle cx="20" cy="48" r="7" fill="${greenActive}" stroke="#000" stroke-width="1"/>
        
        ${color === 'red' ? '<circle cx="20" cy="12" r="7" fill="#FF0000" opacity="0.9"><animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite"/></circle>' : ''}
        ${color === 'yellow' ? '<circle cx="20" cy="30" r="7" fill="#FFFF00" opacity="0.9"><animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite"/></circle>' : ''}
        ${color === 'green' ? '<circle cx="20" cy="48" r="7" fill="#00FF00" opacity="0.9"><animate attributeName="opacity" values="0.7;1;0.7" dur="1s" repeatCount="indefinite"/></circle>' : ''}
      </svg>
    `;
    return L.divIcon({
      html: svgIcon,
      className: 'traffic-light-marker',
      iconSize: [40, 70],
      iconAnchor: [20, 70]
    });
  }

  function createHospitalIcon(type) {
    const isMajor = type === 'major';
    const color = isMajor ? '#DC143C' : '#FF6B6B'; // Darker red for major, lighter for local
    const size = isMajor ? 36 : 28; // Bigger icons for major hospitals
    const crossSize = isMajor ? 22 : 18;
    
    const svgIcon = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="${color}" stroke="#fff" stroke-width="2"/>
        <text x="${size/2}" y="${size/2 + 6}" font-size="${crossSize}" text-anchor="middle" fill="#fff" font-weight="bold">+</text>
        ${isMajor ? `<circle cx="${size/2}" cy="${size/2}" r="${size/2-2}" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>` : ''}
      </svg>
    `;
    return L.divIcon({
      html: svgIcon,
      className: 'hospital-marker',
      iconSize: [size, size],
      iconAnchor: [size/2, size/2]
    });
  }

  function createAmbulanceIcon(ambulanceId) {
    const color = ambulanceColors[ambulanceId] || '#FF4444';
    const svgIcon = `
      <svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="#fff" stroke-width="3">
          <animate attributeName="r" values="18;20;18" dur="1s" repeatCount="indefinite"/>
        </circle>
        <text x="20" y="28" font-size="22" text-anchor="middle" fill="#fff" font-weight="bold">🚑</text>
      </svg>
    `;
    return L.divIcon({
      html: svgIcon,
      className: 'ambulance-marker',
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  }

  function addStatusListItem(id, name, status) {
    const ul = document.getElementById('lightsList');
    const li = document.createElement('li');
    li.id = `tl-${id}`;
    li.textContent = `${name} (${id}) - ${status}`;
    ul.appendChild(li);
  }

  function updateStatusListItem(id, status) {
    const li = document.getElementById(`tl-${id}`);
    const tmData = trafficMarkers[id];
    if (li && tmData) {
      li.textContent = `${tmData.info.name} (${id}) - ${status}`;
    }
  }

  socket.on('ambulance:update', (data) => {
        // Draw full waypoint path if provided
        if (Array.isArray(data.waypointPath) && data.waypointPath.length > 1) {
          // Remove old path if exists
          if (ambulanceRouteLayers[ambulanceId + '_waypoints']) {
            map.removeLayer(ambulanceRouteLayers[ambulanceId + '_waypoints']);
          }
          const latLngs = data.waypointPath.map(wp => [wp.lat, wp.lng]);
          const polyline = L.polyline(latLngs, {
            color: color,
            weight: 14,
            opacity: 1,
            dashArray: '20 10',
            lineCap: 'round',
            lineJoin: 'round',
            className: `route-${ambulanceId}-waypoints`,
            pane: 'overlayPane',
            interactive: false
          }).addTo(map);
          polyline.bringToFront();
          ambulanceRouteLayers[ambulanceId + '_waypoints'] = polyline;
        }
    const ambulanceId = data.id;
    const color = ambulanceColors[ambulanceId] || '#FF4444';
    
    // Create or update ambulance marker
    if (!ambulanceMarkers[ambulanceId]) {
      const icon = createAmbulanceIcon(ambulanceId);
      const marker = L.marker([data.lat, data.lng], { icon })
        .addTo(map)
        .bindPopup(`<b>🚑 ${ambulanceId}</b><br>Emergency: ${data.emergency}<br>Direction: ${data.direction || 'N/A'}`);
      
      ambulanceMarkers[ambulanceId] = marker;
      
      const li = document.createElement('li');
      li.id = `ambulance-${ambulanceId}`;
      li.style.borderLeft = `4px solid ${color}`;
      li.style.paddingLeft = '8px';
      li.innerHTML = `<strong>${ambulanceId}</strong>: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)}`;
      document.getElementById('ambulanceList').appendChild(li);
    } else {
      ambulanceMarkers[ambulanceId].setLatLng([data.lat, data.lng]);
      ambulanceMarkers[ambulanceId].setPopupContent(`<b>🚑 ${ambulanceId}</b><br>Emergency: ${data.emergency}<br>Direction: ${data.direction || 'N/A'}`);
    }
    
    // Update ambulance info
    const infoEl = document.getElementById(`ambulance-${ambulanceId}`);
    if (infoEl) {
      infoEl.innerHTML = `<strong>${ambulanceId}</strong>: ${data.lat.toFixed(6)}, ${data.lng.toFixed(6)} [${data.direction || 'N/A'}]`;
    }

    // Draw route to hospital
    if (data.nearestHospital) {
      const hospitalChanged = ambulanceLastHospital[ambulanceId] !== data.nearestHospital.id;
      
      // Draw route only if hospital changed or first time
      if (hospitalChanged || !ambulanceRouteLayers[ambulanceId]) {
        ambulanceLastHospital[ambulanceId] = data.nearestHospital.id;
        fetchAndDrawRoute(
          ambulanceId,
          data.lat, data.lng,
          data.nearestHospital.lat, data.nearestHospital.lng
        );
      }
    }

    // Store routePath if provided (A* nodes) for turn calculation later
    if (data.routePath && Array.isArray(data.routePath)) {
      ambulanceLastRoutePath[ambulanceId] = data.routePath;
    }

    // Update ETA card if provided
    try {
      const etaEl = document.getElementById('etaValue');
      const etaHospEl = document.getElementById('etaHospital');
      if (data.hospitalETASeconds || data.hospitalETASeconds === 0) {
        const secs = Number(data.hospitalETASeconds);
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        etaEl.textContent = `${m}m ${s}s`;
        etaHospEl.textContent = data.nearestHospital ? data.nearestHospital.name : '';
      } else if (data.hospitalDistance) {
        // Fallback: show distance
        const d = Math.round(data.hospitalDistance);
        etaEl.textContent = `${d} m`;
        etaHospEl.textContent = data.nearestHospital ? data.nearestHospital.name : '';
      }
    } catch (err) { /* ignore UI update errors */ }
  });

  // Listen for intersection updates (directional traffic control)
  socket.on('intersection:update', (data) => {
    // data: { intersectionId, activeDirection, ambulanceId }
    const intersection = trafficData.find(i => i.id === data.intersectionId);
    if (!intersection) return;

    console.log(`🚦 Intersection ${data.intersectionId} - Active: ${data.activeDirection} for ${data.ambulanceId}`);

    // Update all signals at this intersection
    intersection.signals.forEach(signal => {
      const tmData = trafficMarkers[signal.id];
      if (tmData) {
        // Green for ambulance direction, red for others
        const isAmbulanceLane = signal.direction.charAt(0) === data.activeDirection;
        const color = isAmbulanceLane ? 'green' : 'red';
        const statusText = isAmbulanceLane 
          ? `EMERGENCY - CLEAR (Green)` 
          : `EMERGENCY - STOP (Red)`;

        const newIcon = createTrafficLightIcon(color);
        tmData.marker.setIcon(newIcon);
        tmData.marker.setPopupContent(`<b>🚦 ${intersection.name}</b><br>Direction: ${signal.direction}<br>ID: ${signal.id}<br>Status: ${statusText}`);
        updateStatusListItem(signal.id, statusText);
      }
    });

    // Update bottom bar - show next signal and guessed turn
    try {
      const nextSignalName = document.getElementById('nextSignalName');
      const nextTurnEl = document.getElementById('nextTurn');
      nextSignalName.textContent = `${intersection.name} — ${data.activeDirection}`;

      // Guess turn direction (Left/Right/Straight) using A* route if available
      const ambId = data.ambulanceId;
      const route = ambulanceLastRoutePath[ambId];
      let turnText = '—';
      if (route && Array.isArray(route)) {
        // route nodes may have lat/lng and id
        const idx = route.findIndex(n => n.id === data.intersectionId || n.name === data.intersectionId || n.id === data.intersectionId.replace(/INT/, 'INT'));
        const intersectionNode = intersection; // has lat/lng
        const nextNode = route[idx + 1];
        if (nextNode) {
          // map to cardinal for next segment
          function toCardinal(fromLat, fromLng, toLat, toLng) {
            const latDiff = toLat - fromLat;
            const lngDiff = toLng - fromLng;
            if (Math.abs(latDiff) > Math.abs(lngDiff)) return latDiff > 0 ? 'N' : 'S';
            return lngDiff > 0 ? 'E' : 'W';
          }

          const targetDir = toCardinal(intersectionNode.lat, intersectionNode.lng, nextNode.lat, nextNode.lng);
          const approach = data.activeDirection;
          const order = ['N','E','S','W'];
          const ai = order.indexOf(approach);
          const ti = order.indexOf(targetDir);
          if (ai === ti) turnText = 'Straight';
          else if ((ai + 1) % 4 === ti) turnText = 'Right';
          else if ((ai + 3) % 4 === ti) turnText = 'Left';
          else turnText = 'Turn';
        }
      }
      nextTurnEl.textContent = turnText;
    } catch (err) {
      console.debug('Failed to update bottom bar', err);
    }
  });

  // Listen for intersection back to normal
  socket.on('intersection:normal', (data) => {
    const intersection = trafficData.find(i => i.id === data.intersectionId);
    if (!intersection) return;

    console.log(`🚦 Intersection ${data.intersectionId} - Back to normal cycle`);

    // Reset all signals to normal green
    intersection.signals.forEach(signal => {
      const tmData = trafficMarkers[signal.id];
      if (tmData) {
        const newIcon = createTrafficLightIcon('green');
        tmData.marker.setIcon(newIcon);
        tmData.marker.setPopupContent(`<b>🚦 ${intersection.name}</b><br>Direction: ${signal.direction}<br>ID: ${signal.id}<br>Status: Normal (Green)`);
        updateStatusListItem(signal.id, 'Normal (Green)');
      }
    });
  });

  // Listen for hospital updates from server
  socket.on('hospitals:updated', (updatedHospitals) => {
    console.log('🏥 Hospitals updated:', updatedHospitals.length);
    hospitalData = updatedHospitals;
    updateHospitalMarkers(updatedHospitals);
    document.getElementById('hospitalCount').textContent = updatedHospitals.length;
  });

  // Initialize map on load
  initMap();

  // Global function for discover button
  window.discoverHospitals = async function() {
    const btn = document.getElementById('discoverBtn');
    const status = document.getElementById('discoveryStatus');
    
    btn.disabled = true;
    btn.textContent = '🔍 Discovering...';
    status.textContent = 'Searching OpenStreetMap...';
    
    try {
      const center = map.getCenter();
      const response = await fetch('/api/discover-hospitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lat: center.lat, 
          lng: center.lng, 
          radius: 10000 
        })
      });

      // Guard against non-JSON responses (Overpass or proxy may return HTML on error)
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok) {
        let bodyText = await response.text();
        bodyText = bodyText.replace(/\s+/g, ' ').trim();
        const snippet = bodyText.length > 200 ? bodyText.slice(0, 200) + '...' : bodyText;
        status.textContent = `✗ Discovery failed: HTTP ${response.status} ${response.statusText} - ${snippet}`;
        status.style.color = '#e74c3c';
        return;
      }

      if (!contentType.includes('application/json')) {
        // Server returned something other than JSON (often HTML error page)
        const text = await response.text();
        const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 300);
        status.textContent = `✗ Discovery failed: unexpected response (not JSON). Server said: ${snippet}`;
        status.style.color = '#e74c3c';
        return;
      }

      const result = await response.json();
      status.textContent = `✓ Found ${result.discovered} new hospitals! Total: ${result.total}`;
      status.style.color = '#2ecc71';

      setTimeout(() => {
        status.textContent = '';
      }, 5000);
    } catch (error) {
      // Network errors, CORS issues, or JSON parse problems will be caught here
      status.textContent = '✗ Discovery failed: ' + (error && error.message ? error.message : String(error));
      status.style.color = '#e74c3c';
      console.error('Discover hospitals error:', error);
    } finally {
      btn.disabled = false;
      btn.textContent = '🔍 Discover Nearby Hospitals';
    }
  };

  // Vehicle traffic visualization
  function createVehicleIcon(type, state) {
    // All vehicles are grey to show traffic density
    const color = '#95a5a6';
    const opacity = state === 'stopped' ? 0.8 : 1.0;
    const pulseAnimation = state === 'stopped' ? 'animation: pulse 1.5s ease-in-out infinite;' : '';
    const size = state === 'stopped' ? '10px' : '8px';
    
    return L.divIcon({
      html: `<div style="
        background-color: ${color};
        width: ${size};
        height: ${size};
        border-radius: 50%;
        border: 2px solid white;
        box-shadow: 0 0 4px rgba(0,0,0,0.4);
        opacity: ${opacity};
        ${pulseAnimation}
      "></div>
      <style>
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.3); }
        }
      </style>`,
      className: 'vehicle-marker',
      iconSize: [12, 12],
      iconAnchor: [6, 6]
    });
  }

  // Listen for vehicle events
  socket.on('vehicleSpawned', (vehicle) => {
    console.log('Vehicle spawned:', vehicle.id, vehicle.type, 'at', vehicle.intersection);
    const icon = createVehicleIcon(vehicle.type, 'moving');
    const marker = L.marker([vehicle.lat, vehicle.lng], { icon, zIndexOffset: 1000 })
      .addTo(map)
      .bindTooltip(`${vehicle.type.toUpperCase()} - ${vehicle.direction}`, {
        permanent: false,
        direction: 'top',
        offset: [0, -15]
      });
    
    vehicleMarkers[vehicle.id] = { marker, type: vehicle.type };
  });

  socket.on('vehicleUpdate', (data) => {
    const vehicleData = vehicleMarkers[data.id];
    if (vehicleData) {
      vehicleData.marker.setLatLng([data.lat, data.lng]);
      
      // Update icon based on state
      const newIcon = createVehicleIcon(vehicleData.type, data.state);
      vehicleData.marker.setIcon(newIcon);
    }
  });

  socket.on('vehicleReached', (data) => {
    const vehicleData = vehicleMarkers[data.id];
    if (vehicleData) {
      map.removeLayer(vehicleData.marker);
      delete vehicleMarkers[data.id];
      console.log('Vehicle reached destination:', data.id);
    }
  });

  // Traffic light state updates
  socket.on('trafficLightUpdate', (data) => {
    // data: { intersectionId, name, signals: [{ id, direction, state }] }
    data.signals.forEach(signal => {
      const tmData = trafficMarkers[signal.id];
      if (tmData) {
        const newIcon = createTrafficLightIcon(signal.state);
        tmData.marker.setIcon(newIcon);
        
        const intersection = trafficData.find(i => i.id === data.intersectionId);
        const intersectionName = intersection ? intersection.name : data.name;
        
        tmData.marker.setPopupContent(
          `<b>🚦 ${intersectionName}</b><br>Direction: ${signal.direction}<br>ID: ${signal.id}<br>Status: ${signal.state.toUpperCase()}`
        );
      }
    });
  });
})();

