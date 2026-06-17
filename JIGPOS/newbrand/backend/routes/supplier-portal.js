// Supplier Portal Routes — Self-service endpoints for suppliers/farms
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/supplier-portal.controller');

router.get('/products', authenticateToken, controller.getProducts);
router.post('/products', authenticateToken, controller.submitProduct);
router.get('/purchase-orders', authenticateToken, controller.getPurchaseOrders);
router.get('/documents', authenticateToken, controller.getDocuments);

module.exports = router;
