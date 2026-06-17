// Influencer Verification Routes — Thin router, business logic in controllers/influencer-verification.controller.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/influencer-verification.controller');

// Verify influencer social media profiles
router.post('/verify-social-media', controller.verifySocialMedia);

// Get influencer analytics
router.get('/analytics/:affiliateId', controller.getAnalytics);

// Refresh metrics for a verified influencer
router.post('/refresh-metrics/:affiliateId', controller.refreshMetrics);

// Batch verify multiple influencers
router.post('/batch-verify', controller.batchVerify);

module.exports = router;
