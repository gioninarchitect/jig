// Medical Service Provider Routes — Thin router, business logic in controllers/medical-providers.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const controller = require('../controllers/medical-providers.controller');

// Public (patient portal)
router.get('/portal', optionalAuth, controller.getPortal);
router.get('/prescribers', controller.getPrescribers);
router.get('/profile/:slug', controller.getProfile);
router.get('/featured', controller.getFeatured);

// Supplier for branch (auth only, no role)
router.get('/suppliers/branch/:branchId', authenticateToken, controller.getSuppliersForBranch);

// Admin CRUD
router.get('/', authenticateToken, requireRole(['admin', 'owner', 'super_admin']), controller.getAll);
router.post('/', authenticateToken, requireRole(['admin', 'owner', 'super_admin']), controller.create);
router.get('/:id', authenticateToken, requireRole(['admin', 'owner', 'super_admin']), controller.getById);
router.put('/:id', authenticateToken, requireRole(['admin', 'owner', 'super_admin']), controller.update);
router.post('/:id/activate', authenticateToken, requireRole(['admin', 'owner', 'super_admin']), controller.activate);
router.post('/:id/suspend', authenticateToken, requireRole(['admin', 'owner', 'super_admin']), controller.suspend);
router.delete('/:id', authenticateToken, requireRole(['owner', 'super_admin']), controller.remove);

// Branch linkage
router.post('/:id/branches', authenticateToken, requireRole(['admin', 'owner', 'super_admin']), controller.linkBranches);
router.delete('/:id/branches/:branchId', authenticateToken, requireRole(['admin', 'owner', 'super_admin']), controller.unlinkBranch);

// Product linkage
router.post('/:id/products', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.linkProducts);

module.exports = router;
