/**
 * Voucher Routes — Thin router, business logic in controllers/vouchers.controller.js
 *
 * CRITICAL: This voucher system is ONLY for lifestyle/retail products.
 * Section 21 medical cannabis products CANNOT receive discounts (illegal in South Africa).
 *
 * The R700 Section 21 voucher is handled by an EXTERNAL third-party medical service provider.
 * We do NOT build anything related to that.
 */
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/vouchers.controller');

// Public routes
router.post('/validate', controller.validate);

// Authenticated routes
router.post('/redeem/:code', authenticateToken, controller.redeem);

// Admin routes (inline admin check in controller)
router.get('/', authenticateToken, controller.getAll);
router.post('/', authenticateToken, controller.create);
router.put('/:id', authenticateToken, controller.update);
router.delete('/:id', authenticateToken, controller.deactivate);
router.get('/:id/analytics', authenticateToken, controller.getAnalytics);

module.exports = router;
