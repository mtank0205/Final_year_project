import React from 'react';
import { Marker, InfoWindow } from '@react-google-maps/api';

const TrafficSignal = ({ signal }) => {
  const getIcon = () => {
    // Yellow during countdown before turning green
    const color = signal.status === 'green' ? '#00FF00' : 
                  signal.status === 'yellow' ? '#FFFF00' : 
                  '#FF0000';
    
    return {
      path: window.google.maps.SymbolPath.CIRCLE,
      scale: 8,
      fillColor: color,
      fillOpacity: 1,
      strokeColor: '#FFFFFF',
      strokeWeight: 2,
    };
  };

  return (
    <>
      <Marker
        position={signal.position}
        icon={getIcon()}
        title={`Signal ${signal.id} - ${signal.status}`}
      />
      {signal.countdown > 0 && (
        <InfoWindow
          position={signal.position}
          options={{ 
            pixelOffset: new window.google.maps.Size(0, -20),
            disableAutoPan: true
          }}
        >
          <div style={{ 
            background: '#fff', 
            padding: '5px 10px', 
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: signal.status === 'yellow' ? '#FF6B00' : '#00AA00'
          }}>
            {signal.status === 'yellow' ? '🟡 Turning Green: ' : '🟢 Returning Red: '}
            {signal.countdown}s
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export default TrafficSignal;

