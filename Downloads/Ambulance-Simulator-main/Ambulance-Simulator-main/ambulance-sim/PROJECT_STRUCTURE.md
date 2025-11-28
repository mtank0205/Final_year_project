# 📋 Project Structure & File Guide

## Directory Overview

```
ambulance-sim/
├── .env                          # Your Google Maps API key (DO NOT COMMIT)
├── .env.example                  # Template for API key setup
├── package.json                  # Project dependencies
├── README.md                     # Full documentation
├── SETUP_GUIDE.md               # Detailed API setup instructions
├── QUICKSTART.md                # Quick start guide
│
├── public/                       # Static files
│   ├── index.html               # Main HTML template
│   └── favicon.ico              # App icon
│
└── src/
    ├── index.js                 # App entry point
    ├── index.css                # Global styles
    ├── App.js                   # Main router configuration
    ├── App.css                  # App-level styles
    │
    ├── components/              # Reusable components
    │   ├── AmbulanceMarker.js   # Ambulance marker on map
    │   ├── TrafficSignal.js     # Traffic signal marker
    │   └── RoadClosure.js       # Road closure visualization
    │
    ├── pages/                   # Main application pages
    │   ├── MainDashboard.js     # Bird's eye view dashboard
    │   ├── MainDashboard.css    # Dashboard styling
    │   ├── AmbulancePOV.js      # Individual ambulance POV
    │   └── AmbulancePOV.css     # POV page styling
    │
    ├── data/                    # Mock data & configuration
    │   └── mockData.js          # Ambulances, signals, closures data
    │
    └── utils/                   # Helper functions
        └── mapUtils.js          # Distance calculations & map styling
```

## Key Files Explained

### Configuration Files

**`.env`**
- Contains your Google Maps API key
- Never commit this to version control
- Template available in `.env.example`

**`package.json`**
- Lists all dependencies
- Contains npm scripts (start, build, test)

### Entry Points

**`src/index.js`**
- Application entry point
- Renders the root React component
- Mounts app to DOM

**`src/App.js`**
- Main router configuration
- Defines routes for dashboard and POV pages
- Uses React Router for navigation

### Pages

**`src/pages/MainDashboard.js`**
- Main control center view
- Shows all ambulances on map
- Real-time traffic signal monitoring
- Displays road closures
- Sidebar with ambulance list

**`src/pages/AmbulancePOV.js`**
- Individual ambulance navigation view
- Driver's perspective
- Real-time ETA and progress
- Auto-following camera

### Components

**`src/components/AmbulanceMarker.js`**
- Renders ambulance icon on map
- Clickable to navigate to POV
- Color-coded by ambulance

**`src/components/TrafficSignal.js`**
- Traffic light visualization
- Changes color based on proximity
- Red by default, green when ambulance near

**`src/components/RoadClosure.js`**
- Displays blocked roads
- Shows closure reason
- Warning icon and striped pattern

### Data & Configuration

**`src/data/mockData.js`**
- Ambulance start/end positions
- Traffic signal locations
- Road closure coordinates
- Easily customizable for your needs

**`src/utils/mapUtils.js`**
- Distance calculation (Haversine formula)
- Proximity detection for signals
- Dark emergency theme styling
- Google Maps configuration

## Routes

| URL | Component | Description |
|-----|-----------|-------------|
| `/` | MainDashboard | Main control center view |
| `/ambulance/1` | AmbulancePOV | Ambulance 1 navigation view |
| `/ambulance/2` | AmbulancePOV | Ambulance 2 navigation view |

## Data Flow

```
mockData.js (initial positions)
    ↓
MainDashboard.js (calculates routes)
    ↓
Google Maps Directions API
    ↓
Route calculation complete
    ↓
setInterval (movement simulation)
    ↓
Update ambulance positions
    ↓
Check proximity to traffic signals
    ↓
Update signal colors
    ↓
Re-render map
```

## Key Features Implementation

### 1. Traffic Signal Logic
```javascript
// Location: src/utils/mapUtils.js
export const isNearTrafficSignal = (ambulancePos, signalPos, threshold = 100)
```

### 2. Route Calculation
```javascript
// Location: src/pages/MainDashboard.js
directionsService.route({
  origin: ambulance.start,
  destination: ambulance.end,
  travelMode: window.google.maps.TravelMode.DRIVING
})
```

### 3. Movement Simulation
```javascript
// Location: src/pages/MainDashboard.js
setInterval(() => {
  // Update position along route
}, 1000); // Real-time (1 second intervals)
```

### 4. Theme Styling
```javascript
// Location: src/utils/mapUtils.js
export const darkMapStyles = [
  // Custom dark emergency theme
]
```

## Customization Guide

### Add New Ambulance
1. Edit `src/data/mockData.js`
2. Add object to `ambulances` array
3. Set unique `id`, `name`, `color`
4. Define `start` and `end` coordinates

### Change Location
1. Get coordinates (use Google Maps)
2. Update `start` and `end` in `mockData.js`
3. Update `defaultCenter` for map center

### Modify Traffic Signals
1. Edit `trafficSignals` array in `mockData.js`
2. Add/remove signal objects with positions
3. Adjust proximity threshold in `mapUtils.js`

### Adjust Speed
1. Find `setInterval` in dashboard/POV files
2. Change milliseconds (1000 = 1 second)
3. Lower value = faster movement

### Change Theme
1. Edit CSS files in `src/pages/`
2. Modify colors and styles
3. Update `darkMapStyles` in `mapUtils.js`

## Dependencies

### Core
- `react` - UI library
- `react-dom` - React DOM renderer
- `react-router-dom` - Client-side routing

### Google Maps
- `@react-google-maps/api` - Google Maps React integration

### Dev Dependencies
- `react-scripts` - Create React App tooling
- Webpack, Babel, ESLint (included in CRA)

## Build Commands

```bash
npm start          # Development server
npm run build      # Production build
npm test           # Run tests
npm run eject      # Eject from CRA (one-way)
```

## Environment Variables

Only one required:
- `REACT_APP_GOOGLE_MAPS_API_KEY` - Your Google Maps API key

Must be prefixed with `REACT_APP_` to be accessible in React.

## Best Practices

1. **Never commit `.env`** - Contains sensitive API key
2. **Keep components small** - Each does one thing well
3. **Mock data separate** - Easy to swap with real API
4. **Styles co-located** - CSS next to component files
5. **Utils for logic** - Keep components clean

## Need Help?

- **API Setup**: See `SETUP_GUIDE.md`
- **Getting Started**: See `QUICKSTART.md`
- **Full Documentation**: See `README.md`
- **Code Issues**: Check browser console

---

Happy coding! 🚑
