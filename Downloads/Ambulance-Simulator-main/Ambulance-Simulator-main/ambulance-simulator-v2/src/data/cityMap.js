// City map configuration with complex road network
export const CANVAS_WIDTH = 1400;
export const CANVAS_HEIGHT = 900;
export const LANE_WIDTH = 30;

// Define intersections (traffic signal locations)
export const intersections = [
  // Row 1
  { id: 1, x: 300, y: 200 },
  { id: 2, x: 600, y: 200 },
  { id: 3, x: 900, y: 200 },
  { id: 4, x: 1200, y: 200 },
  
  // Row 2
  { id: 5, x: 300, y: 400 },
  { id: 6, x: 600, y: 400 },
  { id: 7, x: 900, y: 400 },
  { id: 8, x: 1200, y: 400 },
  
  // Row 3
  { id: 9, x: 300, y: 600 },
  { id: 10, x: 600, y: 600 },
  { id: 11, x: 900, y: 600 },
  { id: 12, x: 1200, y: 600 },
  
  // Row 4
  { id: 13, x: 300, y: 800 },
  { id: 14, x: 600, y: 800 },
  { id: 15, x: 900, y: 800 },
  { id: 16, x: 1200, y: 800 },
];

// Define roads connecting intersections
export const roads = [
  // Horizontal roads - Row 1
  { from: 1, to: 2, lanes: 2 },
  { from: 2, to: 3, lanes: 2 },
  { from: 3, to: 4, lanes: 2 },
  
  // Horizontal roads - Row 2
  { from: 5, to: 6, lanes: 3 },
  { from: 6, to: 7, lanes: 3 },
  { from: 7, to: 8, lanes: 3 },
  
  // Horizontal roads - Row 3
  { from: 9, to: 10, lanes: 3 },
  { from: 10, to: 11, lanes: 3 },
  { from: 11, to: 12, lanes: 3 },
  
  // Horizontal roads - Row 4
  { from: 13, to: 14, lanes: 2 },
  { from: 14, to: 15, lanes: 2 },
  { from: 15, to: 16, lanes: 2 },
  
  // Vertical roads - Column 1
  { from: 1, to: 5, lanes: 2 },
  { from: 5, to: 9, lanes: 2 },
  { from: 9, to: 13, lanes: 2 },
  
  // Vertical roads - Column 2
  { from: 2, to: 6, lanes: 3 },
  { from: 6, to: 10, lanes: 3 },
  { from: 10, to: 14, lanes: 3 },
  
  // Vertical roads - Column 3
  { from: 3, to: 7, lanes: 3 },
  { from: 7, to: 11, lanes: 3 },
  { from: 11, to: 15, lanes: 3 },
  
  // Vertical roads - Column 4
  { from: 4, to: 8, lanes: 2 },
  { from: 8, to: 12, lanes: 2 },
  { from: 12, to: 16, lanes: 2 },
];

// Get intersection by ID
export const getIntersection = (id) => {
  return intersections.find(i => i.id === id);
};

// Get connected roads for an intersection
export const getConnectedRoads = (intersectionId) => {
  return roads.filter(r => r.from === intersectionId || r.to === intersectionId);
};

// Calculate road segments for rendering
export const getRoadSegments = () => {
  return roads.map(road => {
    const from = getIntersection(road.from);
    const to = getIntersection(road.to);
    const isHorizontal = from.y === to.y;
    
    return {
      ...road,
      x1: from.x,
      y1: from.y,
      x2: to.x,
      y2: to.y,
      isHorizontal,
      length: Math.sqrt(Math.pow(to.x - from.x, 2) + Math.pow(to.y - from.y, 2))
    };
  });
};

export default {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LANE_WIDTH,
  intersections,
  roads,
  getIntersection,
  getConnectedRoads,
  getRoadSegments
};
