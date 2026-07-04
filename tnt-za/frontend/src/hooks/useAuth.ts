import { useState } from 'react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useToastStore } from '../stores/toastStore';

export function useAuth() {
  const { user, isAuthenticated, login, logout: storeLogout } = useAuthStore();
  const addToast = useToastStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);

  async function requestPin(email: string) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/request-pin', { email: email.trim().toLowerCase() });
      addToast('success', 'PIN sent to your email');
      return data;
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Failed to request PIN');
      throw err;
    } finally { setLoading(false); }
  }

  async function verifyPin(email: string, pin: string) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/verify-pin', { email: email.trim().toLowerCase(), pin: pin.trim() });
      login(data.token, data.user);
      addToast('success', `Welcome, ${data.user.name}`);
      return data;
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Invalid PIN');
      throw err;
    } finally { setLoading(false); }
  }

  // FLOCORE SSO (W30) — email OTP through the FLOCORE rail. Falls back to PIN
  // if the backend has SSO disabled (404) or FLOCORE is unavailable (503).
  async function requestSsoCode(email: string) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/flocore/request', { email: email.trim().toLowerCase() });
      addToast('success', 'Code sent to your email');
      return data;
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Could not send code');
      throw err;
    } finally { setLoading(false); }
  }

  async function verifySsoCode(email: string, code: string) {
    setLoading(true);
    try {
      const { data } = await api.post('/auth/flocore/verify', { email: email.trim().toLowerCase(), code: code.trim() });
      login(data.token, data.user);
      addToast('success', `Welcome, ${data.user.name}`);
      return data;
    } catch (err: any) {
      addToast('error', err.response?.data?.error || 'Invalid or expired code');
      throw err;
    } finally { setLoading(false); }
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch { /* ignore */ }
    storeLogout();
    addToast('info', 'Logged out');
  }

  return { user, isAuthenticated, loading, requestPin, verifyPin, requestSsoCode, verifySsoCode, logout };
}
