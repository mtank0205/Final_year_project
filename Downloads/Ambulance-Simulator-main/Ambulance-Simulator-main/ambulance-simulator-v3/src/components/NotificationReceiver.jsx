import React, { useEffect, useState } from 'react';
import './NotificationReceiver.css';

// Static vehicle position (same as VehicleDashboard)
const STATIC_VEHICLE_POSITION = [12.9345, 77.6248];
const ALERT_DISTANCE = 50; // Show alert within 50 meters
const WARNING_DISTANCE = 100; // Show warning within 100 meters

const NotificationReceiver = () => {
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [myLocation] = useState({ lat: STATIC_VEHICLE_POSITION[0], lng: STATIC_VEHICLE_POSITION[1] });
  const [nearbyAmbulances, setNearbyAmbulances] = useState([]);
  const [isConnected, setIsConnected] = useState(true);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [showAlert, setShowAlert] = useState(false);

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Earth's radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in meters
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission === 'granted';
    }
    return false;
  };

  // Show notification
  const showNotification = (distance) => {
    if (notificationPermission === 'granted') {
      new Notification('🚑 AMBULANCE ALERT!', {
        body: `Ambulance approaching! Distance: ${distance.toFixed(0)}m - Please give way!`,
        icon: '/ambulance-icon.png',
        vibrate: [200, 100, 200, 100, 200],
        requireInteraction: false
      });
    }
    
    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  // Poll localStorage for ambulance position
  useEffect(() => {
    const checkAmbulanceProximity = () => {
      try {
        const ambulanceData = localStorage.getItem('ambulance-position');
        
        if (!ambulanceData) {
          setNearbyAmbulances([]);
          setCurrentDistance(null);
          setShowAlert(false);
          return;
        }

        const { position, status, phase } = JSON.parse(ambulanceData);
        
        // Only track if ambulance is active
        if (status !== 'responding' && status !== 'transporting') {
          setNearbyAmbulances([]);
          setCurrentDistance(null);
          setShowAlert(false);
          return;
        }

        // Calculate distance
        const distance = calculateDistance(
          myLocation.lat, myLocation.lng,
          position[0], position[1]
        );

        setCurrentDistance(distance);
        console.log(`[NotificationReceiver] Ambulance distance: ${distance.toFixed(0)}m`);

        // Update nearby ambulances list
        if (distance < WARNING_DISTANCE) {
          setNearbyAmbulances([{
            id: 'ambulance-1',
            distance,
            lat: position[0],
            lng: position[1],
            status,
            phase,
            timestamp: Date.now()
          }]);

          // Show alert if within critical distance
          if (distance <= ALERT_DISTANCE) {
            setShowAlert(true);
            
            // Show notification only once when entering alert zone
            if (!showAlert) {
              showNotification(distance);
            }
          } else {
            setShowAlert(false);
          }
        } else {
          setNearbyAmbulances([]);
          setShowAlert(false);
        }
      } catch (error) {
        console.error('[NotificationReceiver] Error checking proximity:', error);
      }
    };

    // Check every 500ms
    const interval = setInterval(checkAmbulanceProximity, 500);
    checkAmbulanceProximity(); // Initial check

    return () => clearInterval(interval);
  }, [myLocation, notificationPermission, showAlert]);

  const handleEnableNotifications = async () => {
    await requestNotificationPermission();
  };

  return (
    <div className="notification-receiver">
      <div className="receiver-header">
        <h2>🚑 Ambulance Alert System</h2>
        <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? '✅ Connected' : '❌ Disconnected'}
        </div>
      </div>

      <div className="permissions-section">
        <div className="permission-item">
          <span>📍 Location:</span>
          <span className="permission-status granted">
            ✅ Enabled
          </span>
        </div>
        <div className="permission-item">
          <span>🔔 Notifications:</span>
          <span className={`permission-status ${notificationPermission}`}>
            {notificationPermission === 'granted' ? '✅ Enabled' : '❌ Disabled'}
          </span>
        </div>
      </div>

      {notificationPermission !== 'granted' && (
        <button onClick={handleEnableNotifications} className="enable-btn">
          🔔 Enable Notifications
        </button>
      )}

      {myLocation && (
        <div className="location-info">
          <p>📍 Your Location:</p>
          <p className="coords">{myLocation.lat.toFixed(6)}, {myLocation.lng.toFixed(6)}</p>
        </div>
      )}

      <div className="nearby-ambulances">
        <h3>Nearby Ambulances:</h3>
        {nearbyAmbulances.length === 0 ? (
          <p className="no-ambulances">No ambulances nearby</p>
        ) : (
          nearbyAmbulances.map(amb => (
            <div key={amb.id} className={`ambulance-item ${amb.distance <= ALERT_DISTANCE ? 'alert' : ''}`}>
              <span className="ambulance-icon">🚑</span>
              <span className="ambulance-distance">{amb.distance.toFixed(0)}m away</span>
              {amb.distance <= ALERT_DISTANCE && <span className="alert-badge">⚠️ VERY CLOSE!</span>}
            </div>
          ))
        )}
      </div>

      <div className="info-section">
        <p>💡 This app will alert you when an ambulance is within 50 meters.</p>
        <p>📱 Keep this page open to receive notifications.</p>
        <p>🚗 Vehicle position: {STATIC_VEHICLE_POSITION[0].toFixed(4)}, {STATIC_VEHICLE_POSITION[1].toFixed(4)}</p>
      </div>
    </div>
  );
};

export default NotificationReceiver;
