// User Management Routes
const express = require('express');
const router = express.Router();
const User = require('../database/models/User');
const { authenticateToken } = require('../../middleware/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const logger = require('../logger');

// Middleware alias for compatibility
const auth = authenticateToken;

// Admin middleware
const admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Stub upload middleware (single file upload to memory)
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Stub email functions
const sendVerificationEmail = async (email, token) => {
  console.log(`Verification email would be sent to ${email} with token ${token}`);
};
const sendPasswordResetEmail = async (email, token) => {
  console.log(`Password reset email would be sent to ${email} with token ${token}`);
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { 
      email, 
      password, 
      name, 
      phone,
      dateOfBirth,
      newsletter
    } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create new user
    const user = new User({
      email,
      password,
      name,
      phone,
      dateOfBirth,
      preferences: {
        newsletter
      },
      verificationToken: jwt.sign({ email }, config.jwt.secret, { expiresIn: '24h' })
    });

    await user.save();

    // Generate auth token
    const token = user.generateAuthToken();

    // Send verification email
    await sendVerificationEmail(user.email, user.verificationToken);

    res.status(201).json({
      message: 'Registration successful. Please verify your email.',
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const startTime = Date.now();
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const userAgent = req.headers['user-agent'];

  try {
    const { email, password } = req.body;

    // Log login attempt
    logger.info('Login attempt', {
      email,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });

    // Validate input
    if (!email || !password) {
      logger.warn('Login failed: Missing credentials', { email, ip });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      logger.warn('Login failed: User not found', { email, ip, userAgent });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      logger.warn('Login failed: Invalid password', {
        email,
        userId: user._id,
        ip,
        userAgent
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = user.generateAuthToken();

    const duration = Date.now() - startTime;

    // Log successful login
    logger.info('Login successful', {
      userId: user._id,
      email: user.email,
      role: user.role,
      ip,
      userAgent,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        avatar: user.avatar
      }
    });
  } catch (error) {
    logger.error('Login error', {
      email: req.body.email,
      error: error.message,
      stack: error.stack,
      ip,
      userAgent,
      timestamp: new Date().toISOString()
    });
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -__v');
    
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update profile
router.put('/profile', auth, upload.single('avatar'), async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; // Don't update password here
    delete updates.email; // Don't update email without verification
    delete updates.role; // Don't allow role updates
    
    if (req.file) {
      updates.avatar = req.file.path;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -__v');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change password
router.post('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: 'If email exists, reset link has been sent' });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { userId: user._id }, 
      config.jwt.secret, 
      { expiresIn: '1h' }
    );
    
    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000);
    await user.save();

    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);

    res.json({ message: 'If email exists, reset link has been sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reset password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findOne({
      _id: decoded.userId,
      passwordResetToken: token,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Update password
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid or expired reset token' });
  }
});

// Verify email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    const user = await User.findOne({
      email: decoded.email,
      verificationToken: token
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid verification token' });
    }

    user.emailVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ message: 'Email verified successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Invalid verification token' });
  }
});

// Address management
router.get('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('addresses');
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/addresses', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Max 5 addresses
    if (user.addresses.length >= 5) {
      return res.status(400).json({ error: 'Maximum 5 addresses allowed' });
    }

    // Set as default if first address
    if (user.addresses.length === 0) {
      req.body.isDefault = true;
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    user.addresses.push(req.body);
    await user.save();

    res.status(201).json({
      message: 'Address added successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/addresses/:addressId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(req.params.addressId);
    
    if (!address) {
      return res.status(404).json({ error: 'Address not found' });
    }

    // If setting as default, unset other defaults
    if (req.body.isDefault) {
      user.addresses.forEach(addr => addr.isDefault = false);
    }

    Object.assign(address, req.body);
    await user.save();

    res.json({
      message: 'Address updated successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/addresses/:addressId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.addresses.pull(req.params.addressId);
    
    // Set first address as default if default was deleted
    if (user.addresses.length > 0 && !user.addresses.some(addr => addr.isDefault)) {
      user.addresses[0].isDefault = true;
    }
    
    await user.save();

    res.json({
      message: 'Address deleted successfully',
      addresses: user.addresses
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Preferences
router.get('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    res.json(user.preferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/preferences', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    Object.assign(user.preferences, req.body);
    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Admin routes

// Get all users (admin)
router.get('/', [auth, admin], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search,
      role,
      emailVerified
    } = req.query;

    const query = {};
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (role) query.role = role;
    if (emailVerified !== undefined) query.emailVerified = emailVerified === 'true';

    const users = await User.find(query)
      .select('-password -__v')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await User.countDocuments(query);

    res.json({
      users,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalUsers: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID (admin)
router.get('/:id', [auth, admin], async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -__v');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update user (admin)
router.put('/:id', [auth, admin], async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates.password; // Use separate endpoint for password

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).select('-password -__v');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Delete user (admin)
router.delete('/:id', [auth, admin], async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User statistics (admin)
router.get('/stats/overview', [auth, admin], async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      verifiedUsers,
      todaySignups,
      monthSignups,
      activeUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ emailVerified: true }),
      User.countDocuments({ createdAt: { $gte: today } }),
      User.countDocuments({ createdAt: { $gte: thisMonth } }),
      User.countDocuments({ 
        lastLogin: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      })
    ]);

    res.json({
      totalUsers,
      verifiedUsers,
      todaySignups,
      monthSignups,
      activeUsers,
      verificationRate: totalUsers > 0 ? (verifiedUsers / totalUsers * 100).toFixed(1) : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;