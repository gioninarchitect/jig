// Viral Score Routes — Thin router, business logic in controllers/viral.controller.js
const config = require('../config');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const controller = require('../controllers/viral.controller');

// LOCAL middleware — JWT Authentication (specific to viral routes)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// LOCAL middleware — Admin-only for campaign management and analytics
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'branch_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Viral score operations
router.post('/calculate/:entityType/:entityId', authenticateToken, requireAdmin, controller.calculate);
router.get('/trending', authenticateToken, controller.getTrendingProducts);
router.get('/recommendations', authenticateToken, controller.getRecommendations);
router.get('/match-influencers/:productId', authenticateToken, requireAdmin, controller.matchInfluencers);
router.post('/track-spread/:entityType/:entityId', authenticateToken, controller.trackSpread);
router.get('/analytics/dashboard', authenticateToken, requireAdmin, controller.getAnalyticsDashboard);

// Campaign management
router.post('/campaigns', authenticateToken, requireAdmin, controller.createCampaign);
router.get('/campaigns', authenticateToken, requireAdmin, controller.getCampaigns);
router.get('/campaigns/:id', authenticateToken, requireAdmin, controller.getCampaignDetails);
router.post('/campaigns/:id/influencers', authenticateToken, requireAdmin, controller.addInfluencer);
router.post('/campaigns/:id/track', authenticateToken, controller.trackCampaign);
router.get('/campaigns/:id/analytics', authenticateToken, requireAdmin, controller.getCampaignAnalytics);
router.get('/live-dashboard', authenticateToken, requireAdmin, controller.getLiveDashboard);

module.exports = router;
