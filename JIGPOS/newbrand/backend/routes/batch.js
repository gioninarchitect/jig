// Batch Routes — Thin router, business logic in controllers/batch.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/batch.controller');

// List and search
router.get('/', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager', 'branch_assistant']), controller.getAll);
router.get('/available/:productId', authenticateToken, controller.getAvailable);

// Single batch operations
router.get('/:id', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager', 'branch_assistant']), controller.getById);
router.get('/:id/trace', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.getTrace);

// CRUD
router.post('/', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager']), controller.create);
router.put('/:id', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager']), controller.update);

// QA operations
router.post('/:id/qa-approve', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager']), controller.qaApprove);
router.post('/:id/qa-reject', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager']), controller.qaReject);

// Movement
router.post('/:id/move', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager']), controller.move);

// Reports
router.get('/reports/expiring', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager']), controller.getExpiring);
router.get('/reports/low-stock', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager']), controller.getLowStock);

module.exports = router;
