const config = require("../config");
const logger = require('../modules/logger');
// Affiliate Routes
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Affiliate = require('../modules/database/models/Affiliate');
const { authLimiter, registrationLimiter } = require('../middleware/rateLimiter');
const { validateAffiliate } = require('../middleware/validation');

// Middleware to verify affiliate token (also works with regular user tokens for admin)
const verifyAffiliateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    logger.debug('Affiliate token verified', { decoded });
    req.affiliateId = decoded.affiliateId;
    req.user = decoded; // Also set req.user for admin routes
    logger.debug('Affiliate req.user set', { user: req.user });
    next();
  } catch (error) {
    logger.error('Affiliate JWT verification failed', { error: error.message });
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Register new affiliate (rate limited: 3 registrations per hour)
router.post('/register', registrationLimiter, validateAffiliate, async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      fullName, 
      phone, 
      socialMedia,
      affiliateType = 'soldier'
    } = req.body;
    
    // Check if affiliate already exists
    const existingAffiliate = await Affiliate.findOne({ 
      $or: [{ email }, { username }] 
    });
    
    if (existingAffiliate) {
      return res.status(400).json({ 
        error: 'An affiliate with this email or username already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new affiliate
    const affiliate = new Affiliate({
      username,
      email,
      password: hashedPassword,
      fullName,
      phone,
      socialMedia,
      affiliateType,
      termsAccepted: true,
      termsAcceptedAt: new Date()
    });
    
    // Generate unique affiliate code
    affiliate.affiliateCode = affiliate.generateAffiliateCode();
    
    // Ensure code is unique
    let codeExists = await Affiliate.findOne({ affiliateCode: affiliate.affiliateCode });
    while (codeExists) {
      affiliate.affiliateCode = affiliate.generateAffiliateCode();
      codeExists = await Affiliate.findOne({ affiliateCode: affiliate.affiliateCode });
    }
    
    await affiliate.save();
    
    res.status(201).json({
      message: 'Registration successful! Your application is pending approval.',
      affiliateCode: affiliate.affiliateCode,
      status: affiliate.status
    });
  } catch (error) {
    logger.error('Affiliate registration error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login affiliate (rate limited: 5 attempts per 15 minutes)
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Find affiliate by username or email
    const affiliate = await Affiliate.findOne({
      $or: [{ username }, { email: username }]
    });
    
    if (!affiliate) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password
    const isValid = await bcrypt.compare(password, affiliate.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check if affiliate is active
    if (affiliate.status !== 'active') {
      return res.status(403).json({ 
        error: `Your account is ${affiliate.status}. Please contact support.` 
      });
    }
    
    // Generate token
    const token = jwt.sign(
      { affiliateId: affiliate._id, username: affiliate.username },
      config.auth.jwtSecret,
      { expiresIn: '7d' }
    );
    
    res.json({
      token,
      affiliate: {
        id: affiliate._id,
        username: affiliate.username,
        fullName: affiliate.fullName,
        affiliateCode: affiliate.affiliateCode,
        affiliateType: affiliate.affiliateType,
        metrics: affiliate.metrics,
        availableBalance: affiliate.availableBalance,
        pendingCommission: affiliate.pendingCommission
      }
    });
  } catch (error) {
    logger.error('Affiliate login error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get affiliate dashboard data
router.get('/dashboard', verifyAffiliateToken, async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.affiliateId)
      .select('-password')
      .populate('commissions.orderId', 'orderNumber total createdAt');
    
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    // Get recent commissions
    const recentCommissions = affiliate.commissions
      .slice(-10)
      .reverse();
    
    // Get top performing links
    const topLinks = affiliate.links
      .filter(link => link.active)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);
    
    res.json({
      profile: {
        fullName: affiliate.fullName,
        username: affiliate.username,
        email: affiliate.email,
        affiliateCode: affiliate.affiliateCode,
        affiliateType: affiliate.affiliateType,
        status: affiliate.status
      },
      metrics: affiliate.metrics,
      balances: {
        available: affiliate.availableBalance,
        pending: affiliate.pendingCommission,
        total: affiliate.metrics.totalCommission
      },
      recentCommissions,
      topLinks,
      defaultLink: affiliate.generateLink()
    });
  } catch (error) {
    logger.error('Affiliate dashboard error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
});

// Generate custom link
router.post('/generate-link', verifyAffiliateToken, async (req, res) => {
  try {
    const { productId, customSlug, category } = req.body;
    
    const affiliate = await Affiliate.findById(req.affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    // Check if custom slug already exists for this affiliate
    if (customSlug) {
      const slugExists = affiliate.links.find(l => l.customSlug === customSlug);
      if (slugExists) {
        return res.status(400).json({ error: 'This custom link already exists' });
      }
    }
    
    // Create new link entry
    const newLink = {
      customSlug,
      productId,
      category,
      clicks: 0,
      conversions: 0,
      generatedAt: new Date(),
      active: true
    };
    
    affiliate.links.push(newLink);
    await affiliate.save();
    
    // Generate the full URL
    const linkUrl = customSlug 
      ? affiliate.generateLink(null, customSlug)
      : affiliate.generateLink(productId);
    
    res.json({
      link: linkUrl,
      linkId: affiliate.links[affiliate.links.length - 1]._id,
      message: 'Link generated successfully'
    });
  } catch (error) {
    logger.error('Affiliate generate link error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate link' });
  }
});

// Track link click
router.post('/track-click/:affiliateCode', async (req, res) => {
  try {
    const { affiliateCode } = req.params;
    const { linkId, referrer } = req.body;
    
    const affiliate = await Affiliate.findOne({ affiliateCode });
    if (!affiliate || affiliate.status !== 'active') {
      return res.status(404).json({ error: 'Invalid affiliate code' });
    }
    
    // Update total clicks
    affiliate.metrics.totalClicks++;
    
    // Update specific link clicks if linkId provided
    if (linkId) {
      const link = affiliate.links.id(linkId);
      if (link) {
        link.clicks++;
      }
    }
    
    await affiliate.save();
    
    res.json({ 
      success: true,
      affiliateCode,
      tracked: true
    });
  } catch (error) {
    logger.error('Affiliate track click error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to track click' });
  }
});

// Track conversion (called when order is placed with affiliate code)
router.post('/track-conversion', async (req, res) => {
  try {
    const { affiliateCode, orderId, orderAmount, linkId } = req.body;
    
    const affiliate = await Affiliate.findOne({ affiliateCode });
    if (!affiliate || affiliate.status !== 'active') {
      return res.status(404).json({ error: 'Invalid affiliate code' });
    }
    
    // Calculate commission
    const commissionAmount = affiliate.calculateCommission(orderAmount);
    
    // Add commission record
    affiliate.commissions.push({
      orderId,
      orderAmount,
      commissionAmount,
      status: 'pending'
    });
    
    // Update link conversions if linkId provided
    if (linkId) {
      const link = affiliate.links.id(linkId);
      if (link) {
        link.conversions++;
      }
    }
    
    // Update metrics
    await affiliate.updateMetrics();
    
    res.json({
      success: true,
      commissionAmount,
      message: 'Conversion tracked successfully'
    });
  } catch (error) {
    logger.error('Affiliate track conversion error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// Get commission history
router.get('/commissions', verifyAffiliateToken, async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    
    const affiliate = await Affiliate.findById(req.affiliateId)
      .populate('commissions.orderId', 'orderNumber total createdAt customer');
    
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    let commissions = affiliate.commissions;
    
    // Filter by status if provided
    if (status) {
      commissions = commissions.filter(c => c.status === status);
    }
    
    // Sort by date (newest first) and paginate
    commissions = commissions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);
    
    res.json({
      commissions,
      total: affiliate.commissions.length,
      balances: {
        available: affiliate.availableBalance,
        pending: affiliate.pendingCommission
      }
    });
  } catch (error) {
    logger.error('Affiliate get commissions error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get commissions' });
  }
});

// Request payout
router.post('/request-payout', verifyAffiliateToken, async (req, res) => {
  try {
    const { amount, method } = req.body;
    
    const affiliate = await Affiliate.findById(req.affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    // Check if affiliate has enough available balance
    if (amount > affiliate.availableBalance) {
      return res.status(400).json({ 
        error: 'Insufficient available balance',
        available: affiliate.availableBalance
      });
    }
    
    // Check minimum payout amount (R500)
    if (amount < 500) {
      return res.status(400).json({ 
        error: 'Minimum payout amount is R500'
      });
    }
    
    // Check if payout details are complete
    if (!affiliate.payoutDetails || !affiliate.payoutDetails.preferredMethod) {
      return res.status(400).json({ 
        error: 'Please complete your payout details first'
      });
    }
    
    // Create payout request (in production, this would trigger actual payment)
    // For now, we'll just log it
    const payoutRequest = {
      affiliateId: affiliate._id,
      amount,
      method: method || affiliate.payoutDetails.preferredMethod,
      requestedAt: new Date(),
      status: 'pending'
    };
    
    res.json({
      message: 'Payout request submitted successfully',
      request: payoutRequest,
      estimatedProcessingTime: '2-3 business days'
    });
  } catch (error) {
    logger.error('Affiliate payout request error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to process payout request' });
  }
});

// Update payout details
router.put('/payout-details', verifyAffiliateToken, async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    affiliate.payoutDetails = {
      ...affiliate.payoutDetails,
      ...req.body
    };
    
    await affiliate.save();
    
    res.json({
      message: 'Payout details updated successfully',
      payoutDetails: affiliate.payoutDetails
    });
  } catch (error) {
    logger.error('Affiliate update payout details error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update payout details' });
  }
});

// Get affiliate leaderboard
router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate;

    switch (period) {
      case 'week':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(0); // All time
    }

    const affiliates = await Affiliate.find({ status: 'active' })
      .select('username affiliateType metrics')
      .sort('-metrics.totalSales')
      .limit(10);

    const leaderboard = affiliates.map((affiliate, index) => ({
      rank: index + 1,
      username: affiliate.username,
      type: affiliate.affiliateType,
      sales: affiliate.metrics.totalSales,
      orders: affiliate.metrics.totalOrders
    }));

    res.json({ leaderboard, period });
  } catch (error) {
    logger.error('Affiliate leaderboard error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
});

// ============================================================================
// ADMIN ROUTES - Affiliate Management
// ============================================================================

// GET /api/v1/affiliate/admin/all - Get all affiliates (admin only)
router.get('/admin/all', verifyAffiliateToken, async (req, res) => {
  try {
    logger.debug('Admin get all affiliates - req.user', { user: req.user });
    logger.debug('Admin get all affiliates - req.user.id', { userId: req.user?.id });

    // Check if user is admin
    const User = require('../modules/database/models/User');
    const user = await User.findById(req.user.id);

    if (!user || !['admin', 'staff_manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, type, search } = req.query;

    // Build query
    let query = {};
    if (status && status !== 'all') {
      query.status = status;
    }
    if (type && type !== 'all') {
      query.affiliateType = type;
    }
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const affiliates = await Affiliate.find(query)
      .select('-password')
      .sort({ createdAt: -1 });

    // Calculate stats
    const stats = {
      total: affiliates.length,
      active: affiliates.filter(a => a.status === 'active').length,
      pending: affiliates.filter(a => a.status === 'pending').length,
      suspended: affiliates.filter(a => a.status === 'suspended').length,
      totalCommissions: affiliates.reduce((sum, a) => sum + (a.metrics?.totalCommission || 0), 0),
      totalSales: affiliates.reduce((sum, a) => sum + (a.metrics?.totalSales || 0), 0)
    };

    res.json({
      success: true,
      affiliates,
      stats
    });
  } catch (error) {
    logger.error('Admin get all affiliates error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get affiliates' });
  }
});

// POST /api/v1/affiliate/admin/approve/:id - Approve affiliate (admin only)
router.post('/admin/approve/:id', verifyAffiliateToken, async (req, res) => {
  try {
    // Check if user is admin
    const User = require('../modules/database/models/User');
    const user = await User.findById(req.user.id);

    if (!user || !['admin', 'staff_manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    affiliate.status = 'active';
    affiliate.approvedAt = new Date();
    affiliate.approvedBy = user.email;
    await affiliate.save();

    res.json({
      success: true,
      message: 'Affiliate approved successfully',
      affiliate
    });
  } catch (error) {
    logger.error('Admin approve affiliate error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to approve affiliate' });
  }
});

// POST /api/v1/affiliate/admin/suspend/:id - Suspend affiliate (admin only)
router.post('/admin/suspend/:id', verifyAffiliateToken, async (req, res) => {
  try {
    // Check if user is admin
    const User = require('../modules/database/models/User');
    const user = await User.findById(req.user.id);

    if (!user || !['admin', 'staff_manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { reason } = req.body;
    const affiliate = await Affiliate.findById(req.params.id);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    affiliate.status = 'suspended';
    affiliate.suspendedAt = new Date();
    affiliate.suspensionReason = reason;
    await affiliate.save();

    res.json({
      success: true,
      message: 'Affiliate suspended successfully',
      affiliate
    });
  } catch (error) {
    logger.error('Admin suspend affiliate error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to suspend affiliate' });
  }
});

module.exports = router;