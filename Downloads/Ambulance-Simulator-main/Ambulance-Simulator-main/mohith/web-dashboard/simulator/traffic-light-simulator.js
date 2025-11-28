// Traffic Light Simulator - socket-driven controllers with safe preemption
const io = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';

// Load traffic lights configuration (intersections with signals)
const intersections = require('../../config/traffic-lights.json');

// State for each intersection and their signals
const intersectionStates = {};

// Timing (ms) - Realistic timings for demo
const NORMAL_GREEN = 15000;  // 15 seconds
const NORMAL_YELLOW = 3000;  // 3 seconds
const NORMAL_RED = 15000;    // 15 seconds
const ENDING_YELLOW = 4000;  // 4 seconds
const ALL_RED_CLEAR = 2000;  // 2 seconds

// Initialize states
intersections.forEach((intsec, idx) => {
  intersectionStates[intsec.id] = {
    id: intsec.id,
    name: intsec.name,
    signals: intsec.signals.map((s, i) => ({ 
      id: s.id, 
      direction: s.direction, 
      state: i === 0 ? 'green' : 'red' // First signal green, rest red
    })),
    mode: 'normal', // normal | emergency | endingEmergency
    activeDirection: null,
    cycleIndex: 0,
    lastCycleTs: Date.now(),
    timers: []
  };
});

// Connect socket to server
const socket = io(SERVER_URL);

socket.on('connect', () => {
  console.log('🔌 Traffic simulator connected to server', socket.id);
  // Register each individual signal so server can send direct messages if needed
  intersections.forEach(intsec => {
    intsec.signals.forEach(sig => {
      socket.emit('traffic:register', { id: sig.id });
    });
  });
  
  // Broadcast initial state for all intersections
  setTimeout(() => {
    Object.values(intersectionStates).forEach(st => {
      broadcastIntersectionState(st);
    });
    console.log('📡 Broadcasted initial traffic light states');
  }, 1000);
});

// Handle direct per-signal emergency messages (if server sends to a specific socket)
socket.on('traffic:emergency', (payload) => {
  // payload may contain { ambulance, distance, color }
  // We don't have the signal id here, but server may send to this socket specifically
  // If server targets this simulator's socket for a particular signal, find which signal(s) were registered
  // For safety, set any signal that is currently red to green for this socket's registration (best-effort)
  console.log('📨 Received traffic:emergency payload on socket', payload && payload.ambulance ? payload.ambulance.id : '');
});

socket.on('traffic:normal', (payload) => {
  console.log('📨 Received traffic:normal payload on socket', payload);
});

// Handle intersection-level emergency activation
socket.on('intersection:update', (data) => {
  // data: { intersectionId, activeDirection, ambulanceId }
  const st = intersectionStates[data.intersectionId];
  if (!st) return;

  // Clear any existing timers
  st.timers.forEach(t => clearTimeout(t));
  st.timers = [];

  st.mode = 'emergency';
  st.activeDirection = data.activeDirection;
  st.lastCycleTs = Date.now();

  // Set signal states: activeDirection -> green, others -> red
  st.signals.forEach(sig => {
    const isAmb = sig.direction.charAt(0) === data.activeDirection;
    sig.state = isAmb ? 'green' : 'red';
  });

  console.log(`🚨 ${st.id} - EMERGENCY: ${data.activeDirection} for ${data.ambulanceId}`);
});

// Handle intersection back to normal (start safe fallback sequence)
socket.on('intersection:normal', (data) => {
  const st = intersectionStates[data.intersectionId];
  if (!st) return;

  if (st.mode !== 'emergency') return; // nothing to do

  st.mode = 'endingEmergency';
  console.log(`🟡 ${st.id} - Ending emergency, starting safe transition`);

  // Find ambulance signal (the one that is currently green)
  const ambSignal = st.signals.find(s => s.state === 'green');

  if (!ambSignal) {
    // No green found, fallback to resume normal
    st.mode = 'normal';
    st.lastCycleTs = Date.now();
    return;
  }

  // 1) Keep green briefly for ambulance to clear (small grace), then yellow
  const graceMs = 1000; // small grace for immediate passage
  const t1 = setTimeout(() => {
    ambSignal.state = 'yellow';
    console.log(`🟡 ${st.id} - ${ambSignal.id} → YELLOW (clearing)`);
    broadcastIntersectionState(st);
  }, graceMs);
  st.timers.push(t1);

  // 2) After yellow, set ambSignal to red and set ALL to red for clearing
  const t2 = setTimeout(() => {
    ambSignal.state = 'red';
    st.signals.forEach(s => { if (s.id !== ambSignal.id) s.state = 'red'; });
    console.log(`🔴 ${st.id} - ${ambSignal.id} → RED; ALL RED clear`);
    broadcastIntersectionState(st);
  }, graceMs + ENDING_YELLOW);
  st.timers.push(t2);

  // 3) After all-red clear period, resume normal cycling
  const t3 = setTimeout(() => {
    st.mode = 'normal';
    st.activeDirection = null;
    st.lastCycleTs = Date.now();
    // Start with first signal green
    st.cycleIndex = 0;
    st.signals.forEach((s, idx) => s.state = (idx === st.cycleIndex) ? 'green' : 'red');
    console.log(`✅ ${st.id} - Resuming normal cycle`);
    broadcastIntersectionState(st);
  }, graceMs + ENDING_YELLOW + ALL_RED_CLEAR);
  st.timers.push(t3);
});

// Basic normal cycling per intersection
function runNormalCycle(st) {
  const now = Date.now();
  const elapsed = now - st.lastCycleTs;

  // If current green has timed out, move to yellow -> red -> next green
  const current = st.signals[st.cycleIndex];
  if (!current) return;

  if (current.state === 'green' && elapsed >= NORMAL_GREEN) {
    current.state = 'yellow';
    st.lastCycleTs = now;
    console.log(`${st.id} - ${current.id} → YELLOW (normal)`);
    broadcastIntersectionState(st);
  } else if (current.state === 'yellow' && elapsed >= NORMAL_YELLOW) {
    // move to red and next becomes green
    current.state = 'red';
    st.cycleIndex = (st.cycleIndex + 1) % st.signals.length;
    const next = st.signals[st.cycleIndex];
    next.state = 'green';
    st.lastCycleTs = now;
    console.log(`${st.id} - ${current.id} → RED; ${next.id} → GREEN (normal)`);
    broadcastIntersectionState(st);
  }
}

// Broadcast intersection state to all clients
function broadcastIntersectionState(st) {
  socket.emit('trafficLightUpdate', {
    intersectionId: st.id,
    name: st.name,
    signals: st.signals.map(s => ({
      id: s.id,
      direction: s.direction,
      state: s.state
    }))
  });
}

// Simulation loop
setInterval(() => {
  Object.values(intersectionStates).forEach(st => {
    if (st.mode === 'normal') {
      runNormalCycle(st);
    }
    // emergency and endingEmergency are event-driven and use timers
  });
}, 1000);

// Initial log
console.log('🚦 Traffic Light Simulator Started (socket-driven)');
console.log(`   Monitoring ${intersections.length} intersections`);
intersections.forEach(i => console.log(`   - ${i.id}: ${i.name}`));
