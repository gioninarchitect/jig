// Origin POS — minimal install-enabler service worker.
// NETWORK-ONLY pass-through: caches NOTHING, so it makes the POS installable as a PWA
// (one-click "Install" in Chrome/Edge) with ZERO risk of ever serving stale code to the till.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request)); });
