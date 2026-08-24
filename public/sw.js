/**
 * Service Worker for Tu Super Carton (Gestión).
 *
 * Implements:
 * 1. Network-First for documents and dynamic lottery data (ensures instant real-time updates without manual cache clearing).
 * 2. Stale-While-Revalidate for static assets (CSS, JS bundles, images, audio).
 * 3. Instant Activation via skipWaiting() and clients.claim().
 * 4. Automatic pruning of outdated cache versions on activation.
 * 5. Cross-Client Real-Time Message Relay (postMessage to all active windows/tabs).
 * 6. Non-destructive caching (strictly preserves localStorage and sessionStorage state).
 */

const CACHE_VERSION = 'supermillonario-v2.1-live';
const STATIC_CACHE_NAME = `static-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `runtime-${CACHE_VERSION}`;

// Core assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
];

// Install Event: Cache shell assets and immediately activate
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Pre-cache fallback (continuing without blocking):', err);
      });
    }).then(() => {
      // Force the waiting service worker to become the active service worker immediately
      return self.skipWaiting();
    })
  );
});

// Activate Event: Claim clients immediately and prune old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== STATIC_CACHE_NAME && name !== RUNTIME_CACHE_NAME)
          .map((oldName) => {
            console.log('[SW] Pruning obsolete cache version:', oldName);
            return caches.delete(oldName);
          })
      );
    }).then(() => {
      // Take control of all open client tabs immediately without reload
      return self.clients.claim();
    }).then(() => {
      // Broadcast activation to all clients so they know the SW is updated
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'SW_ACTIVATED',
            version: CACHE_VERSION,
            timestamp: Date.now(),
          });
        });
      });
    })
  );
});

// Fetch Event Strategy:
// - Navigation requests (HTML): Network-First with Cache Fallback
// - Static assets (JS, CSS, fonts, images, audio): Stale-While-Revalidate
// - Non-GET requests: Bypass Cache completely
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only intercept GET requests
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);

  // Ignore cross-origin requests unless they are fonts/images
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. Navigation / Document requests: Always Network-First
  // This guarantees that lottery updates and new code versions load immediately without manual cache clearing
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Offline fallback: serve cached index.html
          const cachedResponse = await caches.match('/index.html') || await caches.match(request);
          if (cachedResponse) {
            return cachedResponse;
          }
          return new Response('Sin conexión a Internet. Por favor verifica tu red.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 2. Static Assets (JS, CSS, SVG, PNG, WebP, WOFF2, MP3, etc.): Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // If offline and not in cache, fallback gracefully
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

// Message Event: Listen for cross-client broadcasts, draw events, and sync triggers
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'BROADCAST_DRAW_EVENT':
    case 'BROADCAST_ROUND_UPDATE':
    case 'BROADCAST_PURCHASE':
    case 'BROADCAST_SYNC':
      // Relay event to all other connected client windows
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          // Don't send back to the originating client if source ID matches
          if (event.source && client.id === event.source.id) {
            return;
          }
          client.postMessage({
            type,
            payload,
            sourceClientId: event.source ? event.source.id : null,
            timestamp: Date.now(),
          });
        });
      });
      break;

    case 'CLEAR_RUNTIME_CACHE':
      caches.delete(RUNTIME_CACHE_NAME).then(() => {
        console.log('[SW] Runtime cache purged successfully');
      });
      break;

    default:
      break;
  }
});
