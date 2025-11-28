import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import './AmbulanceBroadcaster.css';

// Use laptop IP for phone access, or localhost for testing on same device
const SOCKET_SERVER = window.location.hostname === 'localhost' 
  ? 'http://localhost:4000' 
  : `http://${window.location.hostname}:4000`;

const AmbulanceBroadcaster = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [myLocation, setMyLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('prompt');

  // Watch location and broadcast to server
  useEffect(() => {
    if (!isBroadcasting) return;

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMyLocation({ lat: latitude, lng: longitude });
          setLocationPermission('granted');

          // Broadcast location to server
          if (socket && isConnected) {
            socket.emit('ambulance:location', {
              lat: latitude,
              lng: longitude,
              timestamp: Date.now()
            });
            console.log('📡 Broadcasting ambulance location:', latitude.toFixed(6), longitude.toFixed(6));
          }
        },
        (error) => {
          console.error('Location error:', error);
          setLocationPermission('denied');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 500,
          timeout: 5000
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, [isBroadcasting, socket, isConnected]);

  // Setup Socket.io connection
  useEffect(() => {
    const newSocket = io(SOCKET_SERVER);
    
    newSocket.on('connect', () => {
      console.log('✅ Connected to notification server');
      setIsConnected(true);
      newSocket.emit('ambulance:register', { 
        id: 'ambulance-001',
        timestamp: Date.now() 
      });
    });

    newSocket.on('disconnect', () => {
      console.log('❌ Disconnected from server');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const handleStartBroadcasting = () => {
    if (locationPermission !== 'granted') {
      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationPermission('granted');
          setIsBroadcasting(true);
        },
        (error) => {
          alert('Please enable location permissions to broadcast ambulance location.');
          console.error(error);
        }
      );
    } else {
      setIsBroadcasting(true);
    }
  };

  const handleStopBroadcasting = () => {
    setIsBroadcasting(false);
  };

  return (
    <div className="ambulance-broadcaster">
      <div className="broadcaster-header">
        <h2>🚑 Ambulance Location Broadcaster</h2>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '✅ Connected' : '❌ Disconnected'}
        </div>
      </div>

      <div className="permissions-section">
        <div className="permission-item">
          <span>📍 Location:</span>
          <span className={`permission-status ${locationPermission}`}>
            {locationPermission === 'granted' ? '✅ Enabled' : '❌ Disabled'}
          </span>
        </div>
        <div className="permission-item">
          <span>📡 Broadcasting:</span>
          <span className={`permission-status ${isBroadcasting ? 'granted' : 'denied'}`}>
            {isBroadcasting ? '✅ Active' : '❌ Inactive'}
          </span>
        </div>
      </div>

      <div className="broadcast-controls">
        {!isBroadcasting ? (
          <button onClick={handleStartBroadcasting} className="start-btn">
            📡 Start Broadcasting
          </button>
        ) : (
          <button onClick={handleStopBroadcasting} className="stop-btn">
            ⏹️ Stop Broadcasting
          </button>
        )}
      </div>

      {myLocation && isBroadcasting && (
        <div className="location-info broadcasting">
          <p className="broadcast-label">📡 Broadcasting Location:</p>
          <p className="coords">{myLocation.lat.toFixed(6)}, {myLocation.lng.toFixed(6)}</p>
          <p className="broadcast-status">All nearby devices within 1m will be alerted!</p>
        </div>
      )}

      <div className="info-section">
        <h3>ℹ️ How it works:</h3>
        <ul>
          <li>This laptop acts as the ambulance</li>
          <li>Your location is broadcast every second</li>
          <li>Phones within 1 meter receive instant notifications</li>
          <li>Ensure location services are enabled</li>
        </ul>
      </div>
    </div>
  );
};

export default AmbulanceBroadcaster;
