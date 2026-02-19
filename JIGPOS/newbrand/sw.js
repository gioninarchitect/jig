// Da Bud Chef POS - Service Worker for Offline Mode
const CACHE_VERSION = 'dbc-pos-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const OFFLINE_QUEUE = 'dbc-offline-queue';

// Files to cache for offline use
const STATIC_ASSETS = [
  '/',
  '/pos.html',
  '/menu-board.html',
  '/css/styles.css',
  '/css/style.css',
  '/images/logo.png',
  'https://fonts.googleapis.com/css2?family=Yeseva+One&family=Montserrat:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  '/api/v1/products',
  '/api/v1/branches',
  '/api/v1/menu-boards'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests for caching (but still intercept POSTs for offline queue)
  if (request.method !== 'GET') {
    // Queue POST requests if offline (sales, etc.)
    if (request.method === 'POST' && url.pathname.includes('/api/v1/pos/sale')) {
      event.respondWith(handleOfflineSale(request));
      return;
    }
    return;
  }

  // API requests - network first, cache fallback
  if (url.pathname.startsWith('/api/v1/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - cache first, network fallback
  event.respondWith(cacheFirstStrategy(request));
});

// Cache first strategy (for static assets)
async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page if available
    return caches.match('/pos.html');
  }
}

// Network first strategy (for API)
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful API responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Try cache
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    // Return error response
    return new Response(JSON.stringify({
      success: false,
      offline: true,
      message: 'You are offline. Data may be stale.'
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle offline sales - queue for later sync
async function handleOfflineSale(request) {
  try {
    // Try to make the request
    const response = await fetch(request.clone());
    return response;
  } catch (error) {
    // Offline - queue the sale
    const saleData = await request.json();
    await queueOfflineSale(saleData);

    return new Response(JSON.stringify({
      success: true,
      offline: true,
      message: 'Sale queued for sync when online',
      queuedAt: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Queue sale in IndexedDB
async function queueOfflineSale(saleData) {
  const db = await openOfflineDB();
  const tx = db.transaction('offlineSales', 'readwrite');
  const store = tx.objectStore('offlineSales');

  await store.add({
    ...saleData,
    offlineId: `offline-${Date.now()}`,
    queuedAt: new Date().toISOString(),
    synced: false
  });
}

// Open IndexedDB
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('JIGOffline', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = event => {
      const db = event.target.result;

      // Offline sales store
      if (!db.objectStoreNames.contains('offlineSales')) {
        const salesStore = db.createObjectStore('offlineSales', { keyPath: 'offlineId' });
        salesStore.createIndex('synced', 'synced', { unique: false });
        salesStore.createIndex('queuedAt', 'queuedAt', { unique: false });
      }

      // Product cache store
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: '_id' });
      }

      // Branch inventory store
      if (!db.objectStoreNames.contains('inventory')) {
        const invStore = db.createObjectStore('inventory', { keyPath: 'id' });
        invStore.createIndex('productId', 'productId', { unique: false });
      }
    };
  });
}

// Background sync - when back online
self.addEventListener('sync', event => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-sales') {
    event.waitUntil(syncOfflineSales());
  }
});

// Sync queued offline sales
async function syncOfflineSales() {
  const db = await openOfflineDB();
  const tx = db.transaction('offlineSales', 'readonly');
  const store = tx.objectStore('offlineSales');
  const index = store.index('synced');

  const unsyncedSales = await new Promise((resolve, reject) => {
    const request = index.getAll(IDBKeyRange.only(false));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  console.log(`[SW] Syncing ${unsyncedSales.length} offline sales...`);

  for (const sale of unsyncedSales) {
    try {
      const response = await fetch('/api/v1/pos/sale/offline-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sale)
      });

      if (response.ok) {
        // Mark as synced
        const updateTx = db.transaction('offlineSales', 'readwrite');
        const updateStore = updateTx.objectStore('offlineSales');
        sale.synced = true;
        sale.syncedAt = new Date().toISOString();
        await updateStore.put(sale);
        console.log(`[SW] Synced sale: ${sale.offlineId}`);
      }
    } catch (error) {
      console.error(`[SW] Failed to sync sale ${sale.offlineId}:`, error);
    }
  }

  // Notify clients
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      count: unsyncedSales.length
    });
  });
}

// Listen for messages from main thread
self.addEventListener('message', event => {
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CACHE_PRODUCTS') {
    cacheProducts(event.data.products);
  }
});

// Cache products for offline use
async function cacheProducts(products) {
  const db = await openOfflineDB();
  const tx = db.transaction('products', 'readwrite');
  const store = tx.objectStore('products');

  for (const product of products) {
    await store.put(product);
  }

  console.log(`[SW] Cached ${products.length} products for offline use`);
}
