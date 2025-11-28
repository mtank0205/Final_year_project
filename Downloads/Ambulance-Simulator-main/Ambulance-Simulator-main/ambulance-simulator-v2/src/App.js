import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainDashboard from './pages/MainDashboard';
import AmbulancePOV from './pages/AmbulancePOV';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<MainDashboard />} />
          <Route path="/ambulance/:id" element={<AmbulancePOV />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
