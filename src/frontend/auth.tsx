/**
 * PureGro Premium Cannabis Care - Auth Context
 *
 * Provides authentication state and OTP login flow to the React app.
 * Persists JWT token in localStorage, auto-validates on mount.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  auth as authApi,
  clients as clientsApi,
  storeAuth,
  clearAuth,
  getStoredToken,
  getStoredClientId,
  type ClientData,
} from './api';

// ── Types ─────────────────────────────────────────────────

interface AuthState {
  status: 'loading' | 'unauthenticated' | 'authenticated';
  client: ClientData | null;
  isAdmin: boolean;
}

interface AuthContextValue extends AuthState {
  requestOtp: (email: string) => Promise<{ otpId: string }>;
  verifyOtp: (email: string, code: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ── Provider ──────────────────────────────────────────────

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS || 'admin@cleva-ai.co.za').split(',').map((e: string) => e.trim().toLowerCase());

function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    status: 'loading',
    client: null,
    isAdmin: false,
  });

  // Validate existing token on mount
  useEffect(() => {
    const token = getStoredToken();
    const clientId = getStoredClientId();

    if (!token || !clientId) {
      setState({ status: 'unauthenticated', client: null, isAdmin: false });
      return;
    }

    clientsApi
      .me()
      .then(({ client }) => {
        setState({
          status: 'authenticated',
          client,
          isAdmin: isAdminEmail(client.email),
        });
      })
      .catch(() => {
        clearAuth();
        setState({ status: 'unauthenticated', client: null, isAdmin: false });
      });
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    const { otpId } = await authApi.requestOtp(email);
    return { otpId };
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    try {
      const { token, clientId } = await authApi.verifyOtp(email, code);
      storeAuth(token, clientId);

      // Set authenticated immediately — don't block on /clients/me
      setState({
        status: 'authenticated',
        client: { id: clientId, email } as ClientData,
        isAdmin: isAdminEmail(email),
      });

      // Fetch full client data in background (non-blocking)
      clientsApi.me().then(({ client }) => {
        setState((prev) => ({
          ...prev,
          client,
          isAdmin: isAdminEmail(client.email),
        }));
      }).catch(() => {
        // Token works for verify but /me failed — keep authenticated
        console.warn('[Auth] Failed to fetch client profile, using minimal data');
      });

      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore logout errors
    }
    clearAuth();
    setState({ status: 'unauthenticated', client: null, isAdmin: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, requestOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
