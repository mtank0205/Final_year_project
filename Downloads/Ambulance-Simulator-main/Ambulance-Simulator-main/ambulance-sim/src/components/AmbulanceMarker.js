import React from 'react';
import { Marker } from '@react-google-maps/api';

const AmbulanceMarker = ({ ambulance, onClick }) => {
  const getIcon = () => {
    return {
      path: 'M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z',
      fillColor: ambulance.color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
      scale: 1.5,
      anchor: new window.google.maps.Point(12, 12),
    };
  };

  return (
    <Marker
      position={ambulance.currentPosition}
      icon={getIcon()}
      title={ambulance.name}
      onClick={onClick}
      animation={window.google.maps.Animation.DROP}
    />
  );
};

export default AmbulanceMarker;
