/**
 * Risk Scoring Routes (P29)
 * Branch risk, network overview, cross-domain alerts, staff accountability.
 */

const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/risk.controller');

// Branch risk score
router.get('/branch/:branchId', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.getBranchRisk);

// Network-wide risk overview
router.get('/network', authenticateToken, requireRole(['super_admin', 'owner']), controller.getNetworkRisk);

// Cross-domain correlation alerts
router.get('/cross-domain', authenticateToken, requireRole(['super_admin', 'owner', 'admin']), controller.getCrossDomainAlerts);

// Individual staff accountability score
router.get('/staff/:staffId', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.getStaffScore);

// Staff leaderboard for a branch
router.get('/staff/leaderboard/:branchId', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.getStaffLeaderboard);

// Create investigation from risk alert
router.post('/investigate', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.createInvestigation);

module.exports = router;
