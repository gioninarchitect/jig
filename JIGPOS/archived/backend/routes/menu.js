// Menu Routes - for Thaba Café & Morija Roastery
const express = require('express');
const router = express.Router();
const MenuItem = require('../modules/database/models/MenuItem');
const POSService = require('../modules/pos/service');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Get all menu items (public)
router.get('/', async (req, res) => {
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
});

// Get menu by venue
router.get('/venue/:venue', async (req, res) => {
  try {
    const { venue } = req.params;
    const menuItems = await MenuItem.getMenuByVenue(venue);

    res.json({ success: true, venue, menuItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get featured items
router.get('/featured', async (req, res) => {
  try {
    const { venue } = req.query;
    const featured = await MenuItem.getFeatured(venue);

    res.json({ success: true, featured });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get single menu item
router.get('/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Calculate price with customizations
router.post('/:id/calculate-price', async (req, res) => {
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
});

// ===== ADMIN ROUTES (require authentication) =====

// Sync menu from POS (Admin only)
router.post('/admin/sync-pos', authenticateToken, requireAdmin, async (req, res) => {
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
});

// Get sync status
router.get('/admin/sync-status', async (req, res) => {
  try {
    const status = POSService.getSyncStatus();
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update inventory
router.post('/admin/update-inventory', async (req, res) => {
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
});

// Create menu item manually
router.post('/admin/create', async (req, res) => {
  try {
    const menuItem = new MenuItem(req.body);
    await menuItem.save();

    res.status(201).json({ success: true, menuItem });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update menu item
router.put('/admin/:id', async (req, res) => {
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
});

// Delete menu item
router.delete('/admin/:id', async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndDelete(req.params.id);

    if (!menuItem) {
      return res.status(404).json({ success: false, message: 'Menu item not found' });
    }

    res.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
