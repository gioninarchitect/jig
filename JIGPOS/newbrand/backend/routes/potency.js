/**
 * Potency Routes (P29)
 * Potency estimation, alerts, auto-markdown, FIFO prioritization.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/potency.controller');

const INVENTORY_ROLES = ['super_admin', 'owner', 'admin', 'branch_manager', 'inventory_manager'];

// Estimate current potency for a batch
router.post('/potency/estimate', authenticateToken, requireRole(INVENTORY_ROLES), controller.estimatePotency);

// Potency degradation alerts
router.get('/potency/alerts', authenticateToken, requireRole(INVENTORY_ROLES), controller.getPotencyAlerts);

// Auto-markdown for degraded batch
router.post('/potency/markdown', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'inventory_manager']), controller.createMarkdown);

// FIFO-prioritized batch list
router.get('/fifo/:productId', authenticateToken, requireRole(INVENTORY_ROLES), controller.getFIFO);

module.exports = router;
