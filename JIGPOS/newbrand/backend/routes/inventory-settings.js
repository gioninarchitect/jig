// Inventory Settings Routes — Thin router, logic in controllers/inventory-settings.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/inventory-settings.controller');

router.get('/', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'super_admin']), controller.get);
router.put('/', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'super_admin']), controller.update);

module.exports = router;
