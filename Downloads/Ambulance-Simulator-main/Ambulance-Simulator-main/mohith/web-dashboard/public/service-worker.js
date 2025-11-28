const CACHE_NAME = 'ambulance-alert-v1';
const urlsToCache = [
  '/auto-receiver.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

// Install event - cache resources (with error handling)
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        // Cache each file individually to avoid 404 blocking installation
        return Promise.allSettled(
          urlsToCache.map(url => 
            cache.add(url).catch(err => {
              console.warn(`[Service Worker] Failed to cache ${url}:`, err);
            })
          )
        );
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
      })
      .catch(err => {
        console.error('[Service Worker] Installation failed:', err);
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, return offline page
        return caches.match('/auto-receiver.html');
      })
  );
});

// Push notification event - receives alerts even when app is closed
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let data = {
    title: '🚨 EMERGENCY AMBULANCE!',
    body: 'An ambulance is approaching. Give way immediately!',
    icon: '/icon-192.svg',
    badge: '/icon-192.svg',
    vibrate: [300, 100, 300, 100, 300],
    tag: 'ambulance-alert',
    requireInteraction: true
  };

  // Parse push data if available
  if (event.data) {
    try {
      const pushData = event.data.json();
      data.title = `🚨 Ambulance ${pushData.id || 'Nearby'}`;
      data.body = `${pushData.distance || '500'}m away - Give way immediately!`;
      data.data = pushData; // Store ambulance data
    } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: data.vibrate,
      tag: data.tag,
      requireInteraction: data.requireInteraction,
      data: data.data
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();

  // Default action - open app
  event.waitUntil(
    clients.openWindow('/auto-receiver.html')
  );
});

// Background sync - handle offline alerts
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-ambulance-alerts') {
    event.waitUntil(
      // Sync any missed alerts when back online
      fetch('/api/missed-alerts')
        .then(response => response.json())
        .then(alerts => {
          alerts.forEach(alert => {
            self.registration.showNotification('🚨 Missed Alert', {
              body: `Ambulance ${alert.id} was nearby at ${alert.time}`,
              tag: 'missed-alert-' + alert.id,
              icon: '/icon-192.svg'
            });
          });
        })
        .catch(err => console.error('[Service Worker] Sync failed:', err))
    );
  }
});

// Message event - communication with main app
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
  if (event.data.type === 'AMBULANCE_ALERT') {
    // Show notification immediately
    const ambulanceData = event.data.payload;
    self.registration.showNotification(`🚨 Ambulance ${ambulanceData.id}`, {
      body: `${ambulanceData.distance || '500'}m away - Speed: ${ambulanceData.speed || '---'} km/h`,
      icon: '/icon-192.svg',
      vibrate: [300, 100, 300, 100, 300],
      tag: 'ambulance-' + ambulanceData.id,
      requireInteraction: true,
      data: ambulanceData
    });
  }
});

// Periodic background sync (Chrome 80+)
self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] Periodic sync:', event.tag);
  
  if (event.tag === 'check-ambulances') {
    event.waitUntil(
      // Check for nearby ambulances periodically
      fetch('/api/check-nearby-ambulances')
        .then(response => response.json())
        .then(data => {
          if (data.ambulances && data.ambulances.length > 0) {
            data.ambulances.forEach(ambulance => {
              self.registration.showNotification('🚨 Ambulance Detected', {
                body: `${ambulance.id} is ${ambulance.distance}m away`,
                tag: 'periodic-check-' + ambulance.id,
                icon: '/icon-192.svg'
              });
            });
          }
        })
        .catch(err => console.error('[Service Worker] Periodic check failed:', err))
    );
  }
});
