import React from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';

const PatientMarker = ({ patient, showInfo, onToggleInfo }) => {
  const getColor = () => {
    switch (patient.status) {
      case 'Critical':
        return '#FF0000';
      case 'Urgent':
        return '#FF6B00';
      case 'Stable':
        return '#FFD700';
      default:
        return '#00FF00';
    }
  };

  return (
    <>
      <Marker
        position={patient.position}
        icon={{
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="${getColor()}" stroke="white" stroke-width="3"/>
              <path d="M20 8 L20 18 M20 22 L20 32 M14 20 L26 20" stroke="white" stroke-width="3" fill="none"/>
              <circle cx="20" cy="10" r="3" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        }}
        title={patient.name}
        onClick={onToggleInfo}
        animation={window.google.maps.Animation.BOUNCE}
      />
      {showInfo && (
        <InfoWindow
          position={patient.position}
          onCloseClick={onToggleInfo}
        >
          <div style={{ color: '#000', padding: '5px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>🚨 {patient.name}</h3>
            <p style={{ margin: '0 0 3px 0', fontSize: '12px' }}>
              Status: <strong style={{ color: getColor() }}>{patient.status}</strong>
            </p>
            <p style={{ margin: '0', fontSize: '12px' }}>
              Ambulance: {patient.assignedAmbulance}
            </p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default PatientMarker;
