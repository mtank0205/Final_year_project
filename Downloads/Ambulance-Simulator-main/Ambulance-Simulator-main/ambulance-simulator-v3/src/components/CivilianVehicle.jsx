import React from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';

const CivilianVehicle = ({ vehicle, isPulledOver, stoppedAtSignal }) => {
  // Get vehicle color (default to gray if not specified)
  const vehicleColor = vehicle.color || '#7f8c8d';
  
  // Adjust appearance based on state
  let borderColor = vehicleColor;
  let opacity = 1;
  let size = 12;
  
  if (isPulledOver) {
    borderColor = '#f39c12'; // Orange border when pulled over
    opacity = 0.7;
    size = 10;
  } else if (stoppedAtSignal) {
    borderColor = '#e74c3c'; // Red border when stopped at signal
    opacity = 0.9;
  }

  // Create a simple colored dot marker
  const vehicleIcon = L.divIcon({
    className: 'civilian-dot-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${vehicleColor};
        border: 2px solid ${borderColor};
        border-radius: 50%;
        opacity: ${opacity};
        box-shadow: 0 0 4px rgba(0,0,0,0.3);
        transition: all 0.3s ease;
      "></div>
    `,
    iconSize: [size + 4, size + 4],
    iconAnchor: [(size + 4) / 2, (size + 4) / 2],
  });

  return (
    <Marker position={vehicle.position} icon={vehicleIcon}>
      <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
          {vehicle.roadName || 'Vehicle'}
          {isPulledOver && <span style={{ color: '#f39c12' }}> (Pulled Over)</span>}
          {stoppedAtSignal && <span style={{ color: '#e74c3c' }}> (At Signal)</span>}
        </div>
      </Tooltip>
    </Marker>
  );
};

export default CivilianVehicle;
