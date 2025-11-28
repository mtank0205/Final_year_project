# 📱 Real Device Proximity Testing Instructions

## Setup Overview

Your **laptop** will act as the ambulance, and your **mobile phone** will receive emergency notifications when they come within proximity.

## Step-by-Step Instructions

### 1. Start the Server (On Laptop)

```bash
cd "c:/Users/MOHITH/Desktop/New folder (2)/mohith/web-dashboard"
npm start
```

Wait for: `Server running on http://localhost:3000`

### 2. Connect Your Mobile Phone

#### Option A: Same WiFi Network (Recommended)

1. Make sure both laptop and mobile are on the same WiFi
2. Find your laptop's local IP address:
   - Windows: Run `ipconfig` and look for "IPv4 Address" (e.g., 192.168.1.5)
3. On your mobile browser, open:
   ```
   http://YOUR_LAPTOP_IP:3000/mobile-driver.html
   ```
   Example: `http://192.168.1.5:3000/mobile-driver.html`

#### Option B: USB Tethering

1. Enable USB tethering on your phone
2. Connect phone to laptop via USB
3. On mobile browser, open:
   ```
   http://192.168.42.129:3000/mobile-driver.html
   ```

### 3. Grant Permissions on Mobile

- **Location**: Allow when prompted (required for GPS tracking)
- **Notifications**: Allow when prompted

### 4. Start the Ambulance Simulator (On Laptop)

Open a new terminal:

```bash
cd "c:/Users/MOHITH/Desktop/New folder (2)/mohith/web-dashboard"
npm run sim:ambulance
```

### 5. Test Proximity Detection

The system uses GPS distance calculation:

- **Normal Alert**: Triggers when ambulance is within 2km (2000m)
- **Emergency Alert**: Triggers when ambulance is within 10m (simulating 1cm physical proximity)

#### What You'll See on Mobile:

1. **Connection Status**: "Connected" in green
2. **Your Location**: Current GPS coordinates
3. **Distance Meter**: Real-time distance to ambulance
4. **Proximity Bar**: Visual indicator (fills as ambulance gets closer)
5. **Emergency Screen**: Full-screen red alert when within 10m
   - Vibration (if supported)
   - Emergency sound
   - Flashing red screen

#### What You'll See on Laptop:

- Ambulance moving through Koramangala
- Console logs showing distance calculations
- Notification broadcasts when mobile is nearby

## Testing Scenarios

### Scenario 1: Remote Alert (2km range)

- Keep devices far apart
- Mobile shows distance > 10m
- Yellow notification appears on mobile
- No emergency screen

### Scenario 2: Critical Proximity (10m = 1cm simulation)

- Bring laptop and mobile close together (same room)
- When ambulance passes near mobile's GPS location
- Mobile triggers:
  - ✅ Full-screen red emergency alert
  - ✅ Vibration pattern
  - ✅ Emergency sound
  - ✅ "AMBULANCE IS DIRECTLY NEAR YOU" message

### Scenario 3: Multiple Devices

- Connect multiple phones to same server
- Each receives notifications based on their individual proximity
- Great for demo to judges!

## Troubleshooting

### Mobile can't connect to server:

- Check both devices are on same WiFi
- Verify laptop firewall allows port 3000
- Try: `http://localhost:3000/mobile-driver.html` if testing on same device

### Location not updating:

- Ensure location permissions granted
- Try refreshing the mobile page
- Check GPS is enabled on phone

### No notifications:

- Check browser console for errors (F12 on mobile browsers)
- Verify server is running (`npm start`)
- Ensure ambulance simulator is running (`npm run sim:ambulance`)

### Adjust Proximity Threshold:

Edit `src/server.js` line 388:

```javascript
if (d <= 10) {  // Change 10 to desired meters
```

## Demo Tips for Judges

1. **Show the Setup**:

   - Display laptop screen (server + ambulance simulator)
   - Show mobile screen (driver app)
   - Explain the 10m = 1cm proximity concept

2. **Demonstrate Real-time Tracking**:

   - Show distance meter updating in real-time
   - Walk around with mobile to show distance changes
   - Proximity bar fills as you get closer

3. **Trigger Emergency Alert**:

   - Wait for ambulance to pass mobile's GPS location
   - Show full-screen red alert
   - Demonstrate vibration and sound
   - Explain this would trigger at 1cm with proper Bluetooth/NFC

4. **Highlight Features**:
   - ✅ Real GPS location tracking
   - ✅ Real-time distance calculation
   - ✅ Progressive alerts (2km → 10m)
   - ✅ Multi-device support
   - ✅ No app installation needed (web-based)

## Technical Details

### Proximity Detection Method:

- **Current**: GPS-based Haversine distance calculation
- **Future**: Can be enhanced with:
  - Bluetooth Low Energy (BLE) for true proximity (<1m)
  - NFC for contact-level detection
  - WiFi Direct for mesh networking

### Distance Calculation:

```javascript
distance = haversine(ambulanceLat, ambulanceLng, mobileLat, mobileLng);
// Returns distance in meters
```

### Alert Thresholds:

- `distance > 2000m`: No alert
- `distance <= 2000m`: Yellow warning notification
- `distance <= 10m`: Red emergency full-screen alert

## Files Modified

1. **`public/mobile-driver.html`** - Mobile driver web app
2. **`src/server.js`** - Added proximity detection logic
3. **`simulator/ambulance-simulator.js`** - Ambulance in Koramangala
4. **`simulator/driver-simulator.js`** - 5 simulated drivers

## Next Steps

After successful testing, you can:

1. Add more ambulances: `npm run sim:multi`
2. Add traffic simulation: `npm run sim:vehicles`
3. Show traffic lights: `npm run sim:traffic`
4. Run everything: See PROXIMITY_TEST_INSTRUCTIONS.md for full demo

Good luck with your demo! 🚀
