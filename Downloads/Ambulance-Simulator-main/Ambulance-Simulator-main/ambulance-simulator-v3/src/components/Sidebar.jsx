import React from 'react';
import { formatTime } from '../utils/helpers';
import { trafficSignals } from '../data/locations';
import './Sidebar.css';

const Sidebar = ({ 
  ambulances, 
  ambulanceStates, 
  trafficSignalStates, 
  eventLog,
  onAmbulanceClick,
  isSimulationRunning,
  onStartSimulation,
  onResetSimulation,
  routesLoaded = true,
  simulationMode,
  smartModeETA,
  normalModeETA,
  calculatedSmartETA,
  calculatedNormalETA
}) => {
  return (
    <div className="sidebar">
      <h1 className="sidebar-title">🚑 Emergency Control</h1>
      <p className="sidebar-subtitle">Real Roads - Koramangala</p>

      {/* Control Buttons */}
      <div className="section control-buttons">
        <h3 style={{marginBottom: '10px', color: '#333'}}>Select Simulation Mode:</h3>
        <button 
          className={`control-btn smart-btn ${(isSimulationRunning || !routesLoaded) ? 'disabled' : ''}`}
          onClick={() => onStartSimulation('smart')}
          disabled={isSimulationRunning || !routesLoaded}
          style={{backgroundColor: '#4caf50', marginBottom: '10px'}}
        >
          {!routesLoaded ? '⏳ Loading...' : '🚀 SMART MODE (Signals Turn Green)'}
        </button>
        <button 
          className={`control-btn normal-btn ${(isSimulationRunning || !routesLoaded) ? 'disabled' : ''}`}
          onClick={() => onStartSimulation('normal')}
          disabled={isSimulationRunning || !routesLoaded}
          style={{backgroundColor: '#ff9800', marginBottom: '10px'}}
        >
          {!routesLoaded ? '⏳ Loading...' : '🚦 NORMAL MODE (Wait at Signals)'}
        </button>
        <button 
          className="control-btn reset-btn"
          onClick={onResetSimulation}
        >
          🔄 Reset Simulation
        </button>
      </div>
      
      {/* ETA Comparison */}
      {(smartModeETA || normalModeETA || calculatedSmartETA || calculatedNormalETA) && (
        <div className="section eta-comparison">
          <h2>⏱️ ETA Comparison</h2>
          
          {/* Calculated/Predicted ETAs */}
          {(calculatedSmartETA || calculatedNormalETA) && (
            <div className="eta-section">
              <h3 style={{fontSize: '0.9rem', color: '#aaa', marginBottom: '10px'}}>📊 Estimated Arrival Time:</h3>
              {calculatedSmartETA && (
                <div className="eta-item smart">
                  <span className="eta-label">🚀 Smart Mode:</span>
                  <span className="eta-value">{calculatedSmartETA}</span>
                </div>
              )}
              {calculatedNormalETA && (
                <div className="eta-item normal">
                  <span className="eta-label">🚦 Normal Mode:</span>
                  <span className="eta-value">{calculatedNormalETA}</span>
                </div>
              )}
            </div>
          )}
          
          {/* Actual ETAs after completion */}
          {(smartModeETA || normalModeETA) && (
            <div className="eta-section" style={{marginTop: '15px'}}>
              <h3 style={{fontSize: '0.9rem', color: '#aaa', marginBottom: '10px'}}>✅ Actual ETA:</h3>
              {smartModeETA && (
                <div className="eta-item smart">
                  <span className="eta-label">🚀 Smart Mode (Actual):</span>
                  <span className="eta-value">{smartModeETA}s</span>
                </div>
              )}
              {normalModeETA && (
                <div className="eta-item normal">
                  <span className="eta-label">🚦 Normal Mode (Actual):</span>
                  <span className="eta-value">{normalModeETA}s</span>
                </div>
              )}
            </div>
          )}
          
          {smartModeETA && normalModeETA && (
            <div className="eta-savings">
              <strong>⚡ Time Saved: {normalModeETA - smartModeETA} seconds</strong>
              <p>✅ Smart signals save lives!</p>
            </div>
          )}
        </div>
      )}

      {/* Ambulance Status */}
      <div className="section">
        <h2>Active Ambulances</h2>
        {ambulances.map((ambulance) => {
          const state = ambulanceStates[ambulance.id] || {};
          return (
            <div 
              key={ambulance.id} 
              className="ambulance-card"
              style={{ borderLeft: `4px solid ${ambulance.color}` }}
              onClick={() => onAmbulanceClick && onAmbulanceClick(ambulance.id)}
            >
              <div className="ambulance-header">
                <span className="ambulance-name">{ambulance.emoji} {ambulance.name}</span>
                <span className={`status-badge ${state.status || 'idle'}`}>
                  {state.status || 'idle'}
                </span>
              </div>
              <div className="ambulance-details">
                {state.status === 'responding' && (
                  <p>🚨 En route to patient</p>
                )}
                {state.status === 'transporting' && (
                  <p>🏥 Returning to hospital</p>
                )}
                {state.status === 'idle' && state.phase === 'arrived' && (
                  <p>✅ Mission complete!</p>
                )}
                {state.status === 'idle' && state.phase !== 'arrived' && (
                  <p>⏳ Standing by at hospital</p>
                )}
              </div>
              <button className="pov-button">Track Ambulance →</button>
            </div>
          );
        })}
      </div>

      {/* Event Log */}
      <div className="section">
        <h2>Event Log</h2>
        <div className="event-log">
          {eventLog.slice(-10).reverse().map((event, index) => (
            <div key={index} className="event-item">
              <span className="event-time">{formatTime(event.time)}</span>
              <span className="event-message">{event.message}</span>
            </div>
          ))}
          {eventLog.length === 0 && (
            <div className="event-item">
              <span className="event-message">Ready to start simulation...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
