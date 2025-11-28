# Ambulance Simulator v3 🚑

A real-time ambulance dispatch and routing simulator with intelligent traffic management and vehicle notification system. Built with React, OpenStreetMap, and OSRM for real road routing.

## 🌟 Key Features

### Real Road Routing
- 🗺️ **OSRM Integration** - Uses OpenStreetMap Routing Machine for actual road paths
- 📍 **Bangalore City Map** - Real streets and intersections from OpenStreetMap
- 🛣️ **Turn-by-Turn Navigation** - Ambulances follow real waypoints on actual roads

### Dual Simulation Modes
- 🚀 **Smart Mode** - Traffic signals turn green ahead of ambulance (zero delays)
- 🚦 **Normal Mode** - Ambulance stops at red signals, waits 5 seconds, then proceeds
- ⏱️ **ETA Comparison** - See time savings with smart traffic management (IST timezone)

### Intelligent Traffic System
- 🚦 **Real Signal Locations** - Traffic lights fetched from OpenStreetMap via Overpass API
- 🎯 **Waypoint-Based Detection** - Signals detected within 50m of ambulance position
- 🟢 **Dynamic Signal Control** - Only signals on ambulance route turn green
- 🔴 **Signal Recovery** - Lights return to red after ambulance passes

### Vehicle Notification System
- 📢 **Proximity Alerts** - Civilian vehicles notified when ambulance within 50 meters
- 🚗 **Static Vehicle Marker** - Purple pulsing car shows notification demo location
- 📱 **Real-time Distance Tracking** - Live countdown shows ambulance approach
- 🔔 **Multi-Page Support** - Separate notification receiver page for testing
- 💾 **localStorage Communication** - No backend required for vehicle alerts

### Interactive Dashboard
- 📊 **Live Status Updates** - Real-time ambulance position and phase tracking
- 📝 **Event Log** - Timestamped events for all simulation activities
- 🎮 **Mode Switching** - Toggle between Smart and Normal modes during simulation
- 📍 **Camera Follow** - Click ambulance cards to follow on map
- 🎨 **Visual Feedback** - Color-coded status indicators and animations

## 🛠️ Tech Stack

- **Frontend**: React.js 19.2.0 with Hooks (useState, useEffect, useCallback, useRef)
- **Mapping**: Leaflet 1.9.4 + React-Leaflet 5.0.0
- **Routing**: OSRM API (router.project-osrm.org)
- **Traffic Data**: Overpass API for real traffic signal locations
- **Communication**: localStorage for inter-page updates
- **Styling**: CSS3 with animations and gradients
- **Icons**: Custom ambulance, hospital, and vehicle markers

## 🚀 Quick Start

### Prerequisites
- Node.js 14+ installed
- npm or yarn package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/zoror2/Ambulance-Simulator.git
   cd Ambulance_Simulator/ambulance-simulator-v3
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open your browser and navigate to:
   - **Main Dashboard**: http://localhost:3000/
   - **Vehicle Notification Receiver**: http://localhost:3000/receiver
   - **Ambulance Broadcaster**: http://localhost:3000/ambulance

## 📖 How to Use

### Running a Simulation

1. **Open Main Dashboard** at http://localhost:3000/
2. **Choose Simulation Mode**:
   - Click **🚀 SMART MODE** (green button) - Signals turn green automatically
   - Click **🚦 NORMAL MODE** (orange button) - Ambulance stops at red signals
3. **Watch the Simulation**:
   - Ambulance dispatches from hospital after 3 seconds
   - Follow the purple route line showing OSRM calculated path
   - Traffic signals on the route are marked with colored dots
   - ETA displays in Indian Standard Time format
4. **Track Progress**:
   - Event log shows all activities with timestamps
   - Ambulance status changes: Idle → Responding → Transporting → Delivered
   - Click ambulance card to follow on map

### Testing Vehicle Notifications

1. **Open Two Browser Windows**:
   - Window 1: Main Dashboard (http://localhost:3000/)
   - Window 2: Notification Receiver (http://localhost:3000/receiver)
2. **Start Simulation** in Window 1 (choose any mode)
3. **Watch Notifications** in Window 2:
   - Shows "Connected" status (using localStorage)
   - Displays static vehicle location (12.9345, 77.6248)
   - Distance tracking starts automatically when ambulance moves
   - Alert appears when ambulance within 50 meters
   - Shows "No ambulances nearby" when ambulance > 100m away

### Understanding the Map

- 🚑 **Red Ambulance Icon** - Active emergency vehicle with siren
- 🏥 **Hospital (H)** - Starting point (Manipal Hospital, Koramangala)
- 🤕 **Patient (P)** - Pickup location (6th Block, Koramangala)
- 🚗 **Purple Pulsing Car** - Static vehicle for notification demo
- 🟢 **Green Traffic Signal** - Ambulance can pass
- 🔴 **Red Traffic Signal** - Ambulance must stop (Normal mode)
- 🟡 **Yellow Traffic Signal** - Signal is transitioning
- 🟣 **Purple Dashed Line** - Ambulance route from OSRM

## 📁 Project Structure

```
ambulance-simulator-v3/
├── public/
│   ├── index.html              # Main HTML file
│   └── manifest.json           # PWA manifest
├── src/
│   ├── components/
│   │   ├── AmbulanceMarker.jsx       # Ambulance icon with siren animation
│   │   ├── TrafficSignal.jsx         # Traffic light with countdown
│   │   ├── HospitalMarker.jsx        # Hospital marker
│   │   ├── PatientMarker.jsx         # Patient pickup location
│   │   ├── CivilianVehicle.jsx       # Civilian vehicle markers
│   │   ├── Sidebar.jsx               # Control panel and event log
│   │   ├── AmbulanceBroadcaster.jsx  # Position broadcasting component
│   │   └── NotificationReceiver.jsx  # Vehicle notification UI
│   ├── pages/
│   │   ├── MainDashboard.jsx         # Main simulation controller
│   │   └── VehicleDashboard.jsx      # Alternative notification view
│   ├── data/
│   │   └── locations.js              # Hospital, patient, ambulance data
│   ├── utils/
│   │   ├── helpers.js                # Distance calculation, movement logic
│   │   └── routingService.js         # OSRM API integration
│   ├── App.js                        # Routing and navigation
│   └── index.js                      # React entry point
├── package.json                # Dependencies and scripts
└── README.md                   # This file
```

## 🎯 Technical Implementation Details

### OSRM Routing
- Fetches real road waypoints from `router.project-osrm.org`
- Calculates both `toPatient` and `toHospital` routes on startup
- Returns latitude/longitude arrays following actual streets
- Ambulance moves through waypoints at configured speed

### Traffic Signal Detection
- Uses Overpass API to query OpenStreetMap for traffic lights
- Filters signals to only those on ambulance routes
- Associates each signal with waypoint index for precise detection
- 50-meter proximity threshold using Haversine distance formula

### Normal Mode Logic
```javascript
1. Check if signal within 50m of current position
2. Stop ambulance and set waitingAtSignal ref (synchronous)
3. Wait 5 seconds with red signal
4. Turn signal green for 5 seconds
5. Mark signal as "passed" to prevent re-detection
6. Resume ambulance movement
7. Return signal to red after ambulance clears
```

### Smart Mode Logic
```javascript
1. Identify next signal on route by waypoint index
2. Turn next signal green as ambulance approaches
3. Keep signal green while ambulance passes
4. Return to red 3 seconds after ambulance clears
5. No stopping or waiting required
```

### ETA Calculation
- Base time: 90 seconds to reach patient (observed timing)
- Return time: Proportional to route length
- Normal mode: Adds 10 seconds per signal (5s wait + 5s pass)
- Displays arrival time in IST format (Asia/Kolkata timezone)

### Vehicle Notification System
- MainDashboard broadcasts position to localStorage every 200ms
- NotificationReceiver polls localStorage every 500ms
- Haversine formula calculates distance in meters
- Alerts trigger at < 50m, warnings at < 100m
- Visual feedback with color changes and animations

## 🔧 Configuration

### Locations (src/data/locations.js)
```javascript
// Bangalore coordinates
const MAP_CENTER = [12.9352, 77.6245];
const hospitals = [{ lat: 12.9352, lng: 77.6245, name: 'Manipal Hospital' }];
const patients = [{ lat: 12.9283, lng: 77.6272, address: '6th Block' }];
```

### Ambulance Settings
```javascript
speed: 0.0001,           // Movement speed per frame
detectionRadius: 50,      // Signal detection distance (meters)
alertRadius: 50,          // Notification trigger distance (meters)
updateInterval: 200       // Position update frequency (ms)
```

## 🐛 Known Issues & Limitations

- OSRM API calls limited by public server rate limits
- Overpass API queries can be slow during high traffic
- localStorage communication limited to same origin
- Traffic signal data depends on OpenStreetMap completeness
- Mobile responsiveness needs improvement
- No offline mode support

## 🚀 Future Enhancements

- [ ] Multiple simultaneous ambulances
- [ ] Real-time traffic data integration
- [ ] Route optimization based on current conditions
- [ ] Hospital bed availability tracking
- [ ] Patient severity-based prioritization
- [ ] Historical simulation playback
- [ ] Socket.io for real-time multi-device sync
- [ ] PWA support for mobile installation
- [ ] Voice alerts for notification system
- [ ] Road closure and detour handling

## 📊 Performance Metrics

- Initial route calculation: ~2-3 seconds
- Traffic signal fetch: ~1-2 seconds
- Frame rate: 5 FPS (200ms intervals)
- Memory usage: ~50-80MB typical
- Browser compatibility: Chrome, Firefox, Edge (latest versions)

## 📄 License

This project is open source and available for educational purposes.

## 👥 Contributors

- Built for ambulance routing optimization research
- Demonstrates smart traffic management benefits
- Part of emergency response system studies

## 🙏 Acknowledgments

- OpenStreetMap for map data
- OSRM Project for routing engine
- Overpass API for traffic signal locations
- Leaflet for mapping library
- React community for excellent documentation

## 📞 Support

For issues, questions, or contributions:
- GitHub Issues: https://github.com/zoror2/Ambulance-Simulator/issues
- Repository: https://github.com/zoror2/Ambulance-Simulator

---

**Made with ❤️ for better emergency response systems**
