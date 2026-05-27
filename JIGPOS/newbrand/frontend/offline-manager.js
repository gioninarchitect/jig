// Da Bud Chef POS - Offline Manager
// Handles offline detection, IndexedDB storage, and sync

class OfflineManager {
  constructor() {
    this.db = null;
    this.isOnline = navigator.onLine;
    this.pendingSales = [];
    this.listeners = [];

    this.init();
  }

  async init() {
    // Open IndexedDB
    this.db = await this.openDB();

    // Listen for online/offline events
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        console.log('[Offline] Service worker registered:', registration.scope);

        // Listen for sync completion messages
        navigator.serviceWorker.addEventListener('message', event => {
          if (event.data.type === 'SYNC_COMPLETE') {
            this.notify('syncComplete', { count: event.data.count });
          }
        });
      } catch (error) {
        console.error('[Offline] Service worker registration failed:', error);
      }
    }

    // Load pending sales count
    await this.updatePendingCount();
  }

  openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('OriginOffline', 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = event => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains('offlineSales')) {
          const store = db.createObjectStore('offlineSales', { keyPath: 'offlineId' });
          store.createIndex('synced', 'synced', { unique: false });
          store.createIndex('queuedAt', 'queuedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('products')) {
          db.createObjectStore('products', { keyPath: '_id' });
        }

        if (!db.objectStoreNames.contains('inventory')) {
          const store = db.createObjectStore('inventory', { keyPath: 'id' });
          store.createIndex('productId', 'productId', { unique: false });
        }
      };
    });
  }

  handleOnline() {
    this.isOnline = true;
    this.notify('statusChange', { online: true });

    // Trigger background sync if available
    if ('serviceWorker' in navigator && 'sync' in window.registration) {
      navigator.serviceWorker.ready.then(reg => {
        reg.sync.register('sync-offline-sales');
      });
    } else {
      // Fallback: manual sync
      this.syncOfflineSales();
    }
  }

  handleOffline() {
    this.isOnline = false;
    this.notify('statusChange', { online: false });
  }

  // Queue a sale for offline storage
  async queueSale(saleData) {
    const offlineSale = {
      ...saleData,
      offlineId: `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      queuedAt: new Date().toISOString(),
      synced: false
    };

    const tx = this.db.transaction('offlineSales', 'readwrite');
    const store = tx.objectStore('offlineSales');
    await store.add(offlineSale);

    await this.updatePendingCount();
    this.notify('saleQueued', { sale: offlineSale });

    return offlineSale;
  }

  // Get all pending (unsynced) sales
  async getPendingSales() {
    const tx = this.db.transaction('offlineSales', 'readonly');
    const store = tx.objectStore('offlineSales');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve((request.result || []).filter(s => !s.synced));
      request.onerror = () => reject(request.error);
    });
  }

  // Update pending count
  async updatePendingCount() {
    const pending = await this.getPendingSales();
    this.pendingSales = pending;
    this.notify('pendingCountUpdate', { count: pending.length });
    return pending.length;
  }

  // Manual sync (fallback when background sync not available)
  async syncOfflineSales() {
    const pending = await this.getPendingSales();
    let synced = 0;

    for (const sale of pending) {
      try {
        const response = await fetch(`${API_URL}/pos/sale/offline-sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sale)
        });

        if (response.ok) {
          // Mark as synced
          const tx = this.db.transaction('offlineSales', 'readwrite');
          const store = tx.objectStore('offlineSales');
          sale.synced = true;
          sale.syncedAt = new Date().toISOString();
          await store.put(sale);
          synced++;
        }
      } catch (error) {
        console.error('[Offline] Sync failed for sale:', sale.offlineId, error);
      }
    }

    await this.updatePendingCount();
    this.notify('syncComplete', { synced, total: pending.length });

    return { synced, total: pending.length };
  }

  // Cache products for offline use
  async cacheProducts(products) {
    const tx = this.db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    // Clear existing
    await store.clear();

    // Add all products
    for (const product of products) {
      await store.put(product);
    }

    // Also tell service worker
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_PRODUCTS',
        products
      });
    }

    console.log(`[Offline] Cached ${products.length} products`);
  }

  // Get cached products
  async getCachedProducts() {
    const tx = this.db.transaction('products', 'readonly');
    const store = tx.objectStore('products');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Update local inventory (deduct after offline sale)
  async updateLocalInventory(productId, quantitySold) {
    const tx = this.db.transaction('products', 'readwrite');
    const store = tx.objectStore('products');

    const product = await new Promise((resolve, reject) => {
      const request = store.get(productId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (product && product.inventory) {
      product.inventory.quantity = Math.max(0, (product.inventory.quantity || 0) - quantitySold);
      await store.put(product);
    }
  }

  // Event listener management
  on(event, callback) {
    this.listeners.push({ event, callback });
  }

  off(event, callback) {
    this.listeners = this.listeners.filter(
      l => l.event !== event || l.callback !== callback
    );
  }

  notify(event, data) {
    this.listeners
      .filter(l => l.event === event)
      .forEach(l => l.callback(data));
  }
}

// Export singleton
window.offlineManager = new OfflineManager();
