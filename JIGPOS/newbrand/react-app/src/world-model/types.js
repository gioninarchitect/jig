// P18 — World Model Types for DBC
// 6 operational domains: inventory, financial, compliance, staff, operational, customer
// Multi-branch architecture: Owner sees all, staff sees one.

// ─── Event Type Constants ────────────────────────────────────────

// POS Events (7)
export const SALE_COMPLETED = 'SALE_COMPLETED';
export const SALE_VOIDED = 'SALE_VOIDED';
export const REFUND_PROCESSED = 'REFUND_PROCESSED';
export const DISCOUNT_APPLIED = 'DISCOUNT_APPLIED';
export const TILL_OPENED = 'TILL_OPENED';
export const TILL_CLOSED = 'TILL_CLOSED';
export const CASH_IN_OUT = 'CASH_IN_OUT';

// Inventory Events (7)
export const STOCK_RECEIVED = 'STOCK_RECEIVED';
export const STOCK_ADJUSTED = 'STOCK_ADJUSTED';
export const STOCK_TRANSFERRED = 'STOCK_TRANSFERRED';
export const BATCH_CREATED = 'BATCH_CREATED';
export const BATCH_QA_RESULT = 'BATCH_QA_RESULT';
export const STOCKTAKE_COMPLETED = 'STOCKTAKE_COMPLETED';
export const REORDER_TRIGGERED = 'REORDER_TRIGGERED';

// Staff Events (4)
export const SHIFT_STARTED = 'SHIFT_STARTED';
export const SHIFT_ENDED = 'SHIFT_ENDED';
export const BREAK_TAKEN = 'BREAK_TAKEN';
export const VARIANCE_DETECTED = 'VARIANCE_DETECTED';

// Compliance Events (3)
export const PURCHASE_LIMIT_CHECK = 'PURCHASE_LIMIT_CHECK';
export const SECTION21_VERIFICATION = 'SECTION21_VERIFICATION';
export const DOCUMENT_EXPIRY_WARNING = 'DOCUMENT_EXPIRY_WARNING';

// Operational Events (6)
export const ORDER_PLACED = 'ORDER_PLACED';
export const ORDER_PACKED = 'ORDER_PACKED';
export const ORDER_DISPATCHED = 'ORDER_DISPATCHED';
export const PO_SUBMITTED = 'PO_SUBMITTED';
export const PO_APPROVED = 'PO_APPROVED';
export const APPROVAL_REQUESTED = 'APPROVAL_REQUESTED';

// Customer Events (3)
export const CUSTOMER_REGISTERED = 'CUSTOMER_REGISTERED';
export const WELLNESS_POINTS_EARNED = 'WELLNESS_POINTS_EARNED';
export const WELLNESS_TIER_CHANGED = 'WELLNESS_TIER_CHANGED';

// All events grouped by domain
export const EVENT_DOMAINS = {
  pos: [SALE_COMPLETED, SALE_VOIDED, REFUND_PROCESSED, DISCOUNT_APPLIED, TILL_OPENED, TILL_CLOSED, CASH_IN_OUT],
  inventory: [STOCK_RECEIVED, STOCK_ADJUSTED, STOCK_TRANSFERRED, BATCH_CREATED, BATCH_QA_RESULT, STOCKTAKE_COMPLETED, REORDER_TRIGGERED],
  staff: [SHIFT_STARTED, SHIFT_ENDED, BREAK_TAKEN, VARIANCE_DETECTED],
  compliance: [PURCHASE_LIMIT_CHECK, SECTION21_VERIFICATION, DOCUMENT_EXPIRY_WARNING],
  operational: [ORDER_PLACED, ORDER_PACKED, ORDER_DISPATCHED, PO_SUBMITTED, PO_APPROVED, APPROVAL_REQUESTED],
  customer: [CUSTOMER_REGISTERED, WELLNESS_POINTS_EARNED, WELLNESS_TIER_CHANGED],
};

// Reverse lookup: event type → domain
export const EVENT_TO_DOMAIN = {};
for (const [domain, events] of Object.entries(EVENT_DOMAINS)) {
  for (const evt of events) {
    EVENT_TO_DOMAIN[evt] = domain;
  }
}

// ─── Default World Model Config ──────────────────────────────────
// Super Admin configurable via /app/config (P30-35)

export const DEFAULT_WORLD_MODEL_CONFIG = {
  features: {
    potencyDegradation: { enabled: false, autoMarkdown: false, markdownThreshold: 15 },
    riskScoring: {
      enabled: false,
      alertThreshold: 70,
      domains: { inventory: true, financial: true, compliance: true, staff: true, operational: true, customer: false },
    },
    smartStock: { enabled: false, autoReorder: false, interBranchTransfer: false },
    staffAccountability: { enabled: false, varianceThreshold: 50, positiveReinforcement: true },
    complianceCascade: { enabled: false, preSaleBlocking: true, auditAlerts: true },
    demandPrediction: { enabled: false, paydayCycleAware: true, seasonalAdjust: false },
  },

  thresholds: {
    tillVarianceAmber: 50,       // R50
    tillVarianceRed: 200,        // R200
    lowStockDays: 7,
    criticalStockDays: 3,
    potencyDropPercent: 15,      // trigger markdown at 15% potency loss
    supplierConcentration: 60,   // % from one supplier = amber
    voidRefundFrequency: 5,      // per shift before flagging
    shiftVarianceStreak: 3,      // consecutive shifts with variance
  },

  branchOverrides: {},
};

// ─── Factory: empty BranchWorldState ─────────────────────────────
// P19-upgraded shape — richer domain slices for reducer processing

export function createBranchWorldState(branchId, branchName) {
  return {
    branchId,
    branchName: branchName || '',
    lastUpdated: Date.now(),

    inventory: {
      totalSKUs: 0,
      lowStockItems: [],
      criticalStockItems: [],
      potencyAlerts: [],
      pendingTransfers: [],
      reorderSuggestions: [],
      batchesNearExpiry: [],
      totalValue: 0,
      shrinkageRate: 0,
    },

    financial: {
      dailyRevenue: 0,
      dailyTransactions: 0,
      avgBasketSize: 0,
      tillVariances: [],
      cashToCardRatio: 0,
      discountTotal: 0,
      refundTotal: 0,
      voidCount: 0,
    },

    compliance: {
      auditReadinessScore: 100,
      purchaseLimitAlerts: [],
      expiringDocuments: [],
      section21Status: { compliant: 0, pending: 0, expired: 0 },
      blockedSales: [],
    },

    staff: {
      onShift: [],
      accountabilityScores: {},
      varianceTrends: {},
      shiftMetrics: {},
    },

    operational: {
      pendingOrders: 0,
      packingQueue: 0,
      dispatchQueue: 0,
      approvalQueue: [],
      stocktakeStatus: null,
    },

    customer: {
      activeCustomers: 0,
      purchaseLimitProximity: [],
      wellnessPointsIssued: 0,
      section21Patients: 0,
    },

    riskScore: { overall: 0, regulatory: 0, financial: 0, inventory: 0, staff: 0, operational: 0, customer: 0 },
    stockHealth: { overall: 100, coverage: 100, freshness: 100, diversity: 100, turnover: 0 },
  };
}

// ─── Factory: empty DBCWorldState ────────────────────────────────

export function createDBCWorldState(userId, userRole, activeBranchId) {
  return {
    userId,
    userRole,
    activeBranchId: activeBranchId || 'ALL',
    branches: {},

    // Network-wide (computed by reducers in P19)
    networkRiskScore: null,
    networkStockHealth: null,
    crossBranchInsights: [],
  };
}
