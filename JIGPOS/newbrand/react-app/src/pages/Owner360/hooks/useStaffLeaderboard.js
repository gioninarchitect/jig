// Hook: Fetch staff leaderboard from backend API
// Calls GET /risk/staff/leaderboard/:branchId

import { useState, useEffect, useCallback } from 'react';
import api from '../../../services/api';

export default function useStaffLeaderboard(branchId) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!branchId) {
      setLoading(false);
      return;
    }

    try {
      const res = await api.get(`/risk/staff/leaderboard/${branchId}`);
      if (res.data?.success && res.data?.data) {
        setLeaderboard(res.data.data);
      }
      setError(null);
    } catch (err) {
      if (err?.response?.status === 403) {
        setError('disabled');
      } else {
        setError(err?.message || 'Failed to load staff data');
      }
    }
    setLoading(false);
  }, [branchId]);

  useEffect(() => {
    load();
  }, [load]);

  return { leaderboard, loading, error, refresh: load };
}
