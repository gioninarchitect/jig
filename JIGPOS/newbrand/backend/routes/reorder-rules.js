// Reorder Rule Routes — Thin router, business logic in controllers/reorder-rules.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/reorder-rules.controller');

router.get('/', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.getAll);
router.get('/check', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.check);
router.post('/', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.create);
router.get('/:id', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.getById);
router.put('/:id', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.update);
router.post('/:id/trigger', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.trigger);
router.delete('/:id', authenticateToken, requireRole(['admin', 'owner']), controller.remove);

module.exports = router;
