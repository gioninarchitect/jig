// P20 — World Model Inference Engine for Origin
// Replaces template mood/emotion patterns with Origin operational patterns.
// 7 risk patterns + cross-domain correlation (World First #2).

import { getWorldModelConfig } from './state';

// ─── Risk Pattern Definitions ────────────────────────────────────
// Each pattern: detect(branchState, config) → boolean | data
//               severity: 'warning' | 'critical' | function
//               action: string (human-readable next step)
//               domain: which domain this pattern belongs to

const RISK_PATTERNS = {
  till_variance_trend: {
    id: 'till_variance_trend',
    label: 'Till Variance Trend',
    domain: 'financial',
    detect: (state, config) => {
      const recent = state.financial.tillVariances.slice(-5);
      if (recent.length < 2) return null;
      const avgVariance = recent.reduce((s, v) => s + Math.abs(v.amount), 0) / recent.length;
      if (avgVariance <= config.thresholds.tillVarianceAmber) return null;
      return { avgVariance, count: recent.length };
    },
    severity: (data, config) =>
      data.avgVariance > config.thresholds.tillVarianceRed ? 'critical' : 'warning',
    action: 'Investigate till handling procedures',
  },

  shrinkage_acceleration: {
    id: 'shrinkage_acceleration',
    label: 'Shrinkage Acceleration',
    domain: 'inventory',
    detect: (state) => {
      if (state.inventory.shrinkageRate <= 0) return null;
      // Flag any non-zero shrinkage as needing attention
      return { rate: state.inventory.shrinkageRate };
    },
    severity: () => 'warning',
    action: 'Review receiving logs and stocktake accuracy',
  },

  staff_pattern_correlation: {
    id: 'staff_pattern_correlation',
    label: 'Staff Anomaly Correlation',
    domain: 'staff',
    detect: (state, config) => {
      // World First #5 — Staff Accountability Intelligence
      // Cross-reference: high variance streak + same staff member
      const streak = config.thresholds.shiftVarianceStreak || 3;
      const flagged = [];
      for (const [staffId, trends] of Object.entries(state.staff.varianceTrends)) {
        if (trends.length >= streak) {
          const totalVariance = trends.reduce((s, t) => s + Math.abs(t.amount), 0);
          flagged.push({ staffId, streak: trends.length, totalVariance });
        }
      }
      return flagged.length > 0 ? { flaggedStaff: flagged } : null;
    },
    severity: () => 'critical',
    action: 'Manager investigation required — correlated anomalies detected',
  },

  supplier_concentration: {
    id: 'supplier_concentration',
    label: 'Supplier Concentration Risk',
    domain: 'inventory',
    detect: (state, config) => {
      // Check if reorder suggestions lean heavily toward one supplier
      const suggestions = state.inventory.reorderSuggestions;
      if (suggestions.length < 3) return null;
      const supplierCounts = {};
      for (const s of suggestions) {
        if (s.supplierId) {
          supplierCounts[s.supplierId] = (supplierCounts[s.supplierId] || 0) + 1;
        }
      }
      const total = suggestions.length;
      for (const [supplierId, count] of Object.entries(supplierCounts)) {
        const pct = (count / total) * 100;
        if (pct >= config.thresholds.supplierConcentration) {
          return { supplierId, percentage: Math.round(pct) };
        }
      }
      return null;
    },
    severity: () => 'warning',
    action: 'Diversify supplier base to reduce stockout risk',
  },

  potency_degradation: {
    id: 'potency_degradation',
    label: 'Potency Degradation',
    domain: 'inventory',
    detect: (state, config) => {
      if (!config.features.potencyDegradation.enabled) return null;
      const threshold = config.thresholds.potencyDropPercent || 15;
      const alerts = state.inventory.potencyAlerts.filter(
        (a) => a.dropPercent >= threshold
      );
      return alerts.length > 0 ? { alerts, count: alerts.length } : null;
    },
    severity: () => 'warning',
    action: 'Suggest markdown or bundle deal for aging stock',
  },

  purchase_limit_pattern: {
    id: 'purchase_limit_pattern',
    label: 'Purchase Limit Pattern',
    domain: 'compliance',
    detect: (state) => {
      // Customers with repeated purchase limit alerts = possible diversion risk
      const alerts = state.compliance.purchaseLimitAlerts;
      if (alerts.length < 2) return null;
      const customerCounts = {};
      for (const a of alerts) {
        customerCounts[a.customerId] = (customerCounts[a.customerId] || 0) + 1;
      }
      const repeat = Object.entries(customerCounts)
        .filter(([, count]) => count >= 2)
        .map(([customerId, count]) => ({ customerId, alerts: count }));
      return repeat.length > 0 ? { repeatOffenders: repeat } : null;
    },
    severity: () => 'critical',
    action: 'Flag customer for compliance review',
  },

  document_expiry_cluster: {
    id: 'document_expiry_cluster',
    label: 'Document Expiry Cluster',
    domain: 'compliance',
    detect: (state) => {
      const expiring = state.compliance.expiringDocuments;
      if (expiring.length < 2) return null;
      return { count: expiring.length, documents: expiring };
    },
    severity: (data) => data.count >= 5 ? 'critical' : 'warning',
    action: 'Bulk document renewal required before audit',
  },
};

// ─── Pattern Detection ───────────────────────────────────────────
// Runs all patterns against a branch state and returns alerts.

export function detectRiskPatterns(branchState, config) {
  if (!branchState || !config) return [];

  const alerts = [];
  for (const pattern of Object.values(RISK_PATTERNS)) {
    try {
      const result = pattern.detect(branchState, config);
      if (result) {
        const severity = typeof pattern.severity === 'function'
          ? pattern.severity(result, config)
          : pattern.severity;
        alerts.push({
          id: pattern.id,
          label: pattern.label,
          domain: pattern.domain,
          severity,
          action: pattern.action,
          data: result,
          detectedAt: Date.now(),
        });
      }
    } catch {
      // Pattern detection should never crash the app
    }
  }

  // Sort: critical first, then warning
  alerts.sort((a, b) => {
    if (a.severity === 'critical' && b.severity !== 'critical') return -1;
    if (a.severity !== 'critical' && b.severity === 'critical') return 1;
    return 0;
  });

  return alerts;
}

// ─── Cross-Domain Correlation Engine ─────────────────────────────
// World First #2: finds patterns that span multiple domains.

export function detectCrossDomainPatterns(branchState, config) {
  if (!branchState || !config?.features?.riskScoring?.enabled) return [];

  const insights = [];

  // Pattern 1: High variance + high voids + same cashier
  // Financial anomaly correlated with staff behaviour
  const recentVariances = branchState.financial.tillVariances.slice(-5);
  if (recentVariances.length > 0 && branchState.financial.voidCount > (config.thresholds.voidRefundFrequency || 5)) {
    const staffVarianceMap = {};
    for (const v of recentVariances) {
      if (v.staffId) {
        staffVarianceMap[v.staffId] = (staffVarianceMap[v.staffId] || 0) + Math.abs(v.amount);
      }
    }
    for (const [staffId, totalVar] of Object.entries(staffVarianceMap)) {
      if (totalVar > (config.thresholds.tillVarianceRed || 200)) {
        insights.push({
          type: 'variance_void_correlation',
          severity: 'critical',
          domains: ['financial', 'staff'],
          description: `Staff ${staffId} has high till variance (R${totalVar.toFixed(0)}) combined with elevated void count`,
          action: 'Cross-reference void logs with this staff member\'s shifts',
          data: { staffId, totalVariance: totalVar, voidCount: branchState.financial.voidCount },
          detectedAt: Date.now(),
        });
      }
    }
  }

  // Pattern 2: Revenue drop + stock stable + traffic normal
  // Possible pricing issue or theft
  if (branchState.financial.dailyRevenue > 0 && branchState.financial.avgBasketSize > 0) {
    const expectedBasket = branchState.financial.dailyRevenue / Math.max(branchState.financial.dailyTransactions, 1);
    if (expectedBasket < branchState.financial.avgBasketSize * 0.5 && branchState.financial.dailyTransactions > 5) {
      insights.push({
        type: 'revenue_anomaly',
        severity: 'warning',
        domains: ['financial', 'inventory'],
        description: 'Average basket size dropped significantly — possible pricing or discount abuse',
        action: 'Review discount logs and product pricing',
        data: { avgBasket: expectedBasket, historical: branchState.financial.avgBasketSize },
        detectedAt: Date.now(),
      });
    }
  }

  // Pattern 3: Stock receiving + variance on same day
  // Inventory shrinkage during receiving
  if (branchState.inventory.shrinkageRate > 0 && branchState.inventory.pendingTransfers.length > 0) {
    insights.push({
      type: 'receiving_shrinkage_correlation',
      severity: 'warning',
      domains: ['inventory', 'staff'],
      description: 'Shrinkage detected during active receiving period',
      action: 'Review receiving logs and verify quantities against delivery notes',
      data: { shrinkageRate: branchState.inventory.shrinkageRate, pendingTransfers: branchState.inventory.pendingTransfers.length },
      detectedAt: Date.now(),
    });
  }

  // Pattern 4: Blocked sales + expiring documents
  // Compliance cascade risk
  if (branchState.compliance.blockedSales.length > 0 && branchState.compliance.expiringDocuments.length > 0) {
    insights.push({
      type: 'compliance_cascade',
      severity: 'critical',
      domains: ['compliance'],
      description: `${branchState.compliance.blockedSales.length} blocked sales with ${branchState.compliance.expiringDocuments.length} expiring documents — audit risk`,
      action: 'Immediate document renewal and compliance review',
      data: {
        blockedCount: branchState.compliance.blockedSales.length,
        expiringCount: branchState.compliance.expiringDocuments.length,
      },
      detectedAt: Date.now(),
    });
  }

  // Pattern 5: High approval queue + pending orders
  // Operational bottleneck
  if (branchState.operational.approvalQueue.length > 3 && branchState.operational.pendingOrders > 5) {
    insights.push({
      type: 'operational_bottleneck',
      severity: 'warning',
      domains: ['operational'],
      description: 'Approval backlog creating order fulfilment delays',
      action: 'Escalate pending approvals to branch manager',
      data: {
        approvalsPending: branchState.operational.approvalQueue.length,
        ordersPending: branchState.operational.pendingOrders,
      },
      detectedAt: Date.now(),
    });
  }

  return insights;
}

// ─── Cross-Branch Anomaly Detection (Owner view) ─────────────────
// Compares same metrics across branches; flags outliers.

export function detectCrossBranchAnomalies(allBranches, config) {
  if (!config?.features?.riskScoring?.enabled) return [];

  const branchIds = Object.keys(allBranches);
  if (branchIds.length < 2) return [];

  const insights = [];

  // Compare daily revenue across branches
  const revenues = branchIds.map((id) => ({
    branchId: id,
    branchName: allBranches[id].branchName,
    revenue: allBranches[id].financial.dailyRevenue,
  }));
  const avgRevenue = revenues.reduce((s, r) => s + r.revenue, 0) / revenues.length;

  if (avgRevenue > 0) {
    for (const r of revenues) {
      // Branch doing less than 40% of network average
      if (r.revenue < avgRevenue * 0.4 && r.revenue > 0) {
        insights.push({
          type: 'cross_branch_revenue_outlier',
          severity: 'warning',
          branchId: r.branchId,
          branchName: r.branchName,
          description: `${r.branchName} revenue (R${r.revenue.toFixed(0)}) is significantly below network average (R${avgRevenue.toFixed(0)})`,
          action: 'Investigate branch-specific factors',
          data: { branchRevenue: r.revenue, networkAverage: avgRevenue },
          detectedAt: Date.now(),
        });
      }
    }
  }

  // Compare risk scores across branches
  const riskScores = branchIds.map((id) => ({
    branchId: id,
    branchName: allBranches[id].branchName,
    risk: allBranches[id].riskScore.overall,
  }));
  const avgRisk = riskScores.reduce((s, r) => s + r.risk, 0) / riskScores.length;

  for (const r of riskScores) {
    if (r.risk > avgRisk * 2 && r.risk > (config.features.riskScoring.alertThreshold || 70)) {
      insights.push({
        type: 'cross_branch_risk_outlier',
        severity: 'critical',
        branchId: r.branchId,
        branchName: r.branchName,
        description: `${r.branchName} risk score (${r.risk}) is well above network average (${Math.round(avgRisk)})`,
        action: 'Priority investigation — this branch is a risk outlier',
        data: { branchRisk: r.risk, networkAverage: avgRisk },
        detectedAt: Date.now(),
      });
    }
  }

  return insights;
}

// ─── Stock Intelligence (feature-gated: smartStock) ──────────────

export function calculateStockIntelligence(branchState, config) {
  if (!branchState || !config?.features?.smartStock?.enabled) return null;

  return {
    lowStockCount: branchState.inventory.lowStockItems.length,
    criticalCount: branchState.inventory.criticalStockItems.length,
    potencyAlertCount: branchState.inventory.potencyAlerts.length,
    batchesNearExpiry: branchState.inventory.batchesNearExpiry.length,
    pendingReorders: branchState.inventory.reorderSuggestions.length,
    pendingTransfers: branchState.inventory.pendingTransfers.length,
    totalValue: branchState.inventory.totalValue,
    shrinkageRate: branchState.inventory.shrinkageRate,
    autoReorderEnabled: config.features.smartStock.autoReorder,
    interBranchTransferEnabled: config.features.smartStock.interBranchTransfer,
  };
}

// ─── Staff Scores (feature-gated: staffAccountability) ───────────

export function calculateStaffScores(branchState, config) {
  if (!branchState || !config?.features?.staffAccountability?.enabled) return {};

  const scores = {};
  const { accountabilityScores, varianceTrends, shiftMetrics } = branchState.staff;

  for (const staffId of Object.keys(accountabilityScores)) {
    const acct = accountabilityScores[staffId] || {};
    const variances = varianceTrends[staffId] || [];
    const metrics = shiftMetrics[staffId] || {};

    // Score 0-100: starts at 100, deductions for variances
    let score = 100;
    const varianceThreshold = config.features.staffAccountability.varianceThreshold || 50;

    for (const v of variances) {
      if (Math.abs(v.amount) > varianceThreshold) score -= 15;
      else if (Math.abs(v.amount) > varianceThreshold * 0.5) score -= 5;
    }

    // Positive reinforcement: bonus for clean shifts
    if (config.features.staffAccountability.positiveReinforcement && variances.length === 0 && acct.sales > 0) {
      score = Math.min(100, score + 5);
    }

    scores[staffId] = {
      score: Math.max(0, Math.min(100, score)),
      sales: acct.sales || 0,
      revenue: acct.revenue || 0,
      varianceCount: variances.length,
      lastShiftEnd: metrics.lastShiftEnd || null,
    };
  }

  return scores;
}
