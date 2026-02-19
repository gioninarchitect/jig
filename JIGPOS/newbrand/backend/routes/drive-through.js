// Drive-Through (Retail Store) Routes — Thin router, business logic in controllers/drive-through.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/drive-through.controller');

// Order operations
router.post('/order', authenticateToken, controller.createOrder);
router.get('/queue', controller.getQueue);
router.get('/orders/:orderId', authenticateToken, controller.getOrder);

// Customer tracking
router.put('/location', authenticateToken, controller.updateLocation);
router.put('/status/:orderId', authenticateToken, controller.updateStatus);
router.post('/arrival', authenticateToken, controller.notifyArrival);
router.post('/complete', authenticateToken, controller.completePickup);
router.post('/cancel', authenticateToken, controller.cancelOrder);
router.get('/history', authenticateToken, controller.getHistory);

// EFT payment approval workflow
router.get('/approvals/pending', authenticateToken, controller.getPendingApprovals);
router.post('/approvals/:orderId/approve', authenticateToken, controller.approveEFT);
router.post('/approvals/:orderId/reject', authenticateToken, controller.rejectEFT);

module.exports = router;
