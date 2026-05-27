// P23 — Potency Degradation Engine (World First #1)
// Cannabis-specific degradation curves based on published research.
// Feature-gated: ONLY active if config.features.potencyDegradation.enabled === true
//
// Batch data shape (from Batch model):
//   cannabinoids: { thc, cbd, cbg, cbn, thca, cbda }
//   terpenes: [{ name, percentage }]
//   harvestDate, testDate, expiryDate
//   product (ObjectId → category)
//   storageConditions: { temperature, humidity, lightExposure }

// ─── Degradation Models ──────────────────────────────────────────
// THC/CBD loss rates per month at standard room conditions (20-25C, 55-65% RH, dark)
// Based on: United Nations, 2009; Trofin et al., 2012; Lindholst, 2010

export const DEGRADATION_MODELS = {
  flower: {
    thcLossPerMonth: 0.10,     // 10% per month at room temp
    cbdLossPerMonth: 0.05,     // 5% per month
    terpeneHalfLife: 60,       // days — volatile monoterpenes evaporate
    factors: {
      temperature: (celsius) => celsius > 25 ? 1.5 : celsius < 15 ? 0.5 : 1.0,
      humidity: (rh) => rh > 65 ? 1.3 : rh < 55 ? 0.8 : 1.0,
      lightExposure: (hoursPerDay) => 1 + (hoursPerDay * 0.05),
    },
  },
  concentrate: {
    thcLossPerMonth: 0.03,     // 3% — more stable in concentrated form
    cbdLossPerMonth: 0.02,
    terpeneHalfLife: 45,       // days — thinner matrix = faster evap
    factors: {
      temperature: (celsius) => celsius > 25 ? 1.4 : celsius < 15 ? 0.6 : 1.0,
      humidity: (rh) => rh > 65 ? 1.2 : rh < 55 ? 0.9 : 1.0,
      lightExposure: (hoursPerDay) => 1 + (hoursPerDay * 0.04),
    },
  },
  edible: {
    thcLossPerMonth: 0.05,     // 5% — protected by carrier matrix
    cbdLossPerMonth: 0.03,
    terpeneHalfLife: 90,       // days — encapsulated in food matrix
    factors: {
      temperature: (celsius) => celsius > 30 ? 1.6 : celsius < 10 ? 0.4 : 1.0,
      humidity: (rh) => rh > 70 ? 1.4 : rh < 50 ? 0.7 : 1.0,
      lightExposure: (hoursPerDay) => 1 + (hoursPerDay * 0.03),
    },
  },
  oil_tincture: {
    thcLossPerMonth: 0.04,     // 4% — oil carrier offers moderate protection
    cbdLossPerMonth: 0.02,
    terpeneHalfLife: 120,      // days — dissolved in oil, slower evaporation
    factors: {
      temperature: (celsius) => celsius > 25 ? 1.3 : celsius < 10 ? 0.5 : 1.0,
      humidity: (rh) => rh > 65 ? 1.1 : 1.0, // oil is less humidity-sensitive
      lightExposure: (hoursPerDay) => 1 + (hoursPerDay * 0.06), // light-sensitive
    },
  },
  topical: {
    thcLossPerMonth: 0.04,
    cbdLossPerMonth: 0.02,
    terpeneHalfLife: 100,
    factors: {
      temperature: (celsius) => celsius > 30 ? 1.5 : celsius < 10 ? 0.5 : 1.0,
      humidity: (rh) => rh > 70 ? 1.3 : 1.0,
      lightExposure: (hoursPerDay) => 1 + (hoursPerDay * 0.03),
    },
  },
};

// Map product categories to degradation model keys
const CATEGORY_TO_MODEL = {
  flower: 'flower',
  concentrates: 'concentrate',
  edibles: 'edible',
  oils: 'oil_tincture',
  topicals: 'topical',
  accessories: null,   // no degradation
  cbd: 'oil_tincture', // default CBD products to oil model
  'lifestyle-cbd': 'oil_tincture',
};

// ─── Utility ─────────────────────────────────────────────────────

function daysBetween(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.max(0, Math.floor((d2 - d1) / 86400000));
}

// ─── Environmental Factor Calculator ─────────────────────────────

function calculateEnvironmentalFactor(storageConditions, model) {
  if (!storageConditions || !model.factors) return 1.0;

  let factor = 1.0;

  if (storageConditions.temperature != null && model.factors.temperature) {
    factor *= model.factors.temperature(storageConditions.temperature);
  }
  if (storageConditions.humidity != null && model.factors.humidity) {
    factor *= model.factors.humidity(storageConditions.humidity);
  }
  if (storageConditions.lightExposure != null && model.factors.lightExposure) {
    factor *= model.factors.lightExposure(storageConditions.lightExposure);
  }

  return factor;
}

// ─── Core: Estimate Current Potency ──────────────────────────────

export function estimateCurrentPotency(batch, config) {
  const productCategory = batch.category || batch.productType || 'flower';
  const modelKey = CATEGORY_TO_MODEL[productCategory] || 'flower';
  const model = DEGRADATION_MODELS[modelKey];

  if (!model) {
    return {
      originalTHC: batch.cannabinoids?.thc || 0,
      estimatedTHC: batch.cannabinoids?.thc || 0,
      originalCBD: batch.cannabinoids?.cbd || 0,
      estimatedCBD: batch.cannabinoids?.cbd || 0,
      terpeneRetention: 100,
      confidenceLevel: 'none',
      daysSinceTest: 0,
      suggestRetest: false,
      suggestMarkdown: false,
      suggestedMarkdownPercent: 0,
      degradationVelocity: 0,
    };
  }

  // Calculate time since lab test
  const testDate = batch.testDate || batch.labTestDate || batch.createdAt;
  const daysSinceTest = testDate ? daysBetween(testDate, new Date()) : 0;
  const monthsSinceTest = daysSinceTest / 30;

  // Environmental factor
  const envFactor = calculateEnvironmentalFactor(batch.storageConditions, model);

  // THC degradation
  const originalTHC = batch.cannabinoids?.thc || 0;
  const thcLoss = model.thcLossPerMonth * monthsSinceTest * envFactor;
  const estimatedTHC = Math.max(0, originalTHC * (1 - thcLoss));
  const thcDropPercent = originalTHC > 0 ? ((originalTHC - estimatedTHC) / originalTHC) * 100 : 0;

  // CBD degradation
  const originalCBD = batch.cannabinoids?.cbd || 0;
  const cbdLoss = model.cbdLossPerMonth * monthsSinceTest * envFactor;
  const estimatedCBD = Math.max(0, originalCBD * (1 - cbdLoss));

  // Terpene retention (exponential decay)
  const terpeneRetention = model.terpeneHalfLife > 0
    ? Math.round(100 * Math.pow(0.5, daysSinceTest / model.terpeneHalfLife))
    : 100;

  // Confidence level based on time since test
  let confidenceLevel = 'high';
  if (daysSinceTest > 90) confidenceLevel = 'low';
  else if (daysSinceTest > 30) confidenceLevel = 'medium';

  // Markdown threshold from config
  const markdownThreshold = config?.features?.potencyDegradation?.markdownThreshold
    || config?.thresholds?.potencyDropPercent
    || 15;

  const suggestMarkdown = thcDropPercent >= markdownThreshold;
  const suggestedMarkdownPercent = suggestMarkdown ? Math.round(thcDropPercent) : 0;

  // Degradation velocity (% per day) — used for FIFO prioritization
  const degradationVelocity = daysSinceTest > 0 ? thcDropPercent / daysSinceTest : 0;

  return {
    originalTHC,
    estimatedTHC: Math.round(estimatedTHC * 100) / 100,
    thcDropPercent: Math.round(thcDropPercent * 10) / 10,
    originalCBD,
    estimatedCBD: Math.round(estimatedCBD * 100) / 100,
    terpeneRetention,
    confidenceLevel,
    daysSinceTest,
    monthsSinceTest: Math.round(monthsSinceTest * 10) / 10,
    envFactor: Math.round(envFactor * 100) / 100,
    suggestRetest: daysSinceTest > 90,
    suggestMarkdown,
    suggestedMarkdownPercent,
    degradationVelocity: Math.round(degradationVelocity * 1000) / 1000,
    modelUsed: modelKey,
  };
}

// ─── Enhanced FIFO: Fastest-Degrading First ──────────────────────
// Standard FIFO: sell oldest first.
// Origin FIFO: sell fastest-degrading first → minimizes customer potency loss.

export function calculateFIFOPriority(batches, config) {
  return batches
    .filter(b => b.status === 'active' && b.qaStatus === 'approved' && (b.remainingQuantity || 0) > 0)
    .map(batch => ({
      ...batch,
      potency: estimateCurrentPotency(batch, config),
    }))
    .sort((a, b) => {
      // Primary: fastest degrading goes first
      if (b.potency.degradationVelocity !== a.potency.degradationVelocity) {
        return b.potency.degradationVelocity - a.potency.degradationVelocity;
      }
      // Secondary: lowest estimated THC first
      if (a.potency.estimatedTHC !== b.potency.estimatedTHC) {
        return a.potency.estimatedTHC - b.potency.estimatedTHC;
      }
      // Tertiary: oldest test date first
      return new Date(a.testDate || a.createdAt) - new Date(b.testDate || b.createdAt);
    });
}

// ─── Degradation Velocity ────────────────────────────────────────
// How fast a batch is losing potency (% per day), factoring in storage conditions.

export function calculateDegradationVelocity(batch) {
  const productCategory = batch.category || batch.productType || 'flower';
  const modelKey = CATEGORY_TO_MODEL[productCategory] || 'flower';
  const model = DEGRADATION_MODELS[modelKey];
  if (!model) return 0;

  const envFactor = calculateEnvironmentalFactor(batch.storageConditions, model);

  // Daily THC loss rate
  return (model.thcLossPerMonth / 30) * envFactor * 100; // as percentage per day
}

// ─── Batch Potency Alerts ────────────────────────────────────────
// Scans all batches and returns those needing attention.

export function scanBatchesForPotencyAlerts(batches, config) {
  if (!config?.features?.potencyDegradation?.enabled) return [];

  const threshold = config.features.potencyDegradation.markdownThreshold
    || config.thresholds.potencyDropPercent
    || 15;

  return batches
    .map(batch => {
      const potency = estimateCurrentPotency(batch, config);
      return { batch, potency };
    })
    .filter(({ potency }) => potency.thcDropPercent >= threshold || potency.suggestRetest)
    .sort((a, b) => b.potency.thcDropPercent - a.potency.thcDropPercent)
    .map(({ batch, potency }) => ({
      batchId: batch._id || batch.batchId,
      productId: batch.product,
      productName: batch.productName || batch.name || '',
      ...potency,
      category: potency.suggestMarkdown ? 'markdown' : 'retest',
      remainingQuantity: batch.remainingQuantity || 0,
    }));
}

// ─── Bundle Candidates ───────────────────────────────────────────
// Identify batches that could be bundled as "clearance" or "deal packs".

export function identifyBundleCandidates(batches, config) {
  if (!config?.features?.potencyDegradation?.enabled) return [];

  const alerts = scanBatchesForPotencyAlerts(batches, config);
  const markdownBatches = alerts.filter(a => a.category === 'markdown');

  if (markdownBatches.length < 2) return [];

  // Group by similar THC drop range for coherent bundles
  const bundles = [];
  const used = new Set();

  for (let i = 0; i < markdownBatches.length; i++) {
    if (used.has(i)) continue;
    const bundle = [markdownBatches[i]];
    used.add(i);

    for (let j = i + 1; j < markdownBatches.length && bundle.length < 4; j++) {
      if (used.has(j)) continue;
      // Group if THC drop is within 5% of each other
      if (Math.abs(markdownBatches[i].thcDropPercent - markdownBatches[j].thcDropPercent) <= 5) {
        bundle.push(markdownBatches[j]);
        used.add(j);
      }
    }

    if (bundle.length >= 2) {
      const avgDrop = bundle.reduce((s, b) => s + b.thcDropPercent, 0) / bundle.length;
      bundles.push({
        items: bundle,
        suggestedDiscount: Math.round(avgDrop * 0.8), // 80% of drop as discount
        label: `Deal Pack (${bundle.length} items, ~${Math.round(avgDrop)}% potency adjusted)`,
      });
    }
  }

  return bundles;
}

// ─── Markdown Suggestion ─────────────────────────────────────────
// Given a potency estimate, calculate the suggested markdown percentage.

export function suggestMarkdownPercent(potencyEstimate) {
  if (!potencyEstimate.suggestMarkdown) return 0;

  // Markdown proportional to potency loss, capped at 50%
  const markdown = Math.min(50, Math.round(potencyEstimate.thcDropPercent * 0.8));
  return markdown;
}

// ─── Terpene Profile Degradation ─────────────────────────────────
// Estimate remaining terpene profile for a batch.

export function estimateTerpeneProfile(batch, config) {
  const productCategory = batch.category || batch.productType || 'flower';
  const modelKey = CATEGORY_TO_MODEL[productCategory] || 'flower';
  const model = DEGRADATION_MODELS[modelKey];
  if (!model || !batch.terpenes?.length) return [];

  const testDate = batch.testDate || batch.labTestDate || batch.createdAt;
  const daysSinceTest = testDate ? daysBetween(testDate, new Date()) : 0;
  const retention = model.terpeneHalfLife > 0
    ? Math.pow(0.5, daysSinceTest / model.terpeneHalfLife)
    : 1;

  return batch.terpenes.map(t => ({
    name: t.name,
    originalPercentage: t.percentage,
    estimatedPercentage: Math.round(t.percentage * retention * 100) / 100,
    retention: Math.round(retention * 100),
  }));
}
