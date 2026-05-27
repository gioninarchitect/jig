import axios from 'axios';
import { useGhostStore } from '../stores/ghostStore';

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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('tnt-token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  },
);

export default api;
