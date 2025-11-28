import React from 'react';
import { useNavigate } from 'react-router-dom';
import CityCanvas from '../components/Canvas/CityCanvas';
import { ambulances, patients, hospitals } from '../data/mockData';
import './MainDashboard.css';

const MainDashboard = () => {
  const navigate = useNavigate();

  const handleAmbulanceClick = (ambulanceId) => {
    navigate(`/ambulance/${ambulanceId}`);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <h1>🚨 Ambulance Route Optimization System</h1>
        <div className="system-status">
          <span className="status-indicator active"></span>
          <span>System Active</span>
        </div>
      </header>

      {/* Main content */}
      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <div className="sidebar-section">
            <h2>Active Missions</h2>
            {ambulances.map((ambulance) => {
              const patient = patients.find(p => p.id === ambulance.patientId);
              const hospital = hospitals.find(h => h.id === ambulance.hospitalId);
              
              return (
                <div 
                  key={ambulance.id} 
                  className="mission-card"
                  onClick={() => handleAmbulanceClick(ambulance.id)}
                >
                  <div className="mission-header">
                    <h3>🚑 {ambulance.name}</h3>
                    <span className="mission-status active">Active</span>
                  </div>
                  <div className="mission-details">
                    <p>
                      <span className="label">Patient:</span>
                      <span className="value">{patient?.name}</span>
                    </p>
                    <p>
                      <span className="label">Urgency:</span>
                      <span className={`urgency ${patient?.urgency.toLowerCase()}`}>
                        {patient?.urgency}
                      </span>
                    </p>
                    <p>
                      <span className="label">Destination:</span>
                      <span className="value">{hospital?.name}</span>
                    </p>
                  </div>
                  <button className="view-pov-btn">
                    View POV →
                  </button>
                </div>
              );
            })}
          </div>

          <div className="sidebar-section">
            <h2>Traffic Signals</h2>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">16</div>
                <div className="stat-label">Total Signals</div>
              </div>
              <div className="stat-item">
                <div className="stat-value green">12</div>
                <div className="stat-label">Normal</div>
              </div>
              <div className="stat-item">
                <div className="stat-value yellow">2</div>
                <div className="stat-label">Emergency</div>
              </div>
              <div className="stat-item">
                <div className="stat-value red">2</div>
                <div className="stat-label">Red</div>
              </div>
            </div>
          </div>

          <div className="sidebar-section">
            <h2>System Info</h2>
            <div className="info-list">
              <p>⚡ Response Time: <strong>3.2 min avg</strong></p>
              <p>🚦 Signals Optimized: <strong>24</strong></p>
              <p>🚗 Traffic Cleared: <strong>89%</strong></p>
              <p>📊 Efficiency: <strong>+42%</strong></p>
            </div>
          </div>
        </aside>

        {/* Canvas */}
        <main className="dashboard-canvas">
          <CityCanvas onAmbulanceClick={handleAmbulanceClick} />
        </main>
      </div>
    </div>
  );
};

export default MainDashboard;
