import { create } from 'zustand';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  facilityId: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  login: (token, user) => {
    localStorage.setItem('tnt-token', token);
    localStorage.setItem('tnt-user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('tnt-token');
    localStorage.removeItem('tnt-user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('tnt-token');
    const userStr = localStorage.getItem('tnt-user');
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        set({ token, user, isAuthenticated: true });
      } catch { /* ignore */ }
    }
  },
}));
