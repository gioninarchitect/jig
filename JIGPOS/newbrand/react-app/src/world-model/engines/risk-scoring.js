// P25 — Cross-Domain Risk Scoring Engine (World First #2)
// 6 domain scorers + cross-domain correlation rules + weighted overall.
// Feature-gated: ONLY active if config.features.riskScoring.enabled === true
// Individual domains toggled via config.features.riskScoring.domains
//
// Builds on P20 inference.js patterns — this engine provides SCORES (0-100),
// while inference.js provides ALERTS (detected patterns).

// ─── Domain Weights (for overall score) ─────────────────────────

const DOMAIN_WEIGHTS = {
  regulatory: 0.25,   // Compliance = highest weight (cannabis industry)
  financial: 0.20,
  inventory: 0.20,
  staff: 0.15,
  operational: 0.10,
  customer: 0.10,
};

// ─── Regulatory/Compliance Risk ─────────────────────────────────

/**
 * Score regulatory risk 0-100.
 * High score = high risk. Factors: audit readiness, expiring docs, purchase limit breaches, blocked sales.
 */
export function scoreRegulatoryRisk(compliance, thresholds) {
  if (!compliance) return 0;
  let score = 0;

  // Audit readiness (inverted — 100% ready = 0 risk)
  const auditGap = 100 - (compliance.auditReadinessScore || 100);
  score += auditGap * 0.3; // 30% weight

  // Expiring documents
  const expiringCount = compliance.expiringDocuments?.length || 0;
  score += Math.min(expiringCount * 5, 30); // 5 pts each, max 30

  // Purchase limit alerts (Section 21 compliance)
  const limitAlerts = compliance.purchaseLimitAlerts?.length || 0;
  score += Math.min(limitAlerts * 8, 20); // 8 pts each, max 20

  // Blocked sales
  const blockedCount = compliance.blockedSales?.length || 0;
  score += Math.min(blockedCount * 10, 20); // 10 pts each, max 20

  // Section 21 pending/expired docs
  const s21 = compliance.section21Status || {};
  if (s21.expired > 0) score += Math.min(s21.expired * 5, 10);

  return Math.min(100, Math.round(score));
}

// ─── Financial Risk ─────────────────────────────────────────────

/**
 * Score financial risk 0-100.
 * Factors: till variances, void/refund ratio, discount abuse, cash-heavy ratio.
 */
export function scoreFinancialRisk(financial, thresholds) {
  if (!financial) return 0;
  let score = 0;

  // Till variances
  const variances = financial.tillVariances || [];
  if (variances.length > 0) {
    const totalVariance = variances.reduce((s, v) => s + Math.abs(v.amount || 0), 0);
    const avgVariance = totalVariance / variances.length;

    if (avgVariance > (thresholds.tillVarianceRed || 200)) {
      score += 30;
    } else if (avgVariance > (thresholds.tillVarianceAmber || 50)) {
      score += 15;
    }
  }

  // Void count
  const voidThreshold = thresholds.voidRefundFrequency || 5;
  if ((financial.voidCount || 0) > voidThreshold * 2) {
    score += 20;
  } else if ((financial.voidCount || 0) > voidThreshold) {
    score += 10;
  }

  // Refund total as % of revenue
  if (financial.dailyRevenue > 0) {
    const refundRatio = (financial.refundTotal || 0) / financial.dailyRevenue;
    if (refundRatio > 0.1) score += 20;        // >10% refund rate
    else if (refundRatio > 0.05) score += 10;   // >5%
  }

  // Discount abuse
  if (financial.dailyRevenue > 0) {
    const discountRatio = (financial.discountTotal || 0) / financial.dailyRevenue;
    if (discountRatio > 0.15) score += 15;      // >15% discount rate
    else if (discountRatio > 0.08) score += 8;
  }

  // Cash-heavy ratio (>70% cash = money laundering risk)
  if ((financial.cashToCardRatio || 0) > 0.7) {
    score += 15;
  }

  return Math.min(100, Math.round(score));
}

// ─── Inventory Risk ─────────────────────────────────────────────

/**
 * Score inventory risk 0-100.
 * Factors: low stock, critical stock, shrinkage, pending transfers, batch expiry.
 */
export function scoreInventoryRisk(inventory, thresholds) {
  if (!inventory) return 0;
  let score = 0;

  // Low stock items
  const lowCount = inventory.lowStockItems?.length || 0;
  score += Math.min(lowCount * 3, 20); // 3 pts each, max 20

  // Critical stock items (more severe)
  const criticalCount = inventory.criticalStockItems?.length || 0;
  score += Math.min(criticalCount * 8, 25); // 8 pts each, max 25

  // Shrinkage rate
  if ((inventory.shrinkageRate || 0) > 5) score += 20;
  else if ((inventory.shrinkageRate || 0) > 2) score += 10;

  // Pending transfers (supply chain delays)
  const pendingCount = inventory.pendingTransfers?.length || 0;
  score += Math.min(pendingCount * 5, 15);

  // Batch expiry alerts
  const expiryCount = inventory.batchesNearExpiry?.length || 0;
  score += Math.min(expiryCount * 4, 15);

  // Potency alerts (cannabis-specific)
  const potencyCount = inventory.potencyAlerts?.length || 0;
  score += Math.min(potencyCount * 2, 5);

  return Math.min(100, Math.round(score));
}

// ─── Staff Risk ─────────────────────────────────────────────────

/**
 * Score staff risk 0-100.
 * Factors: variance streaks, understaffing, accountability scores.
 */
export function scoreStaffRisk(staff, thresholds) {
  if (!staff) return 0;
  let score = 0;

  // Staff with variance streaks
  const varianceTrends = staff.varianceTrends || {};
  const streakThreshold = thresholds.shiftVarianceStreak || 3;
  let flaggedCount = 0;

  for (const trends of Object.values(varianceTrends)) {
    if (Array.isArray(trends) && trends.length >= streakThreshold) {
      flaggedCount++;
    }
  }
  score += Math.min(flaggedCount * 15, 30);

  // Low accountability scores
  const scores = staff.accountabilityScores || {};
  const lowScorers = Object.values(scores).filter(s => (s.score || s) < 60).length;
  score += Math.min(lowScorers * 10, 25);

  // Understaffing (fewer than 2 on shift)
  const onShift = staff.onShift?.length || 0;
  if (onShift === 0) score += 25;
  else if (onShift === 1) score += 15;

  // Shift metrics — high overtime or absenteeism
  const metrics = staff.shiftMetrics || {};
  if (metrics.overtimeHours > 20) score += 10;
  if (metrics.absentDays > 3) score += 10;

  return Math.min(100, Math.round(score));
}

// ─── Operational Risk ───────────────────────────────────────────

/**
 * Score operational risk 0-100.
 * Factors: approval backlog, pending orders, packing delays, stocktake status.
 */
export function scoreOperationalRisk(operational, thresholds) {
  if (!operational) return 0;
  let score = 0;

  // Approval queue
  const approvalCount = operational.approvalQueue?.length || 0;
  score += Math.min(approvalCount * 5, 25);

  // Pending orders
  const pendingOrders = operational.pendingOrders || 0;
  if (pendingOrders > 10) score += 20;
  else if (pendingOrders > 5) score += 10;

  // Packing queue
  const packingQueue = operational.packingQueue || 0;
  if (packingQueue > 10) score += 15;
  else if (packingQueue > 5) score += 8;

  // Dispatch queue
  const dispatchQueue = operational.dispatchQueue || 0;
  if (dispatchQueue > 5) score += 10;

  // Stocktake overdue
  if (operational.stocktakeStatus === 'overdue') score += 20;
  else if (operational.stocktakeStatus === 'due') score += 10;

  return Math.min(100, Math.round(score));
}

// ─── Customer Risk ──────────────────────────────────────────────

/**
 * Score customer risk 0-100.
 * Factors: purchase limit proximity, low engagement, Section 21 concentration.
 */
export function scoreCustomerRisk(customer, thresholds) {
  if (!customer) return 0;
  let score = 0;

  // Customers near purchase limits (diversion risk)
  const limitProximity = customer.purchaseLimitProximity || [];
  const nearLimit = limitProximity.filter(c => (c.usedPercent || 0) > 80).length;
  score += Math.min(nearLimit * 10, 30);

  // Low active customer count (business health)
  if ((customer.activeCustomers || 0) < 10) score += 15;

  // High Section 21 concentration (regulatory exposure)
  const s21Ratio = customer.section21Patients > 0 && customer.activeCustomers > 0
    ? customer.section21Patients / customer.activeCustomers
    : 0;
  if (s21Ratio > 0.7) score += 20;
  else if (s21Ratio > 0.5) score += 10;

  return Math.min(100, Math.round(score));
}

// ─── Weighted Overall Score ─────────────────────────────────────

function calculateWeightedOverall(scores, enabledDomains) {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const [domain, weight] of Object.entries(DOMAIN_WEIGHTS)) {
    if (scores[domain] != null && enabledDomains?.[domain] !== false) {
      weightedSum += (scores[domain] || 0) * weight;
      totalWeight += weight;
    }
  }

  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

// ─── Main: Calculate Branch Risk ────────────────────────────────

/**
 * Calculate risk score for a branch across all enabled domains.
 * @param {Object} state — BranchWorldState
 * @param {Object} config — WorldModelConfig
 * @returns {Object} { overall, regulatory, financial, inventory, staff, operational, customer }
 */
export function calculateBranchRisk(state, config) {
  if (!config?.features?.riskScoring?.enabled || !state) {
    return { overall: 0, regulatory: 0, financial: 0, inventory: 0, staff: 0, operational: 0, customer: 0 };
  }

  const domains = config.features.riskScoring.domains || {};
  const thresholds = {
    ...config.thresholds,
    ...(config.branchOverrides?.[state.branchId] || {}),
  };

  const scores = {};

  if (domains.regulatory !== false) {
    scores.regulatory = scoreRegulatoryRisk(state.compliance, thresholds);
  }
  if (domains.financial !== false) {
    scores.financial = scoreFinancialRisk(state.financial, thresholds);
  }
  if (domains.inventory !== false) {
    scores.inventory = scoreInventoryRisk(state.inventory, thresholds);
  }
  if (domains.staff !== false) {
    scores.staff = scoreStaffRisk(state.staff, thresholds);
  }
  if (domains.operational !== false) {
    scores.operational = scoreOperationalRisk(state.operational, thresholds);
  }
  if (domains.customer !== false) {
    scores.customer = scoreCustomerRisk(state.customer, thresholds);
  }

  scores.overall = calculateWeightedOverall(scores, domains);

  return scores;
}

// ─── Cross-Domain Correlation Rules (World First #2) ────────────
// Formal rule definitions that detect patterns spanning multiple domains.
// These extend P20's inference patterns with structured rule objects.

export const CROSS_DOMAIN_RULES = [
  {
    id: 'internal_theft_pattern',
    name: 'Probable Internal Theft',
    domains: ['financial', 'staff', 'inventory'],
    severity: 'critical',
    action: 'Investigate cashier shifts against product shrinkage patterns',
    detect: (state) => {
      // High till variance + same cashier + inventory shrinkage
      const variances = state.financial?.tillVariances || [];
      const shrinkageRate = state.inventory?.shrinkageRate || 0;
      if (variances.length < 2 || shrinkageRate <= 0) return null;

      // Find staff with repeated high variances
      const staffVariance = {};
      for (const v of variances) {
        if (v.staffId) {
          if (!staffVariance[v.staffId]) staffVariance[v.staffId] = { count: 0, total: 0 };
          staffVariance[v.staffId].count++;
          staffVariance[v.staffId].total += Math.abs(v.amount || 0);
        }
      }

      const suspects = Object.entries(staffVariance)
        .filter(([, data]) => data.count >= 2 && data.total > 100)
        .map(([staffId, data]) => ({ staffId, ...data }));

      return suspects.length > 0 ? { suspects, shrinkageRate } : null;
    },
  },
  {
    id: 'receiving_fraud',
    name: 'Possible Receiving Fraud',
    domains: ['inventory', 'staff', 'operational'],
    severity: 'critical',
    action: 'Audit receiving logs against supplier invoices',
    detect: (state) => {
      // Shrinkage during active receiving + pending transfers
      const shrinkage = state.inventory?.shrinkageRate || 0;
      const pendingTransfers = state.inventory?.pendingTransfers?.length || 0;
      const recentStocktake = state.operational?.stocktakeStatus;

      if (shrinkage > 3 && pendingTransfers > 0) {
        return {
          shrinkageRate: shrinkage,
          pendingTransfers,
          stocktakeStatus: recentStocktake,
        };
      }
      return null;
    },
  },
  {
    id: 'diversion_risk',
    name: 'Customer Diversion Risk',
    domains: ['customer', 'compliance'],
    severity: 'warning',
    action: 'Flag customer for compliance team review',
    detect: (state) => {
      // Customers repeatedly hitting purchase limits
      const limitAlerts = state.compliance?.purchaseLimitAlerts || [];
      const proximity = state.customer?.purchaseLimitProximity || [];

      // Repeat offenders (2+ limit alerts for same customer)
      const customerCounts = {};
      for (const a of limitAlerts) {
        const cid = a.customerId || a.patientId;
        if (cid) customerCounts[cid] = (customerCounts[cid] || 0) + 1;
      }

      const repeaters = Object.entries(customerCounts)
        .filter(([, count]) => count >= 2)
        .map(([customerId, count]) => ({ customerId, alertCount: count }));

      // Customers at >90% of limit
      const nearLimit = proximity.filter(c => (c.usedPercent || 0) > 90);

      if (repeaters.length > 0 || nearLimit.length > 0) {
        return { repeaters, nearLimitCount: nearLimit.length };
      }
      return null;
    },
  },
  {
    id: 'unrecorded_loss',
    name: 'Unrecorded Product Loss',
    domains: ['financial', 'inventory'],
    severity: 'critical',
    action: 'Compare POS transaction count vs stock movement count',
    detect: (state) => {
      // Revenue stable/up but stock dropping without matching sales
      const revenue = state.financial?.dailyRevenue || 0;
      const transactions = state.financial?.dailyTransactions || 0;
      const shrinkage = state.inventory?.shrinkageRate || 0;

      // Shrinkage > 2% AND revenue per transaction looks normal
      if (shrinkage > 2 && transactions > 5 && revenue > 0) {
        return {
          shrinkageRate: shrinkage,
          dailyTransactions: transactions,
          avgTransaction: Math.round(revenue / transactions),
        };
      }
      return null;
    },
  },
  {
    id: 'pricing_anomaly',
    name: 'Pricing or Discount Abuse',
    domains: ['financial', 'staff'],
    severity: 'warning',
    action: 'Review discount approval trail for flagged staff',
    detect: (state) => {
      // High discount rate + specific staff variance
      const discountTotal = state.financial?.discountTotal || 0;
      const revenue = state.financial?.dailyRevenue || 0;

      if (revenue <= 0) return null;
      const discountRate = discountTotal / revenue;

      if (discountRate > 0.12) {
        // Check for staff correlation
        const variances = state.financial?.tillVariances || [];
        const staffWithDiscount = variances
          .filter(v => v.staffId && Math.abs(v.amount || 0) > 30)
          .map(v => v.staffId);

        return {
          discountRate: Math.round(discountRate * 100),
          flaggedStaff: [...new Set(staffWithDiscount)],
        };
      }
      return null;
    },
  },
];

/**
 * Run all cross-domain rules against a branch state.
 * @param {Object} state — BranchWorldState
 * @param {Object} config — WorldModelConfig
 * @returns {Array} triggered alerts
 */
export function runCrossDomainRules(state, config) {
  if (!config?.features?.riskScoring?.enabled || !state) return [];

  const alerts = [];
  for (const rule of CROSS_DOMAIN_RULES) {
    try {
      const result = rule.detect(state);
      if (result) {
        alerts.push({
          ruleId: rule.id,
          name: rule.name,
          domains: rule.domains,
          severity: rule.severity,
          action: rule.action,
          data: result,
          detectedAt: Date.now(),
        });
      }
    } catch {
      // Rule detection should never crash the system
    }
  }

  // Critical first
  alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1));
  return alerts;
}

// ─── Network Risk Score ─────────────────────────────────────────

/**
 * Calculate risk across all branches (owner view).
 * @param {Object} allBranches — { branchId: BranchWorldState }
 * @param {Object} config
 * @returns {Object} { branchScores, networkAverage, highestRisk, crossDomainAlerts }
 */
export function calculateNetworkRisk(allBranches, config) {
  if (!config?.features?.riskScoring?.enabled || !allBranches) {
    return { branchScores: {}, networkAverage: 0, highestRisk: null, crossDomainAlerts: [] };
  }

  const branchScores = {};
  let totalOverall = 0;
  let highestRisk = null;
  let allAlerts = [];

  const branchIds = Object.keys(allBranches);
  for (const id of branchIds) {
    const state = allBranches[id];
    const scores = calculateBranchRisk(state, config);
    branchScores[id] = { ...scores, branchName: state.branchName || id };
    totalOverall += scores.overall;

    if (!highestRisk || scores.overall > highestRisk.overall) {
      highestRisk = { branchId: id, branchName: state.branchName || id, ...scores };
    }

    // Run cross-domain rules per branch
    const alerts = runCrossDomainRules(state, config);
    allAlerts = allAlerts.concat(alerts.map(a => ({ ...a, branchId: id, branchName: state.branchName || id })));
  }

  return {
    branchScores,
    networkAverage: branchIds.length > 0 ? Math.round(totalOverall / branchIds.length) : 0,
    highestRisk,
    crossDomainAlerts: allAlerts,
  };
}
