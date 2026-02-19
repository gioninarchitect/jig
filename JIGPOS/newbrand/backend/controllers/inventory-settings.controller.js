// Inventory Settings Controller
const InventorySettings = require('../modules/database/models/InventorySettings');

// GET / — return current settings
exports.get = async (req, res) => {
  try {
    const settings = await InventorySettings.getSettings();
    res.json({ success: true, settings });
  } catch (err) {
    console.error('[InventorySettings] get error:', err);
    res.status(500).json({ success: false, message: 'Failed to load settings' });
  }
};

// PUT / — update settings
exports.update = async (req, res) => {
  try {
    const { lowStockThreshold, reorderPoint, notifications } = req.body;
    const update = {};

    if (lowStockThreshold !== undefined) update.lowStockThreshold = Number(lowStockThreshold);
    if (reorderPoint !== undefined) update.reorderPoint = Number(reorderPoint);
    if (notifications) update.notifications = notifications;
    update.updatedBy = req.user?.id || req.user?._id;

    const settings = await InventorySettings.findOneAndUpdate(
      {},
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ success: true, settings });
  } catch (err) {
    console.error('[InventorySettings] update error:', err);
    res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
};
