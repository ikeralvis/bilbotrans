// Service Worker para BilboTrans
// Incrementa esta versión cada vez que hagas cambios importantes
const SW_VERSION = '3';
const CACHE_NAME = `bilbotrans-v${SW_VERSION}`;
const urlsToCache = [
  '/',
  '/manifest.json',
];

// Instalar el service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Activar el service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Escuchar mensajes del cliente
self.addEventListener('message', (event) => {
  console.log('SW: Received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('SW: SKIP_WAITING received, taking control');
    self.skipWaiting();
    
    // Notificar a todos los clientes que el control cambió
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    });
  }
});

// Estrategia: Network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // No cachear las rutas de OneSignal y evitar interferencias
  if (url.pathname.includes('OneSignal') || 
      url.pathname.includes('onesignal') ||
      url.pathname.includes('ServiceWorker') ||
      url.hostname.includes('onesignal')) {
    return;
  }

  // Para APIs, usar network-first
  if (url.pathname.startsWith('/api/') || url.pathname.includes('gtfs')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Solo cachear GET requests
          if (request.method === 'GET' && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || new Response('Offline - No cached data available', {
              status: 503,
              statusText: 'Service Unavailable',
            });
          });
        })
    );
  } else {
    // Para assets, usar cache-first
    event.respondWith(
      caches.match(request).then((response) => {
        if (response) {
          return response;
        }
        return fetch(request).then((response) => {
          // Solo cachear GET requests
          if (request.method === 'GET' && response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        });
      })
    );
  }
});

// Background sync para sincronizar favoritos
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  try {
    // Aquí sincronizaría favoritos con el servidor
    console.log('Sincronizando favoritos...');
  } catch (error) {
    console.error('Error sincronizando favoritos:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'Nuevo aviso de Metro Bilbao',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-96x96.png',
      tag: 'metro-alert',
      requireInteraction: true,
      data: {
        url: data.url || '/',
      },
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Metro Bilbao', options)
    );
  }
});

// Click en notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/')
  );
});

