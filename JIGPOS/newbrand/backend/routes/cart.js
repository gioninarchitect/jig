// Cart Routes — Thin router, business logic in controllers/cart.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/cart.controller');

router.get('/', authenticateToken, controller.getCart);
router.post('/add', authenticateToken, controller.addItem);
router.post('/sync', authenticateToken, controller.syncCart);
router.put('/item/:itemIndex', authenticateToken, controller.updateItem);
router.delete('/item/:itemIndex', authenticateToken, controller.removeItem);
router.delete('/clear', authenticateToken, controller.clearCart);

module.exports = router;
