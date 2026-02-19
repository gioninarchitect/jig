// Staff Shift Routes — Thin router, business logic in controllers/staff-shifts.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/staff-shifts.controller');

// Self-service (auth only)
router.post('/clock-in', authenticateToken, controller.clockIn);
router.post('/clock-out', authenticateToken, controller.clockOut);
router.post('/break/start', authenticateToken, controller.startBreak);
router.post('/break/end', authenticateToken, controller.endBreak);
router.get('/my-shifts', authenticateToken, controller.getMyShifts);

// Admin
router.get('/payroll', authenticateToken, requireRole(['admin', 'owner']), controller.getPayroll);
router.get('/', authenticateToken, requireRole(['admin', 'owner', 'branch_manager']), controller.getAll);
router.post('/:id/approve', authenticateToken, requireRole(['admin', 'owner', 'branch_manager']), controller.approve);

module.exports = router;
