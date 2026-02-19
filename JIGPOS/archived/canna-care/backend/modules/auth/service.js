// Auth Service - Business Logic - Max 200 lines
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../database/models/User');
const config = require('../../config');
const emailService = require('../notification/email');
const logger = require('../logger');
const cache = require('../cache');

class AuthService {
  async register(userData) {
    try {
      // Check if user exists
      const existingUser = await User.findOne({
        $or: [
          { email: userData.email },
          { username: userData.username }
        ]
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create new user
      const user = new User({
        ...userData,
        referralCode: this.generateReferralCode(),
        loyalty: {
          ldCoins: config.business.welcomeBonus
        }
      });

      // Handle referral
      if (userData.referralCode) {
        const referrer = await User.findOne({ referralCode: userData.referralCode });
        if (referrer) {
          user.referredBy = referrer._id;
          // Award referral bonus
          referrer.loyalty.ldCoins += config.business.referralBonus;
          await referrer.save();
        }
      }

      await user.save();

      // Send verification email
      const verificationToken = this.generateToken();
      user.emailVerificationToken = verificationToken;
      user.emailVerificationExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
      await user.save();

      await emailService.sendVerificationEmail(user.email, verificationToken);

      // Generate tokens
      const token = this.generateJWT(user);
      const refreshToken = this.generateRefreshToken(user);

      // Cache refresh token
      await cache.set(`refresh_${refreshToken}`, user._id, 30 * 24 * 60 * 60);

      return {
        user: this.sanitizeUser(user),
        token,
        refreshToken
      };
    } catch (error) {
      logger.error('Registration service error:', error);
      throw error;
    }
  }

  async login(email, password) {
    try {
      const user = await User.findOne({ email }).select('+password');
      
      if (!user || !user.isActive) {
        throw new Error('Invalid credentials');
      }

      // Check if account is locked
      if (user.isLocked()) {
        throw new Error('Account is locked. Please try again later');
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      
      if (!isValidPassword) {
        // Increment login attempts
        user.loginAttempts += 1;
        
        if (user.loginAttempts >= config.auth.maxLoginAttempts) {
          user.lockUntil = Date.now() + config.auth.lockoutDuration;
        }
        
        await user.save();
        throw new Error('Invalid credentials');
      }

      // Reset login attempts
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const token = this.generateJWT(user);
      const refreshToken = this.generateRefreshToken(user);

      // Cache refresh token
      await cache.set(`refresh_${refreshToken}`, user._id, 30 * 24 * 60 * 60);

      return {
        user: this.sanitizeUser(user),
        token,
        refreshToken
      };
    } catch (error) {
      logger.error('Login service error:', error);
      throw error;
    }
  }

  async logout(refreshToken) {
    try {
      await cache.del(`refresh_${refreshToken}`);
    } catch (error) {
      logger.error('Logout service error:', error);
    }
  }

  async refreshToken(refreshToken) {
    try {
      const userId = await cache.get(`refresh_${refreshToken}`);
      
      if (!userId) {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findById(userId);
      
      if (!user || !user.isActive) {
        throw new Error('User not found');
      }

      const token = this.generateJWT(user);
      
      return { token };
    } catch (error) {
      logger.error('Refresh token service error:', error);
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const user = await User.findOne({ email });
      
      if (!user) {
        // Don't reveal if user exists
        return;
      }

      const resetToken = this.generateToken();
      user.passwordResetToken = resetToken;
      user.passwordResetExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
      await user.save();

      await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      logger.error('Forgot password service error:', error);
      throw error;
    }
  }

  generateJWT(user) {
    return jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role
      },
      config.auth.jwtSecret,
      { expiresIn: config.auth.jwtExpiry }
    );
  }

  generateRefreshToken(user) {
    return crypto.randomBytes(32).toString('hex');
  }

  generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  generateReferralCode() {
    return crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  sanitizeUser(user) {
    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.passwordResetToken;
    delete userObj.emailVerificationToken;
    delete userObj.twoFactorSecret;
    return userObj;
  }
}

module.exports = new AuthService();