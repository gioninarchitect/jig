// Unified Admin Vetting Queue routes — approve/vet the 3 regulated parties in one place.
// Admin-gated (owner/super_admin bypass is built into requireRole).
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/admin-vetting.controller');

const ADMIN = ['admin', 'owner', 'super_admin'];

router.get('/pending', authenticateToken, requireRole(ADMIN), controller.getPending);
router.post('/:party/:id/approve', authenticateToken, requireRole(ADMIN), controller.approve);
router.post('/:party/:id/reject', authenticateToken, requireRole(ADMIN), controller.reject);

module.exports = router;
