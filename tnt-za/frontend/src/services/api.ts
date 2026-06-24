import axios from 'axios';
import { useGhostStore } from '../stores/ghostStore';
import { useToastStore } from '../stores/toastStore';

const api = axios.create({ baseURL: '/api' });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tnt-token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Ghost Mode — backend swaps effective identity when X-Ghost-As is present.
  // Read-only by default. X-Ghost-Act: 1 escalates to act-as (writes allowed,
  // dual-recorded in AuditLog).
  const { ghostUser, actAsMode } = useGhostStore.getState();
  if (ghostUser) {
    config.headers['X-Ghost-As'] = ghostUser.id;
    if (actAsMode) config.headers['X-Ghost-Act'] = '1';
  }
  return config;
});

// Track whether we've already warned this offline burst, so a batch of queued
// writes doesn't spam one toast per request.
let warnedQueuedAt = 0;

api.interceptors.response.use(
  (res) => {
    // The service worker returns {queued:true} when it parks a write offline.
    // Tell the user the truth — it's saved locally and will sync, NOT live yet.
    if (res.data?.queued) {
      const now = Date.now();
      if (now - warnedQueuedAt > 4000) {
        warnedQueuedAt = now;
        useToastStore.getState().addToast('info', 'Saved offline — will sync when you’re back online.');
      }
    }
    return res;
  },
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tnt-token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
