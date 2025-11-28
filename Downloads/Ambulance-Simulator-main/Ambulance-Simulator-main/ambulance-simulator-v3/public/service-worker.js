// Service Worker for PWA notifications
self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, icon } = event.data;
    
    self.registration.showNotification(title, {
      body: body,
      icon: icon || '/ambulance-icon.png',
      badge: '/ambulance-icon.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: 'ambulance-alert',
      requireInteraction: true,
      actions: [
        { action: 'view', title: 'View' },
        { action: 'close', title: 'Close' }
      ]
    });
  }
});
