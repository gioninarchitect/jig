// Stock Transfer Routes — Thin router, business logic in controllers/stock-transfers.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/stock-transfers.controller');

router.get('/', authenticateToken, controller.getAll);
router.post('/', authenticateToken, controller.create);
router.post('/quick-receive', authenticateToken, controller.quickReceive);
router.get('/:id', authenticateToken, controller.getById);
router.post('/:id/in-transit', authenticateToken, controller.markInTransit);
router.post('/:id/delivered', authenticateToken, controller.markDelivered);
router.post('/:id/cancel', authenticateToken, controller.cancel);

module.exports = router;
