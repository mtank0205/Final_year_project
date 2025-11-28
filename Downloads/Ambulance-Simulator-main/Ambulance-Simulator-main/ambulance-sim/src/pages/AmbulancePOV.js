import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';
import { useParams, useNavigate } from 'react-router-dom';
import { ambulances as initialAmbulances, hospitals, patients } from '../data/mockData';
import './AmbulancePOV.css';

const containerStyle = {
  width: '100%',
  height: '100vh',
};

// Light map style like Google Maps navigation
const navigationMapStyles = [
  {
    featureType: 'all',
    elementType: 'geometry',
    stylers: [{ color: '#e8e8e8' }]
  },
  {
    featureType: 'all',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#616161' }]
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#c9e6f7' }]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#ffffff' }]
  },
  {
    featureType: 'road.highway',
    elementType: 'geometry',
    stylers: [{ color: '#fef9d7' }]
  },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#c8e6c9' }]
  }
];

const AmbulancePOV = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ambulance, setAmbulance] = useState(null);
  const [direction, setDirection] = useState(null);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [map, setMap] = useState(null);
  const [routeIndex, setRouteIndex] = useState(0);
  const [eta, setEta] = useState(null);
  const [remainingDistance, setRemainingDistance] = useState(null);
  const [heading, setHeading] = useState(0);
  const [nextManeuver, setNextManeuver] = useState(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [routePath, setRoutePath] = useState([]);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ['geometry'],
  });

  useEffect(() => {
    const foundAmbulance = initialAmbulances.find((a) => a.id === parseInt(id));
    if (foundAmbulance) {
      setAmbulance(foundAmbulance);
      setCurrentPosition(foundAmbulance.start);
    }
  }, [id]);

  useEffect(() => {
    if (!isLoaded || !ambulance) return;

    const directionsService = new window.google.maps.DirectionsService();
    directionsService.route(
      {
        origin: ambulance.start,
        destination: ambulance.end,
        travelMode: window.google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirection(result);
          const route = result.routes[0];
          setEta(route.legs[0].duration.text);
          setRemainingDistance(route.legs[0].distance.text);
          
          // Extract route path for polyline
          const path = route.overview_path.map(point => ({
            lat: point.lat(),
            lng: point.lng()
          }));
          setRoutePath(path);
          
          // Get first step instruction
          const steps = route.legs[0].steps;
          if (steps.length > 0) {
            setNextManeuver({
              instruction: steps[0].instructions.replace(/<[^>]*>/g, ''),
              distance: steps[0].distance.text,
              maneuver: steps[0].maneuver || 'straight'
            });
          }
        }
      }
    );
  }, [isLoaded, ambulance]);

  useEffect(() => {
    if (!direction) return;

    const route = direction.routes[0].overview_path;
    const steps = direction.routes[0].legs[0].steps;
    
    const interval = setInterval(() => {
      setRouteIndex((prevIndex) => {
        if (prevIndex >= route.length - 1) {
          clearInterval(interval);
          return prevIndex;
        }
        const nextIndex = prevIndex + 1;
        const currentPoint = route[prevIndex];
        const nextPoint = route[nextIndex];
        
        // Calculate heading (direction of travel)
        const lat1 = currentPoint.lat();
        const lng1 = currentPoint.lng();
        const lat2 = nextPoint.lat();
        const lng2 = nextPoint.lng();
        
        const calculatedHeading = window.google.maps.geometry.spherical.computeHeading(
          new window.google.maps.LatLng(lat1, lng1),
          new window.google.maps.LatLng(lat2, lng2)
        );
        
        setHeading(calculatedHeading);
        setCurrentPosition({
          lat: nextPoint.lat(),
          lng: nextPoint.lng(),
        });

        // Simulate speed (30-50 km/h)
        const speed = 30 + Math.random() * 20;
        setCurrentSpeed(Math.round(speed));

        // Update map with rotation and following
        if (map) {
          map.panTo({ lat: nextPoint.lat(), lng: nextPoint.lng() });
          map.setHeading(calculatedHeading);
        }
        
        // Calculate remaining distance
        let distanceRemaining = 0;
        for (let i = nextIndex; i < route.length - 1; i++) {
          const p1 = new window.google.maps.LatLng(route[i].lat(), route[i].lng());
          const p2 = new window.google.maps.LatLng(route[i + 1].lat(), route[i + 1].lng());
          distanceRemaining += window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
        }
        
        if (distanceRemaining > 1000) {
          setRemainingDistance(`${(distanceRemaining / 1000).toFixed(1)} km`);
        } else {
          setRemainingDistance(`${Math.round(distanceRemaining)} m`);
        }
        
        // Find current step for turn-by-turn
        let distanceCovered = 0;
        for (let i = 0; i <= nextIndex && i < route.length - 1; i++) {
          const p1 = new window.google.maps.LatLng(route[i].lat(), route[i].lng());
          const p2 = new window.google.maps.LatLng(route[i + 1].lat(), route[i + 1].lng());
          distanceCovered += window.google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
        }
        
        // Find current step
        let currentStepIndex = 0;
        let stepDistance = 0;
        for (let i = 0; i < steps.length; i++) {
          stepDistance += steps[i].distance.value;
          if (stepDistance > distanceCovered) {
            currentStepIndex = i;
            break;
          }
        }
        
        if (currentStepIndex < steps.length) {
          const remainingStepDistance = stepDistance - distanceCovered;
          setNextManeuver({
            instruction: steps[currentStepIndex].instructions.replace(/<[^>]*>/g, ''),
            distance: remainingStepDistance > 1000 
              ? `${(remainingStepDistance / 1000).toFixed(1)} km`
              : `${Math.round(remainingStepDistance)} m`,
            maneuver: steps[currentStepIndex].maneuver || 'straight'
          });
        }

        return nextIndex;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [direction, map]);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!isLoaded || !ambulance) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Navigation...</p>
      </div>
    );
  }

  const progress = direction
    ? Math.round((routeIndex / direction.routes[0].overview_path.length) * 100)
    : 0;
  
  const patient = patients.find(p => p.id === ambulance.patientId);
  const hospital = hospitals.find(h => h.id === ambulance.hospitalId);

  return (
    <div className="nav-container">
      {/* Top instruction banner */}
      {nextManeuver && (
        <div className="nav-instruction-banner">
          <div className="instruction-text">{nextManeuver.instruction}</div>
        </div>
      )}

      {/* Map */}
      <div className="nav-map-wrapper">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={currentPosition || ambulance.start}
          zoom={19}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            styles: navigationMapStyles,
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            heading: heading,
            tilt: 45,
            gestureHandling: 'none',
            clickableIcons: false,
          }}
        >
          {/* Blue route polyline */}
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#4285F4',
                strokeOpacity: 1,
                strokeWeight: 8,
                geodesic: true,
              }}
            />
          )}

          {/* Ambulance marker */}
          {currentPosition && (
            <Marker
              position={currentPosition}
              icon={{
                path: 'M 0,-20 L 10,10 L 0,5 L -10,10 Z',
                fillColor: ambulance.color,
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 3,
                scale: 1.2,
                anchor: new window.google.maps.Point(0, 0),
              }}
            />
          )}
        </GoogleMap>

        {/* Speedometer */}
        <div className="nav-speedometer">
          <div className="speed-value">{currentSpeed}</div>
          <div className="speed-unit">km/h</div>
        </div>

        {/* Map controls */}
        <div className="nav-map-controls">
          <button className="nav-control-btn" title="Recenter">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
            </svg>
          </button>
          <button className="nav-control-btn" title="Sound">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM19 12c0 2.53-1.71 4.68-4 5.29V19c3.48-.82 6-3.97 6-7.71 0-3.73-2.52-6.88-6-7.7v1.71c2.29.61 4 2.77 4 5.3zM12 3v9.28c-.94-.1-2-.63-3-1.22v-8.06c0-.14-.11-.25-.25-.25h-3.5c-.14 0-.25.11-.25.25v8.06c-1-.59-2.06-1.12-3-1.22V3H1v11c0 1.66 1.34 3 3 3h8c1.66 0 3-1.34 3-3V3h-3z"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Bottom info panel */}
      <div className="nav-bottom-panel">
        <button className="nav-close-btn" onClick={() => navigate('/')}>✕</button>
        
        <div className="nav-eta-container">
          <div className="nav-eta-main">
            <span className="nav-eta-time">{eta || '--'}</span>
            <span className="nav-leaf-icon">🌱</span>
          </div>
          <div className="nav-eta-details">
            <span>{remainingDistance || '--'}</span>
            <span> • </span>
            <span>{new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
          </div>
        </div>

        <div className="nav-route-actions">
          <button className="nav-action-btn" title="Route options">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmbulancePOV;
