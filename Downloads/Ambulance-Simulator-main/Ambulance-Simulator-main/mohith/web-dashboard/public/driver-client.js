(function(){
  const socket = io();
  const statusEl = document.getElementById('status');
  const allowBtn = document.getElementById('allowNotif');
  const alertSound = document.getElementById('alertSound');

  function registerDriver(position) {
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    socket.emit('driver:register', { lat, lng });
    statusEl.textContent = `Registered at ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  function onError(err) {
    statusEl.textContent = 'Geolocation error: ' + (err.message || err.code);
  }

  allowBtn.addEventListener('click', ()=>{
    Notification.requestPermission().then(p => {
      if (p === 'granted') alert('Notifications enabled');
    });
  });

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((pos)=>{
      registerDriver(pos);
      // watch position and inform server
      navigator.geolocation.watchPosition((p)=>{
        socket.emit('driver:location', { lat: p.coords.latitude, lng: p.coords.longitude });
      }, onError, { enableHighAccuracy:true, maximumAge:5000 });
    }, onError);
  } else {
    statusEl.textContent = 'Geolocation not supported';
  }

  socket.on('driver:alert', (payload) => {
    const title = payload.title || 'Emergency vehicle nearby';
    const body = payload.body || 'Please give way';
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    // in-page visual
    const div = document.createElement('div');
    div.className = 'notification';
    div.textContent = `${title} — ${body}`;
    document.body.prepend(div);
    try { alertSound.play(); } catch(e) {}
  });
})();
