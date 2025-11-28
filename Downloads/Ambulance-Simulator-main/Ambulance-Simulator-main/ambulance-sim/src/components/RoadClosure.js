import React from 'react';
import { Polyline, Marker } from '@react-google-maps/api';

const RoadClosure = ({ closure }) => {
  const midPoint = {
    lat: (closure.path[0].lat + closure.path[1].lat) / 2,
    lng: (closure.path[0].lng + closure.path[1].lng) / 2,
  };

  return (
    <>
      <Polyline
        path={closure.path}
        options={{
          strokeColor: '#FF6B00',
          strokeOpacity: 1,
          strokeWeight: 6,
          icons: [
            {
              icon: {
                path: 'M 0,-1 0,1',
                strokeOpacity: 1,
                scale: 4,
              },
              offset: '0',
              repeat: '20px',
            },
          ],
        }}
      />
      <Marker
        position={midPoint}
        icon={{
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: '#FF6B00',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        }}
        title={`Road Closure: ${closure.reason}`}
      />
    </>
  );
};

export default RoadClosure;
