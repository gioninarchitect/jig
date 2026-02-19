import axios from 'axios';
import { API_URL } from '../config';

// Active branch ID — set by AuthContext, read by interceptor
let _activeBranchId = null;

export function setApiBranchId(branchId) {
  _activeBranchId = branchId;
}

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor — attach Bearer token + branch header
api.interceptors.request.use((config) => {
  // Token (check all role-based keys)
  const token =
    localStorage.getItem('adminToken') ||
    localStorage.getItem('ownerToken') ||
    localStorage.getItem('supplierToken') ||
    localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Branch scoping header
  if (_activeBranchId) {
    config.headers['X-Branch-Id'] = _activeBranchId;
  }

  return config;
});

// Response interceptor — handle 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all token variants
      localStorage.removeItem('adminToken');
      localStorage.removeItem('ownerToken');
      localStorage.removeItem('supplierToken');
      localStorage.removeItem('token');

      // Redirect to login (only if not already there)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
