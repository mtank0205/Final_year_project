import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const HospitalMarker = ({ hospital }) => {
  const hospitalIcon = L.divIcon({
    className: 'hospital-marker',
    html: `
      <div class="hospital-icon">
        <span class="hospital-emoji">${hospital.emoji}</span>
        <span class="hospital-label">${hospital.name}</span>
      </div>
    `,
    iconSize: [60, 40],
    iconAnchor: [30, 40],
  });

  return (
    <Marker position={hospital.position} icon={hospitalIcon}>
      <Popup>
        <div className="hospital-popup">
          <strong>{hospital.emoji} {hospital.name}</strong>
          <br />
          Emergency Services Available
        </div>
      </Popup>
    </Marker>
  );
};

export default HospitalMarker;
