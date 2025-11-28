import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MainDashboard from './pages/MainDashboard';
import AmbulanceBroadcaster from './components/AmbulanceBroadcaster';
import NotificationReceiver from './components/NotificationReceiver';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <nav style={{ background: '#333', padding: '15px', marginBottom: '20px' }}>
          <Link to="/" style={{ color: 'white', margin: '0 15px', textDecoration: 'none', fontWeight: 'bold' }}>
            🗺️ Simulation
          </Link>
          <Link to="/ambulance" style={{ color: 'white', margin: '0 15px', textDecoration: 'none', fontWeight: 'bold' }}>
            🚑 Ambulance Broadcaster
          </Link>
          <Link to="/receiver" style={{ color: 'white', margin: '0 15px', textDecoration: 'none', fontWeight: 'bold' }}>
            📱 Notification Receiver
          </Link>
        </nav>
        <Routes>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/ambulance" element={<AmbulanceBroadcaster />} />
          <Route path="/receiver" element={<NotificationReceiver />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
