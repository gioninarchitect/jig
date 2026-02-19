// Menu Board Routes — Thin router, business logic in controllers/menu-boards.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/menu-boards.controller');

// Public (LED screens)
router.get('/display/:id', controller.getDisplay);

// Admin
router.get('/', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'branch_manager']), controller.getAll);
router.post('/', authenticateToken, requireRole(['super_admin', 'admin', 'owner']), controller.create);
router.put('/:id', authenticateToken, requireRole(['super_admin', 'admin', 'owner', 'branch_manager']), controller.update);
router.delete('/:id', authenticateToken, requireRole(['super_admin', 'admin', 'owner']), controller.remove);

module.exports = router;
