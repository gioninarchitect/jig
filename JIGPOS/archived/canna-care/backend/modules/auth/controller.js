// Auth Controller - Max 200 lines
const authService = require('./service');
const { validationResult } = require('express-validator');
const logger = require('../logger');

class AuthController {
  async register(req, res) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const result = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: result
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Registration failed'
      });
    }
  }

  async login(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const { email, password } = req.body;
      const result = await authService.login(email, password);
      
      // Set refresh token as HTTP-only cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
      
      res.json({
        success: true,
        message: 'Login successful',
        data: {
          user: result.user,
          token: result.token
        }
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(error.statusCode || 401).json({
        success: false,
        message: error.message || 'Login failed'
      });
    }
  }

  async logout(req, res) {
    try {
      const { refreshToken } = req.cookies;
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }
      
      res.clearCookie('refreshToken');
      
      res.json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      logger.error('Logout error:', error);
      res.status(500).json({
        success: false,
        message: 'Logout failed'
      });
    }
  }

  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.cookies;
      
      if (!refreshToken) {
        return res.status(401).json({
          success: false,
          message: 'No refresh token provided'
        });
      }
      
      const result = await authService.refreshToken(refreshToken);
      
      res.json({
        success: true,
        data: {
          token: result.token
        }
      });
    } catch (error) {
      logger.error('Token refresh error:', error);
      res.status(401).json({
        success: false,
        message: 'Token refresh failed'
      });
    }
  }

  async forgotPassword(req, res) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      
      res.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      logger.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send reset email'
      });
    }
  }

  async resetPassword(req, res) {
    try {
      const { token, password } = req.body;
      await authService.resetPassword(token, password);
      
      res.json({
        success: true,
        message: 'Password reset successful'
      });
    } catch (error) {
      logger.error('Reset password error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Password reset failed'
      });
    }
  }

  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      await authService.verifyEmail(token);
      
      res.json({
        success: true,
        message: 'Email verified successfully'
      });
    } catch (error) {
      logger.error('Email verification error:', error);
      res.status(400).json({
        success: false,
        message: 'Email verification failed'
      });
    }
  }

  async enable2FA(req, res) {
    try {
      const userId = req.user.id;
      const result = await authService.enable2FA(userId);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('2FA enable error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to enable 2FA'
      });
    }
  }

  async verify2FA(req, res) {
    try {
      const { code } = req.body;
      const userId = req.user.id;
      
      const isValid = await authService.verify2FA(userId, code);
      
      res.json({
        success: isValid,
        message: isValid ? '2FA verified' : 'Invalid code'
      });
    } catch (error) {
      logger.error('2FA verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify 2FA'
      });
    }
  }
}

module.exports = new AuthController();