// Hook: Fetch risk scores from backend API (not World Model)
// Calls GET /risk/network for all branch scores
// Calls GET /risk/cross-domain for alerts

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';

const POLL_INTERVAL = 60000; // 60s

export default function useRiskData() {
  const [networkRisk, setNetworkRisk] = useState(null);
  const [crossDomainAlerts, setCrossDomainAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const [riskRes, alertsRes] = await Promise.all([
        api.get('/risk/network').catch(() => ({ data: {} })),
        api.get('/risk/cross-domain').catch(() => ({ data: {} })),
      ]);

      if (riskRes.data?.success && riskRes.data?.data) {
        setNetworkRisk(riskRes.data.data);
      }

      if (alertsRes.data?.success && alertsRes.data?.data) {
        setCrossDomainAlerts(alertsRes.data.data);
      }

      setError(null);
    } catch (err) {
      // Feature may be disabled (403) — not an error
      if (err?.response?.status === 403) {
        setError('disabled');
      } else {
        setError(err?.message || 'Failed to load risk data');
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  return { networkRisk, crossDomainAlerts, loading, error, refresh: load };
}
