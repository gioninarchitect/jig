// Supplier Routes — Thin router, business logic in controllers/supplier.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/supplier.controller');

// List and search (named routes before :id)
router.get('/', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getAll);
router.get('/expiring-licenses', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getExpiringLicenses);
router.get('/by-category/:category', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getByCategory);

// Single supplier operations
router.get('/:id', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getById);
router.get('/:id/orders', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getOrders);
router.get('/:id/batches', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getBatches);
router.get('/:id/performance', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getPerformance);

// CRUD
router.post('/', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.create);
router.put('/:id', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.update);

// Compliance actions
router.post('/:id/verify', authenticateToken, requireRole(['admin', 'owner']), controller.verify);
router.post('/:id/suspend', authenticateToken, requireRole(['admin', 'owner']), controller.suspend);
router.post('/:id/reactivate', authenticateToken, requireRole(['admin', 'owner']), controller.reactivate);

// Documents
router.post('/:id/documents', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.uploadDocument);

module.exports = router;
