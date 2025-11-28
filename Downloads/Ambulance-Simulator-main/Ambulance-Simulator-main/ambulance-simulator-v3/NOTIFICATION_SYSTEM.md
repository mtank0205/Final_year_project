# 🚑 Ambulance Proximity Notification System

## Setup Instructions

### 1. Install Dependencies
```bash
cd ambulance-simulator-v3
npm install
```

### 2. Start the Notification Server (Terminal 1)
```bash
npm run server
```
This will start the Socket.io server on `http://localhost:4000`

### 3. Start the React App (Terminal 2)
```bash
npm start
```
This will start the app on `http://localhost:3000`

## How to Use

### On Your Laptop (Ambulance):
1. Open browser: `http://localhost:3000/ambulance`
2. Click "Enable Location" and allow permissions
3. Click "Start Broadcasting"
4. Your laptop now acts as an ambulance broadcasting its location

### On Your Phone (Civilian):
1. Connect phone to the same WiFi network as laptop
2. Find your laptop's IP address:
   - Windows: `ipconfig` (look for IPv4 Address)
   - Mac/Linux: `ifconfig` or `ip addr`
3. Open phone browser: `http://YOUR_LAPTOP_IP:3000/receiver`
4. Allow location and notification permissions
5. Keep the page open

### Testing:
- When your phone is within **1 meter** of the laptop, you'll receive:
  - Push notification
  - Vibration alert
  - Visual alert on screen

## Routes:
- `/` - Main simulation dashboard
- `/ambulance` - Ambulance broadcaster (use on laptop)
- `/receiver` - Notification receiver (use on phone)

## Technical Details:
- **Distance threshold**: 1 meter (100cm)
- **Location update**: Every 1 second
- **Technology**: Socket.io for real-time communication
- **Distance calculation**: Haversine formula (GPS coordinates)

## Troubleshooting:
1. **"Can't connect to server"**: Make sure notification server is running (`npm run server`)
2. **"Location not working"**: Enable location services in browser settings
3. **"No notifications"**: Enable notification permissions in browser
4. **Phone can't connect**: Ensure phone and laptop are on same WiFi network

## For Production:
To deploy on a public server:
1. Replace `http://localhost:4000` with your server URL in:
   - `src/components/AmbulanceBroadcaster.jsx`
   - `src/components/NotificationReceiver.jsx`
2. Deploy notification-server.js to Heroku/Railway/Render
3. Deploy React app to Vercel/Netlify
