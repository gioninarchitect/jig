// User Routes — Thin router, business logic in controllers/users.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { validateLogin } = require('../middleware/validation');
const controller = require('../controllers/users.controller');

// Login (rate limited)
router.post('/login', authLimiter, validateLogin, controller.login);

// Admin CRUD
router.get('/', authenticateToken, requireAdmin, controller.getAll);
router.post('/', authenticateToken, requireAdmin, controller.create);
router.get('/:userId', authenticateToken, requireAdmin, controller.getById);
router.put('/:userId', authenticateToken, requireAdmin, controller.update);
router.delete('/:userId', authenticateToken, requireAdmin, controller.remove);
router.post('/:userId/reset-password', authenticateToken, requireAdmin, controller.resetPassword);

module.exports = router;
