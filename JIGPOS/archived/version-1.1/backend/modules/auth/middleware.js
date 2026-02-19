// Auth Middleware - Payment Status Check - Max 200 lines
const jwt = require('jsonwebtoken');
const User = require('../database/models/User');
const Order = require('../database/models/Order');
const config = require('../../config');
const logger = require('../logger');
const cache = require('../cache');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];
  const endpoint = req.originalUrl;

  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      logger.warn('Authorization failed: No token provided', {
        endpoint,
        ip,
        userAgent,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      logger.warn('Authorization failed: User not found', {
        tokenUserId: decoded.id,
        endpoint,
        ip,
        userAgent,
        timestamp: new Date().toISOString()
      });
      throw new Error('User not found');
    }

    // Check if user is active
    if (user.status === 'suspended' || user.status === 'banned') {
      logger.warn('Authorization failed: Account suspended/banned', {
        userId: user._id,
        email: user.email,
        status: user.status,
        endpoint,
        ip,
        userAgent,
        timestamp: new Date().toISOString()
      });
      return res.status(403).json({
        success: false,
        message: 'Account suspended or banned'
      });
    }

    logger.info('Authorization successful', {
      userId: user._id,
      email: user.email,
      role: user.role,
      endpoint,
      ip,
      timestamp: new Date().toISOString()
    });

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    logger.error('Token verification failed', {
      error: error.message,
      endpoint,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
    res.status(401).json({
      success: false,
      message: 'Please authenticate'
    });
  }
};

// Check payment approval status
const checkPaymentApproval = async (req, res, next) => {
  try {
    const user = req.user;
    
    // Skip for admin users
    if (user.role === 'admin') {
      return next();
    }

    // Check if user has pending payment
    const pendingOrder = await Order.findOne({
      user: user._id,
      paymentStatus: 'pending_approval',
      'payment.proofUploaded': true
    }).sort({ createdAt: -1 });

    if (pendingOrder) {
      // User has pending payment awaiting admin approval
      return res.status(403).json({
        success: false,
        message: 'Payment pending approval',
        redirect: '/payment-pending.html',
        orderId: pendingOrder.orderNumber,
        status: 'pending_approval'
      });
    }

    // Check if user has active membership
    if (user.membership?.status === 'active') {
      return next();
    }

    // Check for recently approved orders
    const approvedOrder = await Order.findOne({
      user: user._id,
      paymentStatus: 'completed',
      'items.isLifestyleMembership': true
    }).sort({ createdAt: -1 });

    if (approvedOrder && !user.membership?.active) {
      // Activate membership
      user.membership = {
        status: 'active',
        type: 'lifestyle',
        startDate: new Date(),
        benefits: config.membership.benefits
      };
      await user.save();
      
      // Clear cache
      await cache.invalidateUser(user._id.toString());
      
      req.user = user;
      return next();
    }

    // No active membership or pending payment
    if (!user.membership?.active) {
      return res.status(403).json({
        success: false,
        message: 'Membership required',
        redirect: '/shop.html',
        status: 'no_membership'
      });
    }

    next();
  } catch (error) {
    logger.error('Payment approval check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status'
    });
  }
};

// Check for specific membership tier
const requireMembership = (tier = 'lifestyle') => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      
      // Admin bypass
      if (user.role === 'admin') {
        return next();
      }

      // Check membership status
      if (!user.membership?.active) {
        return res.status(403).json({
          success: false,
          message: 'Active membership required',
          redirect: '/shop.html'
        });
      }

      // Check membership tier
      const tierHierarchy = {
        'basic': 1,
        'lifestyle': 2,
        'vip': 3,
        'platinum': 4
      };

      const userTier = tierHierarchy[user.membership.type] || 0;
      const requiredTier = tierHierarchy[tier] || 2;

      if (userTier < requiredTier) {
        return res.status(403).json({
          success: false,
          message: `${tier} membership required`,
          currentTier: user.membership.type,
          requiredTier: tier
        });
      }

      next();
    } catch (error) {
      logger.error('Membership check failed:', error);
      res.status(500).json({
        success: false,
        message: 'Error checking membership status'
      });
    }
  };
};

// Admin only middleware
const requireAdmin = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  } catch (error) {
    logger.error('Admin check failed:', error);
    res.status(500).json({
      success: false,
      message: 'Authorization error'
    });
  }
};

// Rate limiting per user
const userRateLimit = async (req, res, next) => {
  try {
    const userId = req.user._id.toString();
    const endpoint = req.originalUrl;
    const key = `ratelimit:${userId}:${endpoint}`;
    
    const { count } = await cache.incrementCounter(key, 60);
    
    if (count > config.rateLimit.perUser) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests'
      });
    }
    
    next();
  } catch (error) {
    logger.error('Rate limit check failed:', error);
    next();
  }
};

module.exports = {
  verifyToken,
  checkPaymentApproval,
  requireMembership,
  requireAdmin,
  userRateLimit
};