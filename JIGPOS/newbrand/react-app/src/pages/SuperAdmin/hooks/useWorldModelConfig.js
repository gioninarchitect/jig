// P30+P32 — CRUD hook for World Model configuration
import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

export default function useWorldModelConfig() {
  const [config, setConfig] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch current config
  const fetchConfig = useCallback(async (branchId) => {
    try {
      setLoading(true);
      const params = branchId ? { branchId } : {};
      const res = await api.get('/config/world-model', { params });
      setConfig(res.data.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load configuration');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch change history with optional date range
  const fetchHistory = useCallback(async (page = 1, limit = 20, from = '', to = '') => {
    try {
      const params = { page, limit };
      if (from) params.from = from;
      if (to) params.to = to;
      const res = await api.get('/config/world-model/history', { params });
      setHistory(res.data.data || []);
      return res.data;
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load history');
      return { data: [], total: 0 };
    }
  }, []);

  // Update global config (features and/or thresholds)
  const updateConfig = useCallback(async (updates, reason = '') => {
    try {
      setSaving(true);
      const res = await api.put('/config/world-model', { ...updates, reason });
      setConfig(res.data.data);
      setError(null);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save configuration';
      setError(msg);
      throw new Error(msg);
    } finally {
      setSaving(false);
    }
  }, []);

  // Set branch-specific override
  const setBranchOverride = useCallback(async (branchId, overrides, reason = '') => {
    try {
      setSaving(true);
      const res = await api.put(`/config/world-model/branch/${branchId}`, { ...overrides, reason });
      setError(null);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to save branch override';
      setError(msg);
      throw new Error(msg);
    } finally {
      setSaving(false);
    }
  }, []);

  // Load config on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  return {
    config,
    history,
    loading,
    saving,
    error,
    fetchConfig,
    fetchHistory,
    updateConfig,
    setBranchOverride,
  };
}
