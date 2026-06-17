/**
 * Potency Controller (P29)
 * Potency estimation, degradation alerts, auto-markdown, FIFO prioritization.
 */

const WorldModelConfig = require('../modules/database/models/WorldModelConfig');
const Batch = require('../modules/database/models/Batch');
const Product = require('../modules/database/models/Product');
const logger = require('../modules/logger');

// ─── Feature gate helper ────────────────────────────────────────

async function requireFeature(res) {
  const config = await WorldModelConfig.getConfig();
  if (!config.features?.potencyDegradation?.enabled) {
    res.status(403).json({
      error: 'Feature "potencyDegradation" is disabled',
      message: 'Enable this feature in World Model configuration'
    });
    return null;
  }
  return config;
}

// ─── Degradation models (matches P23 frontend engine) ───────────

const DEGRADATION_MODELS = {
  flower: { halfLife: 365, tempCoeff: 0.02, lightCoeff: 0.03, humidityCoeff: 0.01 },
  oil: { halfLife: 545, tempCoeff: 0.015, lightCoeff: 0.02, humidityCoeff: 0.005 },
  edible: { halfLife: 270, tempCoeff: 0.025, lightCoeff: 0.01, humidityCoeff: 0.02 },
  concentrate: { halfLife: 730, tempCoeff: 0.01, lightCoeff: 0.015, humidityCoeff: 0.005 },
  topical: { halfLife: 455, tempCoeff: 0.02, lightCoeff: 0.02, humidityCoeff: 0.01 }
};

function estimatePotency(batch) {
  const category = batch.product?.category || batch.category || 'flower';
  const model = DEGRADATION_MODELS[category] || DEGRADATION_MODELS.flower;
  const originalTHC = batch.cannabinoids?.thc || batch.product?.cannabinoids?.thc || 0;
  const originalCBD = batch.cannabinoids?.cbd || batch.product?.cannabinoids?.cbd || 0;

  const harvestDate = batch.harvestDate || batch.manufacturingDate || batch.createdAt;
  if (!harvestDate) {
    return { thc: originalTHC, cbd: originalCBD, degradationPercent: 0, daysAge: 0 };
  }

  const daysAge = Math.max(0, Math.ceil((Date.now() - new Date(harvestDate).getTime()) / 86400000));
  const baseDegradation = 1 - Math.pow(0.5, daysAge / model.halfLife);

  // Storage condition adjustments
  let envFactor = 1.0;
  const storage = batch.storageConditions || {};
  if (storage.temperature > 25) envFactor += (storage.temperature - 25) * model.tempCoeff;
  if (storage.lightExposure === 'high') envFactor += model.lightCoeff * 10;
  else if (storage.lightExposure === 'medium') envFactor += model.lightCoeff * 5;
  if (storage.humidity > 65) envFactor += (storage.humidity - 65) * model.humidityCoeff;

  const totalDegradation = Math.min(0.95, baseDegradation * envFactor);
  const currentTHC = Math.round(originalTHC * (1 - totalDegradation) * 100) / 100;
  const currentCBD = Math.round(originalCBD * (1 - totalDegradation * 0.7) * 100) / 100; // CBD degrades slower

  return {
    thc: currentTHC,
    cbd: currentCBD,
    originalTHC,
    originalCBD,
    degradationPercent: Math.round(totalDegradation * 100),
    daysAge,
    model: category,
    envFactor: Math.round(envFactor * 100) / 100
  };
}

// ─── POST /inventory/potency/estimate ───────────────────────────

exports.estimatePotency = async (req, res) => {
  try {
    const config = await requireFeature(res);
    if (!config) return;

    const { batchId } = req.body;
    if (!batchId) return res.status(400).json({ error: 'batchId is required' });

    const batch = await Batch.findById(batchId).populate('product', 'name category cannabinoids').lean();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const estimate = estimatePotency(batch);

    res.json({
      success: true,
      data: {
        batchId,
        batchNumber: batch.batchNumber,
        product: batch.product,
        estimate
      }
    });
  } catch (error) {
    logger.error('Failed to estimate potency', { error: error.message });
    res.status(500).json({ error: 'Failed to estimate potency' });
  }
};

// ─── GET /inventory/potency/alerts ──────────────────────────────

exports.getPotencyAlerts = async (req, res) => {
  try {
    const config = await requireFeature(res);
    if (!config) return;

    const branchId = req.query.branchId;
    const threshold = config.thresholds?.potencyDropPercent || 15;

    const query = { status: { $ne: 'depleted' } };
    if (branchId) query.branch = branchId;

    const batches = await Batch.find(query).populate('product', 'name sku category cannabinoids price').lean();

    const alerts = batches
      .map(batch => {
        const estimate = estimatePotency(batch);
        if (estimate.degradationPercent < threshold) return null;

        return {
          batchId: batch._id,
          batchNumber: batch.batchNumber,
          product: batch.product,
          remaining: batch.remainingQuantity || batch.quantity || 0,
          estimate,
          severity: estimate.degradationPercent >= threshold * 2 ? 'critical' : 'warning',
          value: Math.round((batch.remainingQuantity || batch.quantity || 0) * (batch.product?.price || 0) * 100) / 100
        };
      })
      .filter(Boolean);

    alerts.sort((a, b) => b.estimate.degradationPercent - a.estimate.degradationPercent);

    res.json({
      success: true,
      data: {
        alerts,
        threshold,
        summary: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          totalValueAffected: Math.round(alerts.reduce((sum, a) => sum + a.value, 0) * 100) / 100
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get potency alerts', { error: error.message });
    res.status(500).json({ error: 'Failed to get potency alerts' });
  }
};

// ─── POST /inventory/potency/markdown ───────────────────────────

exports.createMarkdown = async (req, res) => {
  try {
    const config = await requireFeature(res);
    if (!config) return;

    if (!config.features.potencyDegradation.autoMarkdown) {
      return res.status(403).json({ error: 'Auto-markdown is disabled in configuration' });
    }

    const { batchId, discountPercent } = req.body;
    if (!batchId) return res.status(400).json({ error: 'batchId is required' });

    const batch = await Batch.findById(batchId).populate('product', 'name price').lean();
    if (!batch) return res.status(404).json({ error: 'Batch not found' });

    const estimate = estimatePotency(batch);
    const markdownThreshold = config.features.potencyDegradation.markdownThreshold || 20;

    if (estimate.degradationPercent < markdownThreshold) {
      return res.status(400).json({
        error: 'Batch has not degraded enough for auto-markdown',
        degradation: estimate.degradationPercent,
        threshold: markdownThreshold
      });
    }

    const discount = discountPercent || Math.min(50, Math.round(estimate.degradationPercent * 1.5));
    const originalPrice = batch.product?.price || 0;
    const markdownPrice = Math.round(originalPrice * (1 - discount / 100) * 100) / 100;

    // Mark batch as marked down
    await Batch.findByIdAndUpdate(batchId, {
      markedDown: true,
      markdownPercent: discount,
      markdownPrice,
      markdownReason: `Potency degraded ${estimate.degradationPercent}% (THC: ${estimate.originalTHC}% -> ${estimate.thc}%)`,
      markdownBy: req.user.id,
      markdownAt: new Date()
    });

    logger.info('Potency markdown applied', { batchId, discount, degradation: estimate.degradationPercent });
    res.json({
      success: true,
      data: {
        batchId,
        discount,
        originalPrice,
        markdownPrice,
        degradation: estimate.degradationPercent,
        estimate
      },
      message: `${discount}% markdown applied`
    });
  } catch (error) {
    logger.error('Failed to create markdown', { error: error.message });
    res.status(500).json({ error: 'Failed to apply markdown' });
  }
};

// ─── GET /inventory/fifo/:productId ─────────────────────────────

exports.getFIFO = async (req, res) => {
  try {
    const config = await requireFeature(res);
    if (!config) return;

    const { productId } = req.params;
    const branchId = req.query.branchId;

    const query = { product: productId, status: { $ne: 'depleted' } };
    if (branchId) query.branch = branchId;

    const batches = await Batch.find(query).populate('product', 'name category cannabinoids price').lean();

    const prioritized = batches.map(batch => {
      const estimate = estimatePotency(batch);
      const daysToExpiry = batch.expiryDate ? Math.ceil((new Date(batch.expiryDate) - Date.now()) / 86400000) : 999;

      // Priority score: higher = sell first (worst condition)
      const priorityScore = estimate.degradationPercent * 2 + Math.max(0, 100 - daysToExpiry);

      return {
        batchId: batch._id,
        batchNumber: batch.batchNumber,
        remaining: batch.remainingQuantity || batch.quantity || 0,
        expiryDate: batch.expiryDate,
        daysToExpiry,
        estimate,
        priorityScore: Math.round(priorityScore),
        markedDown: batch.markedDown || false,
        markdownPercent: batch.markdownPercent || 0
      };
    });

    prioritized.sort((a, b) => b.priorityScore - a.priorityScore);

    res.json({
      success: true,
      data: {
        productId,
        batches: prioritized,
        totalRemaining: prioritized.reduce((sum, b) => sum + b.remaining, 0)
      }
    });
  } catch (error) {
    logger.error('Failed to get FIFO list', { error: error.message, productId: req.params.productId });
    res.status(500).json({ error: 'Failed to get FIFO list' });
  }
};
