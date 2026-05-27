// P19+P34 — World Model State Management for Origin
// Reducer: handles all 30 events + __BATCH__, updates branch state, checks feature config.
// Persistence: localStorage per user, backend sync every 30s.
// Config: loaded from API, cached 5 minutes, falls back to defaults.

import api from '../services/api';
import {
  SALE_COMPLETED, SALE_VOIDED, REFUND_PROCESSED, DISCOUNT_APPLIED,
  TILL_OPENED, TILL_CLOSED, CASH_IN_OUT,
  STOCK_RECEIVED, STOCK_ADJUSTED, STOCK_TRANSFERRED,
  BATCH_CREATED, BATCH_QA_RESULT, STOCKTAKE_COMPLETED, REORDER_TRIGGERED,
  SHIFT_STARTED, SHIFT_ENDED, BREAK_TAKEN, VARIANCE_DETECTED,
  PURCHASE_LIMIT_CHECK, SECTION21_VERIFICATION, DOCUMENT_EXPIRY_WARNING,
  ORDER_PLACED, ORDER_PACKED, ORDER_DISPATCHED,
  PO_SUBMITTED, PO_APPROVED, APPROVAL_REQUESTED,
  CUSTOMER_REGISTERED, WELLNESS_POINTS_EARNED, WELLNESS_TIER_CHANGED,
  DEFAULT_WORLD_MODEL_CONFIG,
  createBranchWorldState,
} from './types';

// ─── Config Cache ────────────────────────────────────────────────
// Loaded from GET /api/v1/config/world-model, refreshed every 5 min.
// Falls back to DEFAULT_WORLD_MODEL_CONFIG until first load.

let _configCache = { ...DEFAULT_WORLD_MODEL_CONFIG };
let _configLoadedAt = 0;
const CONFIG_TTL = 5 * 60 * 1000; // 5 minutes

export function getWorldModelConfig() {
  return _configCache;
}

export async function refreshWorldModelConfig() {
  try {
    const res = await api.get('/config/world-model');
    if (res.data) {
      _configCache = { ...DEFAULT_WORLD_MODEL_CONFIG, ...res.data };
      _configLoadedAt = Date.now();
    }
  } catch {
    // API not ready yet (P28-29 builds it) — use defaults silently
    _configCache = { ...DEFAULT_WORLD_MODEL_CONFIG };
  }
  return _configCache;
}

export function isConfigStale() {
  return Date.now() - _configLoadedAt > CONFIG_TTL;
}

// ─── Branch-level Config (with per-branch overrides) ─────────────

function getThresholdsForBranch(branchId) {
  const overrides = _configCache.branchOverrides?.[branchId] || {};
  return { ..._configCache.thresholds, ...overrides };
}

// ─── Domain Handlers ─────────────────────────────────────────────
// Each handler is pure: (domainSlice, eventData, thresholds?) → newDomainSlice

// ── POS → Financial ──────────────────────────────────────────────

function handleSaleFinancial(fin, data) {
  const revenue = fin.dailyRevenue + (data.total || 0);
  const txns = fin.dailyTransactions + 1;
  return {
    ...fin,
    dailyRevenue: revenue,
    dailyTransactions: txns,
    avgBasketSize: txns > 0 ? revenue / txns : 0,
  };
}

function handleVoidFinancial(fin, data) {
  return {
    ...fin,
    voidCount: fin.voidCount + 1,
    dailyRevenue: fin.dailyRevenue - (data.amount || 0),
  };
}

function handleRefundFinancial(fin, data) {
  return {
    ...fin,
    refundTotal: fin.refundTotal + (data.amount || 0),
  };
}

function handleDiscountFinancial(fin, data) {
  return {
    ...fin,
    discountTotal: fin.discountTotal + (data.amount || 0),
  };
}

function handleTillCloseFinancial(fin, data) {
  const variance = {
    tillId: data.tillId,
    expected: data.expected || 0,
    actual: data.actual || 0,
    amount: (data.actual || 0) - (data.expected || 0),
    closedAt: Date.now(),
    staffId: data.staffId,
  };
  return {
    ...fin,
    tillVariances: [...fin.tillVariances, variance],
  };
}

function handleCashMovementFinancial(fin, data) {
  const ratio = data.cashTotal && data.cardTotal
    ? data.cashTotal / (data.cashTotal + data.cardTotal)
    : fin.cashToCardRatio;
  return { ...fin, cashToCardRatio: ratio };
}

// ── POS → Inventory (feature-gated: smartStock) ──────────────────

function handleSaleInventory(inv, data) {
  if (!data.items) return inv;
  const lowIds = new Set(inv.lowStockItems.map(i => i.productId));
  const critIds = new Set(inv.criticalStockItems.map(i => i.productId));

  for (const item of data.items) {
    if (item.remainingStock != null && item.remainingStock <= 5) {
      critIds.add(item.productId);
    } else if (item.remainingStock != null && item.remainingStock <= 15) {
      lowIds.add(item.productId);
    }
  }
  return inv;
}

// ── POS → Compliance (feature-gated: complianceCascade) ──────────

function handleSaleCompliance(comp, data) {
  if (data.section21) {
    return {
      ...comp,
      section21Status: {
        ...comp.section21Status,
        compliant: comp.section21Status.compliant + 1,
      },
    };
  }
  if (data.purchaseLimitWarning) {
    return {
      ...comp,
      purchaseLimitAlerts: [...comp.purchaseLimitAlerts, {
        customerId: data.customerId,
        currentTotal: data.purchaseLimitWarning.currentTotal,
        limit: data.purchaseLimitWarning.limit,
        timestamp: Date.now(),
      }],
    };
  }
  return comp;
}

// ── POS → Staff (feature-gated: staffAccountability) ─────────────

function handleSaleStaff(staff, data) {
  if (!data.staffId) return staff;
  const scores = { ...staff.accountabilityScores };
  const current = scores[data.staffId] || { sales: 0, revenue: 0 };
  scores[data.staffId] = {
    sales: current.sales + 1,
    revenue: current.revenue + (data.total || 0),
  };
  return { ...staff, accountabilityScores: scores };
}

// ── Inventory Events ─────────────────────────────────────────────

function handleStockReceived(inv, data) {
  return {
    ...inv,
    totalSKUs: data.totalSKUs ?? inv.totalSKUs,
    totalValue: inv.totalValue + (data.value || 0),
  };
}

function handleStockAdjusted(inv, data) {
  const shrinkage = data.reason === 'shrinkage'
    ? inv.shrinkageRate + (data.quantity || 0)
    : inv.shrinkageRate;
  return { ...inv, shrinkageRate: shrinkage };
}

function handleStockTransferred(inv, data) {
  return {
    ...inv,
    pendingTransfers: [...inv.pendingTransfers, {
      transferId: data.transferId,
      fromBranch: data.fromBranch,
      toBranch: data.toBranch,
      items: data.items || [],
      timestamp: Date.now(),
    }],
  };
}

function handleBatchCreated(inv, data) {
  if (data.nearExpiry) {
    return {
      ...inv,
      batchesNearExpiry: [...inv.batchesNearExpiry, {
        batchId: data.batchId,
        productId: data.productId,
        expiryDate: data.expiryDate,
      }],
    };
  }
  return inv;
}

function handleBatchQA(inv, data) {
  if (data.potencyDrop) {
    return {
      ...inv,
      potencyAlerts: [...inv.potencyAlerts, {
        batchId: data.batchId,
        productId: data.productId,
        dropPercent: data.potencyDrop,
        timestamp: Date.now(),
      }],
    };
  }
  return inv;
}

function handleStocktakeCompleted(inv) {
  return { ...inv };
}

function handleReorderTriggered(inv, data) {
  return {
    ...inv,
    reorderSuggestions: [...inv.reorderSuggestions, {
      productId: data.productId,
      suggestedQty: data.suggestedQty,
      supplierId: data.supplierId,
      timestamp: Date.now(),
    }],
  };
}

// ── Staff Events ─────────────────────────────────────────────────

function handleShiftStarted(staff, data) {
  return {
    ...staff,
    onShift: [...staff.onShift, {
      staffId: data.staffId,
      staffName: data.staffName,
      tillId: data.tillId,
      startedAt: Date.now(),
    }],
  };
}

function handleShiftEnded(staff, data) {
  const metrics = { ...staff.shiftMetrics };
  metrics[data.staffId] = {
    ...(metrics[data.staffId] || {}),
    lastShiftEnd: Date.now(),
    totalSales: data.totalSales || 0,
    totalRevenue: data.totalRevenue || 0,
  };
  return {
    ...staff,
    onShift: staff.onShift.filter(s => s.staffId !== data.staffId),
    shiftMetrics: metrics,
  };
}

function handleBreakTaken(staff, data) {
  const metrics = { ...staff.shiftMetrics };
  const current = metrics[data.staffId] || {};
  metrics[data.staffId] = {
    ...current,
    breaks: (current.breaks || 0) + 1,
  };
  return { ...staff, shiftMetrics: metrics };
}

function handleVarianceDetected(staff, data, thresholds) {
  const trends = { ...staff.varianceTrends };
  const history = trends[data.staffId] || [];
  history.push({
    amount: data.amount,
    shiftId: data.shiftId,
    timestamp: Date.now(),
  });
  // Keep last N entries based on shiftVarianceStreak threshold
  const keep = Math.max(thresholds.shiftVarianceStreak || 3, history.length);
  trends[data.staffId] = history.slice(-keep);
  return { ...staff, varianceTrends: trends };
}

// ── Compliance Events ────────────────────────────────────────────

function handlePurchaseLimitCheck(comp, data) {
  if (data.exceeded || data.warning) {
    return {
      ...comp,
      purchaseLimitAlerts: [...comp.purchaseLimitAlerts, {
        customerId: data.customerId,
        productId: data.productId,
        currentTotal: data.currentTotal,
        limit: data.limit,
        exceeded: !!data.exceeded,
        timestamp: Date.now(),
      }],
    };
  }
  return comp;
}

function handleSection21Verification(comp, data) {
  const status = { ...comp.section21Status };
  if (data.result === 'compliant') status.compliant++;
  else if (data.result === 'pending') status.pending++;
  else if (data.result === 'expired') status.expired++;

  if (data.blocked) {
    return {
      ...comp,
      section21Status: status,
      blockedSales: [...comp.blockedSales, {
        customerId: data.customerId,
        reason: data.reason,
        timestamp: Date.now(),
      }],
    };
  }
  return { ...comp, section21Status: status };
}

function handleDocumentExpiry(comp, data) {
  return {
    ...comp,
    expiringDocuments: [...comp.expiringDocuments, {
      documentId: data.documentId,
      type: data.type,
      expiryDate: data.expiryDate,
      entityId: data.entityId,
      entityType: data.entityType,
    }],
    auditReadinessScore: Math.max(0, comp.auditReadinessScore - (data.scoreImpact || 5)),
  };
}

// ── Operational Events ───────────────────────────────────────────

function handleOrderPlaced(ops) {
  return { ...ops, pendingOrders: ops.pendingOrders + 1 };
}

function handleOrderPacked(ops) {
  return {
    ...ops,
    pendingOrders: Math.max(0, ops.pendingOrders - 1),
    packingQueue: ops.packingQueue + 1,
  };
}

function handleOrderDispatched(ops) {
  return {
    ...ops,
    packingQueue: Math.max(0, ops.packingQueue - 1),
    dispatchQueue: ops.dispatchQueue + 1,
  };
}

function handlePOSubmitted(ops) {
  return ops;
}

function handlePOApproved(ops) {
  return ops;
}

function handleApprovalRequested(ops, data) {
  return {
    ...ops,
    approvalQueue: [...ops.approvalQueue, {
      type: data.type,
      entityId: data.entityId,
      requestedBy: data.requestedBy,
      timestamp: Date.now(),
    }],
  };
}

// ── Customer Events ──────────────────────────────────────────────

function handleCustomerRegistered(cust) {
  return { ...cust, activeCustomers: cust.activeCustomers + 1 };
}

function handleWellnessPointsEarned(cust, data) {
  return { ...cust, wellnessPointsIssued: cust.wellnessPointsIssued + (data.points || 0) };
}

function handleWellnessTierChanged(cust) {
  return cust;
}

// ─── Risk Score Calculator ───────────────────────────────────────
// Produces per-domain risk 0-100 and overall weighted average.

function calculateBranchRisk(branch, config) {
  const t = getThresholdsForBranch(branch.branchId);
  const domains = config.features.riskScoring.domains || {};

  const scores = {};

  // Financial risk
  if (domains.financial !== false) {
    let fRisk = 0;
    const recentVariances = branch.financial.tillVariances.slice(-5);
    if (recentVariances.length > 0) {
      const avgVar = recentVariances.reduce((s, v) => s + Math.abs(v.amount), 0) / recentVariances.length;
      if (avgVar > t.tillVarianceRed) fRisk += 40;
      else if (avgVar > t.tillVarianceAmber) fRisk += 20;
    }
    if (branch.financial.voidCount > t.voidRefundFrequency) fRisk += 30;
    scores.financial = Math.min(100, fRisk);
  }

  // Inventory risk
  if (domains.inventory !== false) {
    let iRisk = 0;
    iRisk += branch.inventory.criticalStockItems.length * 10;
    iRisk += branch.inventory.lowStockItems.length * 3;
    iRisk += branch.inventory.potencyAlerts.length * 15;
    scores.inventory = Math.min(100, iRisk);
  }

  // Compliance risk
  if (domains.compliance !== false) {
    let cRisk = 0;
    cRisk += branch.compliance.blockedSales.length * 20;
    cRisk += branch.compliance.expiringDocuments.length * 10;
    cRisk += (100 - branch.compliance.auditReadinessScore) * 0.5;
    scores.compliance = Math.min(100, cRisk);
  }

  // Staff risk
  if (domains.staff !== false) {
    let sRisk = 0;
    for (const staffId of Object.keys(branch.staff.varianceTrends)) {
      const trend = branch.staff.varianceTrends[staffId] || [];
      if (trend.length >= t.shiftVarianceStreak) sRisk += 25;
    }
    scores.staff = Math.min(100, sRisk);
  }

  // Operational risk
  if (domains.operational !== false) {
    let oRisk = 0;
    oRisk += branch.operational.approvalQueue.length * 5;
    if (branch.operational.pendingOrders > 10) oRisk += 20;
    scores.operational = Math.min(100, oRisk);
  }

  // Customer risk
  if (domains.customer !== false) {
    let cuRisk = 0;
    cuRisk += branch.customer.purchaseLimitProximity.length * 10;
    scores.customer = Math.min(100, cuRisk);
  }

  // Regulatory = compliance alias
  scores.regulatory = scores.compliance || 0;

  // Overall = weighted average of enabled domains
  const vals = Object.values(scores);
  const overall = vals.length > 0 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;

  return { overall, ...scores };
}

// ─── The Reducer ─────────────────────────────────────────────────
// Pure function: (state, event) → newState
// Checks feature config before processing feature-gated domains.
// P34: Supports __BATCH__ event to process multiple events in one reducer pass.

export function jigWorldReducer(state, event) {
  // P34: Batch handler — process multiple events, return single new state
  if (event.type === '__BATCH__' && Array.isArray(event.events)) {
    let result = state;
    for (const e of event.events) {
      result = jigWorldReducer(result, e);
    }
    return result;
  }

  const config = getWorldModelConfig();
  const branchId = event.branchId;
  const branch = state.branches[branchId] || createBranchWorldState(branchId);
  const thresholds = getThresholdsForBranch(branchId);
  const data = event.data || {};

  let updated = { ...branch };

  switch (event.type) {
    // ── POS Events ─────────────────────────────────────────────
    case SALE_COMPLETED:
      updated.financial = handleSaleFinancial(updated.financial, data);
      if (config.features.smartStock.enabled) {
        updated.inventory = handleSaleInventory(updated.inventory, data);
      }
      if (config.features.complianceCascade.enabled) {
        updated.compliance = handleSaleCompliance(updated.compliance, data);
      }
      if (config.features.staffAccountability.enabled) {
        updated.staff = handleSaleStaff(updated.staff, data);
      }
      break;

    case SALE_VOIDED:
      updated.financial = handleVoidFinancial(updated.financial, data);
      break;

    case REFUND_PROCESSED:
      updated.financial = handleRefundFinancial(updated.financial, data);
      break;

    case DISCOUNT_APPLIED:
      updated.financial = handleDiscountFinancial(updated.financial, data);
      break;

    case TILL_OPENED:
      updated.staff = handleShiftStarted(updated.staff, data);
      break;

    case TILL_CLOSED:
      updated.financial = handleTillCloseFinancial(updated.financial, data);
      break;

    case CASH_IN_OUT:
      updated.financial = handleCashMovementFinancial(updated.financial, data);
      break;

    // ── Inventory Events ───────────────────────────────────────
    case STOCK_RECEIVED:
      updated.inventory = handleStockReceived(updated.inventory, data);
      break;

    case STOCK_ADJUSTED:
      updated.inventory = handleStockAdjusted(updated.inventory, data);
      break;

    case STOCK_TRANSFERRED:
      updated.inventory = handleStockTransferred(updated.inventory, data);
      break;

    case BATCH_CREATED:
      updated.inventory = handleBatchCreated(updated.inventory, data);
      break;

    case BATCH_QA_RESULT:
      updated.inventory = handleBatchQA(updated.inventory, data);
      if (config.features.potencyDegradation.enabled && data.potencyDrop > config.features.potencyDegradation.markdownThreshold) {
        updated.inventory.potencyAlerts = [...updated.inventory.potencyAlerts, {
          batchId: data.batchId,
          productId: data.productId,
          dropPercent: data.potencyDrop,
          autoMarkdown: config.features.potencyDegradation.autoMarkdown,
          timestamp: Date.now(),
        }];
      }
      break;

    case STOCKTAKE_COMPLETED:
      updated.inventory = handleStocktakeCompleted(updated.inventory, data);
      updated.operational = { ...updated.operational, stocktakeStatus: 'completed' };
      break;

    case REORDER_TRIGGERED:
      updated.inventory = handleReorderTriggered(updated.inventory, data);
      break;

    // ── Staff Events ───────────────────────────────────────────
    case SHIFT_STARTED:
      updated.staff = handleShiftStarted(updated.staff, data);
      break;

    case SHIFT_ENDED:
      updated.staff = handleShiftEnded(updated.staff, data);
      break;

    case BREAK_TAKEN:
      updated.staff = handleBreakTaken(updated.staff, data);
      break;

    case VARIANCE_DETECTED:
      updated.staff = handleVarianceDetected(updated.staff, data, thresholds);
      if (config.features.riskScoring.enabled) {
        updated.riskScore = calculateBranchRisk(updated, config);
      }
      break;

    // ── Compliance Events ──────────────────────────────────────
    case PURCHASE_LIMIT_CHECK:
      updated.compliance = handlePurchaseLimitCheck(updated.compliance, data);
      break;

    case SECTION21_VERIFICATION:
      updated.compliance = handleSection21Verification(updated.compliance, data);
      break;

    case DOCUMENT_EXPIRY_WARNING:
      updated.compliance = handleDocumentExpiry(updated.compliance, data);
      break;

    // ── Operational Events ─────────────────────────────────────
    case ORDER_PLACED:
      updated.operational = handleOrderPlaced(updated.operational, data);
      break;

    case ORDER_PACKED:
      updated.operational = handleOrderPacked(updated.operational, data);
      break;

    case ORDER_DISPATCHED:
      updated.operational = handleOrderDispatched(updated.operational, data);
      break;

    case PO_SUBMITTED:
      updated.operational = handlePOSubmitted(updated.operational, data);
      break;

    case PO_APPROVED:
      updated.operational = handlePOApproved(updated.operational, data);
      break;

    case APPROVAL_REQUESTED:
      updated.operational = handleApprovalRequested(updated.operational, data);
      break;

    // ── Customer Events ────────────────────────────────────────
    case CUSTOMER_REGISTERED:
      updated.customer = handleCustomerRegistered(updated.customer, data);
      break;

    case WELLNESS_POINTS_EARNED:
      updated.customer = handleWellnessPointsEarned(updated.customer, data);
      break;

    case WELLNESS_TIER_CHANGED:
      updated.customer = handleWellnessTierChanged(updated.customer, data);
      break;

    default:
      // Unknown event — no state change
      return state;
  }

  // Recalculate risk after every event if scoring is enabled
  if (config.features.riskScoring.enabled && event.type !== VARIANCE_DETECTED) {
    updated.riskScore = calculateBranchRisk(updated, config);
  }

  updated.lastUpdated = Date.now();

  return {
    ...state,
    branches: { ...state.branches, [branchId]: updated },
  };
}

// ─── Persistence Layer ───────────────────────────────────────────
// Save/load world state to localStorage per user.
// Sync with backend every 30s (backend API built in P28-29).

const STORAGE_PREFIX = 'origin_world_';
let _syncInterval = null;

export function saveWorldState(userId, state) {
  if (!userId) return;
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_PREFIX + userId, serialized);
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

export function loadWorldState(userId) {
  if (!userId) return null;
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + userId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearWorldState(userId) {
  if (userId) {
    localStorage.removeItem(STORAGE_PREFIX + userId);
  }
}

// Sync state to backend (POST /api/v1/world-model/sync)
// Silent on failure — backend API not built until P28-29.
async function syncToBackend(userId, state) {
  if (!userId || !state) return;
  try {
    await api.post('/world-model/sync', { userId, state });
  } catch {
    // Backend not ready — silent
  }
}

export function startBackendSync(userId, getState) {
  stopBackendSync();
  _syncInterval = setInterval(() => {
    const state = getState();
    if (state) {
      saveWorldState(userId, state);
      syncToBackend(userId, state);
    }
  }, 30000); // 30 seconds
}

export function stopBackendSync() {
  if (_syncInterval) {
    clearInterval(_syncInterval);
    _syncInterval = null;
  }
}
