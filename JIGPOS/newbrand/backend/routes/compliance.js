// Compliance Routes — Compliance logging and audit package generation
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/compliance.controller');

router.get('/log', authenticateToken, controller.getLog);
router.post('/log', authenticateToken, controller.createLog);
router.post('/audit-package', authenticateToken, controller.generateAuditPackage);
router.get('/section21/status', authenticateToken, controller.getSection21Status);

module.exports = router;
