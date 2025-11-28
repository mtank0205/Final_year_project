import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const TrafficSignal = ({ signal, status, countdown }) => {
  // Create traffic light icon based on status
  const getStatusColor = () => {
    switch (status) {
      case 'green': return '#00FF00';
      case 'yellow': return '#FFFF00';
      case 'red': 
      default: return '#FF0000';
    }
  };

  const trafficIcon = L.divIcon({
    className: 'traffic-signal-marker',
    html: `
      <div class="traffic-signal">
        <div class="signal-box">
          <div class="light red ${status === 'red' ? 'active' : ''}"></div>
          <div class="light yellow ${status === 'yellow' ? 'active' : ''}"></div>
          <div class="light green ${status === 'green' ? 'active' : ''}"></div>
        </div>
        ${countdown > 0 ? `<div class="countdown">${countdown}s</div>` : ''}
      </div>
    `,
    iconSize: [30, 50],
    iconAnchor: [15, 50],
  });

  return (
    <Marker position={signal.position} icon={trafficIcon}>
      <Popup>
        <div className="signal-popup">
          <strong>{signal.name}</strong>
          <br />
          Status: <span style={{ color: getStatusColor() }}>{status.toUpperCase()}</span>
        </div>
      </Popup>
    </Marker>
  );
};

export default TrafficSignal;
