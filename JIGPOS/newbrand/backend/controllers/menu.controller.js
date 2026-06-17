// Menu Controller — Business logic for menu routes
const MenuItem = require('../modules/database/models/MenuItem');
const POSService = require('../modules/pos/service');

// GET / — List menu items with venue/category/featured filters
const getAll = async (req, res) => {
  try {
    const { venue, category, featured } = req.query;
    const query = {};

    if (venue) query.venue = { $in: [venue, 'both'] };
    if (category) query.category = category;
    if (featured) query.featured = true;

    query.available = true;

    const menuItems = await MenuItem.find(query)
      .sort({ category: 1, popular: -1, name: 1 });

    res.json({ success: true, menuItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /venue/:venue — Menu by venue using static method
const getByVenue = async (req, res) => {
  try {
    const { venue } = req.params;
    const menuItems = await MenuItem.getMenuByVenue(venue);

    res.json({ success: true, venue, menuItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /featured — Featured items
const getFeatured = async (req, res) => {
  try {
    const { venue } = req.query;
    const featured = await MenuItem.getFeatured(venue);

    res.json({ success: true, featured });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /:id — Single menu item
const getById = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /:id/calculate-price — Calculate price with customizations
const calculatePrice = async (req, res) => {
  try {
    const { sizeIndex = 0, customizationIds = [] } = req.body;
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    const price = menuItem.calculatePrice(sizeIndex, customizationIds);

    res.json({ success: true, price, item: menuItem.name });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /admin/sync-pos — Sync menu from POS (admin only)
const syncPos = async (req, res) => {
  try {
    const { posMenuItems, venue } = req.body;

    if (!posMenuItems || !Array.isArray(posMenuItems)) {
      return res.status(400).json({ success: false, message: 'Invalid POS menu data' });
    }

    if (!['la-brewha', 'bean-and-bud'].includes(venue)) {
      return res.status(400).json({ success: false, message: 'Invalid venue' });
    }

    const results = await POSService.syncMenu(posMenuItems, venue);

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /admin/sync-status — Get sync status
const getSyncStatus = async (req, res) => {
  try {
    const status = POSService.getSyncStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /admin/update-inventory — Update inventory
const updateInventory = async (req, res) => {
  try {
    const { inventoryUpdates } = req.body;

    if (!inventoryUpdates || !Array.isArray(inventoryUpdates)) {
      return res.status(400).json({ success: false, message: 'Invalid inventory data' });
    }

    const results = await POSService.updateInventory(inventoryUpdates);

    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /admin/create — Create menu item manually
const adminCreate = async (req, res) => {
  try {
    const menuItem = new MenuItem(req.body);
    await menuItem.save();

    res.status(201).json({ success: true, menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /admin/:id — Update menu item
const adminUpdate = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /admin/:id — Delete menu item
const adminDelete = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAll,
  getByVenue,
  getFeatured,
  getById,
  calculatePrice,
  syncPos,
  getSyncStatus,
  updateInventory,
  adminCreate,
  adminUpdate,
  adminDelete
};
