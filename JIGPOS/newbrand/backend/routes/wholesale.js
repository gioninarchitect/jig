// Wholesale Routes — Thin router, business logic in controllers/wholesale.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/wholesale.controller');

// Customer management
router.get('/customers', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getCustomers);
router.get('/customers/:id', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getCustomer);
router.post('/customers', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.createCustomer);
router.put('/customers/:id', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.updateCustomer);
router.post('/customers/from-branch/:branchId', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.createFromBranch);

// Order management
router.get('/orders', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getOrders);
router.get('/orders/:id', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getOrder);
router.post('/orders', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.createOrder);
router.post('/orders/:id/convert', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.convertToOrder);
router.post('/orders/:id/approve', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.approveOrder);
router.post('/orders/:id/status', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.updateOrderStatus);
router.post('/orders/:id/payment', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.recordPayment);
router.get('/orders/overdue', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getOverdueOrders);

// Resupply
router.get('/resupply/:branchId', authenticateToken, controller.getResupply);
router.post('/resupply', authenticateToken, controller.createResupply);

// Reports
router.get('/reports/aging', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getAgingReport);
router.get('/reports/sales-by-customer', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'inventory_manager']), controller.getSalesByCustomer);

module.exports = router;
