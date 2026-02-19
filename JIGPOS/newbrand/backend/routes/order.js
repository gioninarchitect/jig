// Order Routes — Thin router, business logic in controllers/order.controller.js
const express = require('express');
const router = express.Router();
const { verifyToken, checkPaymentApproval } = require('../modules/auth/middleware');
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/order.controller');

// Payment status
router.post('/check-payment-status', verifyToken, controller.checkPaymentStatus);

// Order creation
router.post('/create', controller.createOrder);
router.post('/guest-checkout', controller.guestCheckout);
router.post('/create-split', authenticateToken, controller.createSplitPaymentOrder);

// Customer orders
router.get('/my-orders', verifyToken, checkPaymentApproval, controller.getMyOrders);
router.post('/:orderId/upload-proof', verifyToken, controller.uploadProof);

// Admin/Staff order management
router.get('/all', authenticateToken, controller.getAllOrders);
router.post('/:orderId/approve-payment', authenticateToken, controller.approvePaymentById);
router.post('/:orderId/reject-payment', authenticateToken, controller.rejectPaymentById);
router.post('/:orderId/approve', verifyToken, controller.approvePayment);
router.post('/:orderId/reject', verifyToken, controller.rejectPayment);

// Invoice
router.get('/:orderId/invoice', authenticateToken, controller.getInvoice);

// Split payment operations
router.post('/:orderId/add-payment', authenticateToken, controller.addPayment);
router.post('/:orderId/refund-payment', authenticateToken, controller.refundPayment);
router.get('/:orderId/payment-breakdown', authenticateToken, controller.getPaymentBreakdown);

// Order line item editing
router.put('/:id/items', authenticateToken, controller.updateItems);
router.put('/:id/items/:itemIndex', authenticateToken, controller.swapItem);

// PND (Pack & Dispatch) workflow
router.post('/:orderId/start-packing', authenticateToken, controller.startPacking);
router.post('/:orderId/complete-packing', authenticateToken, controller.completePacking);
router.post('/:orderId/dispatch', authenticateToken, controller.dispatch);
router.post('/:orderId/deliver', authenticateToken, controller.deliver);

// Get single order (must be last — catches /:orderId param)
router.get('/:orderId', authenticateToken, controller.getOrder);

module.exports = router;
