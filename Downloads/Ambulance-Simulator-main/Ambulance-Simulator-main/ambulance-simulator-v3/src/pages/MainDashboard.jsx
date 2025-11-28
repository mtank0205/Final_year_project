import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import AmbulanceMarker from '../components/AmbulanceMarker';
import TrafficSignal from '../components/TrafficSignal';
import HospitalMarker from '../components/HospitalMarker';
import PatientMarker from '../components/PatientMarker';
import CivilianVehicle from '../components/CivilianVehicle';
import Sidebar from '../components/Sidebar';

import { 
  MAP_CENTER, 
  MAP_ZOOM, 
  hospitals, 
  patients, 
  ambulances
} from '../data/locations';

import { moveTowards, getDistance } from '../utils/helpers';
import { fetchAmbulanceRoutes, fetchCivilianRoutes } from '../utils/routingService';

import './MainDashboard.css';

// Component to handle map following ambulance
const MapController = ({ followAmbulance, ambulancePositions }) => {
  const map = useMap();
  
  useEffect(() => {
    if (followAmbulance && ambulancePositions[followAmbulance]) {
      map.panTo(ambulancePositions[followAmbulance], { animate: true });
    }
  }, [followAmbulance, ambulancePositions, map]);
  
  return null;
};

const MainDashboard = () => {
  // Simulation running state
  const [isSimulationRunning, setIsSimulationRunning] = useState(false);
  const [simulationKey, setSimulationKey] = useState(0);
  const [simulationMode, setSimulationMode] = useState(null); // 'smart' or 'normal'
  
  // ETA tracking for comparison
  const [startTime, setStartTime] = useState(null);
  const [completionTime, setCompletionTime] = useState(null);
  const [smartModeETA, setSmartModeETA] = useState(null);
  const [normalModeETA, setNormalModeETA] = useState(null);
  const [calculatedSmartETA, setCalculatedSmartETA] = useState(null);
  const [calculatedNormalETA, setCalculatedNormalETA] = useState(null);

  // Real road routes fetched from OSRM
  const [realRoutes, setRealRoutes] = useState({});
  const [routesLoaded, setRoutesLoaded] = useState(false);
  
  // PRE-CALCULATED signals that are on each ambulance's route
  const [signalsOnRoute, setSignalsOnRoute] = useState({});
  
  // Dynamic traffic signals at real intersections
  const [dynamicTrafficSignals, setDynamicTrafficSignals] = useState([]);

  // OSRM-routed civilian vehicles (follow actual roads)
  const [civilianRoutes, setCivilianRoutes] = useState([]);
  const [civilianWaypointIndices, setCivilianWaypointIndices] = useState({});

  // Ambulance positions and states
  const [ambulancePositions, setAmbulancePositions] = useState(() => {
    const initial = {};
    ambulances.forEach(amb => {
      const hospital = hospitals.find(h => h.id === amb.hospitalId);
      initial[amb.id] = hospital ? [...hospital.position] : [...MAP_CENTER];
    });
    return initial;
  });

  // Track current waypoint index for each ambulance
  const [waypointIndex, setWaypointIndex] = useState(() => {
    const initial = {};
    ambulances.forEach(amb => {
      initial[amb.id] = 0;
    });
    return initial;
  });

  const [ambulanceStates, setAmbulanceStates] = useState(() => {
    const initial = {};
    ambulances.forEach(amb => {
      initial[amb.id] = {
        status: 'idle', // idle, responding, transporting
        phase: 'waiting', // waiting, toPatient, toHospital, arrived
        patientPickedUp: false,
      };
    });
    return initial;
  });

  // Track which ambulance is waiting at which signal (for normal mode)
  const [waitingAtSignal, setWaitingAtSignal] = useState({});
  const waitingAtSignalRef = useRef({}); // Ref for immediate synchronous checking
  const passedSignalsRef = useRef({}); // Track which signals each ambulance has passed

  // Fetch real road routes on component mount
  useEffect(() => {
    const loadRoutes = async () => {
      addEvent('📡 Fetching real road routes from OpenStreetMap...');
      const result = await fetchAmbulanceRoutes(ambulances, hospitals, patients);
      
      setRealRoutes(result.routes);
      
      // Store pre-calculated signals that are ON each ambulance's route
      if (result.signalsOnRoute) {
        setSignalsOnRoute(result.signalsOnRoute);
        
        // Extract ONLY the unique signals that are actually on routes
        const uniqueSignalIds = new Set();
        const signalsOnRoutesOnly = [];
        Object.values(result.signalsOnRoute).forEach(routeSignals => {
          routeSignals.forEach(signal => {
            if (!uniqueSignalIds.has(signal.signalId)) {
              uniqueSignalIds.add(signal.signalId);
              signalsOnRoutesOnly.push({
                id: signal.signalId,
                name: signal.name,
                position: signal.position,
              });
            }
          });
        });
        
        // Only set signals that are actually on ambulance routes
        setDynamicTrafficSignals(signalsOnRoutesOnly);
        addEvent(`🚦 Found ${signalsOnRoutesOnly.length} traffic signals on ambulance routes`);
        
        // Log how many signals are on each route
        Object.entries(result.signalsOnRoute).forEach(([key, signals]) => {
          addEvent(`🚦 Route ${key}: ${signals.length} signals`);
        });
      } else {
        addEvent('⚠️ No traffic signals found on route');
      }
      
      // Fetch OSRM routes for civilian vehicles
      addEvent('🚗 Fetching civilian vehicle routes...');
      const civRoutes = await fetchCivilianRoutes();
      setCivilianRoutes(civRoutes);
      
      // Initialize civilian positions and waypoint indices
      const initialCivPositions = {};
      const initialCivWaypoints = {};
      civRoutes.forEach(route => {
        initialCivPositions[route.id] = {
          position: route.startPosition,
          isPulledOver: false,
          stoppedAtSignal: false,
        };
        initialCivWaypoints[route.id] = 0;
      });
      setCivilianPositions(initialCivPositions);
      setCivilianWaypointIndices(initialCivWaypoints);
      addEvent(`🚗 Loaded ${civRoutes.length} civilian vehicles on real roads`);
      
      setRoutesLoaded(true);
      addEvent('✅ All routes loaded successfully!');
    };
    
    loadRoutes();
  }, []);

  // Traffic signal states (will include dynamic signals)
  const [trafficSignalStates, setTrafficSignalStates] = useState({});
  
  // Initialize signal states when dynamic signals are loaded
  useEffect(() => {
    if (dynamicTrafficSignals.length > 0) {
      const initial = {};
      dynamicTrafficSignals.forEach(signal => {
        initial[signal.id] = {
          status: 'red',
          countdown: 0,
          lastAmbulanceNear: false,
        };
      });
      setTrafficSignalStates(initial);
    }
  }, [dynamicTrafficSignals]);

  // Civilian vehicle positions (now populated from OSRM routes)
  const [civilianPositions, setCivilianPositions] = useState({});

  // Patients picked up status
  const [patientsPickedUp, setPatientsPickedUp] = useState({});

  // Event log
  const [eventLog, setEventLog] = useState([]);

  // Which ambulance to follow (for POV)
  const [followAmbulance, setFollowAmbulance] = useState(null);

  // Add event to log
  const addEvent = useCallback((message) => {
    setEventLog(prev => [...prev, { time: new Date(), message }]);
  }, []);

  // Reset simulation function
  const resetSimulation = useCallback(() => {
    // Reset ambulance positions to hospital
    const initialPositions = {};
    ambulances.forEach(amb => {
      const hospital = hospitals.find(h => h.id === amb.hospitalId);
      initialPositions[amb.id] = hospital ? [...hospital.position] : [...MAP_CENTER];
    });
    setAmbulancePositions(initialPositions);

    // Reset waypoint indices
    const initialWaypoints = {};
    ambulances.forEach(amb => {
      initialWaypoints[amb.id] = 0;
    });
    setWaypointIndex(initialWaypoints);

    // Reset ambulance states
    const initialStates = {};
    ambulances.forEach(amb => {
      initialStates[amb.id] = {
        status: 'idle',
        phase: 'waiting',
        patientPickedUp: false,
      };
    });
    setAmbulanceStates(initialStates);

    // Reset traffic signals
    const initialSignals = {};
    dynamicTrafficSignals.forEach(signal => {
      initialSignals[signal.id] = {
        status: 'red',
        countdown: 0,
        lastAmbulanceNear: false,
      };
    });
    setTrafficSignalStates(initialSignals);

    // Reset civilian vehicles to their starting positions
    const initialCivilian = {};
    const initialCivWaypoints = {};
    civilianRoutes.forEach(route => {
      initialCivilian[route.id] = {
        position: route.startPosition,
        isPulledOver: false,
        stoppedAtSignal: false,
      };
      initialCivWaypoints[route.id] = 0;
    });
    setCivilianPositions(initialCivilian);
    setCivilianWaypointIndices(initialCivWaypoints);

    // Reset patients
    setPatientsPickedUp({});
    
    // Reset waiting at signal state
    setWaitingAtSignal({});
    waitingAtSignalRef.current = {};
    passedSignalsRef.current = {};

    // Clear event log and add start message
    setEventLog([]);
    
    setIsSimulationRunning(false);
    setSimulationKey(prev => prev + 1);
  }, [signalsOnRoute]);

  // Start simulation function with mode selection
  const startSimulation = useCallback((mode) => {
    if (isSimulationRunning) return;
    
    if (!routesLoaded) {
      addEvent('⏳ Please wait, loading road routes...');
      return;
    }
    
    setSimulationMode(mode);
    setStartTime(Date.now());
    setCompletionTime(null);
    setIsSimulationRunning(true);
    
    // Initialize passedSignalsRef for all ambulances
    passedSignalsRef.current = {};
    ambulances.forEach(amb => {
      passedSignalsRef.current[amb.id] = new Set();
    });
    
    // Calculate predicted ETA based on route and mode
    const ambulance = ambulances[0];
    const realRoute = realRoutes[ambulance.id];
    
    if (realRoute) {
      const waypointsToPatient = realRoute.waypointsToPatient || [];
      const waypointsToHospital = realRoute.waypointsToHospital || [];
      
      // Count signals on route
      const signalsToPatient = signalsOnRoute[`${ambulance.id}_toPatient`] || [];
      const signalsToHospital = signalsOnRoute[`${ambulance.id}_toHospital`] || [];
      
      // Get current time in Indian Time
      const now = new Date();
      const indianTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      
      if (mode === 'smart') {
        // Smart mode: Based on actual timing - approximately 90 seconds to patient
        const timeToPatient = 90; // 1 min 30 sec observed
        const timeToHospital = Math.round(timeToPatient * (waypointsToHospital.length / waypointsToPatient.length));
        const totalTravelSeconds = timeToPatient + timeToHospital;
        
        const arrivalTime = new Date(indianTime.getTime() + totalTravelSeconds * 1000);
        const etaString = arrivalTime.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true 
        });
        setCalculatedSmartETA(etaString);
        addEvent(`🚀 SMART MODE - Signals turn GREEN for ambulance!`);
        addEvent(`📊 Estimated Arrival: ${etaString} (~${Math.round(totalTravelSeconds/60)} mins, ${signalsToPatient.length + signalsToHospital.length} signals)`);
      } else {
        // Normal mode: Add 10 seconds per signal (5s wait + 5s green)
        const timeToPatient = 90; // Base time same as smart mode
        const timeToHospital = Math.round(timeToPatient * (waypointsToHospital.length / waypointsToPatient.length));
        const baseTravelSeconds = timeToPatient + timeToHospital;
        
        const totalSignals = signalsToPatient.length + signalsToHospital.length;
        const signalDelaySeconds = totalSignals * 10;
        const totalTravelSeconds = baseTravelSeconds + signalDelaySeconds;
        
        const arrivalTime = new Date(indianTime.getTime() + totalTravelSeconds * 1000);
        const etaString = arrivalTime.toLocaleTimeString('en-IN', { 
          hour: '2-digit', 
          minute: '2-digit',
          second: '2-digit',
          hour12: true 
        });
        setCalculatedNormalETA(etaString);
        addEvent(`🚦 NORMAL MODE - Wait at each RED signal`);
        addEvent(`📊 Estimated Arrival: ${etaString} (~${Math.round(totalTravelSeconds/60)} mins: ${Math.round(baseTravelSeconds/60)}m travel + ${Math.round(signalDelaySeconds/60)}m at ${totalSignals} signals)`);
      }
    }
    
    addEvent('🚑 Emergency simulation started!');
    
    // Start ambulances after 3 seconds
    ambulances.forEach((amb, index) => {
      const patient = patients.find(p => p.id === amb.patientId);
      const hospital = hospitals.find(h => h.id === amb.hospitalId);
      
      setTimeout(() => {
        setAmbulanceStates(prev => ({
          ...prev,
          [amb.id]: {
            ...prev[amb.id],
            status: 'responding',
            phase: 'toPatient',
          }
        }));
        addEvent(`${amb.emoji} ${amb.name} dispatched from ${hospital?.name || 'Hospital'}`);
        if (patient) {
          addEvent(`📍 Destination: ${patient.address || patient.name}`);
        }
      }, 3000 + (index * 5000));
    });
  }, [isSimulationRunning, routesLoaded, addEvent]);

  // Main simulation loop - only runs when simulation is active
  useEffect(() => {
    if (!isSimulationRunning || !routesLoaded) return;

    const interval = setInterval(() => {
      // Update ambulance positions using REAL ROAD WAYPOINTS from OSRM
      setAmbulancePositions(prevPositions => {
        const newPositions = { ...prevPositions };

        ambulances.forEach(amb => {
          const state = ambulanceStates[amb.id];
          const currentPos = prevPositions[amb.id];
          const currentWaypointIdx = waypointIndex[amb.id] || 0;
          
          if (!state || !currentPos) return;
          if (state.phase !== 'toPatient' && state.phase !== 'toHospital') return;

          // Get the REAL ROAD waypoints from OSRM
          const realRoute = realRoutes[amb.id];
          if (!realRoute) return;

          const waypoints = state.phase === 'toPatient' 
            ? realRoute.waypointsToPatient 
            : realRoute.waypointsToHospital;

          if (!waypoints || waypoints.length === 0 || currentWaypointIdx >= waypoints.length) return;

          // Get current target waypoint
          const targetWaypoint = waypoints[currentWaypointIdx];
          
          // NORMAL MODE: Check if ambulance should wait at signal
          if (simulationMode === 'normal') {
            const routeKey = state.phase === 'toPatient' 
              ? `${amb.id}_toPatient` 
              : `${amb.id}_toHospital`;
            const routeSignals = signalsOnRoute[routeKey];
            
            // Initialize passed signals tracking for this ambulance
            if (!passedSignalsRef.current[amb.id]) {
              passedSignalsRef.current[amb.id] = new Set();
            }
            
            console.log(`[Normal Mode] ${amb.id} at waypoint ${currentWaypointIdx}, checking ${routeSignals?.length || 0} signals`);
            
            if (routeSignals && routeSignals.length > 0) {
              // Find the CLOSEST signal within detection range (not by waypoint index)
              let closestSignal = null;
              let closestDistance = Infinity;
              
              for (const signal of routeSignals) {
                // Skip signals that have already been passed
                if (passedSignalsRef.current[amb.id].has(signal.signalId)) {
                  continue;
                }
                
                const signalPos = signal.position;
                const distToSignal = getDistance(currentPos, signalPos);
                
                console.log(`  Signal ${signal.signalId} at waypoint ${signal.waypointIndex}: distance=${distToSignal.toFixed(2)}m`);
                
                // Check if this signal is close and closer than any found so far
                // Threshold: 50 meters (getDistance returns meters)
                if (distToSignal < 50 && distToSignal < closestDistance) {
                  // Only consider signals ahead (waypoint index >= current)
                  if (signal.waypointIndex >= currentWaypointIdx - 5) {
                    closestSignal = signal;
                    closestDistance = distToSignal;
                    console.log(`    ✓ This is the closest signal so far!`);
                  }
                }
              }
              
              // If we found a close signal and not already waiting
              if (closestSignal && !waitingAtSignalRef.current[amb.id]) {
                console.log(`  🛑 STOPPING at signal ${closestSignal.signalId}!`);
                // Start waiting at this signal - use BOTH state and ref
                const waitInfo = {
                  signalId: closestSignal.signalId,
                  startTime: Date.now(),
                  waypointIndex: closestSignal.waypointIndex,
                };
                
                waitingAtSignalRef.current[amb.id] = waitInfo; // Immediate sync update
                setWaitingAtSignal(prev => ({
                  ...prev,
                  [amb.id]: waitInfo,
                }));
                
                const signalObj = dynamicTrafficSignals.find(s => s.id === closestSignal.signalId);
                addEvent(`⏸️ ${amb.name} waiting at ${signalObj?.name || 'Signal'} (${closestDistance.toFixed(1)}m away)`);
                
                // After 5 seconds, turn signal green and let ambulance pass
                setTimeout(() => {
                  console.log(`  🟢 Signal ${closestSignal.signalId} turning GREEN after 5s`);
                  setTrafficSignalStates(p => ({
                    ...p,
                    [closestSignal.signalId]: {
                      status: 'green',
                      countdown: 0,
                      forAmbulance: amb.id,
                    }
                  }));
                  addEvent(`🟢 ${signalObj?.name || 'Signal'} - GREEN (ambulance can pass)`);
                  
                  // Clear waiting state immediately so ambulance can move
                  console.log(`  ✅ ${amb.id} can now pass signal ${closestSignal.signalId}`);
                  delete waitingAtSignalRef.current[amb.id]; // Clear ref immediately
                  setWaitingAtSignal(prev => {
                    const newState = { ...prev };
                    delete newState[amb.id];
                    return newState;
                  });
                  
                  // Mark this signal as passed so ambulance doesn't stop again
                  if (!passedSignalsRef.current[amb.id]) {
                    passedSignalsRef.current[amb.id] = new Set();
                  }
                  passedSignalsRef.current[amb.id].add(closestSignal.signalId);
                  console.log(`  📍 Signal ${closestSignal.signalId} marked as passed`);
                  
                  // After 5 seconds (leave green longer), turn signal red again
                  setTimeout(() => {
                    setTrafficSignalStates(p => ({
                      ...p,
                      [closestSignal.signalId]: {
                        status: 'red',
                        countdown: 0,
                        forAmbulance: null,
                      }
                    }));
                    addEvent(`🔴 ${signalObj?.name || 'Signal'} - RED (ambulance passed)`);
                  }, 5000);
                }, 5000);
                
                // Don't move while waiting - return early
                return;
              }
              
              // If currently waiting (check ref for immediate sync), don't move
              if (waitingAtSignalRef.current[amb.id]) {
                const waitInfo = waitingAtSignalRef.current[amb.id];
                const waitDuration = Date.now() - waitInfo.startTime;
                
                console.log(`  ⏳ ${amb.id} waiting... ${waitDuration}ms elapsed`);
                
                // Wait for 5s until signal turns green
                if (waitDuration < 5000) {
                  return; // Stay still, don't move
                }
                // After 5 seconds, signal is green and ambulance can pass (ref already cleared)
                console.log(`  ➡️ ${amb.id} wait complete, resuming movement`);
              }
            }
          }
          
          // Move towards current waypoint
          const result = moveTowards(currentPos, targetWaypoint, amb.speed);
          newPositions[amb.id] = result.position;

          // Check if reached current waypoint
          if (result.reached) {
            const nextIdx = currentWaypointIdx + 1;
            
            if (nextIdx >= waypoints.length) {
              // Reached final waypoint (destination)
              if (state.phase === 'toPatient') {
                // Arrived at patient
                const patient = patients.find(p => p.id === amb.patientId);
                setAmbulanceStates(prev => ({
                  ...prev,
                  [amb.id]: {
                    ...prev[amb.id],
                    status: 'transporting',
                    phase: 'toHospital',
                    patientPickedUp: true,
                  }
                }));
                // Reset waypoint index for return journey
                setWaypointIndex(prev => ({ ...prev, [amb.id]: 0 }));
                setPatientsPickedUp(prev => ({ ...prev, [amb.patientId]: true }));
                addEvent(`${amb.emoji} Patient secured at ${patient?.address || 'location'}`);
                addEvent(`🏥 Returning to ${hospitals.find(h => h.id === amb.hospitalId)?.name}`);
              } else if (state.phase === 'toHospital') {
                // Arrived at hospital - Calculate ETA
                const hospital = hospitals.find(h => h.id === amb.hospitalId);
                const arrivalTime = Date.now();
                const totalTimeSeconds = Math.round((arrivalTime - startTime) / 1000);
                
                // Store ETA based on mode
                if (simulationMode === 'smart') {
                  setSmartModeETA(totalTimeSeconds);
                  addEvent(`✅ ${amb.name} - Patient delivered to ${hospital?.name}!`);
                  addEvent(`⏱️ SMART MODE ETA: ${totalTimeSeconds} seconds`);
                } else if (simulationMode === 'normal') {
                  setNormalModeETA(totalTimeSeconds);
                  addEvent(`✅ ${amb.name} - Patient delivered to ${hospital?.name}!`);
                  addEvent(`⏱️ NORMAL MODE ETA: ${totalTimeSeconds} seconds`);
                }
                
                setCompletionTime(arrivalTime);
                setIsSimulationRunning(false);
                
                setAmbulanceStates(prev => ({
                  ...prev,
                  [amb.id]: {
                    ...prev[amb.id],
                    status: 'idle',
                    phase: 'arrived',
                    patientPickedUp: false,
                  }
                }));
              }
            } else {
              // Move to next waypoint
              setWaypointIndex(prev => ({ ...prev, [amb.id]: nextIdx }));
            }
          }
        });

        return newPositions;
      });

      // Broadcast ambulance position to localStorage for Vehicle Dashboard
      ambulances.forEach(amb => {
        const state = ambulanceStates[amb.id];
        const position = ambulancePositions[amb.id];
        
        if (state && position) {
          const broadcastData = {
            position: position,
            status: state.status,
            phase: state.phase,
            timestamp: Date.now()
          };
          localStorage.setItem('ambulance-position', JSON.stringify(broadcastData));
          console.log(`[MainDashboard] Broadcasting: ${amb.id} at [${position[0].toFixed(4)}, ${position[1].toFixed(4)}], status: ${state.status}, phase: ${state.phase}`);
        }
      });

      // Update traffic signals - behavior depends on simulation mode
      setTrafficSignalStates(prev => {
        const newStates = { ...prev };

        // SMART MODE: Signals turn green for ambulance
        if (simulationMode === 'smart') {
        ambulances.forEach(amb => {
          const state = ambulanceStates[amb.id];
          if (state?.status !== 'responding' && state?.status !== 'transporting') return;
          
          const currentWaypointIdx = waypointIndex[amb.id] || 0;
          
          // Get the route key
          const routeKey = state.phase === 'toPatient' 
            ? `${amb.id}_toPatient` 
            : `${amb.id}_toHospital`;
          
          // Get signals on this route
          const routeSignals = signalsOnRoute[routeKey];
          if (!routeSignals || routeSignals.length === 0) return;
          
          // Find which signal the ambulance is currently at/approaching
          let activeSignalIndex = -1;
          
          for (let i = 0; i < routeSignals.length; i++) {
            const signal = routeSignals[i];
            
            // If ambulance hasn't reached this signal yet, this is the active one
            if (currentWaypointIdx <= signal.waypointIndex) {
              activeSignalIndex = i;
              break;
            }
          }
          
          // Turn signals green/red based on position
          routeSignals.forEach((signal, index) => {
            const signalState = prev[signal.signalId];
            if (!signalState) return;
            
            if (index === activeSignalIndex) {
              // This is the NEXT signal - turn it GREEN
              if (signalState.status !== 'green') {
                newStates[signal.signalId] = {
                  status: 'green',
                  countdown: 0,
                  forAmbulance: amb.id,
                };
                const signalObj = dynamicTrafficSignals.find(s => s.id === signal.signalId);
                addEvent(`🟢 ${signalObj?.name || 'Signal'} - GREEN for ${amb.name}`);
              }
            } else if (index < activeSignalIndex) {
              // Ambulance has PASSED this signal - turn it RED after 3 second delay
              if (signalState.status === 'green' && !signalState.turningRed) {
                newStates[signal.signalId] = {
                  ...signalState,
                  turningRed: true,
                };
                
                setTimeout(() => {
                  setTrafficSignalStates(p => ({
                    ...p,
                    [signal.signalId]: {
                      status: 'red',
                      countdown: 0,
                      forAmbulance: null,
                      turningRed: false,
                    }
                  }));
                  const signalObj = dynamicTrafficSignals.find(s => s.id === signal.signalId);
                  addEvent(`🔴 ${signalObj?.name || 'Signal'} - RED (ambulance passed)`);
                }, 3000);
              }
            } else {
              // Future signals - keep them RED
              if (signalState.status !== 'red') {
                newStates[signal.signalId] = {
                  status: 'red',
                  countdown: 0,
                  forAmbulance: null,
                };
              }
            }
          });
        });
        }
        
        // NORMAL MODE: Signal control is handled in the ambulance movement logic above
        // (signals turn green after 5s wait, then red after passage)
        // No global override needed here

        return newStates;
      });

      // Update civilian vehicles - follow OSRM waypoints, stop at signals, pull over for ambulance
      setCivilianPositions(prev => {
        const newPositions = { ...prev };

        civilianRoutes.forEach(vehicle => {
          const currentState = prev[vehicle.id];
          if (!currentState) return;

          const currentWaypointIdx = civilianWaypointIndices[vehicle.id] || 0;
          const waypoints = vehicle.waypoints;
          
          if (!waypoints || waypoints.length === 0) return;

          // Check if any ambulance is nearby
          let shouldPullOver = false;
          
          ambulances.forEach(amb => {
            const state = ambulanceStates[amb.id];
            if (state?.status === 'responding' || state?.status === 'transporting') {
              const ambPos = ambulancePositions[amb.id];
              if (ambPos) {
                const dist = getDistance(currentState.position, ambPos);
                
                // Pull over if ambulance is within 120m and approaching
                if (dist < 120) {
                  shouldPullOver = true;
                }
              }
            }
          });

          // Check if near a red signal
          let stoppedAtSignal = false;
          
          dynamicTrafficSignals.forEach(signal => {
            const signalState = trafficSignalStates[signal.id];
            const distToSignal = getDistance(currentState.position, signal.position);
            
            // Stop at red signal if within 30m
            if (signalState?.status === 'red' && distToSignal < 30) {
              stoppedAtSignal = true;
            }
          });

          if (shouldPullOver) {
            // PULL OVER - move slightly off the road
            // Small offset to side of road
            const pulledPosition = [
              currentState.position[0] + 0.0004,
              currentState.position[1] + 0.0004
            ];
            
            newPositions[vehicle.id] = {
              position: pulledPosition,
              isPulledOver: true,
              stoppedAtSignal: false,
            };
          } else if (stoppedAtSignal) {
            // Stop at red signal
            newPositions[vehicle.id] = {
              position: currentState.position,
              isPulledOver: false,
              stoppedAtSignal: true,
            };
          } else {
            // Move along OSRM waypoints
            const targetWaypoint = waypoints[currentWaypointIdx];
            const result = moveTowards(currentState.position, targetWaypoint, vehicle.speed);
            
            newPositions[vehicle.id] = {
              position: result.position,
              isPulledOver: false,
              stoppedAtSignal: false,
            };

            // Check if reached current waypoint
            if (result.reached) {
              const nextIdx = currentWaypointIdx + 1;
              
              if (nextIdx >= waypoints.length) {
                // Reached end - loop back to start
                setCivilianWaypointIndices(prev => ({ ...prev, [vehicle.id]: 0 }));
                newPositions[vehicle.id] = {
                  position: waypoints[0],
                  isPulledOver: false,
                  stoppedAtSignal: false,
                };
              } else {
                // Move to next waypoint
                setCivilianWaypointIndices(prev => ({ ...prev, [vehicle.id]: nextIdx }));
              }
            }
          }
        });

        return newPositions;
      });

    }, 200); // Update rate slowed down for better visibility

    return () => clearInterval(interval);
  }, [isSimulationRunning, routesLoaded, ambulanceStates, ambulancePositions, trafficSignalStates, waypointIndex, realRoutes, dynamicTrafficSignals, civilianRoutes, civilianWaypointIndices, signalsOnRoute, addEvent]);

  // Countdown timer
  useEffect(() => {
    if (!isSimulationRunning) return;

    const interval = setInterval(() => {
      setTrafficSignalStates(prev => {
        const newStates = { ...prev };
        Object.keys(newStates).forEach(id => {
          if (newStates[id].countdown > 0) {
            newStates[id] = {
              ...newStates[id],
              countdown: newStates[id].countdown - 1,
            };
          }
        });
        return newStates;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulationRunning]);

  // Generate route polylines - shows the REAL ROAD PATH from OSRM
  const getRoutePolyline = (ambulanceId) => {
    const amb = ambulances.find(a => a.id === ambulanceId);
    const state = ambulanceStates[ambulanceId];
    const currentPos = ambulancePositions[ambulanceId];
    const currentWaypointIdx = waypointIndex[ambulanceId] || 0;
    
    if (!amb || !state || !currentPos || !routesLoaded) return null;
    if (state.phase !== 'toPatient' && state.phase !== 'toHospital') return null;

    // Get the REAL ROAD waypoints from OSRM
    const realRoute = realRoutes[ambulanceId];
    if (!realRoute) return null;

    const waypoints = state.phase === 'toPatient' 
      ? realRoute.waypointsToPatient 
      : realRoute.waypointsToHospital;

    if (!waypoints || waypoints.length === 0) return null;

    // Return remaining waypoints from current position
    const remainingPath = [currentPos, ...waypoints.slice(currentWaypointIdx)];
    return remainingPath;
  };

  return (
    <div className="dashboard-container">
      <Sidebar 
        ambulances={ambulances}
        ambulanceStates={ambulanceStates}
        trafficSignalStates={trafficSignalStates}
        eventLog={eventLog}
        onAmbulanceClick={(id) => setFollowAmbulance(id)}
        isSimulationRunning={isSimulationRunning}
        onStartSimulation={startSimulation}
        onResetSimulation={resetSimulation}
        routesLoaded={routesLoaded}
        simulationMode={simulationMode}
        smartModeETA={smartModeETA}
        normalModeETA={normalModeETA}
        calculatedSmartETA={calculatedSmartETA}
        calculatedNormalETA={calculatedNormalETA}
      />
      
      <div className="map-container">
        <MapContainer 
          key={simulationKey}
          center={MAP_CENTER} 
          zoom={MAP_ZOOM} 
          style={{ height: '100%', width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapController 
            followAmbulance={followAmbulance} 
            ambulancePositions={ambulancePositions} 
          />

          {/* Route polylines */}
          {ambulances.map(amb => {
            const route = getRoutePolyline(amb.id);
            if (!route) return null;
            return (
              <Polyline 
                key={`route-${amb.id}`}
                positions={route}
                color={amb.color}
                weight={5}
                opacity={0.8}
                dashArray="15, 10"
              />
            );
          })}

          {/* Hospitals */}
          {hospitals.map(hospital => (
            <HospitalMarker key={hospital.id} hospital={hospital} />
          ))}

          {/* Patients */}
          {patients.map(patient => (
            <PatientMarker 
              key={patient.id} 
              patient={patient} 
              isPickedUp={patientsPickedUp[patient.id]}
            />
          ))}

          {/* Traffic Signals - At Real Intersections */}
          {dynamicTrafficSignals.map(signal => (
            <TrafficSignal 
              key={signal.id} 
              signal={signal}
              status={trafficSignalStates[signal.id]?.status || 'red'}
              countdown={trafficSignalStates[signal.id]?.countdown || 0}
            />
          ))}

          {/* Civilian Vehicles - Colored dots following pre-defined routes */}
          {civilianRoutes.map(vehicle => (
            <CivilianVehicle 
              key={vehicle.id}
              vehicle={{
                id: vehicle.id,
                color: vehicle.color,
                position: civilianPositions[vehicle.id]?.position || vehicle.startPosition,
                roadName: vehicle.roadName,
              }}
              isPulledOver={civilianPositions[vehicle.id]?.isPulledOver}
              stoppedAtSignal={civilianPositions[vehicle.id]?.stoppedAtSignal}
            />
          ))}

          {/* Static Vehicle - Near Signal on Ambulance Route (for notification demo) */}
          <Marker 
            position={[12.9345, 77.6248]}
            icon={L.divIcon({
              className: 'static-vehicle-marker',
              html: `
                <div style="
                  width: 32px;
                  height: 32px;
                  background-color: #9b59b6;
                  border: 4px solid #8e44ad;
                  border-radius: 50%;
                  box-shadow: 0 0 20px rgba(155, 89, 182, 0.8);
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  font-size: 18px;
                  animation: pulse-vehicle 2s infinite;
                ">🚗</div>
                <style>
                  @keyframes pulse-vehicle {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.2); }
                  }
                </style>
              `,
              iconSize: [32, 32],
              iconAnchor: [16, 16],
            })}
          >
            <Tooltip direction="top" offset={[0, -20]} opacity={0.95} permanent>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#9b59b6' }}>
                🚗 Static Vehicle<br/>
                On Ambulance Route
              </div>
            </Tooltip>
          </Marker>

          {/* Ambulances */}
          {ambulances.map(amb => (
            <AmbulanceMarker 
              key={amb.id}
              ambulance={amb}
              position={ambulancePositions[amb.id]}
              status={ambulanceStates[amb.id]?.status || 'idle'}
              onClick={(id) => setFollowAmbulance(id)}
            />
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default MainDashboard;
