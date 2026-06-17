// Branches Routes — Thin router, business logic in controllers/branches.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, authenticateInternalOrToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/branches.controller');

// Public routes
router.get('/', controller.getAll);

// Owner stats — must be before /:id to avoid matching as an ID
router.get('/owner-stats', authenticateToken, requireRole(['owner', 'super_admin', 'admin']), controller.ownerStats);

router.get('/:id', controller.getById);

// Branch data (authenticated)
router.get('/:id/inventory', authenticateInternalOrToken, controller.getInventory);
router.get('/:id/stats', authenticateToken, controller.getStats);

// Branch CRUD (authenticated, admin/owner)
router.post('/', authenticateToken, requireRole(['admin', 'owner']), controller.create);
router.put('/:id', authenticateToken, requireRole(['admin', 'owner']), controller.update);
router.delete('/:id', authenticateToken, requireRole(['admin', 'owner']), controller.deactivate);
router.post('/:id/activate', authenticateToken, requireRole(['admin', 'owner']), controller.activate);

// Staff management
router.get('/:id/staff', authenticateToken, requireRole(['admin', 'owner', 'branch_manager']), controller.getStaff);
router.post('/:id/staff', authenticateToken, requireRole(['admin', 'owner', 'branch_manager']), controller.assignStaff);
router.delete('/:id/staff/:userId', authenticateToken, requireRole(['admin', 'owner', 'branch_manager']), controller.removeStaff);

// Till management
router.post('/:id/tills', authenticateToken, requireRole(['admin', 'owner']), controller.addTill);
router.put('/:id/tills/:tillNumber', authenticateToken, requireRole(['admin', 'owner']), controller.updateTill);

module.exports = router;
