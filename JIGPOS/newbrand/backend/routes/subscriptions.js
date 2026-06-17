/**
 * Subscription Routes
 * Thin router - business logic in controllers/subscriptions.controller.js
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/subscriptions.controller');

// Public
router.get('/modules', controller.getModules);
router.post('/webhook/payu', controller.webhookPayu);

// User routes
router.get('/my', authenticateToken, controller.getMy);
router.post('/subscribe', authenticateToken, controller.subscribe);
router.post('/:id/cancel', authenticateToken, controller.cancel);
router.get('/:moduleId/check', authenticateToken, controller.checkAccess);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, controller.adminGetAll);
router.post('/admin/:id/suspend', authenticateToken, requireAdmin, controller.adminSuspend);

module.exports = router;
