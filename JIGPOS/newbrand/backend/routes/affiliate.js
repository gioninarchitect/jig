// Affiliate Routes — Thin router, business logic in controllers/affiliate.controller.js
const config = require('../config');
const logger = require('../modules/logger');
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../middleware/auth');
const { authLimiter, registrationLimiter } = require('../middleware/rateLimiter');
const { validateAffiliate } = require('../middleware/validation');
const controller = require('../controllers/affiliate.controller');

// LOCAL middleware — Verify affiliate token (also works with regular user tokens for admin)
const verifyAffiliateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    logger.debug('Affiliate token verified', { decoded });
    req.affiliateId = decoded.affiliateId;
    req.user = decoded;
    logger.debug('Affiliate req.user set', { user: req.user });
    next();
  } catch (error) {
    logger.error('Affiliate JWT verification failed', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Public routes (rate limited)
router.post('/register', registrationLimiter, validateAffiliate, controller.register);
router.post('/login', authLimiter, controller.login);

// Affiliate authenticated routes
router.get('/dashboard', verifyAffiliateToken, controller.getDashboard);
router.post('/generate-link', verifyAffiliateToken, controller.generateLink);
router.get('/commissions', verifyAffiliateToken, controller.getCommissions);
router.post('/request-payout', verifyAffiliateToken, controller.requestPayout);
router.put('/payout-details', verifyAffiliateToken, controller.updatePayoutDetails);
router.get('/leaderboard', controller.getLeaderboard);

// Tracking routes (public)
router.post('/track-click/:affiliateCode', controller.trackClick);
router.post('/track-conversion', controller.trackConversion);

// Admin routes (use affiliate token which also decodes user for admin checks)
router.get('/admin/all', verifyAffiliateToken, controller.adminGetAll);
router.post('/admin/approve/:id', verifyAffiliateToken, controller.adminApprove);
router.post('/admin/suspend/:id', verifyAffiliateToken, controller.adminSuspend);

module.exports = router;
