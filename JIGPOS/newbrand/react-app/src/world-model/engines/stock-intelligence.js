// P24 — Predictive Stock Intelligence Engine (World First #3)
// Cannabis-specific demand prediction, intelligent reordering, inter-branch transfers.
// Feature-gated: ONLY active if config.features.smartStock.enabled === true
//
// Demand variables:
//   1. Base sales velocity (last 30 days)
//   2. Cannabinoid preference shifts (THC vs CBD trending)
//   3. Grow method trending (indoor/outdoor/greenhouse)
//   4. Section 21 vs Lifestyle ratio changes
//   5. SA payday cycle (25th + last day of month)
//   6. Seasonal patterns (winter/summer, holiday spikes)
//   7. New vs returning customer demand mix

// ─── Sales Velocity ─────────────────────────────────────────────

/**
 * Calculate average daily sales velocity over a window.
 * @param {Array} sales — [{quantity, soldAt, productId}]
 * @param {number} days — lookback window
 * @returns {number} units per day
 */
export function calculateSalesVelocity(sales, days = 30) {
  if (!sales?.length || days <= 0) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const recentSales = sales.filter(s => new Date(s.soldAt || s.date || s.createdAt) >= cutoff);
  const totalQty = recentSales.reduce((sum, s) => sum + (s.quantity || 1), 0);

  return totalQty / days;
}

// ─── Cannabinoid Preference Shift ───────────────────────────────

/**
 * Detect whether customers are shifting toward higher-THC or higher-CBD products.
 * Compares last 30 days vs prior 30 days.
 */
export function detectCannabinoidShift(sales) {
  if (!sales?.length || sales.length < 10) {
    return { trend: 'stable', multiplier: 1.0, thcShare: 0.5, cbdShare: 0.5 };
  }

  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);

  const recent = sales.filter(s => new Date(s.soldAt || s.date) >= d30);
  const prior = sales.filter(s => {
    const d = new Date(s.soldAt || s.date);
    return d >= d60 && d < d30;
  });

  if (!recent.length || !prior.length) {
    return { trend: 'stable', multiplier: 1.0, thcShare: 0.5, cbdShare: 0.5 };
  }

  // Calculate THC-dominant share in each period
  const thcShareRecent = recent.filter(s => (s.thc || 0) > (s.cbd || 0)).length / recent.length;
  const thcSharePrior = prior.filter(s => (s.thc || 0) > (s.cbd || 0)).length / prior.length;

  const shift = thcShareRecent - thcSharePrior;

  let trend = 'stable';
  let multiplier = 1.0;

  if (shift > 0.1) { trend = 'thc_rising'; multiplier = 1.1; }
  else if (shift < -0.1) { trend = 'cbd_rising'; multiplier = 0.9; }

  return {
    trend,
    multiplier,
    thcShare: Math.round(thcShareRecent * 100) / 100,
    cbdShare: Math.round((1 - thcShareRecent) * 100) / 100,
  };
}

// ─── Grow Method Trending ───────────────────────────────────────

/**
 * Detect if customers are trending toward specific grow methods.
 */
export function detectGrowMethodTrend(sales) {
  if (!sales?.length || sales.length < 10) {
    return { trending: null, multiplier: 1.0, shares: {} };
  }

  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);

  const recent = sales.filter(s => new Date(s.soldAt || s.date) >= d30);
  if (!recent.length) return { trending: null, multiplier: 1.0, shares: {} };

  // Count by grow method
  const counts = {};
  recent.forEach(s => {
    const method = (s.growMethod || 'unknown').toLowerCase();
    counts[method] = (counts[method] || 0) + (s.quantity || 1);
  });

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const shares = {};
  Object.entries(counts).forEach(([k, v]) => { shares[k] = Math.round((v / total) * 100) / 100; });

  // Find dominant method
  const sorted = Object.entries(shares).sort((a, b) => b[1] - a[1]);
  const topMethod = sorted[0]?.[0];
  const topShare = sorted[0]?.[1] || 0;

  return {
    trending: topShare > 0.5 ? topMethod : null,
    multiplier: topShare > 0.6 ? 1.05 : 1.0, // slight boost if strong preference
    shares,
  };
}

// ─── Section 21 vs Lifestyle Track Shift ────────────────────────

/**
 * Detect shifts in Section 21 (medical) vs Lifestyle (recreational) ratio.
 */
export function detectTrackShift(sales) {
  if (!sales?.length || sales.length < 10) {
    return { trend: 'stable', multiplier: 1.0, medicalShare: 0, lifestyleShare: 1 };
  }

  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const d60 = new Date(now); d60.setDate(d60.getDate() - 60);

  const recent = sales.filter(s => new Date(s.soldAt || s.date) >= d30);
  const prior = sales.filter(s => {
    const d = new Date(s.soldAt || s.date);
    return d >= d60 && d < d30;
  });

  if (!recent.length || !prior.length) {
    return { trend: 'stable', multiplier: 1.0, medicalShare: 0, lifestyleShare: 1 };
  }

  const medShareRecent = recent.filter(s => s.track === 'medical' || s.requiresSection21).length / recent.length;
  const medSharePrior = prior.filter(s => s.track === 'medical' || s.requiresSection21).length / prior.length;

  const shift = medShareRecent - medSharePrior;

  let trend = 'stable';
  let multiplier = 1.0;

  if (shift > 0.1) { trend = 'medical_rising'; multiplier = 1.05; }
  else if (shift < -0.1) { trend = 'lifestyle_rising'; multiplier = 0.95; }

  return {
    trend,
    multiplier,
    medicalShare: Math.round(medShareRecent * 100) / 100,
    lifestyleShare: Math.round((1 - medShareRecent) * 100) / 100,
  };
}

// ─── SA Payday Cycle ────────────────────────────────────────────

/**
 * SA payday cycle — demand spikes around 25th and last day of month.
 * Returns multiplier for today's position in the cycle.
 */
export function getPaydayCycleMultiplier(date = new Date()) {
  const day = date.getDate();
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const daysToEnd = lastDay - day;

  // Peak around 25th: days 23-27
  if (day >= 23 && day <= 27) return 1.35;

  // Peak around last/first of month: last 2 days + first 3 days
  if (daysToEnd <= 1 || day <= 3) return 1.25;

  // Mid-month dip: days 8-18
  if (day >= 8 && day <= 18) return 0.85;

  // Normal days
  return 1.0;
}

// ─── Seasonal Patterns ──────────────────────────────────────────

// SA seasons (Southern Hemisphere)
const SEASON_MULTIPLIERS = {
  // Summer (Dec-Feb) — outdoor season, higher demand
  11: 1.15, 0: 1.2, 1: 1.15,
  // Autumn (Mar-May) — harvest season, fresh stock
  2: 1.1, 3: 1.05, 4: 1.0,
  // Winter (Jun-Aug) — indoor preference, slightly lower
  5: 0.9, 6: 0.85, 7: 0.9,
  // Spring (Sep-Nov) — growing anticipation
  8: 0.95, 9: 1.0, 10: 1.05,
};

// Holiday multipliers
const HOLIDAY_MULTIPLIERS = {
  // Month-day → multiplier (major SA dates)
  '12-16': 1.3,  // Day of Reconciliation (long weekend start)
  '12-25': 0.5,  // Christmas (closed or low traffic)
  '12-31': 1.4,  // New Year's Eve
  '1-1': 0.6,    // New Year's Day
  '4-20': 1.5,   // 420 Day — peak cannabis demand
  '3-21': 1.2,   // Human Rights Day (public holiday)
  '4-27': 1.15,  // Freedom Day
  '6-16': 1.1,   // Youth Day
  '9-24': 1.15,  // Heritage Day
};

/**
 * Seasonal demand multiplier factoring SA climate + cannabis-specific events.
 */
export function getSeasonalMultiplier(date = new Date()) {
  const month = date.getMonth();
  const dayKey = `${month + 1}-${date.getDate()}`;

  // Check holiday first (overrides seasonal)
  if (HOLIDAY_MULTIPLIERS[dayKey]) return HOLIDAY_MULTIPLIERS[dayKey];

  return SEASON_MULTIPLIERS[month] || 1.0;
}

// ─── Customer Mix Analysis ──────────────────────────────────────

/**
 * Analyze new vs returning customer ratio — new customers drive trial/discovery demand.
 */
export function analyzeCustomerMix(sales) {
  if (!sales?.length) return { newRatio: 0, returningRatio: 1, multiplier: 1.0 };

  const now = new Date();
  const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
  const recent = sales.filter(s => new Date(s.soldAt || s.date) >= d30);

  if (!recent.length) return { newRatio: 0, returningRatio: 1, multiplier: 1.0 };

  // Count unique customers and their first purchase dates
  const customerFirstSeen = {};
  sales.forEach(s => {
    const cid = s.customerId || s.customer;
    if (!cid) return;
    const d = new Date(s.soldAt || s.date);
    if (!customerFirstSeen[cid] || d < customerFirstSeen[cid]) {
      customerFirstSeen[cid] = d;
    }
  });

  // Of recent sales, how many are from "new" customers (first seen in last 30 days)
  let newCount = 0;
  recent.forEach(s => {
    const cid = s.customerId || s.customer;
    if (!cid) return;
    if (customerFirstSeen[cid] >= d30) newCount++;
  });

  const newRatio = recent.length > 0 ? newCount / recent.length : 0;
  const returningRatio = 1 - newRatio;

  // More new customers = slightly higher demand (discovery purchases are larger)
  const multiplier = 1 + (newRatio * 0.1);

  return {
    newRatio: Math.round(newRatio * 100) / 100,
    returningRatio: Math.round(returningRatio * 100) / 100,
    multiplier: Math.round(multiplier * 100) / 100,
  };
}

// ─── Prediction Confidence ──────────────────────────────────────

/**
 * Confidence level based on sample size.
 */
export function calculatePredictionConfidence(sampleSize) {
  if (sampleSize >= 100) return { level: 'high', score: 0.9 };
  if (sampleSize >= 30) return { level: 'medium', score: 0.7 };
  if (sampleSize >= 10) return { level: 'low', score: 0.5 };
  return { level: 'insufficient', score: 0.2 };
}

// ─── Core: Demand Prediction ────────────────────────────────────

/**
 * Predict daily demand for a product at a branch.
 * @param {Object} params
 * @param {string} params.productId
 * @param {string} params.branchId
 * @param {Array} params.historicalSales — [{quantity, soldAt, customerId, thc, cbd, growMethod, track}]
 * @param {number} params.currentStock — current units on hand
 * @param {number} params.leadTimeDays — supplier delivery time
 * @param {Object} config — WorldModelConfig
 * @returns {Object} DemandPrediction
 */
export function predictDemand({ productId, branchId, historicalSales, currentStock, leadTimeDays = 3 }, config) {
  const baseVelocity = calculateSalesVelocity(historicalSales, 30);

  let adjusted = baseVelocity;
  const adjustments = [];

  if (config?.features?.demandPrediction?.enabled) {
    // 1. Cannabinoid preference shifts
    const cannabinoidTrend = detectCannabinoidShift(historicalSales);
    adjusted *= cannabinoidTrend.multiplier;
    if (cannabinoidTrend.multiplier !== 1.0) {
      adjustments.push({ factor: 'Cannabinoid trend', direction: cannabinoidTrend.trend, impact: cannabinoidTrend.multiplier });
    }

    // 2. Grow method trending
    const growTrend = detectGrowMethodTrend(historicalSales);
    adjusted *= growTrend.multiplier;
    if (growTrend.multiplier !== 1.0) {
      adjustments.push({ factor: 'Grow method', direction: growTrend.trending, impact: growTrend.multiplier });
    }

    // 3. Section 21 vs Lifestyle ratio
    const trackRatio = detectTrackShift(historicalSales);
    adjusted *= trackRatio.multiplier;
    if (trackRatio.multiplier !== 1.0) {
      adjustments.push({ factor: 'Track shift', direction: trackRatio.trend, impact: trackRatio.multiplier });
    }

    // 4. SA payday cycle
    if (config.features.demandPrediction.paydayCycleAware) {
      const paydayMult = getPaydayCycleMultiplier(new Date());
      adjusted *= paydayMult;
      if (paydayMult !== 1.0) {
        adjustments.push({ factor: 'Payday cycle', direction: paydayMult > 1 ? 'peak' : 'dip', impact: paydayMult });
      }
    }

    // 5. Seasonal patterns
    if (config.features.demandPrediction.seasonalAdjust) {
      const seasonalMult = getSeasonalMultiplier(new Date());
      adjusted *= seasonalMult;
      if (seasonalMult !== 1.0) {
        adjustments.push({ factor: 'Seasonal', direction: seasonalMult > 1 ? 'high' : 'low', impact: seasonalMult });
      }
    }

    // 6. Customer mix
    const customerMix = analyzeCustomerMix(historicalSales);
    adjusted *= customerMix.multiplier;
    if (customerMix.multiplier !== 1.0) {
      adjustments.push({ factor: 'Customer mix', direction: `${Math.round(customerMix.newRatio * 100)}% new`, impact: customerMix.multiplier });
    }
  }

  // Ensure non-negative
  adjusted = Math.max(0, adjusted);

  const daysOfStock = adjusted > 0 ? currentStock / adjusted : Infinity;
  const reorderDate = calculateReorderDate(currentStock, adjusted, leadTimeDays);
  const confidence = calculatePredictionConfidence(historicalSales?.length || 0);

  return {
    productId,
    branchId,
    dailyDemand: Math.round(adjusted * 100) / 100,
    baseVelocity: Math.round(baseVelocity * 100) / 100,
    adjustedVelocity: Math.round(adjusted * 100) / 100,
    daysOfStock: daysOfStock === Infinity ? 999 : Math.round(daysOfStock),
    reorderDate,
    reorderUrgency: getReorderUrgency(daysOfStock, leadTimeDays),
    confidence,
    adjustments,
    currentStock,
    leadTimeDays,
  };
}

// ─── Reorder Date Calculation ───────────────────────────────────

function calculateReorderDate(currentStock, dailyDemand, leadTimeDays) {
  if (dailyDemand <= 0) return null;

  // Reorder when stock reaches (leadTimeDays * dailyDemand) — safety buffer
  const safetyBuffer = Math.ceil(leadTimeDays * dailyDemand * 0.5); // 50% safety stock
  const reorderPoint = (leadTimeDays * dailyDemand) + safetyBuffer;
  const daysUntilReorder = (currentStock - reorderPoint) / dailyDemand;

  if (daysUntilReorder <= 0) return new Date(); // Reorder now

  const reorderDate = new Date();
  reorderDate.setDate(reorderDate.getDate() + Math.floor(daysUntilReorder));
  return reorderDate;
}

function getReorderUrgency(daysOfStock, leadTimeDays) {
  if (daysOfStock <= leadTimeDays) return 'critical';       // Will stock out before delivery
  if (daysOfStock <= leadTimeDays * 2) return 'urgent';     // Tight margin
  if (daysOfStock <= leadTimeDays * 3) return 'soon';       // Plan ahead
  return 'healthy';
}

// ─── Reorder Suggestions ────────────────────────────────────────

/**
 * Generate reorder suggestions for a branch.
 * @param {Array} inventoryItems — [{productId, productName, sku, category, quantity, reorderPoint, reorderQuantity, costPrice, leadTimeDays}]
 * @param {Array} salesByProduct — [{productId, sales: [...]}]
 * @param {Object} config
 * @returns {Array} ReorderSuggestion[]
 */
export function generateReorderSuggestions(inventoryItems, salesByProduct, config) {
  if (!config?.features?.smartStock?.enabled) return [];

  const suggestions = [];

  for (const item of inventoryItems) {
    const productSales = salesByProduct?.find(s => s.productId === item.productId)?.sales || [];

    const prediction = predictDemand({
      productId: item.productId,
      branchId: item.branchId,
      historicalSales: productSales,
      currentStock: item.quantity || 0,
      leadTimeDays: item.leadTimeDays || 3,
    }, config);

    // Only suggest if below reorder point OR prediction says urgent
    const belowReorder = (item.quantity || 0) <= (item.reorderPoint || 20);
    const predictedUrgent = prediction.reorderUrgency === 'critical' || prediction.reorderUrgency === 'urgent';

    if (!belowReorder && !predictedUrgent) continue;

    // Calculate optimal order quantity
    const optimalQty = calculateOptimalOrderQuantity(item, prediction);

    suggestions.push({
      productId: item.productId,
      productName: item.productName || item.name,
      sku: item.sku,
      category: item.category,
      currentStock: item.quantity || 0,
      reorderPoint: item.reorderPoint || 20,
      dailyDemand: prediction.dailyDemand,
      daysOfStock: prediction.daysOfStock,
      reorderDate: prediction.reorderDate,
      urgency: prediction.reorderUrgency,
      suggestedQuantity: optimalQty,
      estimatedCost: optimalQty * (item.costPrice || 0),
      confidence: prediction.confidence,
      reason: belowReorder ? 'Below reorder point' : 'Predicted stockout',
      prediction,
    });
  }

  // Sort: critical first, then urgent, then soon
  const urgencyOrder = { critical: 0, urgent: 1, soon: 2, healthy: 3 };
  return suggestions.sort((a, b) => (urgencyOrder[a.urgency] || 3) - (urgencyOrder[b.urgency] || 3));
}

function calculateOptimalOrderQuantity(item, prediction) {
  // Base: configured reorder quantity
  let qty = item.reorderQuantity || 50;

  // Adjust for predicted demand (target 30 days of stock)
  const targetDays = 30;
  const demandBased = Math.ceil(prediction.dailyDemand * targetDays);

  // Use the larger of configured or demand-based
  qty = Math.max(qty, demandBased);

  // Cap at max stock if set
  if (item.maxStock) {
    qty = Math.min(qty, item.maxStock - (item.quantity || 0));
  }

  return Math.max(1, qty);
}

// ─── Inter-Branch Transfer Intelligence ─────────────────────────

/**
 * Suggest transfers between branches to balance stock.
 * @param {Array} networkInventory — [{branchId, branchName, productId, productName, quantity, dailyDemand, daysOfStock}]
 * @param {Object} config
 * @returns {Array} TransferSuggestion[]
 */
export function suggestTransfers(networkInventory, config) {
  if (!config?.features?.smartStock?.interBranchTransfer) return [];

  const suggestions = [];

  // Group inventory by product
  const byProduct = {};
  networkInventory.forEach(item => {
    if (!byProduct[item.productId]) byProduct[item.productId] = [];
    byProduct[item.productId].push(item);
  });

  for (const [productId, branches] of Object.entries(byProduct)) {
    if (branches.length < 2) continue;

    // Find branches with surplus (>14 days) and deficit (<3 days)
    const surplus = branches.filter(b => (b.daysOfStock || 0) > 14 && (b.quantity || 0) > 0);
    const deficit = branches.filter(b => (b.daysOfStock || 0) < 3 && (b.dailyDemand || 0) > 0);

    for (const deficitBranch of deficit) {
      for (const surplusBranch of surplus) {
        if (deficitBranch.branchId === surplusBranch.branchId) continue;

        // Calculate transfer quantity: enough for 7 days at deficit branch
        const transferQty = Math.ceil((deficitBranch.dailyDemand || 1) * 7);
        // Don't take more than half of surplus branch's stock
        const maxTransfer = Math.floor((surplusBranch.quantity || 0) * 0.5);
        const actualTransfer = Math.min(transferQty, maxTransfer);

        if (actualTransfer <= 0) continue;

        const transferCost = actualTransfer * (deficitBranch.costPrice || 0) * 0.05; // ~5% logistics
        const reorderCost = actualTransfer * (deficitBranch.costPrice || 0); // Full product cost

        suggestions.push({
          productId,
          productName: deficitBranch.productName || surplusBranch.productName,
          fromBranch: { id: surplusBranch.branchId, name: surplusBranch.branchName },
          toBranch: { id: deficitBranch.branchId, name: deficitBranch.branchName },
          quantity: actualTransfer,
          fromDaysOfStock: surplusBranch.daysOfStock,
          toDaysOfStock: deficitBranch.daysOfStock,
          transferCost: Math.round(transferCost),
          reorderCost: Math.round(reorderCost),
          savings: Math.round(reorderCost - transferCost),
          recommendation: transferCost < reorderCost ? 'transfer' : 'reorder',
        });
      }
    }
  }

  // Sort by savings (highest first)
  return suggestions.sort((a, b) => b.savings - a.savings);
}

// ─── Substitution Finder ────────────────────────────────────────

/**
 * Find cannabinoid-profile-matched alternatives for a product.
 * @param {Object} targetProduct — {cannabinoids: {thc, cbd}, category, name}
 * @param {Array} allProducts — full product catalog
 * @param {number} maxResults
 * @returns {Array} sorted by profile similarity
 */
export function findSubstitutes(targetProduct, allProducts, maxResults = 5) {
  if (!targetProduct?.cannabinoids || !allProducts?.length) return [];

  const targetTHC = targetProduct.cannabinoids.thc || 0;
  const targetCBD = targetProduct.cannabinoids.cbd || 0;

  return allProducts
    .filter(p => {
      // Exclude self
      if (p._id === targetProduct._id || p.productId === targetProduct.productId) return false;
      // Must have cannabinoid data
      if (!p.cannabinoids?.thc && !p.cannabinoids?.cbd) return false;
      // Same category preferred
      return true;
    })
    .map(p => {
      const thcDiff = Math.abs((p.cannabinoids?.thc || 0) - targetTHC);
      const cbdDiff = Math.abs((p.cannabinoids?.cbd || 0) - targetCBD);

      // Weighted similarity (THC weighted 60%, CBD 40%)
      const similarity = 100 - (thcDiff * 0.6 + cbdDiff * 0.4) * 5;
      const sameCategory = p.category === targetProduct.category;

      return {
        productId: p._id || p.productId,
        name: p.name,
        sku: p.sku,
        category: p.category,
        thc: p.cannabinoids?.thc || 0,
        cbd: p.cannabinoids?.cbd || 0,
        thcDiff: Math.round(thcDiff * 10) / 10,
        cbdDiff: Math.round(cbdDiff * 10) / 10,
        similarity: Math.max(0, Math.round(similarity)),
        sameCategory,
        price: p.price,
        inStock: (p.inventory?.quantity || 0) > 0,
      };
    })
    .sort((a, b) => {
      // Same category first, then by similarity
      if (a.sameCategory !== b.sameCategory) return b.sameCategory ? 1 : -1;
      return b.similarity - a.similarity;
    })
    .slice(0, maxResults);
}

// ─── Waste Prevention ───────────────────────────────────────────

/**
 * Identify near-expiry batches and suggest waste prevention actions.
 * @param {Array} batches — active batches with expiryDate
 * @param {Object} config
 * @returns {Object} { atRisk, actions, totalAtRiskValue }
 */
export function identifyWasteRisk(batches, config) {
  if (!batches?.length) return { atRisk: [], actions: [], totalAtRiskValue: 0 };

  const now = new Date();
  const warningDays = config?.thresholds?.lowStockDays || 7;
  const criticalDays = config?.thresholds?.criticalStockDays || 3;

  const atRisk = batches
    .filter(b => b.expiryDate && b.remainingQuantity > 0)
    .map(b => {
      const expiry = new Date(b.expiryDate);
      const daysUntilExpiry = Math.floor((expiry - now) / 86400000);

      if (daysUntilExpiry > 30) return null; // Not at risk

      let riskLevel = 'watch';
      if (daysUntilExpiry <= criticalDays) riskLevel = 'critical';
      else if (daysUntilExpiry <= warningDays) riskLevel = 'warning';
      else if (daysUntilExpiry <= 14) riskLevel = 'approaching';

      return {
        batchId: b._id || b.batchId,
        productName: b.productName || b.name || '',
        productId: b.product || b.productId,
        remainingQuantity: b.remainingQuantity,
        expiryDate: b.expiryDate,
        daysUntilExpiry,
        riskLevel,
        unitCost: b.unitCost || 0,
        atRiskValue: (b.remainingQuantity || 0) * (b.unitCost || 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  // Generate actions
  const actions = [];

  // Group critical items for clearance bundles
  const critical = atRisk.filter(b => b.riskLevel === 'critical' || b.riskLevel === 'warning');
  if (critical.length >= 2) {
    actions.push({
      type: 'bundle',
      label: `Clearance Bundle (${critical.length} items expiring soon)`,
      items: critical,
      suggestedDiscount: 30,
    });
  }

  // Individual markdown suggestions for warning items
  atRisk.filter(b => b.riskLevel === 'warning').forEach(b => {
    const discount = b.daysUntilExpiry <= 3 ? 40 : b.daysUntilExpiry <= 7 ? 25 : 15;
    actions.push({
      type: 'markdown',
      label: `Mark down ${b.productName}`,
      batchId: b.batchId,
      suggestedDiscount: discount,
      daysLeft: b.daysUntilExpiry,
    });
  });

  // Transfer suggestion for approaching items with excess quantity
  atRisk.filter(b => b.riskLevel === 'approaching' && b.remainingQuantity > 10).forEach(b => {
    actions.push({
      type: 'transfer',
      label: `Transfer ${b.productName} to high-demand branch`,
      batchId: b.batchId,
      quantity: b.remainingQuantity,
      daysLeft: b.daysUntilExpiry,
    });
  });

  const totalAtRiskValue = atRisk.reduce((sum, b) => sum + (b.atRiskValue || 0), 0);

  return { atRisk, actions, totalAtRiskValue: Math.round(totalAtRiskValue) };
}
