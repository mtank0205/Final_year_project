// A* Pathfinding algorithm for ambulance routing
import { roads, getIntersection } from '../data/cityMap';

// Heuristic function (Euclidean distance)
const heuristic = (a, b) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Get neighbors of an intersection
const getNeighbors = (intersectionId) => {
  const neighbors = [];
  
  roads.forEach(road => {
    if (road.from === intersectionId) {
      neighbors.push({
        id: road.to,
        cost: heuristic(getIntersection(road.from), getIntersection(road.to))
      });
    } else if (road.to === intersectionId) {
      neighbors.push({
        id: road.from,
        cost: heuristic(getIntersection(road.to), getIntersection(road.from))
      });
    }
  });
  
  return neighbors;
};

// A* algorithm implementation
export const findPath = (startId, endId) => {
  const openSet = [{ id: startId, g: 0, f: 0 }];
  const closedSet = new Set();
  const cameFrom = {};
  const gScore = { [startId]: 0 };
  
  const endNode = getIntersection(endId);
  
  while (openSet.length > 0) {
    // Get node with lowest f score
    openSet.sort((a, b) => a.f - b.f);
    const current = openSet.shift();
    
    // Reached destination
    if (current.id === endId) {
      return reconstructPath(cameFrom, current.id);
    }
    
    closedSet.add(current.id);
    
    // Check neighbors
    const neighbors = getNeighbors(current.id);
    
    neighbors.forEach(neighbor => {
      if (closedSet.has(neighbor.id)) return;
      
      const tentativeG = gScore[current.id] + neighbor.cost;
      
      if (!gScore[neighbor.id] || tentativeG < gScore[neighbor.id]) {
        cameFrom[neighbor.id] = current.id;
        gScore[neighbor.id] = tentativeG;
        
        const neighborNode = getIntersection(neighbor.id);
        const f = tentativeG + heuristic(neighborNode, endNode);
        
        const inOpenSet = openSet.find(n => n.id === neighbor.id);
        if (inOpenSet) {
          inOpenSet.g = tentativeG;
          inOpenSet.f = f;
        } else {
          openSet.push({ id: neighbor.id, g: tentativeG, f });
        }
      }
    });
  }
  
  // No path found
  return [];
};

// Reconstruct path from cameFrom map
const reconstructPath = (cameFrom, current) => {
  const path = [current];
  
  while (cameFrom[current]) {
    current = cameFrom[current];
    path.unshift(current);
  }
  
  return path;
};

// Get full route with coordinates
export const getRouteCoordinates = (path) => {
  return path.map(intersectionId => {
    const intersection = getIntersection(intersectionId);
    return { x: intersection.x, y: intersection.y, intersectionId };
  });
};

// Calculate route for ambulance mission (station -> patient -> hospital)
export const calculateMissionRoute = (startId, patientId, hospitalId) => {
  const toPatient = findPath(startId, patientId);
  const toHospital = findPath(patientId, hospitalId);
  const returnHome = findPath(hospitalId, startId);
  
  return {
    toPatient: getRouteCoordinates(toPatient),
    toHospital: getRouteCoordinates(toHospital),
    returnHome: getRouteCoordinates(returnHome),
    fullPath: [...toPatient, ...toHospital.slice(1), ...returnHome.slice(1)]
  };
};

export default {
  findPath,
  getRouteCoordinates,
  calculateMissionRoute
};
