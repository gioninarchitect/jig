// Menu Routes — Thin router, business logic in controllers/menu.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/menu.controller');

// Public routes
router.get('/', controller.getAll);
router.get('/venue/:venue', controller.getByVenue);
router.get('/featured', controller.getFeatured);

// Admin routes (named before parameterized)
router.post('/admin/sync-pos', authenticateToken, requireAdmin, controller.syncPos);
router.get('/admin/sync-status', controller.getSyncStatus);
router.post('/admin/update-inventory', controller.updateInventory);
router.post('/admin/create', controller.adminCreate);
router.put('/admin/:id', controller.adminUpdate);
router.delete('/admin/:id', controller.adminDelete);

// Parameterized (after named)
router.get('/:id', controller.getById);
router.post('/:id/calculate-price', controller.calculatePrice);

module.exports = router;
