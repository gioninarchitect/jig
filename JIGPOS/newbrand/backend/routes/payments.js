// Payments Routes — Admin payment queries
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/payments.controller');

router.get('/', authenticateToken, requireRole(['admin', 'owner', 'branch_manager']), controller.getAll);

module.exports = router;
