// Lead Routes — Thin router, business logic in controllers/leads.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin, requireRole } = require('../middleware/auth');
const controller = require('../controllers/leads.controller');

// Public
router.post('/', controller.create);

// Named routes before parameterized
router.get('/meta/statistics', authenticateToken, requireRole(['admin', 'branch_manager']), controller.getStatistics);

// Authenticated
router.get('/', authenticateToken, requireRole(['admin', 'branch_manager']), controller.getAll);
router.get('/:id', authenticateToken, requireRole(['admin', 'branch_manager']), controller.getById);
router.put('/:id', authenticateToken, requireRole(['admin', 'branch_manager']), controller.update);
router.delete('/:id', authenticateToken, requireAdmin, controller.remove);

module.exports = router;
