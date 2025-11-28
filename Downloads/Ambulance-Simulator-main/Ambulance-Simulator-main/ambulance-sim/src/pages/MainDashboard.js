import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, DirectionsRenderer } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import AmbulanceMarker from '../components/AmbulanceMarker';
import TrafficSignal from '../components/TrafficSignal';
import RoadClosure from '../components/RoadClosure';
import HospitalMarker from '../components/HospitalMarker';
import PatientMarker from '../components/PatientMarker';
import { ambulances as initialAmbulances, trafficSignals as initialSignals, roadClosures, hospitals, patients, defaultCenter } from '../data/mockData';
import { isNearTrafficSignal, darkMapStyles } from '../utils/mapUtils';
import './MainDashboard.css';

const containerStyle = {
  width: '100%',
  height: '100vh',
};

const MainDashboard = () => {
  const navigate = useNavigate();
  const [ambulances, setAmbulances] = useState(initialAmbulances);
  const [trafficSignals, setTrafficSignals] = useState(
    initialSignals.map(signal => ({
      ...signal,
      countdown: 0,
      lastAmbulanceNear: false,
      changeTimer: null
    }))
  );
  const [directions, setDirections] = useState({});
  const [map, setMap] = useState(null);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ['geometry'],
  });

  // Calculate routes for ambulances
  useEffect(() => {
    if (!isLoaded) return;

    ambulances.forEach((ambulance) => {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: ambulance.start,
          destination: ambulance.end,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections((prev) => ({ ...prev, [ambulance.id]: result }));
          }
        }
      );
    });
  }, [isLoaded, ambulances.length]);

  // Simulate ambulance movement
  useEffect(() => {
    const interval = setInterval(() => {
      setAmbulances((prevAmbulances) =>
        prevAmbulances.map((ambulance) => {
          const direction = directions[ambulance.id];
          if (!direction) return ambulance;

          const route = direction.routes[0].overview_path;
          const currentIndex = route.findIndex(
            (point) =>
              Math.abs(point.lat() - ambulance.currentPosition.lat) < 0.0001 &&
              Math.abs(point.lng() - ambulance.currentPosition.lng) < 0.0001
          );

          if (currentIndex === -1 || currentIndex >= route.length - 1) {
            return ambulance;
          }

          const nextPoint = route[currentIndex + 1];
          return {
            ...ambulance,
            currentPosition: {
              lat: nextPoint.lat(),
              lng: nextPoint.lng(),
            },
          };
        })
      );
    }, 1000); // Update every second (real-time)

    return () => clearInterval(interval);
  }, [directions]);

  // Update traffic signals based on ambulance proximity with timing
  useEffect(() => {
    setTrafficSignals((prevSignals) =>
      prevSignals.map((signal) => {
        const nearbyAmbulance = ambulances.some((ambulance) =>
          isNearTrafficSignal(ambulance.currentPosition, signal.position, 100)
        );
        
        // Ambulance approaching (within 100m) and signal is red
        if (nearbyAmbulance && !signal.lastAmbulanceNear && signal.status === 'red') {
          // Start countdown to turn green (3 seconds)
          setTimeout(() => {
            setTrafficSignals(prev => prev.map(s => 
              s.id === signal.id ? { ...s, status: 'green', countdown: 0 } : s
            ));
          }, 3000);
          
          return {
            ...signal,
            lastAmbulanceNear: true,
            countdown: 3,
            status: 'yellow' // Transition state
          };
        }
        
        // Ambulance has passed (no longer nearby) and signal is green
        if (!nearbyAmbulance && signal.lastAmbulanceNear && signal.status === 'green') {
          // Wait 5 seconds then turn back to red
          setTimeout(() => {
            setTrafficSignals(prev => prev.map(s => 
              s.id === signal.id ? { ...s, status: 'red', countdown: 0 } : s
            ));
          }, 5000);
          
          return {
            ...signal,
            lastAmbulanceNear: false,
            countdown: 5,
            status: 'green' // Stay green during countdown
          };
        }
        
        return signal;
      })
    );
  }, [ambulances]);

  // Countdown timer that ticks every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficSignals(prev => prev.map(signal => {
        if (signal.countdown > 0) {
          return {
            ...signal,
            countdown: signal.countdown - 1
          };
        }
        return signal;
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const onLoad = useCallback((map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleAmbulanceClick = (ambulanceId) => {
    navigate(`/ambulance/${ambulanceId}`);
  };

  if (!isLoaded) {
    return (
      <div className="loading-screen">
        <div className="spinner"></div>
        <p>Loading Emergency Response System...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="sidebar">
        <h1 className="dashboard-title">🚑 Emergency Control</h1>
        
        <div className="ambulance-list">
          <h2>Active Ambulances</h2>
          {ambulances.map((ambulance) => {
            const patient = patients.find(p => p.id === ambulance.patientId);
            const hospital = hospitals.find(h => h.id === ambulance.hospitalId);
            return (
              <div
                key={ambulance.id}
                className="ambulance-card"
                onClick={() => handleAmbulanceClick(ambulance.id)}
                style={{ borderLeft: `4px solid ${ambulance.color}` }}
              >
                <h3>{ambulance.name}</h3>
                <p className="status">Status: {ambulance.status}</p>
                <p className="mission-info">
                  🚨 {patient?.name} → 🏥 {hospital?.name}
                </p>
                <button className="view-pov-btn">View POV →</button>
              </div>
            );
          })}
        </div>

        <div className="mission-status">
          <h2>Active Missions</h2>
          {patients.map((patient) => (
            <div key={patient.id} className="mission-card">
              <span className={`status-indicator ${patient.status.toLowerCase()}`}></span>
              <div className="mission-details">
                <div className="patient-name">{patient.name}</div>
                <div className="patient-status">{patient.status}</div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="signal-status">
          <h2>Traffic Signals</h2>
          <div className="signal-grid">
            {trafficSignals.map((signal) => (
              <div key={signal.id} className="signal-item">
                <span className={`signal-dot ${signal.status}`}></span>
                <span>Signal {signal.id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="map-container">
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={defaultCenter}
          zoom={14}
          onLoad={onLoad}
          onUnmount={onUnmount}
          options={{
            styles: darkMapStyles,
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
          }}
        >
          {/* Render routes */}
          {Object.entries(directions).map(([id, direction]) => (
            <DirectionsRenderer
              key={id}
              directions={direction}
              options={{
                polylineOptions: {
                  strokeColor: ambulances.find((a) => a.id === parseInt(id))?.color,
                  strokeOpacity: 0.6,
                  strokeWeight: 5,
                },
                suppressMarkers: true,
              }}
            />
          ))}

          {/* Render hospitals */}
          {hospitals.map((hospital) => (
            <HospitalMarker
              key={hospital.id}
              hospital={hospital}
              showInfo={selectedHospital === hospital.id}
              onToggleInfo={() => setSelectedHospital(selectedHospital === hospital.id ? null : hospital.id)}
            />
          ))}

          {/* Render patient pickup locations */}
          {patients.map((patient) => (
            <PatientMarker
              key={patient.id}
              patient={patient}
              showInfo={selectedPatient === patient.id}
              onToggleInfo={() => setSelectedPatient(selectedPatient === patient.id ? null : patient.id)}
            />
          ))}

          {/* Render ambulances */}
          {ambulances.map((ambulance) => (
            <AmbulanceMarker
              key={ambulance.id}
              ambulance={ambulance}
              onClick={() => handleAmbulanceClick(ambulance.id)}
            />
          ))}

          {/* Render traffic signals */}
          {trafficSignals.map((signal) => (
            <TrafficSignal key={signal.id} signal={signal} />
          ))}

          {/* Render road closures */}
          {roadClosures.map((closure) => (
            <RoadClosure key={closure.id} closure={closure} />
          ))}
        </GoogleMap>
      </div>
    </div>
  );
};

export default MainDashboard;
