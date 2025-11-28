# IoT Ambulance Traffic Clearance System (Software Simulation)

This project is a **software-only** proof-of-concept for an IoT ambulance traffic clearance system. No hardware required! It uses Node.js backend, Socket.io for real-time updates, OpenStreetMap for visualization, and JavaScript simulators to replace physical devices.

## Project Structure

```
/web-dashboard/
  /public/
    index.html              # Main dashboard with map
    driver-alerts.html      # Driver notification page
    style.css
    map-client.js          # Map controls & real-time updates
    driver-client.js       # Driver notification handler
  /src/
    server.js              # Node.js backend server
    map-controller.js      # Distance calculations (Haversine)
    notification-service.js # Driver alert system
  /simulator/
    ambulance-simulator.js      # Simulates moving ambulance
    traffic-light-simulator.js  # Simulates traffic lights
    driver-simulator.js         # Simulates nearby drivers
  package.json
  .env
/config/
  traffic-lights.json      # Intersection coordinates
SIMULATOR_GUIDE.md         # Detailed simulator instructions
```

## Quick Start

### 1. Install Dependencies

```bash
cd web-dashboard
npm install
```

### 2. Start the Server

```bash
npm start
```

Server runs on `http://localhost:3000`

### 3. Run Simulators (Open 3 New Terminals)

**Terminal 2 - Ambulance Simulator:**

```bash
cd web-dashboard
npm run sim:ambulance
```

**Terminal 3 - Traffic Light Simulator:**

```bash
cd web-dashboard
npm run sim:traffic
```

**Terminal 4 - Driver Simulator:**

```bash
cd web-dashboard
npm run sim:drivers
```

### 4. Open Dashboard in Browser

- **Main Dashboard:** http://localhost:3000/
- **Driver Alerts:** http://localhost:3000/driver-alerts.html

## How It Works

### Software Simulation Architecture

1. **Ambulance Simulator** → Sends GPS coordinates to server every 2 seconds
2. **Server** → Calculates distances using Haversine formula
3. **Traffic Light Simulator** → Polls server, switches to emergency mode when ambulance within 700m
4. **Driver Simulator** → Receives alerts when ambulance within 2km
5. **Web Dashboard** → Shows real-time map with ambulance, traffic lights, and routes

### Emergency Mode Logic

- Ambulance approaches intersection (within 700m)
- Server marks traffic light as "emergency"
- Traffic light simulator switches to green immediately
- Dashboard updates marker to RED
- Nearby drivers receive push notifications
- When ambulance passes, traffic light returns to normal cycle

### Normal Traffic Cycle

- Green: 10 seconds
- Yellow: 3 seconds
- Red: 10 seconds
- Repeat

## Features

✅ **Real-time ambulance tracking** on OpenStreetMap
✅ **Automated traffic light control** based on distance
✅ **Driver notifications** when ambulance nearby
✅ **Visual route display** from ambulance to hospital
✅ **Live status panel** with ETA calculations
✅ **No hardware required** - pure software simulation
✅ **No API keys needed** - uses free OpenStreetMap

## Configuration

### Add More Intersections

Edit `config/traffic-lights.json`:

```json
[
  {
    "id": "TL004",
    "name": "New Intersection",
    "lat": 37.778,
    "lng": -122.416
  }
]
```

### Adjust Emergency Distance

Edit `web-dashboard/src/server.js` (line ~46):

```javascript
if (d <= 700 && data.emergency) {  // Change 700 to desired meters
```

### Change Ambulance Speed

Edit `web-dashboard/simulator/ambulance-simulator.js`:

```javascript
const SPEED = 0.0002; // Increase for faster movement
const UPDATE_INTERVAL = 2000; // Update frequency in ms
```

## Troubleshooting

### Port Already in Use

```bash
taskkill //F //IM node.exe     # Windows
# or
pkill -f node                  # Linux/Mac
```

### Simulators Won't Connect

- Ensure server is running first
- Check `http://localhost:3000` is accessible
- Verify no firewall blocking

### Map Not Loading

- Check internet connection (Leaflet loads from CDN)
- Open browser console for errors
- Try refreshing page

## Next Steps (Optional Enhancements)

- Add persistent storage (MongoDB) for logs
- Implement Web Push notifications (VAPID keys)
- Add authentication for API endpoints
- Deploy to cloud (Heroku, AWS, Azure)
- Add multiple ambulances support
- Create admin panel for traffic light management

## Why Software-Only?

Perfect for:

- 🎓 **Learning** - Understand IoT concepts without hardware
- 🧪 **Testing** - Rapid prototyping and development
- 🎤 **Demonstrations** - Show proof of concept
- 💰 **Cost-effective** - No ESP32, GPS, or LED components needed
- 🚀 **Quick deployment** - Run anywhere Node.js works

---

**No ESP32. No GPS. No LEDs. Just Code!** 🚀

For detailed simulator usage, see [SIMULATOR_GUIDE.md](SIMULATOR_GUIDE.md)
