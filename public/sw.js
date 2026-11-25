// Service Worker para BilboTrans
// Incrementa esta versión cada vez que hagas cambios importantes
const SW_VERSION = '6';
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
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    
    // Notificar a todos los clientes que el control cambió
    self.clients.matchAll().then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: 'SW_UPDATED' });
      });
    });
  }
});

// Estrategias:
// - Tiempo real (/api/*): solo red, nunca caché (un dato viejo parecería "en vivo").
// - Navegación (HTML): red primero, caché como respaldo offline (evita servir un shell obsoleto).
// - /_next/static (con hash) e iconos: caché primero (inmutables).
// - /_next/image (fotos de estación): stale-while-revalidate.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // En desarrollo los chunks no llevan hash: cachearlos serviría código viejo
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') return;

  // Ignorar peticiones de otros orígenes
  if (url.origin !== location.origin) return;

  // No interferir con OneSignal
  if (/onesignal|ServiceWorker/i.test(url.pathname)) return;

  if (url.pathname.startsWith('/api/') || url.pathname.includes('gtfs')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/')))
    );
    return;
  }

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
      })
    );
    return;
  }

  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const hit = await cache.match(request);
        const network = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => hit);
        return hit || network;
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

