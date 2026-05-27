/**
 * PureGro Premium Cannabis Care - World Model barrel exports
 *
 * Phase 1: Types & Constants
 * Phase 2: Events & State
 * Phase 3: Patterns, Inference, Interventions
 * Phase 4: React Context & Hooks + AI System Prompt
 */

// ── Types ────────────────────────────────────────────────────
export type {
  // Primitives / Enums
  ClientTier,
  ClientStatus,
  ClientType,
  PaymentTerms,
  PaymentStatus,
  PaymentMethod,
  OrderStatus,
  ProductCategory,
  StrainType,
  StockStatus,
  ChurnRisk,
  InterventionType,
  InterventionChannel,
  InterventionPriority,
  OtpPurpose,

  // Auth Types
  AuthOtp,
  AuthSession,
  OtpRequest,
  OtpVerifyRequest,
  AuthTokenResponse,

  // Value Objects
  Address,

  // Core Entities
  Client,
  PriceTier,
  Product,
  OrderItem,
  Order,

  // Intelligence Types
  ProductPreference,
  StockAlert,
  ReorderPrediction,
  ClientPattern,
  Intervention,

  // Domain State Slices
  PurchasingState,
  PaymentState,
  InventoryState,
  RelationshipState,
  BrowsingEvent,
  BehavioralState,

  // Unified World State
  ClientWorldState,

  // Events
  ClientWorldEvent,

  // Inference Results
  RestockPredictionResult,
  ChurnAnalysis,
  PaymentRiskAnalysis,
  ProductRecommendation,
  TierAnalysis,
  ContactRecommendation,
  RevenueForecast,

  // Definition Types
  PatternDefinition,
  InterventionTrigger,
} from './types';

// ── Constants ────────────────────────────────────────────────
export { TIER_THRESHOLDS, VAT_RATE, OTP_CONFIG } from './types';

// ── Type Guards ──────────────────────────────────────────────
export {
  isValidOrderStatus,
  isValidClientTier,
  isValidChurnRisk,
  isValidPaymentStatus,
  isValidClientStatus,
  isValidProductCategory,
} from './types';

// ── Event Bus (Phase 2) ─────────────────────────────────────
export { clientEventBus } from './events';
export {
  emitOrderPlaced,
  emitOrderConfirmed,
  emitOrderShipped,
  emitOrderDelivered,
  emitOrderCancelled,
  emitPaymentReceived,
  emitPaymentOverdue,
  emitClientLogin,
  emitProductViewed,
  emitCartUpdated,
  emitCartAbandoned,
  emitPromotionSent,
  emitPromotionResponded,
  emitSupportTicketOpened,
  emitComplaintReceived,
  emitFeedbackReceived,
  emitPatternDetected,
  emitInterventionTriggered,
  emitInterventionResponded,
} from './events';

// ── State Management (Phase 2) ──────────────────────────────
export {
  createInitialClientState,
  saveClientState,
  loadClientState,
  clearClientState,
  getAllClientIds,
  clientWorldReducer,
  calculateOrderFrequency,
  estimateStockDays,
  detectPreferredOrderDay,
  calculatePaymentReliability,
  assessChurnRisk,
  checkTierUpgrade,
  updateProductPreferences,
} from './state';

// ── Pattern Detection (Phase 3) ─────────────────────────────
export {
  detectAllPatterns,
  detectPurchasingPatterns,
  detectPaymentPatterns,
  detectEngagementPatterns,
  detectRiskPatterns,
  getHighPriorityPatterns,
  getPatternDefinitions,
} from './patterns';

// ── Inference Engine (Phase 3) ──────────────────────────────
export {
  predictRestock,
  analyzeChurnRisk,
  assessPaymentRisk,
  generateProductRecommendations,
  analyzeTierStatus,
  recommendContactTime,
  forecastRevenue,
} from './inference';

// ── Interventions (Phase 3) ─────────────────────────────────
export {
  generateInterventions,
  shouldTriggerIntervention,
  getInterventionTriggers,
} from './interventions';

// ── Intelligence Summary (pure, no React) ───────────────────
export { computeIntelligenceSummary } from './intelligence-summary';
export type { ClientIntelligenceSummary } from './intelligence-summary';

// ── React Context & Hooks (Phase 4) ─────────────────────────
// NOTE: React exports are NOT included in the barrel to keep
// the server build free of React dependencies.
// Import directly from './ClientWorldContext' in frontend code.
