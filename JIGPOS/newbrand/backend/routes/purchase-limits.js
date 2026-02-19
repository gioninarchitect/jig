// Purchase Limits Routes — Thin router, business logic in controllers/purchase-limits.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/purchase-limits.controller');

// Patient limit operations
router.get('/patients/:id/limits', authenticateToken, requireRole(['admin', 'branch_manager', 'branch_assistant']), controller.getPatientLimits);
router.post('/patients/:id/check-purchase', authenticateToken, requireRole(['admin', 'branch_manager', 'branch_assistant']), controller.checkPurchase);
router.get('/patients/:id/purchase-history', authenticateToken, requireRole(['admin', 'branch_manager', 'branch_assistant']), controller.getPurchaseHistory);
router.put('/patients/:id/limits', authenticateToken, requireRole(['admin']), controller.updateLimits);

// Purchase recording
router.post('/record', authenticateToken, requireRole(['admin', 'branch_manager', 'branch_assistant']), controller.recordPurchase);
router.post('/records/:id/void', authenticateToken, requireRole(['admin']), controller.voidRecord);

// Reports
router.get('/approaching-limits', authenticateToken, requireRole(['admin', 'branch_manager']), controller.getApproachingLimits);

module.exports = router;
