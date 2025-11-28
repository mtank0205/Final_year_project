import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import CityCanvas from '../components/Canvas/CityCanvas';
import { ambulances, patients, hospitals } from '../data/mockData';
import './AmbulancePOV.css';

const AmbulancePOV = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const ambulanceId = parseInt(id);
  
  const ambulance = ambulances.find(a => a.id === ambulanceId);
  const patient = patients.find(p => p.id === ambulance?.patientId);
  const hospital = hospitals.find(h => h.id === ambulance?.hospitalId);

  if (!ambulance) {
    return <div>Ambulance not found</div>;
  }

  return (
    <div className="pov-container">
      {/* Header */}
      <header className="pov-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          ← Back to Dashboard
        </button>
        <h1>🚑 {ambulance.name} - Point of View</h1>
        <div className="emergency-badge">
          🚨 EMERGENCY MODE
        </div>
      </header>

      {/* Main content */}
      <div className="pov-content">
        {/* Left Panel - Mission Info */}
        <aside className="pov-sidebar left">
          <div className="info-panel">
            <h2>Mission Details</h2>
            <div className="info-row">
              <span className="info-label">Patient:</span>
              <span className="info-value">{patient?.name}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Status:</span>
              <span className={`urgency-badge ${patient?.urgency.toLowerCase()}`}>
                {patient?.urgency}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Destination:</span>
              <span className="info-value">{hospital?.name}</span>
            </div>
          </div>

          <div className="info-panel">
            <h2>Route Info</h2>
            <div className="route-progress">
              <div className="progress-step active">
                <div className="step-icon">📍</div>
                <div className="step-text">En Route to Patient</div>
              </div>
              <div className="progress-step">
                <div className="step-icon">🏥</div>
                <div className="step-text">To Hospital</div>
              </div>
              <div className="progress-step">
                <div className="step-icon">🏁</div>
                <div className="step-text">Return to Station</div>
              </div>
            </div>
          </div>

          <div className="info-panel">
            <h2>Upcoming Signals</h2>
            <div className="signal-list">
              <div className="signal-item">
                <div className="signal-dot green"></div>
                <span>Intersection 2 - GREEN</span>
              </div>
              <div className="signal-item">
                <div className="signal-dot yellow"></div>
                <span>Intersection 3 - CHANGING</span>
              </div>
              <div className="signal-item">
                <div className="signal-dot red"></div>
                <span>Intersection 6 - RED</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Center - Canvas */}
        <main className="pov-canvas">
          <div className="canvas-wrapper">
            <CityCanvas onAmbulanceClick={() => {}} />
            
            {/* Overlay HUD */}
            <div className="pov-hud">
              <div className="hud-top">
                <div className="speed-indicator">
                  <div className="speed-value">45</div>
                  <div className="speed-label">km/h</div>
                </div>
                <div className="eta-display">
                  <div className="eta-label">ETA</div>
                  <div className="eta-value">2:34</div>
                </div>
              </div>
              
              <div className="hud-bottom">
                <div className="next-signal">
                  <span>Next Signal:</span>
                  <span className="signal-distance">150m</span>
                  <div className="signal-status yellow">CHANGING</div>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Right Panel - Stats */}
        <aside className="pov-sidebar right">
          <div className="info-panel">
            <h2>Performance</h2>
            <div className="stat-bar">
              <div className="stat-label">Speed</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '75%', background: '#00ff00' }}></div>
              </div>
              <div className="stat-value">45 km/h</div>
            </div>
            <div className="stat-bar">
              <div className="stat-label">Efficiency</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '92%', background: '#00ff00' }}></div>
              </div>
              <div className="stat-value">92%</div>
            </div>
            <div className="stat-bar">
              <div className="stat-label">Time Saved</div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '68%', background: '#ffff00' }}></div>
              </div>
              <div className="stat-value">2.3 min</div>
            </div>
          </div>

          <div className="info-panel">
            <h2>Traffic Cleared</h2>
            <div className="cleared-count">
              <div className="cleared-number">8</div>
              <div className="cleared-label">Signals Optimized</div>
            </div>
          </div>

          <div className="info-panel">
            <h2>System Status</h2>
            <div className="status-list">
              <div className="status-item success">
                <span>✓</span>
                <span>GPS Active</span>
              </div>
              <div className="status-item success">
                <span>✓</span>
                <span>Traffic Sync</span>
              </div>
              <div className="status-item success">
                <span>✓</span>
                <span>Route Optimized</span>
              </div>
              <div className="status-item success">
                <span>✓</span>
                <span>Siren Active</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AmbulancePOV;
