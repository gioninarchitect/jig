// P20+P34 — World Model Context Provider for JIG
// Wires: P18 EventBus → P19 Reducer → P20 Inference → React Context
// P34: Event batching (100ms window), debounced persistence, memoised inference.

import { createContext, useContext, useReducer, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import eventBus from './events';
import { createDBCWorldState } from './types';
import {
  dbcWorldReducer,
  refreshWorldModelConfig,
  getWorldModelConfig,
  isConfigStale,
  loadWorldState,
  saveWorldState,
  startBackendSync,
  stopBackendSync,
} from './state';
import {
  detectRiskPatterns,
  detectCrossDomainPatterns,
  detectCrossBranchAnomalies,
  calculateStockIntelligence,
  calculateStaffScores,
} from './inference';

// ─── Constants ───────────────────────────────────────────────────

const EVENT_BATCH_MS = 100;       // Batch events within 100ms window
const PERSIST_DEBOUNCE_MS = 2000; // Debounce localStorage writes

// ─── Context ─────────────────────────────────────────────────────

const WorldModelContext = createContext(null);

// ─── Provider ────────────────────────────────────────────────────

export function WorldModelProvider({ children }) {
  const { user, activeBranch } = useAuth();
  const userId = user?._id || user?.id;
  const userRole = user?.role;

  // Initialise state: try localStorage first, then create fresh
  const [state, dispatch] = useReducer(dbcWorldReducer, null, () => {
    if (userId) {
      const persisted = loadWorldState(userId);
      if (persisted) return persisted;
    }
    return createDBCWorldState(userId || 'anon', userRole || 'user', activeBranch || 'ALL');
  });

  // Config state — kept in sync with module-level cache
  const configRef = useRef(getWorldModelConfig());

  // Load config on mount + refresh every 5 min
  useEffect(() => {
    refreshWorldModelConfig().then((cfg) => {
      configRef.current = cfg;
    });

    const interval = setInterval(() => {
      if (isConfigStale()) {
        refreshWorldModelConfig().then((cfg) => {
          configRef.current = cfg;
        });
      }
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // P34: Batched event dispatch — group rapid events within 100ms window
  // Instead of dispatching each event immediately, buffer them and flush as one batch.
  const batchRef = useRef([]);
  const batchTimerRef = useRef(null);

  useEffect(() => {
    const unsubscribe = eventBus.subscribe('*', (event) => {
      batchRef.current.push(event);
      if (!batchTimerRef.current) {
        batchTimerRef.current = setTimeout(() => {
          const events = batchRef.current;
          batchRef.current = [];
          batchTimerRef.current = null;
          if (events.length === 1) {
            dispatch(events[0]);
          } else if (events.length > 1) {
            dispatch({ type: '__BATCH__', events });
          }
        }, EVENT_BATCH_MS);
      }
    });
    return () => {
      unsubscribe();
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current);
        batchTimerRef.current = null;
      }
    };
  }, []);

  // P34: Debounced persistence — don't write localStorage on every state change
  const persistTimerRef = useRef(null);

  useEffect(() => {
    if (!userId) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      saveWorldState(userId, state);
    }, PERSIST_DEBOUNCE_MS);
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    };
  }, [state, userId]);

  useEffect(() => {
    if (!userId) return;
    startBackendSync(userId, () => state);
    return () => stopBackendSync();
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Computed values (memoised, feature-gated) ──────────────────

  const config = configRef.current;

  const activeBranchId = activeBranch || state.activeBranchId || 'ALL';
  const activeBranchState = state.branches[activeBranchId] || null;

  // P34: Only recompute when the relevant state slice changes
  const riskAlerts = useMemo(() => {
    if (!config.features.riskScoring.enabled || !activeBranchState) return [];
    return detectRiskPatterns(activeBranchState, config);
  }, [activeBranchState, config]);

  const crossDomainInsights = useMemo(() => {
    if (!config.features.riskScoring.enabled || !activeBranchState) return [];
    return detectCrossDomainPatterns(activeBranchState, config);
  }, [activeBranchState, config]);

  const crossBranchInsights = useMemo(() => {
    if (!config.features.riskScoring.enabled) return [];
    return detectCrossBranchAnomalies(state.branches, config);
  }, [state.branches, config]);

  const stockIntelligence = useMemo(() => {
    return calculateStockIntelligence(activeBranchState, config);
  }, [activeBranchState, config]);

  const staffScores = useMemo(() => {
    return calculateStaffScores(activeBranchState, config);
  }, [activeBranchState, config]);

  // ── Emit helper — components call this instead of importing eventBus directly ──

  const emitEvent = useCallback((type, branchId, data) => {
    return eventBus.emit({ type, branchId: branchId || activeBranchId, data });
  }, [activeBranchId]);

  // ── Context value ──────────────────────────────────────────────

  const value = useMemo(() => ({
    // State
    state,
    activeBranch: activeBranchState,
    allBranches: state.branches,

    // Config
    config,

    // Computed (inference)
    riskAlerts,
    crossDomainInsights,
    crossBranchInsights,
    stockIntelligence,
    staffScores,

    // Actions
    emitEvent,
    dispatch,
  }), [
    state, activeBranchState, config,
    riskAlerts, crossDomainInsights, crossBranchInsights,
    stockIntelligence, staffScores,
    emitEvent,
  ]);

  return (
    <WorldModelContext.Provider value={value}>
      {children}
    </WorldModelContext.Provider>
  );
}

// ─── Hooks ───────────────────────────────────────────────────────

export function useDBCWorldModel() {
  const ctx = useContext(WorldModelContext);
  if (!ctx) throw new Error('useDBCWorldModel must be used within WorldModelProvider');
  return ctx;
}

export function useRiskAlerts() {
  const { riskAlerts, crossDomainInsights } = useDBCWorldModel();
  return { riskAlerts, crossDomainInsights };
}

export function useStockIntelligence() {
  const { stockIntelligence } = useDBCWorldModel();
  return stockIntelligence;
}

export function useStaffScores() {
  const { staffScores } = useDBCWorldModel();
  return staffScores;
}

export function useBranchState(branchId) {
  const { state, activeBranch } = useDBCWorldModel();
  if (!branchId) return activeBranch;
  return state.branches[branchId] || null;
}

export function useWorldModelConfig() {
  const { config } = useDBCWorldModel();
  return config;
}
