// Purchase Order Routes — Thin router, business logic in controllers/purchase-order.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/purchase-order.controller');

const poRoles = ['admin', 'owner', 'inventory_manager', 'branch_manager'];

// List & query
router.get('/', authenticateToken, requireRole(poRoles), controller.getAll);
router.get('/requiring-action', authenticateToken, requireRole(poRoles), controller.getRequiringAction);
router.get('/overdue', authenticateToken, requireRole(poRoles), controller.getOverdue);
router.get('/:id', authenticateToken, requireRole(poRoles), controller.getById);

// CRUD
router.post('/', authenticateToken, requireRole(poRoles), controller.create);
router.put('/:id', authenticateToken, requireRole(poRoles), controller.update);

// Workflow
router.post('/:id/submit', authenticateToken, requireRole(poRoles), controller.submit);
router.post('/:id/approve', authenticateToken, requireRole(['admin', 'owner']), controller.approve);
router.post('/:id/reject', authenticateToken, requireRole(['admin', 'owner']), controller.reject);
router.post('/:id/mark-ordered', authenticateToken, requireRole(poRoles), controller.markOrdered);
router.post('/:id/receive', authenticateToken, requireRole(poRoles), controller.receiveGoods);
router.post('/:id/cancel', authenticateToken, requireRole(['admin', 'owner']), controller.cancel);

// Documents & payments
router.post('/:id/documents', authenticateToken, requireRole(poRoles), controller.addDocument);
router.post('/:id/payment', authenticateToken, requireRole(['admin', 'owner']), controller.recordPayment);

// PDF & email
router.get('/:id/pdf', authenticateToken, requireRole(poRoles), controller.generatePdf);
router.post('/:id/send-to-supplier', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.sendToSupplier);

module.exports = router;
