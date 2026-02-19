// Auth Routes - Max 200 lines
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('./controller');
const authMiddleware = require('./middleware');
const rateLimiter = require('../middleware/rateLimiter');

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('username').isLength({ min: 3 }).trim(),
  body('password').isLength({ min: 8 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').optional().isMobilePhone('any')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

const passwordResetValidation = [
  body('password').isLength({ min: 8 })
];

// Public routes
router.post(
  '/register',
  rateLimiter.auth,
  registerValidation,
  authController.register
);

router.post(
  '/login',
  rateLimiter.auth,
  loginValidation,
  authController.login
);

router.post(
  '/logout',
  authController.logout
);

router.post(
  '/refresh',
  authController.refreshToken
);

router.post(
  '/forgot-password',
  rateLimiter.auth,
  body('email').isEmail().normalizeEmail(),
  authController.forgotPassword
);

router.post(
  '/reset-password',
  passwordResetValidation,
  authController.resetPassword
);

router.get(
  '/verify-email/:token',
  authController.verifyEmail
);

// Protected routes
router.post(
  '/2fa/enable',
  authMiddleware.authenticate,
  authController.enable2FA
);

router.post(
  '/2fa/verify',
  authMiddleware.authenticate,
  body('code').notEmpty(),
  authController.verify2FA
);

module.exports = router;