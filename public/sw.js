// ChromaFall Service Worker - Network First Strategy
const CACHE_NAME = 'chromafall-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - skip waiting to activate immediately
self.addEventListener('install', (event) => {
  console.log('[SW] Installing new version...');
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up ALL old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((name) => {
            console.log('[SW] Deleting cache:', name);
            return caches.delete(name);
          })
        );
      })
      .then(() => {
        console.log('[SW] Activated, claiming clients');
        return self.clients.claim();
      })
      .then(() => {
        // Notify all clients to reload
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({ type: 'SW_UPDATED' });
          });
        });
      })
  );
});

// Fetch event - NETWORK FIRST strategy (always get fresh content)
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then((response) => {
        // Got network response, cache it for offline use
        if (response.ok) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline fallback for navigation
            if (event.request.mode === 'navigate') {
              return caches.match('/');
            }
            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Listen for skip waiting message from client
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
