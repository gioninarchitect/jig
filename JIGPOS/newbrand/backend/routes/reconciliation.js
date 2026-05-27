// Reconciliation Routes — Stock reconciliation based on last stocktake baseline
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/reconciliation.controller');

router.get('/:branchId', authenticateToken, controller.getReconciliation);
router.get('/:branchId/summary', authenticateToken, controller.getSummary);

module.exports = router;
