/**
 * Stock Intelligence Controller (P29+P34)
 * Demand prediction, reorder suggestions, transfers, substitutes, waste prevention.
 * P34: In-memory cache with 5-minute TTL for stock predictions.
 */

const WorldModelConfig = require('../modules/database/models/WorldModelConfig');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Batch = require('../modules/database/models/Batch');
const Product = require('../modules/database/models/Product');
const Sale = require('../modules/database/models/Sale');
const PurchaseOrder = require('../modules/database/models/PurchaseOrder');
const InterBranchTransfer = require('../modules/database/models/InterBranchTransfer');
const Branch = require('../modules/database/models/Branch');
const logger = require('../modules/logger');

// ─── P34: Response cache (5-minute TTL) ─────────────────────────

const _stockCache = new Map();
const STOCK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key) {
  const entry = _stockCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > STOCK_CACHE_TTL) {
    _stockCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  _stockCache.set(key, { data, ts: Date.now() });
  if (_stockCache.size > 200) {
    const oldest = _stockCache.keys().next().value;
    _stockCache.delete(oldest);
  }
}

// ─── Feature gate helper ────────────────────────────────────────

async function requireFeature(featureName, res) {
  const config = await WorldModelConfig.getConfig();
  if (!config.features?.[featureName]?.enabled) {
    res.status(403).json({
      error: `Feature "${featureName}" is disabled`,
      message: 'Enable this feature in World Model configuration'
    });
    return null;
  }
  return config;
}

// ─── GET /stock/predict/:productId ──────────────────────────────

exports.predictDemand = async (req, res) => {
  try {
    const config = await requireFeature('demandPrediction', res);
    if (!config) return;

    const { productId } = req.params;
    const branchId = req.query.branchId;

    // P34: Check cache
    const cacheKey = `predict_${productId}_${branchId || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);

    // Get historical sales
    const salesQuery = { 'items.product': productId, createdAt: { $gte: thirtyDaysAgo } };
    if (branchId) salesQuery.branch = branchId;

    const sales = await Sale.find(salesQuery).lean();
    const totalSold = sales.reduce((sum, sale) => {
      const item = sale.items?.find(i => String(i.product) === String(productId));
      return sum + (item?.quantity || 0);
    }, 0);

    const daysCovered = Math.max(1, Math.ceil((now - thirtyDaysAgo) / 86400000));
    const dailyDemand = totalSold / daysCovered;

    // Get current stock
    const inventoryQuery = { product: productId };
    if (branchId) inventoryQuery.branch = branchId;
    const inv = await BranchInventory.findOne(inventoryQuery).lean();
    const currentStock = inv?.quantity || 0;

    const daysOfStock = dailyDemand > 0 ? Math.round(currentStock / dailyDemand) : currentStock > 0 ? 999 : 0;

    // Cannabis-specific adjustments
    const adjustments = [];

    // Payday cycle (SA: 25th and last day of month)
    if (config.features.demandPrediction.paydayCycleAware) {
      const dayOfMonth = now.getDate();
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      if (dayOfMonth >= 23 && dayOfMonth <= 27) {
        adjustments.push({ factor: 'payday_cycle', multiplier: 1.35, note: 'Near payday (25th)' });
      } else if (dayOfMonth >= lastDay - 2) {
        adjustments.push({ factor: 'payday_cycle', multiplier: 1.25, note: 'Near month-end payday' });
      } else if (dayOfMonth >= 10 && dayOfMonth <= 15) {
        adjustments.push({ factor: 'mid_month_dip', multiplier: 0.85, note: 'Mid-month spending dip' });
      }
    }

    // Seasonal (Southern Hemisphere)
    if (config.features.demandPrediction.seasonalAdjust) {
      const month = now.getMonth();
      if (month >= 10 || month <= 1) {
        adjustments.push({ factor: 'summer_peak', multiplier: 1.2, note: 'Southern Hemisphere summer' });
      } else if (month >= 5 && month <= 7) {
        adjustments.push({ factor: 'winter_dip', multiplier: 0.9, note: 'Winter slowdown' });
      }
      // 420 Day
      if (month === 3 && now.getDate() >= 15 && now.getDate() <= 22) {
        adjustments.push({ factor: '420_day', multiplier: 1.5, note: '420 Day proximity' });
      }
    }

    const adjustedDemand = adjustments.reduce((d, a) => d * a.multiplier, dailyDemand);
    const adjustedDaysOfStock = adjustedDemand > 0 ? Math.round(currentStock / adjustedDemand) : daysOfStock;
    const leadTimeDays = 5;
    const reorderDate = adjustedDaysOfStock > leadTimeDays
      ? new Date(now.getTime() + (adjustedDaysOfStock - leadTimeDays) * 86400000)
      : now;

    const confidence = Math.min(95, Math.max(30, Math.round(50 + (sales.length * 1.5))));

    const data = {
      productId,
      branchId: branchId || 'all',
      dailyDemand: Math.round(dailyDemand * 100) / 100,
      adjustedDemand: Math.round(adjustedDemand * 100) / 100,
      currentStock,
      daysOfStock,
      adjustedDaysOfStock,
      reorderDate,
      confidence,
      adjustments,
      salesAnalyzed: sales.length,
      daysCovered
    };

    setCache(cacheKey, data);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Failed to predict demand', { error: error.message, productId: req.params.productId });
    res.status(500).json({ error: 'Failed to predict demand' });
  }
};

// ─── GET /stock/reorder-suggestions ─────────────────────────────

exports.getReorderSuggestions = async (req, res) => {
  try {
    const config = await requireFeature('smartStock', res);
    if (!config) return;

    const branchId = req.query.branchId;

    // P34: Check cache
    const cacheKey = `reorder_${branchId || 'all'}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const query = branchId ? { branch: branchId } : {};

    const inventory = await BranchInventory.find(query).populate('product', 'name sku category price').lean();
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);

    const suggestions = [];

    for (const item of inventory) {
      if (!item.product) continue;
      const reorderPoint = item.reorderPoint || 10;
      if ((item.quantity || 0) > reorderPoint) continue;

      // Calculate velocity
      const salesQuery = { 'items.product': item.product._id, createdAt: { $gte: thirtyDaysAgo } };
      if (branchId) salesQuery.branch = branchId;
      const sales = await Sale.find(salesQuery).select('items').lean();
      const totalSold = sales.reduce((sum, sale) => {
        const si = sale.items?.find(i => String(i.product) === String(item.product._id));
        return sum + (si?.quantity || 0);
      }, 0);
      const dailyDemand = totalSold / 30;

      const daysOfStock = dailyDemand > 0 ? Math.round((item.quantity || 0) / dailyDemand) : 999;
      const suggestedQty = Math.max(1, Math.ceil(dailyDemand * 14) - (item.quantity || 0));
      const urgency = daysOfStock <= 3 ? 'critical' : daysOfStock <= 7 ? 'urgent' : 'soon';

      suggestions.push({
        productId: item.product._id,
        name: item.product.name,
        sku: item.product.sku,
        category: item.product.category,
        currentStock: item.quantity || 0,
        reorderPoint,
        dailyDemand: Math.round(dailyDemand * 100) / 100,
        daysOfStock,
        suggestedQuantity: suggestedQty,
        estimatedCost: Math.round(suggestedQty * (item.product.price || 0) * 0.6 * 100) / 100,
        urgency,
        branchId: item.branch
      });
    }

    suggestions.sort((a, b) => {
      const order = { critical: 0, urgent: 1, soon: 2 };
      return (order[a.urgency] || 3) - (order[b.urgency] || 3);
    });

    setCache(cacheKey, suggestions);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    logger.error('Failed to get reorder suggestions', { error: error.message });
    res.status(500).json({ error: 'Failed to get reorder suggestions' });
  }
};

// ─── POST /stock/auto-reorder ───────────────────────────────────

exports.autoReorder = async (req, res) => {
  try {
    const config = await requireFeature('smartStock', res);
    if (!config) return;

    if (!config.features.smartStock.autoReorder) {
      return res.status(403).json({ error: 'Auto-reorder is disabled in configuration' });
    }

    const { productId, branchId, quantity, supplierId } = req.body;
    if (!productId || !quantity) return res.status(400).json({ error: 'productId and quantity are required' });

    const product = await Product.findById(productId).lean();
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const po = await PurchaseOrder.create({
      supplier: supplierId,
      branch: branchId,
      status: 'draft',
      items: [{ product: productId, quantity, unitPrice: product.price * 0.6 }],
      total: quantity * product.price * 0.6,
      createdBy: req.user.id,
      notes: 'Auto-generated by Smart Stock intelligence'
    });

    logger.info('Auto-reorder PO created', { poId: po._id, productId, quantity });
    res.json({ success: true, data: po, message: 'Draft purchase order created' });
  } catch (error) {
    logger.error('Failed to auto-reorder', { error: error.message });
    res.status(500).json({ error: 'Failed to create reorder' });
  }
};

// ─── GET /stock/transfer-suggestions ────────────────────────────

exports.getTransferSuggestions = async (req, res) => {
  try {
    const config = await requireFeature('smartStock', res);
    if (!config) return;

    if (!config.features.smartStock.interBranchTransfer) {
      return res.status(403).json({ error: 'Inter-branch transfers are disabled in configuration' });
    }

    const branches = await Branch.find({ status: 'active' }).select('_id name branchCode').lean();
    const allInventory = await BranchInventory.find().populate('product', 'name sku price').lean();

    // Group by product
    const productMap = {};
    for (const item of allInventory) {
      if (!item.product) continue;
      const pid = String(item.product._id);
      if (!productMap[pid]) productMap[pid] = { product: item.product, branches: [] };
      productMap[pid].branches.push({ branchId: item.branch, quantity: item.quantity || 0, reorderPoint: item.reorderPoint || 10 });
    }

    const suggestions = [];

    for (const [pid, data] of Object.entries(productMap)) {
      const deficit = data.branches.filter(b => b.quantity < b.reorderPoint);
      const surplus = data.branches.filter(b => b.quantity > b.reorderPoint * 3);

      for (const def of deficit) {
        for (const sur of surplus) {
          if (String(def.branchId) === String(sur.branchId)) continue;
          const transferQty = Math.min(sur.quantity - sur.reorderPoint * 2, def.reorderPoint * 2 - def.quantity);
          if (transferQty <= 0) continue;

          const fromBranch = branches.find(b => String(b._id) === String(sur.branchId));
          const toBranch = branches.find(b => String(b._id) === String(def.branchId));

          suggestions.push({
            productId: pid,
            productName: data.product.name,
            fromBranch: { id: sur.branchId, name: fromBranch?.name, stock: sur.quantity },
            toBranch: { id: def.branchId, name: toBranch?.name, stock: def.quantity },
            suggestedQuantity: transferQty,
            estimatedSavings: Math.round(transferQty * (data.product.price || 0) * 0.3 * 100) / 100
          });
        }
      }
    }

    suggestions.sort((a, b) => b.estimatedSavings - a.estimatedSavings);
    res.json({ success: true, data: suggestions });
  } catch (error) {
    logger.error('Failed to get transfer suggestions', { error: error.message });
    res.status(500).json({ error: 'Failed to get transfer suggestions' });
  }
};

// ─── POST /stock/transfer ───────────────────────────────────────

exports.initiateTransfer = async (req, res) => {
  try {
    const config = await requireFeature('smartStock', res);
    if (!config) return;

    const { productId, fromBranch, toBranch, quantity } = req.body;
    if (!productId || !fromBranch || !toBranch || !quantity) {
      return res.status(400).json({ error: 'productId, fromBranch, toBranch, and quantity are required' });
    }

    const transfer = await InterBranchTransfer.create({
      product: productId,
      fromBranch,
      toBranch,
      quantity,
      status: 'pending',
      requestedBy: req.user.id
    });

    try {
      const websocket = require('../modules/websocket');
      websocket.notifyBranch(fromBranch, 'stock:transfer-requested', { transfer });
      websocket.notifyBranch(toBranch, 'stock:transfer-incoming', { transfer });
    } catch { /* WebSocket not initialized */ }

    logger.info('Transfer initiated', { transferId: transfer._id, productId, fromBranch, toBranch, quantity });
    res.json({ success: true, data: transfer, message: 'Transfer initiated' });
  } catch (error) {
    logger.error('Failed to initiate transfer', { error: error.message });
    res.status(500).json({ error: 'Failed to initiate transfer' });
  }
};

// ─── GET /stock/substitutes/:productId ──────────────────────────

exports.getSubstitutes = async (req, res) => {
  try {
    const config = await requireFeature('smartStock', res);
    if (!config) return;

    const { productId } = req.params;
    const maxResults = Math.min(Number(req.query.limit) || 10, 20);

    const target = await Product.findById(productId).lean();
    if (!target) return res.status(404).json({ error: 'Product not found' });

    const targetTHC = target.cannabinoids?.thc || 0;
    const targetCBD = target.cannabinoids?.cbd || 0;

    // Find products in same category with similar cannabinoid profile
    const candidates = await Product.find({
      _id: { $ne: productId },
      status: 'active',
      category: target.category
    }).lean();

    const scored = candidates.map(c => {
      const cTHC = c.cannabinoids?.thc || 0;
      const cCBD = c.cannabinoids?.cbd || 0;
      const thcDiff = Math.abs(targetTHC - cTHC);
      const cbdDiff = Math.abs(targetCBD - cCBD);
      const similarity = Math.max(0, 100 - (thcDiff * 3 + cbdDiff * 2));

      return {
        productId: c._id,
        name: c.name,
        category: c.category,
        cannabinoids: c.cannabinoids,
        price: c.price,
        similarity: Math.round(similarity)
      };
    });

    scored.sort((a, b) => b.similarity - a.similarity);

    res.json({
      success: true,
      data: {
        target: { id: target._id, name: target.name, cannabinoids: target.cannabinoids },
        substitutes: scored.slice(0, maxResults)
      }
    });
  } catch (error) {
    logger.error('Failed to find substitutes', { error: error.message, productId: req.params.productId });
    res.status(500).json({ error: 'Failed to find substitutes' });
  }
};

// ─── GET /stock/waste-prevention ────────────────────────────────

exports.getWastePrevention = async (req, res) => {
  try {
    const config = await requireFeature('smartStock', res);
    if (!config) return;

    const branchId = req.query.branchId;
    const query = { status: { $ne: 'depleted' } };
    if (branchId) query.branch = branchId;

    const batches = await Batch.find(query).populate('product', 'name sku price category').lean();
    const now = new Date();

    const atRisk = batches
      .filter(b => b.expiryDate)
      .map(b => {
        const daysToExpiry = Math.ceil((new Date(b.expiryDate) - now) / 86400000);
        if (daysToExpiry > 30) return null;

        const remaining = b.remainingQuantity || b.quantity || 0;
        const value = remaining * (b.product?.price || 0);
        const risk = daysToExpiry <= 0 ? 'expired' : daysToExpiry <= 7 ? 'critical' : daysToExpiry <= 14 ? 'warning' : 'approaching';

        const actions = [];
        if (daysToExpiry > 0 && daysToExpiry <= 14) actions.push({ type: 'markdown', description: `Apply ${Math.min(50, Math.round((1 - daysToExpiry / 30) * 50))}% discount` });
        if (remaining > 5) actions.push({ type: 'bundle', description: 'Create bundle deal with complementary products' });
        if (daysToExpiry > 7) actions.push({ type: 'transfer', description: 'Transfer to higher-demand branch' });

        return {
          batchId: b._id,
          batchNumber: b.batchNumber,
          product: b.product,
          remaining,
          expiryDate: b.expiryDate,
          daysToExpiry,
          value: Math.round(value * 100) / 100,
          risk,
          actions
        };
      })
      .filter(Boolean);

    atRisk.sort((a, b) => a.daysToExpiry - b.daysToExpiry);

    const totalValueAtRisk = atRisk.reduce((sum, b) => sum + b.value, 0);

    res.json({
      success: true,
      data: {
        atRisk,
        summary: {
          totalBatches: atRisk.length,
          expired: atRisk.filter(b => b.risk === 'expired').length,
          critical: atRisk.filter(b => b.risk === 'critical').length,
          warning: atRisk.filter(b => b.risk === 'warning').length,
          approaching: atRisk.filter(b => b.risk === 'approaching').length,
          totalValueAtRisk: Math.round(totalValueAtRisk * 100) / 100
        }
      }
    });
  } catch (error) {
    logger.error('Failed to get waste prevention data', { error: error.message });
    res.status(500).json({ error: 'Failed to get waste prevention data' });
  }
};
