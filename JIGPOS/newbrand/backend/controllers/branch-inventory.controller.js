// Branch Inventory Controller — Aggregated branch inventory queries
const logger = require('../modules/logger');
const BranchInventory = require('../modules/database/models/BranchInventory');

// GET /branch-inventory — Aggregated inventory across branches
exports.getAll = async (req, res) => {
  try {
    const { limit = 500, branchId } = req.query;

    const query = {};
    if (branchId) query.branchId = branchId;

    const inventory = await BranchInventory.find(query)
      .populate('branchId', 'name branchCode')
      .populate('productId', 'name sku category price')
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, inventory });
  } catch (error) {
    logger.error('Branch inventory fetch error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching branch inventory' });
  }
};
