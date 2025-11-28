const https = require('https');
const fs = require('fs');
const path = require('path');

// Koramangala area, Bangalore
// Koramangala roughly spans: 12.92-12.95 (latitude), 77.61-77.64 (longitude)
const bbox = '12.92,77.61,12.95,77.64'; // south,west,north,east

// Overpass API query for traffic signals
const query = `
[out:json][timeout:25];
(
  node["highway"="traffic_signals"](${bbox});
);
out body;
>;
out skel qt;
`;

const url = 'https://overpass-api.de/api/interpreter';

console.log('🔍 Querying Overpass API for traffic signals in Koramangala...');

const postData = query;

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(url, options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      const signals = result.elements || [];
      
      console.log(`✓ Found ${signals.length} traffic signals`);
      
      // Group signals by proximity (within ~50m = 0.0005 degrees)
      const intersections = [];
      const processed = new Set();
      
      signals.forEach((signal, idx) => {
        if (processed.has(idx)) return;
        
        const nearby = [signal];
        processed.add(idx);
        
      signals.forEach((other, otherIdx) => {
        if (processed.has(otherIdx)) return;
        
        const latDiff = Math.abs(signal.lat - other.lat);
        const lngDiff = Math.abs(signal.lon - other.lon);
        const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
        
        // Group if within ~50m (0.0005 degrees ≈ 50m)
        if (distance < 0.0005 && distance > 0) {
          nearby.push(other);
          processed.add(otherIdx);
        }
      });        // Only include intersections with 3-4 signals (T-junction or 4-way)
        if (nearby.length >= 3 && nearby.length <= 4) {
          // Calculate center point
          const centerLat = nearby.reduce((sum, s) => sum + s.lat, 0) / nearby.length;
          const centerLng = nearby.reduce((sum, s) => sum + s.lon, 0) / nearby.length;
          
          // Sort signals by their position to assign consistent directions
          const directions = [];
          
          const signalsWithDirection = nearby.map((s) => {
            const latDiff = s.lat - centerLat;
            const lngDiff = s.lon - centerLng;
            
            // Determine direction based on position relative to center
            let direction;
            if (Math.abs(latDiff) > Math.abs(lngDiff)) {
              direction = latDiff > 0 ? 'North' : 'South';
            } else {
              direction = lngDiff > 0 ? 'East' : 'West';
            }
            
            // Skip duplicates - only one signal per direction
            if (directions.includes(direction)) {
              return null;
            }
            directions.push(direction);
            
            return {
              id: `TL${intersections.length + 1}_${direction[0]}`,
              direction: direction,
              lat: s.lat,
              lng: s.lon
            };
          }).filter(s => s !== null);
          
          // Only add if we still have 3-4 unique directional signals
          if (signalsWithDirection.length >= 3 && signalsWithDirection.length <= 4) {
            intersections.push({
              id: `INT${String(intersections.length + 1).padStart(3, '0')}`,
              name: `Intersection ${intersections.length + 1}`,
              lat: centerLat,
              lng: centerLng,
              signals: signalsWithDirection
            });
          }
        }
      });
      
      // Sort by latitude to get spread across the city
      intersections.sort((a, b) => b.lat - a.lat);
      
      // Take top 6 intersections
      const topIntersections = intersections.slice(0, 6);
      
      console.log(`\n✓ Created ${topIntersections.length} intersections with 3-4 signals each`);
      topIntersections.forEach((int, idx) => {
        console.log(`  ${int.id}: ${int.signals.length} signals at (${int.lat.toFixed(5)}, ${int.lng.toFixed(5)})`);
      });
      
      // Save to file
      const outputPath = path.join(__dirname, '..', 'config', 'traffic-lights.json');
      fs.writeFileSync(outputPath, JSON.stringify(topIntersections, null, 2));
      
      console.log(`\n✓ Saved to ${outputPath}`);
      
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();
