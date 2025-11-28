// Mock data for ambulances, traffic signals, and road closures

// Hospitals
export const hospitals = [
  {
    id: 1,
    name: 'NYC Medical Center',
    position: { lat: 40.7614, lng: -73.9776 }, // Near Central Park
    type: 'Emergency Hospital'
  },
  {
    id: 2,
    name: 'East Side General Hospital',
    position: { lat: 40.7505, lng: -73.9934 }, // West side
    type: 'General Hospital'
  }
];

// Patient pickup locations
export const patients = [
  {
    id: 1,
    name: 'Patient Alpha',
    position: { lat: 40.7580, lng: -73.9855 }, // Times Square
    status: 'Critical',
    assignedAmbulance: 1,
    hospital: 1
  },
  {
    id: 2,
    name: 'Patient Beta',
    position: { lat: 40.7489, lng: -73.9680 }, // East side
    status: 'Stable',
    assignedAmbulance: 2,
    hospital: 2
  }
];

export const ambulances = [
  {
    id: 1,
    name: 'Ambulance 1',
    start: { lat: 40.7580, lng: -73.9855 }, // Patient pickup (Times Square)
    end: { lat: 40.7614, lng: -73.9776 },   // Hospital (Near Central Park)
    currentPosition: { lat: 40.7580, lng: -73.9855 },
    speed: 0.0001, // degrees per update (real-time)
    status: 'active',
    color: '#FF0000',
    patientId: 1,
    hospitalId: 1
  },
  {
    id: 2,
    name: 'Ambulance 2',
    start: { lat: 40.7489, lng: -73.9680 }, // Patient pickup (East side)
    end: { lat: 40.7505, lng: -73.9934 },   // Hospital (West side)
    currentPosition: { lat: 40.7489, lng: -73.9680 },
    speed: 0.0001,
    status: 'active',
    color: '#00FF00',
    patientId: 2,
    hospitalId: 2
  }
];

export const trafficSignals = [
  { id: 1, position: { lat: 40.7590, lng: -73.9845 }, status: 'red' },
  { id: 2, position: { lat: 40.7600, lng: -73.9825 }, status: 'red' },
  { id: 3, position: { lat: 40.7605, lng: -73.9800 }, status: 'red' },
  { id: 4, position: { lat: 40.7495, lng: -73.9750 }, status: 'red' },
  { id: 5, position: { lat: 40.7500, lng: -73.9850 }, status: 'red' },
];

export const roadClosures = [
  {
    id: 1,
    path: [
      { lat: 40.7570, lng: -73.9830 },
      { lat: 40.7575, lng: -73.9825 }
    ],
    reason: 'Construction'
  },
  {
    id: 2,
    path: [
      { lat: 40.7510, lng: -73.9750 },
      { lat: 40.7515, lng: -73.9745 }
    ],
    reason: 'Accident'
  }
];

export const defaultCenter = { lat: 40.7580, lng: -73.9855 };
