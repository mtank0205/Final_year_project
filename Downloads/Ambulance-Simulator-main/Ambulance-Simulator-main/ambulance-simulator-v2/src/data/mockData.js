// Mock data for ambulances, hospitals, and patients

export const hospitals = [
  {
    id: 1,
    name: "City General Hospital",
    intersectionId: 4, // Top right area
    color: '#FF4444'
  },
  {
    id: 2,
    name: "Central Medical Center",
    intersectionId: 13, // Bottom left area
    color: '#FF6666'
  }
];

export const patients = [
  {
    id: 1,
    name: "Patient Alpha",
    intersectionId: 15, // Bottom right
    urgency: "Critical",
    color: '#FF0000'
  },
  {
    id: 2,
    name: "Patient Beta",
    intersectionId: 3, // Top middle
    urgency: "Urgent",
    color: '#FFA500'
  }
];

export const ambulances = [
  {
    id: 1,
    name: "Ambulance 1",
    startIntersectionId: 1, // Top left
    patientId: 1,
    hospitalId: 1,
    color: '#00FF00',
    speed: 0.5, // pixels per frame - slower for better traffic light demonstration
  },
  {
    id: 2,
    name: "Ambulance 2",
    startIntersectionId: 13, // Bottom left
    patientId: 2,
    hospitalId: 2,
    color: '#00FFFF',
    speed: 0.5,
  }
];

// Traffic signal timing configuration
export const trafficSignalConfig = {
  normalCycle: {
    green: 5000,    // 5 seconds green
    yellow: 2000,   // 2 seconds yellow
    red: 5000       // 5 seconds red
  },
  emergencyCycle: {
    approachCountdown: 3000,  // 3 seconds countdown when ambulance approaches
    clearDelay: 5000          // 5 seconds before returning to red after ambulance passes
  }
};

export default {
  hospitals,
  patients,
  ambulances,
  trafficSignalConfig
};
