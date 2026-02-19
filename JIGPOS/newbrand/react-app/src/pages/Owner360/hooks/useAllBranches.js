// P22 — Load all branches with stats for 360View
// Polls /branches and /branches/:id/stats for each branch

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';

const POLL_INTERVAL = 60000; // 60s refresh

export default function useAllBranches() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerStats, setOwnerStats] = useState(null);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    try {
      // Load branches + owner stats in parallel
      const [branchRes, statsRes] = await Promise.all([
        api.get('/branches'),
        api.get('/dashboard/owner-stats').catch(() => ({ data: {} })),
      ]);

      const branchList = branchRes.data?.branches || branchRes.data?.data || [];

      // Load individual branch stats in parallel (max 10)
      const statsPromises = branchList.slice(0, 10).map(b =>
        api.get(`/branches/${b._id}/stats`).catch(() => ({ data: {} }))
      );
      const statsResults = await Promise.all(statsPromises);

      // Merge stats into branches
      const enriched = branchList.map((branch, i) => {
        const stats = statsResults[i]?.data?.stats || {};
        return {
          ...branch,
          stats: {
            todayRevenue: stats.sales?.today?.total || 0,
            todayOrders: stats.sales?.today?.count || 0,
            weekRevenue: stats.sales?.week?.total || 0,
            monthRevenue: stats.sales?.month?.total || 0,
            inventoryValue: stats.inventory?.value || 0,
            inventoryQuantity: stats.inventory?.quantity || 0,
            lowStockItems: stats.inventory?.lowStockItems || 0,
            staffCount: stats.staff?.count || 0,
            isOpenNow: stats.branch?.isOpenNow || false,
            activeTills: stats.branch?.activeTills || 0,
          },
        };
      });

      setBranches(enriched);

      if (statsRes.data?.data) {
        setOwnerStats(statsRes.data.data);
      }
    } catch {
      // Keep existing data on error
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const refresh = useCallback(() => {
    load();
  }, [load]);

  return { branches, ownerStats, loading, refresh };
}
