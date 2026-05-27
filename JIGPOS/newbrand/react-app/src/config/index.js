// API_URL — environment-aware, matches existing frontend/config.js pattern
const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

export const API_URL =
  hostname === 'localhost' || hostname === '127.0.0.1'
    ? 'http://localhost:3002/api/v1'
    : `${window.location.protocol}//${window.location.host}/api/v1`;

export const DEV_MODE = hostname === 'localhost' || hostname === '127.0.0.1';

export const BRAND = {
  black: '#0E0E0E',
  slate: '#1A1A1A',
  gold: '#C9A84C',
  goldDark: '#8B6914',
  goldLight: '#D4B96A',
  cream: '#F5F0E8',
  amber: '#C9A84C',
  amberDark: '#8B6914',
  amberLight: '#F8C242',
  green: '#C9A84C',
  greenDark: '#8B6914',
  greenLight: '#D4B96A',
  red: '#DC2626',
  redDark: '#B91C1C',
};

export const CURRENCY = {
  locale: 'en-ZA',
  symbol: 'R',
};

export const VAT_RATE = 0.15; // 15% — change here to update everywhere

// Roles from User model (backend/modules/database/models/User.js)
export const ROLES = {
  USER: 'user',
  SUPER_ADMIN: 'super_admin',
  OWNER: 'owner',
  ADMIN: 'admin',
  INVENTORY_MANAGER: 'inventory_manager',
  PACKER: 'packer',
  DISPATCH_MANAGER: 'dispatch_manager',
  BRANCH_MANAGER: 'branch_manager',
  STAFF_ASSISTANT: 'branch_assistant',
  SUPPLIER: 'supplier',
};

// Token storage keys — matches existing vanilla app pattern
export const TOKEN_KEYS = {
  super_admin: 'adminToken',
  owner: 'ownerToken',
  admin: 'adminToken',
  inventory_manager: 'adminToken',
  packer: 'adminToken',
  dispatch_manager: 'adminToken',
  branch_manager: 'adminToken',
  branch_assistant: 'adminToken',
  supplier: 'supplierToken',
  user: 'token',
};

export function formatCurrency(amount) {
  return `R${Number(amount).toFixed(2)}`;
}
