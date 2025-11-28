// A* Pathfinding Algorithm Implementation
class AStarPathfinder {
  constructor(trafficLights, hospitals) {
    this.intersections = trafficLights; // Store original intersection structure
    this.hospitals = hospitals;
    
    // Flatten traffic lights from intersections structure
    this.trafficLights = [];
    trafficLights.forEach(intersection => {
      if (intersection.signals && Array.isArray(intersection.signals)) {
        // Add individual signals
        intersection.signals.forEach(signal => {
          this.trafficLights.push({
            id: signal.id,
            lat: signal.lat,
            lng: signal.lng,
            name: signal.direction
          });
        });
      } else {
        // Fallback: use intersection center point
        this.trafficLights.push({
          id: intersection.id,
          lat: intersection.lat,
          lng: intersection.lng,
          name: intersection.name
        });
      }
    });
    
    // Create grid nodes from traffic lights and hospitals
    this.nodes = [...this.trafficLights, ...hospitals];
  }

  // Haversine distance (heuristic for A*)
  haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000; // meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  toRad(deg) {
    return deg * Math.PI / 180;
  }

  // Find nearest hospital
  findNearestHospital(ambulanceLat, ambulanceLng) {
    const startTime = Date.now();
    let nearest = null;
    let minDistance = Infinity;

    this.hospitals.forEach(hospital => {
      const dist = this.haversineDistance(
        ambulanceLat, ambulanceLng,
        hospital.lat, hospital.lng
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearest = hospital;
      }
    });

    console.log(`⚡ A* findNearestHospital: ${Date.now() - startTime}ms`);
    return { hospital: nearest, distance: minDistance };
  }

  // A* algorithm to find optimal path through traffic lights
  findOptimalPath(startLat, startLng, endLat, endLng) {
    const startTime = Date.now();
    const start = { lat: startLat, lng: startLng, id: 'START' };
    const end = { lat: endLat, lng: endLng, id: 'END' };

    // Create open and closed sets
    const openSet = [start];
    const closedSet = [];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    gScore.set(start.id, 0);
    fScore.set(start.id, this.haversineDistance(start.lat, start.lng, end.lat, end.lng));

    while (openSet.length > 0) {
      // Get node with lowest fScore
      openSet.sort((a, b) => (fScore.get(a.id) || Infinity) - (fScore.get(b.id) || Infinity));
      const current = openSet.shift();

      // Check if reached destination
      if (this.haversineDistance(current.lat, current.lng, end.lat, end.lng) < 100) {
        console.log(`⚡ A* findOptimalPath: ${Date.now() - startTime}ms (found path)`);
        return this.reconstructPath(cameFrom, current, start, end);
      }

      closedSet.push(current);

      // Get neighbors (nearby traffic lights and end point)
      const neighbors = this.getNeighbors(current, end);

      neighbors.forEach(neighbor => {
        if (closedSet.find(n => n.id === neighbor.id)) return;

        const tentativeGScore = (gScore.get(current.id) || Infinity) + 
                                this.haversineDistance(current.lat, current.lng, neighbor.lat, neighbor.lng);

        if (!openSet.find(n => n.id === neighbor.id)) {
          openSet.push(neighbor);
        } else if (tentativeGScore >= (gScore.get(neighbor.id) || Infinity)) {
          return;
        }

        cameFrom.set(neighbor.id, current);
        gScore.set(neighbor.id, tentativeGScore);
        fScore.set(neighbor.id, tentativeGScore + this.haversineDistance(neighbor.lat, neighbor.lng, end.lat, end.lng));
      });
    }

    // If no path through traffic lights, return direct path
    console.log(`⚡ A* findOptimalPath: ${Date.now() - startTime}ms`);
    return [start, end];
  }

  getNeighbors(node, end) {
    const neighbors = [];
    const maxDistance = 1000; // Only consider traffic lights within 1km

    // Add nearby traffic lights
    this.trafficLights.forEach(tl => {
      const dist = this.haversineDistance(node.lat, node.lng, tl.lat, tl.lng);
      if (dist < maxDistance && dist > 10) {
        neighbors.push(tl);
      }
    });

    // Always add the end point as a potential neighbor
    const distToEnd = this.haversineDistance(node.lat, node.lng, end.lat, end.lng);
    if (distToEnd < maxDistance * 2) {
      neighbors.push(end);
    }

    return neighbors;
  }

  reconstructPath(cameFrom, current, start, end) {
    const path = [current];
    while (cameFrom.has(current.id)) {
      current = cameFrom.get(current.id);
      path.unshift(current);
    }
    // Ensure end point is included
    if (path[path.length - 1].id !== 'END') {
      path.push(end);
    }
    return path;
  }
}

module.exports = { AStarPathfinder };
