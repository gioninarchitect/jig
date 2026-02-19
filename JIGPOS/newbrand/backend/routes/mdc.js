// MDC Routes — Master Digital Catalogue pipeline
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/mdc.controller');

const MDC_ROLES = ['admin', 'owner', 'inventory_manager'];

// Pipeline overview
router.get('/pipeline', authenticateToken, requireRole(MDC_ROLES), controller.getPipeline);

// Product listing by stage
router.get('/products', authenticateToken, requireRole(MDC_ROLES), controller.getProducts);

// Bulk operations (must be before :id routes)
router.patch('/products/bulk-tag', authenticateToken, requireRole(MDC_ROLES), controller.bulkTag);

// Stage transitions
router.patch('/products/:id/advance', authenticateToken, requireRole(MDC_ROLES), controller.advance);
router.patch('/products/:id/reject', authenticateToken, requireRole(MDC_ROLES), controller.reject);

// Branch allocation
router.post('/products/:id/allocate', authenticateToken, requireRole(MDC_ROLES), controller.allocate);
router.get('/products/:id/allocation', authenticateToken, requireRole(MDC_ROLES), controller.getAllocation);

// Go live
router.post('/products/:id/go-live', authenticateToken, requireRole(MDC_ROLES), controller.goLive);

module.exports = router;
