// Staff Routes — Thin router, business logic in controllers/staff.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/staff.controller');

// Named routes BEFORE parameterized
router.get('/meta/roles', authenticateToken, requireAdmin, controller.getRoles);

// CRUD
router.get('/', authenticateToken, requireAdmin, controller.getAll);
router.post('/', authenticateToken, requireAdmin, controller.create);
router.get('/:id', authenticateToken, requireAdmin, controller.getById);
router.put('/:id', authenticateToken, requireAdmin, controller.update);
router.delete('/:id', authenticateToken, requireAdmin, controller.remove);
router.post('/:id/reset-password', authenticateToken, requireAdmin, controller.resetPassword);

module.exports = router;
