# 🚀 Quick Start - Ambulance Simulator

## Prerequisites
- Node.js installed
- Google Maps API key (see SETUP_GUIDE.md)

## Installation Steps

### 1. Navigate to project
```bash
cd ambulance-sim
```

### 2. Install dependencies
```bash
npm install
```

### 3. Configure API Key
```bash
# Copy the example env file
copy .env.example .env

# Edit .env and add your Google Maps API key
# REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

### 4. Start the development server
```bash
npm start
```

The app will automatically open at `http://localhost:3000`

## What You'll See

### Main Dashboard (Home Page)
- 🗺️ Full map view of New York City (Times Square area)
- 🚑 Two ambulances (red and green) moving along their routes
- 🚦 Traffic signals that turn green when ambulances approach
- 🚧 Road closures marked in orange
- 📊 Sidebar with ambulance status and traffic signal monitoring

### Ambulance POV Pages
- Click on any ambulance card or map marker
- See navigation view from that ambulance's perspective
- Real-time ETA and progress tracking
- Auto-following camera

## Features Demo

1. **Watch ambulances move** - They follow Google Maps calculated routes
2. **Traffic signals respond** - Turn green within 100m of ambulance
3. **Click ambulances** - View their individual POV
4. **Navigation** - Use "Back to Dashboard" button to return

## Customization

### Change locations
Edit `src/data/mockData.js`:
```javascript
start: { lat: YOUR_LAT, lng: YOUR_LNG }
end: { lat: YOUR_LAT, lng: YOUR_LNG }
```

### Adjust speed
In dashboard and POV files, change interval:
```javascript
setInterval(() => { /* ... */ }, 1000); // milliseconds
```

### Add more ambulances
Add to `ambulances` array in `src/data/mockData.js`

## Troubleshooting

**Map not loading?**
- Check `.env` file has correct API key
- Ensure APIs are enabled in Google Cloud Console
- Restart dev server with `Ctrl+C` then `npm start`

**Ambulances not moving?**
- Check browser console for errors
- Verify start/end points are valid locations
- Ensure Directions API is enabled

**Need detailed help?**
- See `SETUP_GUIDE.md` for API key setup
- See `README.md` for full documentation

## Next Steps

1. ✅ Get it running with default NYC locations
2. 🗺️ Change locations to your city
3. 🎨 Customize colors and styling
4. 🚑 Add more ambulances
5. 🎯 Add more traffic signals and road closures

---

Need help? Check the full documentation in README.md!
