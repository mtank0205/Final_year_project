# 🚑 Ambulance Route Optimization Simulator

A real-time ambulance route optimization system with dynamic traffic signal control. Built with React and Google Maps API.

## 🎯 Features

### Main Dashboard (Bird's Eye View)
- **Real-time tracking** of multiple ambulances
- **Dynamic traffic signals** that turn green when ambulance approaches (within 100m)
- **Road closures** visualization
- **Route optimization** using Google Maps Directions API
- **Dark emergency theme** for professional look

### Ambulance POV Pages
- Individual **navigation view** for each ambulance
- **Google Maps street-level perspective**
- Real-time **progress tracking** with ETA
- **Speed and distance** metrics
- Smooth **camera following** ambulance movement

## 🚀 Quick Start

### 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable these APIs:
   - Maps JavaScript API
   - Directions API
   - Places API (optional, for future features)
4. Go to **Credentials** → **Create Credentials** → **API Key**
5. Copy your API key

### 2. Configure Environment

```bash
# Navigate to the project folder
cd ambulance-sim

# Create .env file from example
copy .env.example .env

# Edit .env and add your API key
# REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 3. Install & Run

```bash
# Install dependencies (already done if you followed setup)
npm install

# Start the development server
npm start
```

The app will open at `http://localhost:3000`

## 📁 Project Structure

```
ambulance-sim/
├── public/                 # Static files
├── src/
│   ├── components/         # Reusable components
│   │   ├── AmbulanceMarker.js
│   │   ├── TrafficSignal.js
│   │   └── RoadClosure.js
│   ├── pages/             # Main views
│   │   ├── MainDashboard.js
│   │   ├── MainDashboard.css
│   │   ├── AmbulancePOV.js
│   │   └── AmbulancePOV.css
│   ├── data/              # Mock data
│   │   └── mockData.js
│   ├── utils/             # Helper functions
│   │   └── mapUtils.js
│   ├── App.js             # Router setup
│   └── index.js           # Entry point
└── package.json
```

## 🎮 How to Use

1. **Main Dashboard**: 
   - View all active ambulances on the map
   - Monitor traffic signal status in the sidebar
   - See real-time routes and road closures
   - Click on any ambulance card or marker to view its POV

2. **Ambulance POV**:
   - Navigate using the back button
   - Watch real-time progress
   - Monitor ETA and speed
   - See the route from driver's perspective

## ⚙️ Configuration

### Modify Ambulance Data
Edit `src/data/mockData.js` to customize:
- Starting and ending locations
- Number of ambulances
- Colors and names
- Traffic signal positions
- Road closures

### Adjust Speed
In `src/pages/MainDashboard.js` and `src/pages/AmbulancePOV.js`, change the interval timing:
```javascript
setInterval(() => {
  // Update logic
}, 1000); // 1000ms = 1 second (real-time)
```

For faster simulation, reduce to `500` (0.5s) or `100` (0.1s)

### Traffic Signal Threshold
In `src/utils/mapUtils.js`, modify the distance threshold:
```javascript
export const isNearTrafficSignal = (ambulancePos, signalPos, threshold = 100) => {
  // 100 = 100 meters
```

## 🔧 Technical Details

### Key Technologies
- **React 18** - UI framework
- **Google Maps JavaScript API** - Mapping and directions
- **React Router** - Navigation between views
- **CSS3** - Dark emergency theme styling

### Traffic Signal Logic
Signals automatically turn green when any ambulance is within 100 meters:
```javascript
const nearbyAmbulance = ambulances.some((ambulance) =>
  isNearTrafficSignal(ambulance.currentPosition, signal.position, 100)
);
```

### Movement Simulation
Ambulances follow the calculated Google Maps route:
- Route is calculated once using Directions API
- Position updates every second along the route path
- Map auto-centers on ambulance in POV mode

## 🎨 Customization

### Change Theme Colors
Edit CSS files to modify the dark theme:
- `src/pages/MainDashboard.css` - Dashboard styling
- `src/pages/AmbulancePOV.css` - POV page styling

### Add More Ambulances
In `src/data/mockData.js`:
```javascript
export const ambulances = [
  // ... existing ambulances
  {
    id: 3,
    name: 'Ambulance 3',
    start: { lat: YOUR_LAT, lng: YOUR_LNG },
    end: { lat: YOUR_LAT, lng: YOUR_LNG },
    currentPosition: { lat: YOUR_LAT, lng: YOUR_LNG },
    speed: 0.0001,
    status: 'active',
    color: '#0000FF'
  }
];
```

## 📊 Future Enhancements

- [ ] Real-time GPS integration
- [ ] Machine learning for traffic prediction
- [ ] Multi-hospital dispatch system
- [ ] Public citizen alerts
- [ ] Advanced analytics dashboard
- [ ] Historical route data
- [ ] Weather integration

## 🐛 Troubleshooting

### Map doesn't load
- Check if Google Maps API key is correctly set in `.env`
- Ensure Maps JavaScript API is enabled in Google Cloud Console
- Check browser console for API errors

### Ambulances not moving
- Verify route calculation succeeded (check console)
- Ensure start and end points are valid locations
- Check if there's a valid driving route between points

### "Over Query Limit" error
- You may have exceeded free tier usage
- Enable billing in Google Cloud Console
- Consider implementing request caching

## 📝 License

This project is for educational purposes.

## 👨‍💻 Development

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Build for production
npm run build

# Run tests
npm test
```

## 🤝 Contributing

Feel free to fork this project and add your own features!

---

Built with ❤️ for emergency response optimization

