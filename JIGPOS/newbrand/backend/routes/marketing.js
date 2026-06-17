// Marketing Routes — Thin router, business logic in controllers/marketing.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/marketing.controller');

// Campaign management
router.get('/campaigns', authenticateToken, requireRole(['admin']), controller.getCampaigns);
router.get('/campaigns/stats', authenticateToken, requireRole(['admin']), controller.getCampaignStats);
router.get('/campaigns/:id', authenticateToken, requireRole(['admin']), controller.getCampaign);
router.get('/campaigns/:id/stats', authenticateToken, requireRole(['admin']), controller.getCampaignDetailedStats);
router.post('/campaigns', authenticateToken, requireRole(['admin']), controller.createCampaign);
router.put('/campaigns/:id', authenticateToken, requireRole(['admin']), controller.updateCampaign);
router.post('/campaigns/:id/schedule', authenticateToken, requireRole(['admin']), controller.scheduleCampaign);
router.post('/campaigns/:id/send', authenticateToken, requireRole(['admin']), controller.sendCampaign);
router.post('/campaigns/:id/cancel', authenticateToken, requireRole(['admin']), controller.cancelCampaign);
router.post('/campaigns/:id/event', controller.recordEvent);

// Marketing preference management
router.get('/preferences/stats', authenticateToken, requireRole(['admin']), controller.getPreferenceStats);
router.get('/preferences/:userId', authenticateToken, controller.getPreferences);
router.put('/preferences/:userId', authenticateToken, controller.updatePreferences);
router.post('/unsubscribe', controller.unsubscribe);
router.post('/preferences/:userId/resubscribe', authenticateToken, controller.resubscribe);

module.exports = router;
