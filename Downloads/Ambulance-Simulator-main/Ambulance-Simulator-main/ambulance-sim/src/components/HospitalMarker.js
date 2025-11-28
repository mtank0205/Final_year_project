import React from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';

const HospitalMarker = ({ hospital, showInfo, onToggleInfo }) => {
  return (
    <>
      <Marker
        position={hospital.position}
        icon={{
          url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r="18" fill="#FF4444" stroke="white" stroke-width="3"/>
              <rect x="12" y="18" width="16" height="4" fill="white"/>
              <rect x="18" y="12" width="4" height="16" fill="white"/>
            </svg>
          `),
          scaledSize: new window.google.maps.Size(40, 40),
          anchor: new window.google.maps.Point(20, 20),
        }}
        title={hospital.name}
        onClick={onToggleInfo}
      />
      {showInfo && (
        <InfoWindow
          position={hospital.position}
          onCloseClick={onToggleInfo}
        >
          <div style={{ color: '#000', padding: '5px' }}>
            <h3 style={{ margin: '0 0 5px 0', fontSize: '16px' }}>🏥 {hospital.name}</h3>
            <p style={{ margin: '0', fontSize: '12px' }}>{hospital.type}</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default HospitalMarker;
