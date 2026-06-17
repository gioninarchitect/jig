// Report Routes — Thin router, business logic in controllers/reports.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/reports.controller');

// Allowed roles for reports access
const reportRoles = ['admin', 'owner', 'super_admin', 'inventory_manager', 'branch_manager'];

// JSON Reports (data for dashboards)
router.get('/sales', authenticateToken, requireRole(reportRoles), controller.getSales);
router.get('/inventory', authenticateToken, requireRole(reportRoles), controller.getInventory);
router.get('/orders', authenticateToken, requireRole(reportRoles), controller.getOrders);
router.get('/branches', authenticateToken, requireRole(reportRoles), controller.getBranches);
router.get('/staff', authenticateToken, requireRole(reportRoles), controller.getStaff);

// CSV Export Reports (downloadable files)
router.get('/sales/csv', authenticateToken, requireRole(reportRoles), controller.getSalesCSV);
router.get('/inventory/csv', authenticateToken, requireRole(reportRoles), controller.getInventoryCSV);
router.get('/orders/csv', authenticateToken, requireRole(reportRoles), controller.getOrdersCSV);
router.get('/staff/csv', authenticateToken, requireRole(reportRoles), controller.getStaffCSV);
router.get('/products/csv', authenticateToken, requireRole(reportRoles), controller.getProductsCSV);

module.exports = router;
