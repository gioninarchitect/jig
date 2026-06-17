// Reconciliation Controller — Rolling baseline stock reconciliation
// Uses last approved stocktake as baseline, subtracts sales, adjusts for transfers

const mongoose = require('mongoose');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Sale = require('../modules/database/models/Sale');
const InterBranchTransfer = require('../modules/database/models/InterBranchTransfer');

/**
 * Find the latest approved StockTake for a branch.
 * StockTake model uses: status 'approved', branchId field, contains items with actualQty.
 */
async function findLatestStocktake(branchId) {
  // StockTake collection — find latest approved session for this branch
  const StockTake = mongoose.model('StockTake');
  const stocktake = await StockTake.findOne({
    branchId: new mongoose.Types.ObjectId(branchId),
    status: 'approved',
  })
    .sort({ approvedAt: -1, updatedAt: -1 })
    .lean();
  return stocktake;
}

/**
 * Full reconciliation report for a branch.
 * GET /reconciliation/:branchId
 */
exports.getReconciliation = async (req, res) => {
  try {
    const { branchId } = req.params;
    const branchOid = new mongoose.Types.ObjectId(branchId);

    // 1. Find latest approved stocktake
    const stocktake = await findLatestStocktake(branchId);
    if (!stocktake) {
      return res.json({
        success: true,
        hasBaseline: false,
        message: 'No approved stocktake found for this branch. Complete a stocktake to establish a baseline.',
        items: [],
      });
    }

    const baselineDate = stocktake.approvedAt || stocktake.updatedAt || stocktake.createdAt;
    const baselineItems = stocktake.items || [];

    if (baselineItems.length === 0) {
      return res.json({
        success: true,
        hasBaseline: true,
        baselineDate,
        stocktakeId: stocktake._id,
        message: 'Stocktake has no items.',
        items: [],
      });
    }

    // Build baseline map: productId -> { actualQty, name, sku }
    const baselineMap = new Map();
    for (const item of baselineItems) {
      const pid = (item.productId || item.product)?._id?.toString() || (item.productId || item.product)?.toString();
      if (pid) {
        baselineMap.set(pid, {
          productId: pid,
          name: item.productName || item.name || '',
          sku: item.sku || '',
          baselineQty: item.actualQty ?? item.countedQty ?? 0,
        });
      }
    }

    // 2. Get all completed sales since baseline date for this branch
    const sales = await Sale.aggregate([
      {
        $match: {
          branchId: branchOid,
          createdAt: { $gte: new Date(baselineDate) },
          status: 'completed',
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $toString: { $ifNull: ['$items.productId', '$items.product'] } },
          totalSold: { $sum: '$items.quantity' },
        },
      },
    ]);
    const soldMap = new Map();
    for (const s of sales) {
      if (s._id) soldMap.set(s._id, s.totalSold);
    }

    // 3. Get transfers IN to this branch since baseline
    const transfersIn = await InterBranchTransfer.aggregate([
      {
        $match: {
          toBranchId: branchOid,
          status: { $in: ['received', 'partially_received'] },
          receivedAt: { $gte: new Date(baselineDate) },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $toString: '$items.productId' },
          totalIn: { $sum: { $ifNull: ['$items.quantityReceived', '$items.quantity'] } },
        },
      },
    ]);
    const inMap = new Map();
    for (const t of transfersIn) {
      if (t._id) inMap.set(t._id, t.totalIn);
    }

    // 4. Get transfers OUT from this branch since baseline
    const transfersOut = await InterBranchTransfer.aggregate([
      {
        $match: {
          fromBranchId: branchOid,
          status: { $in: ['in_transit', 'received', 'partially_received'] },
          dispatchedAt: { $gte: new Date(baselineDate) },
        },
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: { $toString: '$items.productId' },
          totalOut: { $sum: '$items.quantity' },
        },
      },
    ]);
    const outMap = new Map();
    for (const t of transfersOut) {
      if (t._id) outMap.set(t._id, t.totalOut);
    }

    // 5. Get current inventory for this branch
    const currentInventory = await BranchInventory.find({ branchId: branchOid, isActive: true })
      .populate('productId', 'name sku price')
      .lean();
    const currentMap = new Map();
    for (const inv of currentInventory) {
      const pid = inv.productId?._id?.toString();
      if (pid) {
        currentMap.set(pid, {
          quantity: inv.quantity,
          name: inv.productId.name,
          sku: inv.productId.sku,
          price: inv.productId.price,
        });
      }
    }

    // 6. Build reconciliation items
    const reconItems = [];
    for (const [pid, baseline] of baselineMap) {
      const sold = soldMap.get(pid) || 0;
      const transferredIn = inMap.get(pid) || 0;
      const transferredOut = outMap.get(pid) || 0;
      const current = currentMap.get(pid);
      const currentQty = current?.quantity ?? 0;

      const expected = baseline.baselineQty - sold + transferredIn - transferredOut;
      const variance = currentQty - expected;

      reconItems.push({
        productId: pid,
        name: current?.name || baseline.name,
        sku: current?.sku || baseline.sku,
        price: current?.price || 0,
        baselineQty: baseline.baselineQty,
        sold,
        transferredIn,
        transferredOut,
        expected,
        actual: currentQty,
        variance,
        varianceValue: variance * (current?.price || 0),
      });
    }

    // Sort by absolute variance descending (biggest discrepancies first)
    reconItems.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));

    const discrepancies = reconItems.filter(i => i.variance !== 0);
    const totalVarianceValue = discrepancies.reduce((sum, i) => sum + i.varianceValue, 0);

    res.json({
      success: true,
      hasBaseline: true,
      baselineDate,
      stocktakeId: stocktake._id,
      daysSinceBaseline: Math.floor((Date.now() - new Date(baselineDate).getTime()) / 86400000),
      summary: {
        totalItems: reconItems.length,
        discrepancies: discrepancies.length,
        totalVarianceValue: Math.round(totalVarianceValue * 100) / 100,
        balanced: discrepancies.length === 0,
      },
      items: reconItems,
    });
  } catch (error) {
    console.error('Reconciliation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Summary-only reconciliation (lighter query).
 * GET /reconciliation/:branchId/summary
 */
exports.getSummary = async (req, res) => {
  try {
    const { branchId } = req.params;

    const stocktake = await findLatestStocktake(branchId);
    if (!stocktake) {
      return res.json({
        success: true,
        hasBaseline: false,
        message: 'No approved stocktake found.',
      });
    }

    const baselineDate = stocktake.approvedAt || stocktake.updatedAt || stocktake.createdAt;
    const baselineItemCount = (stocktake.items || []).length;

    // Quick count of sales since baseline
    const salesCount = await Sale.countDocuments({
      branchId: new mongoose.Types.ObjectId(branchId),
      createdAt: { $gte: new Date(baselineDate) },
      status: 'completed',
    });

    res.json({
      success: true,
      hasBaseline: true,
      baselineDate,
      daysSinceBaseline: Math.floor((Date.now() - new Date(baselineDate).getTime()) / 86400000),
      stocktakeItemCount: baselineItemCount,
      salesSinceBaseline: salesCount,
    });
  } catch (error) {
    console.error('Reconciliation summary error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
