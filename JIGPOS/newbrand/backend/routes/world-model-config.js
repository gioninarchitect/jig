/**
 * World Model Config Routes
 * GET/PUT config, history, branch overrides, state sync.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/world-model-config.controller');

// Any authenticated user can read config
router.get('/', authenticateToken, controller.getConfig);

// Super Admin + Owner only can update
router.put('/', authenticateToken, requireRole(['super_admin', 'owner']), controller.updateConfig);

// Config change history (audit trail)
router.get('/history', authenticateToken, requireRole(['super_admin', 'owner']), controller.getHistory);

// Branch-specific override
router.put('/branch/:branchId', authenticateToken, requireRole(['super_admin', 'owner']), controller.setBranchOverride);

// Revert a config change
router.post('/revert/:historyId', authenticateToken, requireRole(['super_admin', 'owner']), controller.revertChange);

// World Model state sync (rate limited in controller)
router.post('/sync', authenticateToken, controller.syncState);

module.exports = router;
