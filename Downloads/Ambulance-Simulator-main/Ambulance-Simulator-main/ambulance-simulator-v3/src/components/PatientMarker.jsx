import React from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';

const PatientMarker = ({ patient, isPickedUp }) => {
  const patientIcon = L.divIcon({
    className: 'patient-marker',
    html: `
      <div class="patient-icon ${isPickedUp ? 'picked-up' : ''} ${patient.status === 'Critical' ? 'critical' : 'stable'}">
        <span class="patient-emoji">${isPickedUp ? '✅' : patient.emoji}</span>
        ${!isPickedUp ? `<span class="pulse-ring"></span>` : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  return (
    <Marker position={patient.position} icon={patientIcon}>
      <Popup>
        <div className="patient-popup">
          <strong>{patient.name}</strong>
          <br />
          Status: <span className={patient.status === 'Critical' ? 'critical' : 'stable'}>
            {patient.status}
          </span>
          <br />
          {isPickedUp ? '✅ Picked up' : '⏳ Waiting for ambulance'}
        </div>
      </Popup>
    </Marker>
  );
};

export default PatientMarker;
