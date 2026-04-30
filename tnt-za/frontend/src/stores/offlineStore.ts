import { create } from 'zustand';
import api from '../services/api';

interface QueuedAction {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
}

interface OfflineState {
  isOnline: boolean;
  queue: QueuedAction[];
  syncing: boolean;
  setOnline: (online: boolean) => void;
  addToQueue: (action: Omit<QueuedAction, 'id'>) => void;
  syncQueue: () => Promise<void>;
  clearQueue: () => void;
}

const DB_NAME = 'origin-tnt-offline';
const STORE_NAME = 'queue';

// IndexedDB helpers
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToIDB(item: QueuedAction) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(item);
}

async function getAllFromIDB(): Promise<QueuedAction[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve([]);
  });
}

async function deleteFromIDB(id: string) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
}

async function clearIDB() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
}

export const useOfflineStore = create<OfflineState>((set, get) => ({
  isOnline: navigator.onLine,
  queue: [],
  syncing: false,

  setOnline: (online) => {
    set({ isOnline: online });
    if (online && get().queue.length > 0) get().syncQueue();
  },

  addToQueue: async (action) => {
    const item: QueuedAction = { ...action, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` };
    await saveToIDB(item);
    set(s => ({ queue: [...s.queue, item] }));
  },

  syncQueue: async () => {
    if (get().syncing) return;
    set({ syncing: true });

    const items = await getAllFromIDB();
    let synced = 0;

    for (const item of items) {
      try {
        const url = new URL(item.url);
        await fetch(url.pathname, {
          method: item.method,
          headers: { ...item.headers, 'Content-Type': 'application/json' },
          body: item.body,
        });
        await deleteFromIDB(item.id);
        synced++;
      } catch {
        // Still offline or server error — leave in queue
        break;
      }
    }

    const remaining = await getAllFromIDB();
    set({ queue: remaining, syncing: false });

    if (synced > 0) {
      console.log(`[Offline] Synced ${synced} queued actions`);
    }
  },

  clearQueue: async () => {
    await clearIDB();
    set({ queue: [] });
  },
}));

// Init: load queue from IDB + listen for online/offline
export async function initOffline() {
  const items = await getAllFromIDB();
  useOfflineStore.setState({ queue: items, isOnline: navigator.onLine });

  window.addEventListener('online', () => {
    useOfflineStore.getState().setOnline(true);
  });
  window.addEventListener('offline', () => {
    useOfflineStore.getState().setOnline(false);
  });

  // Listen for SW messages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'QUEUE_OFFLINE_ACTION') {
        useOfflineStore.getState().addToQueue(event.data.action);
      }
      if (event.data.type === 'SYNC_OFFLINE_QUEUE') {
        useOfflineStore.getState().syncQueue();
      }
    });
  }
}
