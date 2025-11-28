import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const AmbulanceMarker = ({ ambulance, position, status, onClick }) => {
  // Create custom icon with emoji
  const ambulanceIcon = L.divIcon({
    className: 'ambulance-marker',
    html: `
      <div class="ambulance-icon ${status === 'responding' || status === 'transporting' ? 'emergency' : ''}" 
           style="color: ${ambulance.color};">
        <span class="ambulance-emoji">${ambulance.emoji}</span>
        ${status === 'responding' || status === 'transporting' ? '<span class="siren">🚨</span>' : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  return (
    <Marker 
      position={position} 
      icon={ambulanceIcon}
      eventHandlers={{
        click: () => onClick && onClick(ambulance.id),
      }}
    >
      <Popup>
        <div className="ambulance-popup">
          <strong>{ambulance.name}</strong>
          <br />
          Status: <span className={`status-${status}`}>{status}</span>
        </div>
      </Popup>
    </Marker>
  );
};

export default AmbulanceMarker;
