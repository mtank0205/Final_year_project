import React, { useState, useEffect } from 'react';
import './VehicleDashboard.css';

const VehicleDashboard = () => {
  const [notification, setNotification] = useState(null);
  const [ambulanceDistance, setAmbulanceDistance] = useState(null);
  const [vehicleInfo] = useState({
    id: 'vehicle-1',
    type: 'Sedan',
    location: 'On Ambulance Route (Near Hospital)',
    position: [12.9345, 77.6248] // Very close to hospital, directly on ambulance's starting path
  });
  const [notificationHistory, setNotificationHistory] = useState([]);

  useEffect(() => {
    // Poll for ambulance position from localStorage
    const checkAmbulanceProximity = () => {
      try {
        const ambulanceData = localStorage.getItem('ambulance-position');
        if (!ambulanceData) {
          setAmbulanceDistance(null);
          console.log('[Vehicle Dashboard] No ambulance data in localStorage');
          return;
        }

        const { position, status, phase } = JSON.parse(ambulanceData);
        
        console.log('[Vehicle Dashboard] Ambulance data:', { position, status, phase });
        
        // Only alert if ambulance is responding or transporting
        if (status !== 'responding' && status !== 'transporting') {
          setNotification(null);
          setAmbulanceDistance(null);
          console.log('[Vehicle Dashboard] Ambulance not active, status:', status);
          return;
        }

        // Calculate distance using Haversine formula
        const distance = calculateDistance(vehicleInfo.position, position);
        setAmbulanceDistance(distance);

        console.log(`[Vehicle Dashboard] ✅ Ambulance distance: ${distance.toFixed(2)}m, Status: ${status}, Phase: ${phase}`);

        // Show notification if within 1000 meters (increased from 300m for better detection)
        if (distance <= 500) {
          const newNotification = {
            message: '🚨 AMBULANCE APPROACHING - CLEAR THE PATH!',
            distance: Math.round(distance),
            timestamp: new Date(),
            type: 'critical'
          };
          
          setNotification(newNotification);
          
          // Add to history if not already there
          setNotificationHistory(prev => {
            const lastAlert = prev[prev.length - 1];
            if (!lastAlert || Date.now() - lastAlert.timestamp.getTime() > 5000) {
              return [...prev, newNotification].slice(-5); // Keep last 5
            }
            return prev;
          });

          // Play alert sound
          playAlertSound();
        } else if (distance > 500 && distance <= 1000) {
          setNotification({
            message: '⚠️ Ambulance nearby - Be alert',
            distance: Math.round(distance),
            timestamp: new Date(),
            type: 'warning'
          });
        } else {
          setNotification(null);
        }
      } catch (error) {
        console.error('Error checking ambulance proximity:', error);
      }
    };

    // Check every 200ms for smooth updates
    const interval = setInterval(checkAmbulanceProximity, 200);
    
    // Initial check
    checkAmbulanceProximity();
    
    return () => clearInterval(interval);
  }, [vehicleInfo.position]);

  const calculateDistance = (pos1, pos2) => {
    const R = 6371000; // Earth's radius in meters
    const lat1 = pos1[0] * Math.PI / 180;
    const lat2 = pos2[0] * Math.PI / 180;
    const deltaLat = (pos2[0] - pos1[0]) * Math.PI / 180;
    const deltaLng = (pos2[1] - pos1[1]) * Math.PI / 180;

    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const playAlertSound = () => {
    // Simple beep using Web Audio API
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Audio API not supported:', error);
    }
  };

  return (
    <div className="vehicle-dashboard">
      <div className="vehicle-header">
        <h1>🚗 Vehicle Dashboard</h1>
        <p className="subtitle">Civilian Vehicle on Mahayogi Venamma Road</p>
      </div>

      <div className="vehicle-content">
        {/* Vehicle Info Card */}
        <div className="info-card">
          <h2>📍 Your Vehicle</h2>
          <div className="info-row">
            <span className="label">Vehicle Type:</span>
            <span className="value">{vehicleInfo.type}</span>
          </div>
          <div className="info-row">
            <span className="label">Location:</span>
            <span className="value">{vehicleInfo.location}</span>
          </div>
          <div className="info-row">
            <span className="label">Coordinates:</span>
            <span className="value">{vehicleInfo.position[0].toFixed(4)}, {vehicleInfo.position[1].toFixed(4)}</span>
          </div>
          <div className="info-row">
            <span className="label">Status:</span>
            <span className="value status-driving">🟢 Parked</span>
          </div>
        </div>

        {/* Ambulance Distance Card */}
        {ambulanceDistance !== null && (
          <div className="info-card distance-card">
            <h2>🚑 Ambulance Distance</h2>
            <div className="distance-display">
              <span className="distance-value">{Math.round(ambulanceDistance)}</span>
              <span className="distance-unit">meters</span>
            </div>
            {ambulanceDistance <= 500 && (
              <p className="warning-text">⚠️ VERY CLOSE - AMBULANCE PASSING!</p>
            )}
            {ambulanceDistance > 500 && ambulanceDistance <= 1000 && (
              <p className="caution-text">Be prepared - ambulance approaching</p>
            )}
            {ambulanceDistance > 1000 && (
              <p className="info-text">Ambulance detected in area</p>
            )}
          </div>
        )}

        {/* Notification Alert */}
        {notification && (
          <div className={`notification-alert ${notification.type}`}>
            <div className="notification-icon">
              {notification.type === 'critical' ? '🚨' : '⚠️'}
            </div>
            <div className="notification-content">
              <h3>{notification.message}</h3>
              <p className="distance-text">Distance: {notification.distance} meters</p>
              <p className="timestamp">
                {notification.timestamp.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </p>
            </div>
          </div>
        )}

        {/* No Ambulance Message */}
        {!notification && ambulanceDistance === null && (
          <div className="info-card no-alert">
            <h2>✅ All Clear</h2>
            <p>No emergency vehicles nearby</p>
            <p className="hint">Start the ambulance simulation on the main dashboard to see alerts</p>
          </div>
        )}

        {/* Notification History */}
        {notificationHistory.length > 0 && (
          <div className="info-card history-card">
            <h3>📜 Recent Alerts</h3>
            <div className="history-list">
              {notificationHistory.slice().reverse().map((alert, index) => (
                <div key={index} className="history-item">
                  <span className="history-icon">🚨</span>
                  <span className="history-distance">{alert.distance}m</span>
                  <span className="history-time">
                    {alert.timestamp.toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions-card">
          <h3>📋 How it works</h3>
          <ul>
            <li>🚗 This vehicle is parked on Mahayogi Venamma Road</li>
            <li>🚑 When ambulance simulation starts, distance tracking begins</li>
            <li>📢 Alert triggers when ambulance is within 500 meters (CRITICAL)</li>
            <li>⚠️ Warning shows when ambulance is within 1000 meters</li>
            <li>🔊 Sound plays to notify driver</li>
            <li>⏰ Real-time distance updates every 200ms</li>
            <li>📍 Vehicle position: {vehicleInfo.position[0].toFixed(4)}, {vehicleInfo.position[1].toFixed(4)}</li>
          </ul>
        </div>

        {/* Link to Main Dashboard */}
        <div className="navigation-card">
          <a href="/" className="nav-button">
            ← Back to Main Dashboard
          </a>
        </div>
      </div>
    </div>
  );
};

export default VehicleDashboard;
