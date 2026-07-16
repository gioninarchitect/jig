const CACHE_NAME = 'origin-tnt-v4';
const API_CACHE = 'origin-api-v1';
const OFFLINE_QUEUE = 'origin-offline-queue';

// App shell — cache on install
const APP_SHELL = [
  '/',
  '/index.html',
];

// Install — cache app shell + precache the CURRENT JS/CSS bundle so the app opens
// fully offline even on a fresh load (not only after the assets were lazily fetched).
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      await cache.addAll(APP_SHELL);
      try {
        const html = await (await fetch('/index.html', { cache: 'no-cache' })).text();
        const assets = [...new Set([...html.matchAll(/\/assets\/[A-Za-z0-9_.-]+\.(?:js|css)/g)].map(m => m[0]))];
        if (assets.length) await cache.addAll(assets);
      } catch (e) { /* best-effort precache — lazy caching still covers it */ }
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME && k !== API_CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls — network first, cache fallback for GET
  if (url.pathname.startsWith('/api/')) {
    if (event.request.method === 'GET') {
      event.respondWith(
        fetch(event.request)
          .then(response => {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => caches.match(event.request).then(r => r || new Response(JSON.stringify({ success: false, error: 'Offline', offline: true }), { headers: { 'Content-Type': 'application/json' } })))
      );
    } else {
      // POST/PATCH/DELETE — try network, queue if offline
      event.respondWith(
        fetch(event.request).catch(async () => {
          // Store in IndexedDB queue for later sync
          const body = await event.request.clone().text();
          const queueItem = {
            url: event.request.url,
            method: event.request.method,
            headers: Object.fromEntries(event.request.headers.entries()),
            body,
            timestamp: Date.now(),
          };

          // Send message to client to store in IndexedDB
          const clients = await self.clients.matchAll();
          clients.forEach(client => client.postMessage({ type: 'QUEUE_OFFLINE_ACTION', action: queueItem }));

          return new Response(JSON.stringify({ success: true, queued: true, message: 'Saved offline — will sync when connected' }), {
            headers: { 'Content-Type': 'application/json' },
          });
        })
      );
    }
    return;
  }

  // App assets — cache first, network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cache JS/CSS/fonts
        if (response.ok && (url.pathname.endsWith('.js') || url.pathname.endsWith('.css') || url.pathname.includes('fonts'))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback for navigation
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// Background sync — process offline queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' }));
}

// Listen for messages
self.addEventListener('message', (event) => {
  if (event.data.type === 'SKIP_WAITING') self.skipWaiting();
});
