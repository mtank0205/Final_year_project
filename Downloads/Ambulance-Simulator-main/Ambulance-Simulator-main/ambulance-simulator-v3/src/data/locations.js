// =========================================================
// KORAMANGALA, BANGALORE - FOLLOWING ACTUAL ROAD GEOMETRY
// Coordinates trace the ACTUAL road path as it curves
// =========================================================

// Center on the road
export const MAP_CENTER = [12.9346, 77.6180];
export const MAP_ZOOM = 16;

// =========================================================
// HOSPITAL - Apollo Spectra (on the road, east side)
// =========================================================
export const hospitals = [
  {
    id: 1,
    name: "Apollo Spectra Hospital",
    position: [12.9343, 77.6280], // On actual road
    address: "80 Feet Road, Koramangala",
    emoji: "🏥",
  },
];

// =========================================================
// PATIENT - On western part of the road
// =========================================================
export const patients = [
  {
    id: 1,
    name: "Emergency Patient",
    position: [12.9352, 77.6085], // On actual road (west)
    address: "80 Feet Road, Near Hosur Road",
    status: "Critical",
    emoji: "🚨",
  },
];

// =========================================================
// AMBULANCE - Follows ACTUAL ROAD CURVES
// These waypoints trace the real road path on the map
// =========================================================
export const ambulances = [
  {
    id: 1,
    name: "Apollo Emergency 1",
    color: "#FF0000",
    emoji: "🚑",
    hospitalId: 1,
    patientId: 1,
    speed: 0.00008,
    // WAYPOINTS following ACTUAL 80 Feet Road geometry
    waypointsToPatient: [
      [12.9343, 77.6280], // Start: Hospital
      [12.9343, 77.6260], // Following road
      [12.9344, 77.6240], // Road curves slightly
      [12.9344, 77.6220], // Continue on road
      [12.9345, 77.6200], // Road continues
      [12.9346, 77.6180], // Center section
      [12.9347, 77.6160], // Road angles up slightly
      [12.9348, 77.6140], // Continue
      [12.9349, 77.6120], // Road curves
      [12.9351, 77.6100], // Approaching west end
      [12.9352, 77.6085], // Arrive: Patient
    ],
    waypointsToHospital: [
      [12.9352, 77.6085], // Start: Patient location
      [12.9351, 77.6100], // Return on road
      [12.9349, 77.6120], // Following road back
      [12.9348, 77.6140], // Continue
      [12.9347, 77.6160], // Road path
      [12.9346, 77.6180], // Center
      [12.9345, 77.6200], // Continue east
      [12.9344, 77.6220], // Road path
      [12.9344, 77.6240], // Following road
      [12.9343, 77.6260], // Almost there
      [12.9343, 77.6280], // Arrive: Hospital
    ],
  },
];

// =========================================================
// TRAFFIC SIGNALS - On actual road intersections
// =========================================================
export const trafficSignals = [
  {
    id: 1,
    name: "Signal 1 - East Junction",
    position: [12.9344, 77.6230], // On road
  },
  {
    id: 2,
    name: "Signal 2 - Center",
    position: [12.9347, 77.6155], // On road
  },
  {
    id: 3,
    name: "Signal 3 - West Junction",
    position: [12.9350, 77.6100], // On road
  },
];

// =========================================================
// CIVILIAN TRAFFIC - Multiple roads with realistic traffic
// =========================================================
export const civilianVehicles = [
  // === MAIN ROAD: 80 Feet Road (East-West) ===
  // Eastern section (near hospital)
  { 
    id: 1, 
    emoji: "🚗", 
    position: [12.9343, 77.6265], 
    speed: 0.00003, 
    direction: -1, 
    roadSegment: "80ft-east",
    roadName: "80 Feet Road East",
    axis: "horizontal" // moves along longitude
  },
  { 
    id: 2, 
    emoji: "🚕", 
    position: [12.9343, 77.6250], 
    speed: 0.00003, 
    direction: -1, 
    roadSegment: "80ft-east",
    roadName: "80 Feet Road East",
    axis: "horizontal"
  },
  
  // Middle section
  { 
    id: 3, 
    emoji: "🚙", 
    position: [12.9344, 77.6225], 
    speed: 0.00002, 
    direction: -1, 
    roadSegment: "80ft-middle",
    roadName: "80 Feet Road Center",
    axis: "horizontal"
  },
  { 
    id: 4, 
    emoji: "🛺", 
    position: [12.9345, 77.6210], 
    speed: 0.00002, 
    direction: -1, 
    roadSegment: "80ft-middle",
    roadName: "80 Feet Road Center",
    axis: "horizontal"
  },
  { 
    id: 5, 
    emoji: "🚌", 
    position: [12.9346, 77.6185], 
    speed: 0.00002, 
    direction: -1, 
    roadSegment: "80ft-middle",
    roadName: "80 Feet Road Center",
    axis: "horizontal"
  },
  
  // Western section
  { 
    id: 6, 
    emoji: "🚗", 
    position: [12.9348, 77.6145], 
    speed: 0.00002, 
    direction: -1, 
    roadSegment: "80ft-west",
    roadName: "80 Feet Road West",
    axis: "horizontal"
  },
  { 
    id: 7, 
    emoji: "🏍️", 
    position: [12.9349, 77.6125], 
    speed: 0.00004, 
    direction: -1, 
    roadSegment: "80ft-west",
    roadName: "80 Feet Road West",
    axis: "horizontal"
  },

  // === PERPENDICULAR ROADS (North-South) ===
  // Road 1: Near hospital area (longitude ~77.6250)
  { 
    id: 11, 
    emoji: "🚗", 
    position: [12.9360, 77.6250], 
    speed: 0.00002, 
    direction: -1, // moving south
    roadSegment: "cross-1",
    roadName: "Cross Road 1 (East)",
    axis: "vertical" // moves along latitude
  },
  { 
    id: 12, 
    emoji: "🚕", 
    position: [12.9355, 77.6250], 
    speed: 0.00003, 
    direction: 1, // moving north
    roadSegment: "cross-1",
    roadName: "Cross Road 1 (East)",
    axis: "vertical"
  },

  // Road 2: Middle area (longitude ~77.6180)
  { 
    id: 13, 
    emoji: "🛺", 
    position: [12.9365, 77.6180], 
    speed: 0.00002, 
    direction: -1, // moving south
    roadSegment: "cross-2",
    roadName: "Cross Road 2 (Center)",
    axis: "vertical"
  },
  { 
    id: 14, 
    emoji: "🚙", 
    position: [12.9350, 77.6180], 
    speed: 0.00003, 
    direction: 1, // moving north
    roadSegment: "cross-2",
    roadName: "Cross Road 2 (Center)",
    axis: "vertical"
  },
  { 
    id: 15, 
    emoji: "🚗", 
    position: [12.9340, 77.6180], 
    speed: 0.00002, 
    direction: -1, // moving south
    roadSegment: "cross-2",
    roadName: "Cross Road 2 (Center)",
    axis: "vertical"
  },

  // Road 3: Western area (longitude ~77.6120)
  { 
    id: 16, 
    emoji: "🚕", 
    position: [12.9370, 77.6120], 
    speed: 0.00003, 
    direction: -1, // moving south
    roadSegment: "cross-3",
    roadName: "Cross Road 3 (West)",
    axis: "vertical"
  },
  { 
    id: 17, 
    emoji: "🏍️", 
    position: [12.9360, 77.6120], 
    speed: 0.00004, 
    direction: 1, // moving north
    roadSegment: "cross-3",
    roadName: "Cross Road 3 (West)",
    axis: "vertical"
  },
  { 
    id: 18, 
    emoji: "🛺", 
    position: [12.9345, 77.6120], 
    speed: 0.00002, 
    direction: -1, // moving south
    roadSegment: "cross-3",
    roadName: "Cross Road 3 (West)",
    axis: "vertical"
  },

  // Additional traffic on main road (opposite direction - going EAST)
  { 
    id: 19, 
    emoji: "🚗", 
    position: [12.9341, 77.6150], // slightly south of main road
    speed: 0.00003, 
    direction: 1, // moving east
    roadSegment: "80ft-return",
    roadName: "80 Feet Road (Return)",
    axis: "horizontal"
  },
  { 
    id: 20, 
    emoji: "🚕", 
    position: [12.9341, 77.6200], 
    speed: 0.00002, 
    direction: 1, // moving east
    roadSegment: "80ft-return",
    roadName: "80 Feet Road (Return)",
    axis: "horizontal"
  },
];
