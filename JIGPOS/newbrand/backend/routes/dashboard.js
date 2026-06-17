// Dashboard Routes — Thin router, business logic in controllers/dashboard.controller.js
const express = require('express');
const router = express.Router();
const config = require('../config');
const controller = require('../controllers/dashboard.controller');

// Local verifyToken middleware (dashboard-specific, sets req.userId/userEmail/userRole)
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Dashboard stats
router.get('/stats', verifyToken, controller.getStats);
router.get('/owner-stats', verifyToken, controller.getOwnerStats);

// Orders
router.get('/orders', verifyToken, controller.getOrders);
router.get('/orders/:orderNumber', verifyToken, controller.getOrderDetails);
router.get('/track/:orderNumber', controller.trackOrder);

// Profile
router.put('/profile', verifyToken, controller.updateProfile);

// Activity & membership
router.get('/activity', verifyToken, controller.getActivity);
router.post('/upgrade-membership', verifyToken, controller.upgradeMembership);

// Affiliate stats
router.get('/affiliate-stats', controller.getAffiliateStats);

// Wellness points
router.get('/points', verifyToken, controller.getPoints);
router.get('/points/history', verifyToken, controller.getPointsHistory);
router.post('/points/redeem', verifyToken, controller.redeemPoints);

// Role-specific KPIs
router.get('/kpis', verifyToken, controller.getKPIs);

// Owner 360 endpoints
router.get('/staff-overview', verifyToken, controller.staffOverview);
router.get('/branch-comparison', verifyToken, controller.branchComparison);

// Purchase limits
router.get('/purchase-limits', verifyToken, controller.getPurchaseLimits);
router.post('/purchase-limits/check', verifyToken, controller.checkPurchaseLimits);
router.put('/purchase-limits/:userId', verifyToken, controller.updatePurchaseLimits);
router.post('/purchase-limits/record', verifyToken, controller.recordPurchase);

module.exports = router;
