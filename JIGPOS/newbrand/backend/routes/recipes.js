// Recipe Routes — Thin router, business logic in controllers/recipes.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/recipes.controller');

router.get('/', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.getAll);
router.post('/calculate', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.calculate);
router.post('/', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.create);
router.get('/:id', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.getById);
router.put('/:id', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.update);
router.post('/:id/clone', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.clone);
router.delete('/:id', authenticateToken, requireRole(['admin', 'owner']), controller.remove);

module.exports = router;
