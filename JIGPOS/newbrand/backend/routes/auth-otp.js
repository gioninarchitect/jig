// Auth OTP Routes — Thin router, business logic in controllers/auth-otp.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/auth-otp.controller');

// OTP flow (public)
router.post('/request', controller.requestOTP);
router.post('/verify-pin', controller.verifyPin);
router.post('/verify', controller.verifyOTP);
router.post('/resend', controller.resendOTP);

// Session management (authenticated)
router.post('/logout', authenticateToken, controller.logout);
router.post('/logout-all', authenticateToken, controller.logoutAll);
router.get('/sessions', authenticateToken, controller.getSessions);
router.delete('/sessions/:sessionId', authenticateToken, controller.revokeSession);

// User info & profile
router.get('/me', authenticateToken, controller.getMe);
router.put('/update-profile', authenticateToken, controller.updateProfile);

// Age verification
router.post('/verify-age', authenticateToken, controller.verifyAge);
router.get('/age-status', authenticateToken, controller.getAgeStatus);

// Admin tools
router.get('/test-smtp', authenticateToken, controller.testSmtp);

module.exports = router;
