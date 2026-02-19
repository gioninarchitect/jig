// Budget Routes — Thin router, business logic in controllers/budgets.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/budgets.controller');

// Named route before parameterized
router.get('/comparison/:year/:month', authenticateToken, requireRole(['admin', 'owner']), controller.getComparison);

router.get('/:year/:month', authenticateToken, requireRole(['admin', 'owner', 'branch_manager']), controller.getByMonth);
router.post('/', authenticateToken, requireRole(['admin', 'owner']), controller.create);
router.put('/:id', authenticateToken, requireRole(['admin', 'owner']), controller.update);
router.post('/:id/approve', authenticateToken, requireRole(['owner']), controller.approve);
router.post('/:id/expense', authenticateToken, requireRole(['admin', 'owner', 'branch_manager']), controller.addExpense);

module.exports = router;
