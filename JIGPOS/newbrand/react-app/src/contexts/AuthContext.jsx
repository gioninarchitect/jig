import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { TOKEN_KEYS } from '../config';
import { ROLE_PERMISSIONS, GLOBAL_ROLES, ROLE_REDIRECTS } from '../config/roles';

const AuthContext = createContext(null);

// Get the storage key for a user role
function getTokenKey(role) {
  return TOKEN_KEYS[role] || 'token';
}

// Find active token from localStorage (check all known keys)
function findStoredToken() {
  const keys = ['adminToken', 'ownerToken', 'supplierToken', 'token'];
  for (const key of keys) {
    const t = localStorage.getItem(key);
    if (t) return t;
  }
  return null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeBranch, setActiveBranch] = useState(null); // null = all branches

  // Check session on mount — call /auth/otp/me if token exists
  useEffect(() => {
    const token = findStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/otp/me')
      .then((res) => {
        if (res.data.success && res.data.user) {
          setUser(res.data.user);
          // Branch-scoped roles default to their primary branch
          if (!GLOBAL_ROLES.includes(res.data.user.role) && res.data.user.primaryBranch?._id) {
            setActiveBranch(res.data.user.primaryBranch._id);
          }
        }
      })
      .catch(() => {
        clearTokens();
      })
      .finally(() => setLoading(false));
  }, []);

  function clearTokens() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('supplierToken');
    localStorage.removeItem('token');
  }

  // Request OTP (email, purpose)
  const requestOTP = useCallback(async (email, purpose = 'login') => {
    const res = await api.post('/auth/otp/request', { email, purpose });
    return res.data;
  }, []);

  // Verify OTP and log in
  const verifyOTP = useCallback(async (email, otpCode) => {
    const res = await api.post('/auth/otp/verify', { email, otp_code: otpCode });
    if (res.data.success) {
      const { token, user: userData } = res.data;
      const key = getTokenKey(userData.role);
      localStorage.setItem(key, token);
      setUser(userData);
      if (!GLOBAL_ROLES.includes(userData.role) && userData.primaryBranch?._id) {
        setActiveBranch(userData.primaryBranch._id);
      }
    }
    return res.data;
  }, []);

  // Verify PIN (for owner/admin)
  const verifyPin = useCallback(async (email, pin) => {
    const res = await api.post('/auth/otp/verify-pin', { email, pin });
    if (res.data.success) {
      const { token, user: userData } = res.data;
      const key = getTokenKey(userData.role);
      localStorage.setItem(key, token);
      setUser(userData);
      if (!GLOBAL_ROLES.includes(userData.role) && userData.primaryBranch?._id) {
        setActiveBranch(userData.primaryBranch._id);
      }
    }
    return res.data;
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await api.post('/auth/otp/logout');
    } catch {
      // Ignore errors — still clear local state
    }
    clearTokens();
    setUser(null);
    setActiveBranch(null);
  }, []);

  // Role checking — accepts single role string or array
  const hasRole = useCallback(
    (roles) => {
      if (!user) return false;
      const arr = Array.isArray(roles) ? roles : [roles];
      return arr.includes(user.role);
    },
    [user]
  );

  // Permission checking — checks explicit permission or wildcard
  const can = useCallback(
    (permission) => {
      if (!user) return false;
      const perms = ROLE_PERMISSIONS[user.role];
      if (!perms) return false;
      if (perms.includes('*')) return true;
      return perms.includes(permission);
    },
    [user]
  );

  // Get post-login redirect path for current user
  const getRedirectPath = useCallback(() => {
    if (!user) return '/login';
    return ROLE_REDIRECTS[user.role] || '/customer';
  }, [user]);

  // Branch switching (only for global roles)
  const switchBranch = useCallback(
    (branchId) => {
      if (GLOBAL_ROLES.includes(user?.role)) {
        setActiveBranch(branchId);
      }
    },
    [user]
  );

  const canSwitchBranch = GLOBAL_ROLES.includes(user?.role);
  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        activeBranch,
        canSwitchBranch,
        isAuthenticated,
        requestOTP,
        verifyOTP,
        verifyPin,
        logout,
        hasRole,
        can,
        getRedirectPath,
        switchBranch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Protected route wrapper — checks roles OR permissions
export function ProtectedRoute({ children, roles, permission }) {
  const { user, loading, isAuthenticated, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-jig-slate">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-jig-purple border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role list
  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // Check permission
  if (permission && !can(permission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
