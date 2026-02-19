// Users Management Routes
const express = require('express');
const router = express.Router();
const config = require('../config');
const logger = require('../modules/logger');
const User = require('../modules/database/models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const { authLimiter, passwordResetLimiter } = require('../middleware/rateLimiter');
const { validateLogin } = require('../middleware/validation');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Login route (rate limited: 5 attempts per 15 minutes)
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt to users route', { email, passwordLength: password?.length });

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    const user = await User.findOne({ email }).select('+password');

    if (user) {
      logger.info('User found in users route', {
        email: user.email,
        role: user.role,
        isAdmin: user.isAdmin,
        isActive: user.isActive
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      logger.warn('Login failed - Invalid password (users route)', { email });
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    logger.info('Login successful (users route)', { email });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      config.auth.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        profile: user.profile || {}
      }
    });
  } catch (error) {
    logger.error('Login error in users route', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error during login'
    });
  }
});

// Get all users (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role, search, limit = 100, skip = 0 } = req.query;

    const filter = {};

    if (role) {
      filter.role = role;
    }

    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        hasMore: (parseInt(skip) + users.length) < total
      }
    });
  } catch (error) {
    logger.error('Error fetching users', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Get single user by ID (Admin only)
router.get('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Error fetching user', { userId: req.params.userId, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// Create new user (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { email, password, firstName, lastName, username, role, phone } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName: firstName || 'User',
      lastName: lastName || 'Account',
      username: username || email.split('@')[0],
      role: role || 'user',
      phone: phone || '',
      isEmailVerified: true
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: userResponse
    });
  } catch (error) {
    logger.error('Error creating user', { email: req.body.email, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: error.message
    });
  }
});

// Update user (Admin only)
router.put('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { firstName, lastName, username, role, phone, isEmailVerified, isLifestyleMember, memberSince, membershipSource } = req.body;

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update fields if provided
    if (firstName !== undefined) user.firstName = firstName;
    if (lastName !== undefined) user.lastName = lastName;
    if (username !== undefined) user.username = username;
    if (role !== undefined) user.role = role;
    if (phone !== undefined) {
      if (!user.profile) user.profile = {};
      user.profile.phone = phone;
    }
    if (isEmailVerified !== undefined) user.isEmailVerified = isEmailVerified;
    if (isLifestyleMember !== undefined) user.isLifestyleMember = isLifestyleMember;
    if (memberSince !== undefined) user.memberSince = memberSince;
    if (membershipSource !== undefined) user.membershipSource = membershipSource;

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    logger.error('Error updating user', { userId: req.params.userId, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error updating user',
      error: error.message
    });
  }
});

// Delete user (Admin only)
router.delete('/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting own account
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.userId);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting user', { userId: req.params.userId, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message
    });
  }
});

// Reset user password (Admin only)
router.post('/:userId/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password is required'
      });
    }

    const user = await User.findById(req.params.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting password', { userId: req.params.userId, error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error resetting password',
      error: error.message
    });
  }
});

module.exports = router;
