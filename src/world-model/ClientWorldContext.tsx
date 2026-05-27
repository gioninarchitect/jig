/**
 * PureGro Premium Cannabis Care - Client World React Context
 *
 * Provides the full intelligence layer to any React component tree.
 *
 * Usage:
 *   <ClientWorldProvider clientId={id} client={client} allProducts={products}>
 *     <Dashboard />
 *   </ClientWorldProvider>
 *
 *   // Inside any child component:
 *   const { churnAnalysis, restockPredictions } = useClientWorld();
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type {
  BehavioralState,
  ChurnAnalysis,
  Client,
  ClientPattern,
  ClientWorldEvent,
  ClientWorldState,
  ContactRecommendation,
  Intervention,
  InventoryState,
  PaymentRiskAnalysis,
  PaymentState,
  Product,
  ProductRecommendation,
  PurchasingState,
  RelationshipState,
  RestockPredictionResult,
  RevenueForecast,
  TierAnalysis,
} from './types';

import { clientEventBus } from './events';
import {
  clientWorldReducer,
  createInitialClientState,
  loadClientState,
  saveClientState,
  clearClientState,
} from './state';
import { detectAllPatterns, getHighPriorityPatterns } from './patterns';
import {
  analyzeChurnRisk,
  assessPaymentRisk,
  analyzeTierStatus,
  predictRestock,
  generateProductRecommendations,
  recommendContactTime,
  forecastRevenue,
} from './inference';
import { generateInterventions } from './interventions';

// ─────────────────────────────────────────────────────────────
// CONTEXT VALUE
// ─────────────────────────────────────────────────────────────

interface ClientWorldContextValue {
  // Core state
  state: ClientWorldState;
  isLoading: boolean;
  error: string | null;

  // Dispatch
  dispatch: (event: ClientWorldEvent) => void;

  // Computed intelligence
  churnAnalysis: ChurnAnalysis;
  restockPredictions: RestockPredictionResult[];
  paymentRiskAnalysis: PaymentRiskAnalysis;
  tierStatus: TierAnalysis;
  productRecommendations: ProductRecommendation[];
  contactRecommendation: ContactRecommendation;
  revenueForecast: RevenueForecast;
  activeInterventions: Intervention[];
  patterns: ClientPattern[];
  highPriorityPatterns: ClientPattern[];

  // Actions
  refreshPredictions: () => void;
  acknowledgeIntervention: (interventionId: string, outcome: string) => void;
  resetClientState: () => Promise<void>;
}

const ClientWorldContext = createContext<ClientWorldContextValue | null>(null);

// ─────────────────────────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────────────────────────

interface ClientWorldProviderProps {
  clientId: string;
  client: Client;
  allProducts: Product[];
  children: ReactNode;
}

export function ClientWorldProvider({
  clientId,
  client,
  allProducts,
  children,
}: ClientWorldProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [predictionVersion, setPredictionVersion] = useState(0);

  // ── State management with reducer ────────────────────────
  const [state, dispatchReducer] = useReducer(
    clientWorldReducer,
    createInitialClientState(clientId, client),
  );

  // Track if we've loaded persisted state
  const hasLoaded = useRef(false);

  // ── Load persisted state on mount ────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const persisted = await loadClientState(clientId);
        if (cancelled) return;

        if (persisted) {
          // Replay a no-op event to set the loaded state into the reducer.
          // We use a LOGIN event with the persisted timestamp.
          dispatchReducer({
            type: 'CLIENT_LOGIN',
            timestamp: persisted.behavioral.lastLoginAt ?? Date.now(),
          });
        }

        hasLoaded.current = true;
        setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load state',
          );
          setIsLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // ── Auto-save on state changes ───────────────────────────
  useEffect(() => {
    if (!hasLoaded.current) return;

    const timer = setTimeout(() => {
      saveClientState(state).catch((err) => {
        console.error('[ClientWorldProvider] Save failed:', err);
      });
    }, 500); // debounce 500ms

    return () => clearTimeout(timer);
  }, [state]);

  // ── Subscribe to event bus ───────────────────────────────
  useEffect(() => {
    const unsubscribe = clientEventBus.subscribe((event) => {
      dispatchReducer(event);
    });
    return unsubscribe;
  }, []);

  // ── Dispatch wrapper (emit to bus + local reducer) ───────
  const dispatch = useCallback((event: ClientWorldEvent) => {
    clientEventBus.emit(event);
  }, []);

  // ── Computed intelligence (memoized) ─────────────────────

  const churnAnalysis = useMemo(
    () => analyzeChurnRisk(state),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.lastUpdated, predictionVersion],
  );

  const restockPredictions = useMemo(
    () => predictRestock(state),
    [state.lastUpdated, predictionVersion],
  );

  const paymentRiskAnalysis = useMemo(
    () => assessPaymentRisk(state),
    [state.lastUpdated, predictionVersion],
  );

  const tierStatus = useMemo(
    () => analyzeTierStatus(state),
    [state.lastUpdated, predictionVersion],
  );

  const productRecommendations = useMemo(
    () => generateProductRecommendations(state, allProducts),
    [state.lastUpdated, allProducts, predictionVersion],
  );

  const contactRecommendation = useMemo(
    () => recommendContactTime(state),
    [state.lastUpdated, predictionVersion],
  );

  const revenueForecast = useMemo(
    () => forecastRevenue(state),
    [state.lastUpdated, predictionVersion],
  );

  const patterns = useMemo(
    () => detectAllPatterns(state),
    [state.lastUpdated, predictionVersion],
  );

  const highPriorityPatterns = useMemo(
    () => getHighPriorityPatterns(state),
    [state.lastUpdated, predictionVersion],
  );

  const activeInterventions = useMemo(
    () => generateInterventions(state),
    [state.lastUpdated, predictionVersion],
  );

  // ── Actions ──────────────────────────────────────────────

  const refreshPredictions = useCallback(() => {
    setPredictionVersion((v) => v + 1);
  }, []);

  const acknowledgeIntervention = useCallback(
    (interventionId: string, outcome: string) => {
      dispatch({
        type: 'INTERVENTION_RESPONDED',
        interventionId,
        outcome,
      });
    },
    [dispatch],
  );

  const resetState = useCallback(async () => {
    await clearClientState(clientId);
    // Re-dispatch a login to reset local reducer state
    dispatchReducer({
      type: 'CLIENT_LOGIN',
      timestamp: Date.now(),
    });
  }, [clientId]);

  // ── Context value ────────────────────────────────────────

  const value = useMemo<ClientWorldContextValue>(
    () => ({
      state,
      isLoading,
      error,
      dispatch,
      churnAnalysis,
      restockPredictions,
      paymentRiskAnalysis,
      tierStatus,
      productRecommendations,
      contactRecommendation,
      revenueForecast,
      activeInterventions,
      patterns,
      highPriorityPatterns,
      refreshPredictions,
      acknowledgeIntervention,
      resetClientState: resetState,
    }),
    [
      state,
      isLoading,
      error,
      dispatch,
      churnAnalysis,
      restockPredictions,
      paymentRiskAnalysis,
      tierStatus,
      productRecommendations,
      contactRecommendation,
      revenueForecast,
      activeInterventions,
      patterns,
      highPriorityPatterns,
      refreshPredictions,
      acknowledgeIntervention,
      resetState,
    ],
  );

  return (
    <ClientWorldContext.Provider value={value}>
      {children}
    </ClientWorldContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// MAIN HOOK
// ─────────────────────────────────────────────────────────────

/** Access the full client world context. Must be inside ClientWorldProvider. */
export function useClientWorld(): ClientWorldContextValue {
  const ctx = useContext(ClientWorldContext);
  if (!ctx) {
    throw new Error(
      'useClientWorld must be used within a <ClientWorldProvider>',
    );
  }
  return ctx;
}

// ─────────────────────────────────────────────────────────────
// SPECIALIZED DOMAIN HOOKS
// ─────────────────────────────────────────────────────────────

/** Purchasing metrics: LTV, order frequency, preferred products, etc. */
export function usePurchasingState(): PurchasingState {
  return useClientWorld().state.purchasing;
}

/** Payment metrics: reliability, outstanding balance, trend, etc. */
export function usePaymentState(): PaymentState {
  return useClientWorld().state.payment;
}

/** Estimated client inventory: stock days, alerts, reorder predictions. */
export function useInventoryState(): InventoryState {
  return useClientWorld().state.inventory;
}

/** Relationship health: tier, satisfaction, churn risk, support tickets. */
export function useRelationshipState(): RelationshipState {
  return useClientWorld().state.relationship;
}

/** Engagement metrics: sessions, browsing, cart abandonment, etc. */
export function useBehavioralState(): BehavioralState {
  return useClientWorld().state.behavioral;
}

/** Detailed churn analysis with factors and suggested actions. */
export function useChurnRisk(): ChurnAnalysis {
  return useClientWorld().churnAnalysis;
}

/** Per-product restock predictions sorted by urgency. */
export function useRestockPredictions(): RestockPredictionResult[] {
  return useClientWorld().restockPredictions;
}

/** Active interventions (pending actions for this client). */
export function useActiveInterventions(): Intervention[] {
  return useClientWorld().activeInterventions;
}

/** Tier progress and upgrade path analysis. */
export function useTierStatus(): TierAnalysis {
  return useClientWorld().tierStatus;
}

/** All detected patterns for this client. */
export function usePatterns(): ClientPattern[] {
  return useClientWorld().patterns;
}

/** Payment risk assessment with recommended terms. */
export function usePaymentRisk(): PaymentRiskAnalysis {
  return useClientWorld().paymentRiskAnalysis;
}

/** Product recommendations (reorder, cross-sell, upsell, new). */
export function useProductRecommendations(): ProductRecommendation[] {
  return useClientWorld().productRecommendations;
}

/** Revenue forecast for this client. */
export function useRevenueForecast(): RevenueForecast {
  return useClientWorld().revenueForecast;
}

/** Best contact time/channel for this client. */
export function useContactRecommendation(): ContactRecommendation {
  return useClientWorld().contactRecommendation;
}

// ─────────────────────────────────────────────────────────────
// ADMIN DASHBOARD HOOK
// ─────────────────────────────────────────────────────────────

// Re-export from shared module (no React dependency)
export { computeIntelligenceSummary, type ClientIntelligenceSummary } from './intelligence-summary';
import type { ClientIntelligenceSummary } from './intelligence-summary';
import { computeIntelligenceSummary } from './intelligence-summary';

/**
 * Aggregate intelligence summary for admin dashboard view.
 */
export function useClientIntelligenceSummary(
  state: ClientWorldState,
): ClientIntelligenceSummary {
  return useMemo(() => computeIntelligenceSummary(state), [state.lastUpdated]);
}
