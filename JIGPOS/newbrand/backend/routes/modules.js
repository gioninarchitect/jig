// Module Routes — Thin router, business logic in controllers/modules.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/modules.controller');

router.get('/', authenticateToken, requireRole(['admin']), controller.getAll);
router.get('/installed', authenticateToken, controller.getInstalled);
router.post('/install/:moduleId', authenticateToken, requireRole(['admin']), controller.install);
router.delete('/uninstall/:moduleId', authenticateToken, requireRole(['admin']), controller.uninstall);
router.put('/configure/:moduleId', authenticateToken, requireRole(['admin']), controller.configure);
router.post('/activate/:moduleId', authenticateToken, requireRole(['admin']), controller.activate);
router.post('/track-usage/:moduleId', authenticateToken, controller.trackUsage);

module.exports = router;
