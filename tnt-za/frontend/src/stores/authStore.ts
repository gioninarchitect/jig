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

// Synchronous hydration at module init so a hard reload / deep-link to a
// protected route (e.g. /owner) has isAuthenticated=true on the FIRST render.
// Previously hydration ran in a useEffect AFTER render, so the route guard saw
// isAuthenticated=false and bounced an already-logged-in user back to /login.
function hydrateFromStorage(): { token: string | null; user: AuthUser | null; isAuthenticated: boolean } {
  if (typeof window === 'undefined') return { token: null, user: null, isAuthenticated: false };
  try {
    const token = localStorage.getItem('tnt-token');
    const userStr = localStorage.getItem('tnt-user');
    if (token && userStr) {
      return { token, user: JSON.parse(userStr), isAuthenticated: true };
    }
  } catch { /* ignore */ }
  return { token: null, user: null, isAuthenticated: false };
}

const initial = hydrateFromStorage();

export const useAuthStore = create<AuthState>((set) => ({
  user: initial.user,
  token: initial.token,
  isAuthenticated: initial.isAuthenticated,

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
