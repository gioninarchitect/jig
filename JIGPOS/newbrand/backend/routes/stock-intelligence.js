/**
 * Stock Intelligence Routes (P29)
 * Demand prediction, reorder, transfers, substitutes, waste prevention.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/stock-intelligence.controller');

const INVENTORY_ROLES = ['super_admin', 'owner', 'admin', 'branch_manager', 'inventory_manager'];

// Demand prediction for a product
router.get('/predict/:productId', authenticateToken, requireRole(INVENTORY_ROLES), controller.predictDemand);

// Reorder suggestions
router.get('/reorder-suggestions', authenticateToken, requireRole(INVENTORY_ROLES), controller.getReorderSuggestions);

// Auto-reorder (create draft PO)
router.post('/auto-reorder', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'inventory_manager']), controller.autoReorder);

// Transfer suggestions
router.get('/transfer-suggestions', authenticateToken, requireRole(INVENTORY_ROLES), controller.getTransferSuggestions);

// Initiate inter-branch transfer
router.post('/transfer', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'inventory_manager']), controller.initiateTransfer);

// Cannabinoid-matched substitutes
router.get('/substitutes/:productId', authenticateToken, requireRole(INVENTORY_ROLES), controller.getSubstitutes);

// Waste prevention (near-expiry batches)
router.get('/waste-prevention', authenticateToken, requireRole(INVENTORY_ROLES), controller.getWastePrevention);

module.exports = router;
