// Affiliate Controller — Business logic for affiliate/wellness advocate program
const config = require('../config');
const logger = require('../modules/logger');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Affiliate = require('../modules/database/models/Affiliate');

// Register new affiliate
exports.register = async (req, res) => {
  try {
    const { username, email, password, fullName, phone, socialMedia, affiliateType = 'soldier' } = req.body;

    const existingAffiliate = await Affiliate.findOne({ $or: [{ email }, { username }] });
    if (existingAffiliate) {
      return res.status(400).json({ error: 'An affiliate with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const affiliate = new Affiliate({
      username, email, password: hashedPassword, fullName, phone,
      socialMedia, affiliateType,
      termsAccepted: true, termsAcceptedAt: new Date()
    });

    affiliate.affiliateCode = affiliate.generateAffiliateCode();
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
};

// Login affiliate
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const affiliate = await Affiliate.findOne({ $or: [{ username }, { email: username }] });
    if (!affiliate) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, affiliate.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (affiliate.status !== 'active') {
      return res.status(403).json({ error: `Your account is ${affiliate.status}. Please contact support.` });
    }

    const token = jwt.sign(
      { affiliateId: affiliate._id, username: affiliate.username },
      config.auth.jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      affiliate: {
        id: affiliate._id, username: affiliate.username, fullName: affiliate.fullName,
        affiliateCode: affiliate.affiliateCode, affiliateType: affiliate.affiliateType,
        metrics: affiliate.metrics,
        availableBalance: affiliate.availableBalance,
        pendingCommission: affiliate.pendingCommission
      }
    });
  } catch (error) {
    logger.error('Affiliate login error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Login failed' });
  }
};

// Get affiliate dashboard data
exports.getDashboard = async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.affiliateId)
      .select('-password')
      .populate('commissions.orderId', 'orderNumber total createdAt');

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    const recentCommissions = affiliate.commissions.slice(-10).reverse();
    const topLinks = affiliate.links
      .filter(link => link.active)
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 5);

    res.json({
      profile: {
        fullName: affiliate.fullName, username: affiliate.username,
        email: affiliate.email, affiliateCode: affiliate.affiliateCode,
        affiliateType: affiliate.affiliateType, status: affiliate.status
      },
      metrics: affiliate.metrics,
      balances: {
        available: affiliate.availableBalance,
        pending: affiliate.pendingCommission,
        total: affiliate.metrics.totalCommission
      },
      recentCommissions, topLinks,
      defaultLink: affiliate.generateLink()
    });
  } catch (error) {
    logger.error('Affiliate dashboard error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
};

// Generate custom link
exports.generateLink = async (req, res) => {
  try {
    const { productId, customSlug, category } = req.body;

    const affiliate = await Affiliate.findById(req.affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    if (customSlug) {
      const slugExists = affiliate.links.find(l => l.customSlug === customSlug);
      if (slugExists) {
        return res.status(400).json({ error: 'This custom link already exists' });
      }
    }

    const newLink = {
      customSlug, productId, category,
      clicks: 0, conversions: 0, generatedAt: new Date(), active: true
    };

    affiliate.links.push(newLink);
    await affiliate.save();

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
};

// Track link click
exports.trackClick = async (req, res) => {
  try {
    const { affiliateCode } = req.params;
    const { linkId, referrer } = req.body;

    const affiliate = await Affiliate.findOne({ affiliateCode });
    if (!affiliate || affiliate.status !== 'active') {
      return res.status(404).json({ error: 'Invalid affiliate code' });
    }

    affiliate.metrics.totalClicks++;

    if (linkId) {
      const link = affiliate.links.id(linkId);
      if (link) link.clicks++;
    }

    await affiliate.save();

    res.json({ success: true, affiliateCode, tracked: true });
  } catch (error) {
    logger.error('Affiliate track click error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to track click' });
  }
};

// Track conversion
exports.trackConversion = async (req, res) => {
  try {
    const { affiliateCode, orderId, orderAmount, linkId } = req.body;

    const affiliate = await Affiliate.findOne({ affiliateCode });
    if (!affiliate || affiliate.status !== 'active') {
      return res.status(404).json({ error: 'Invalid affiliate code' });
    }

    const commissionAmount = affiliate.calculateCommission(orderAmount);

    affiliate.commissions.push({ orderId, orderAmount, commissionAmount, status: 'pending' });

    if (linkId) {
      const link = affiliate.links.id(linkId);
      if (link) link.conversions++;
    }

    await affiliate.updateMetrics();

    res.json({ success: true, commissionAmount, message: 'Conversion tracked successfully' });
  } catch (error) {
    logger.error('Affiliate track conversion error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to track conversion' });
  }
};

// Get commission history
exports.getCommissions = async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    const affiliate = await Affiliate.findById(req.affiliateId)
      .populate('commissions.orderId', 'orderNumber total createdAt customer');

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    let commissions = affiliate.commissions;
    if (status) commissions = commissions.filter(c => c.status === status);

    commissions = commissions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(offset, offset + limit);

    res.json({
      commissions, total: affiliate.commissions.length,
      balances: { available: affiliate.availableBalance, pending: affiliate.pendingCommission }
    });
  } catch (error) {
    logger.error('Affiliate get commissions error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get commissions' });
  }
};

// Request payout
exports.requestPayout = async (req, res) => {
  try {
    const { amount, method } = req.body;

    const affiliate = await Affiliate.findById(req.affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    if (amount > affiliate.availableBalance) {
      return res.status(400).json({ error: 'Insufficient available balance', available: affiliate.availableBalance });
    }

    if (amount < 500) {
      return res.status(400).json({ error: 'Minimum payout amount is R500' });
    }

    if (!affiliate.payoutDetails || !affiliate.payoutDetails.preferredMethod) {
      return res.status(400).json({ error: 'Please complete your payout details first' });
    }

    const payoutRequest = {
      affiliateId: affiliate._id,
      amount, method: method || affiliate.payoutDetails.preferredMethod,
      requestedAt: new Date(), status: 'pending'
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
};

// Update payout details
exports.updatePayoutDetails = async (req, res) => {
  try {
    const affiliate = await Affiliate.findById(req.affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }

    affiliate.payoutDetails = { ...affiliate.payoutDetails, ...req.body };
    await affiliate.save();

    res.json({ message: 'Payout details updated successfully', payoutDetails: affiliate.payoutDetails });
  } catch (error) {
    logger.error('Affiliate update payout details error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update payout details' });
  }
};

// Get affiliate leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate;
    switch (period) {
      case 'week': startDate = new Date(now - 7 * 24 * 60 * 60 * 1000); break;
      case 'month': startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
      case 'year': startDate = new Date(now.getFullYear(), 0, 1); break;
      default: startDate = new Date(0);
    }

    const affiliates = await Affiliate.find({ status: 'active' })
      .select('username affiliateType metrics')
      .sort('-metrics.totalSales')
      .limit(10);

    const leaderboard = affiliates.map((affiliate, index) => ({
      rank: index + 1, username: affiliate.username,
      type: affiliate.affiliateType, sales: affiliate.metrics.totalSales,
      orders: affiliate.metrics.totalOrders
    }));

    res.json({ leaderboard, period });
  } catch (error) {
    logger.error('Affiliate leaderboard error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

// Admin: Get all affiliates
exports.adminGetAll = async (req, res) => {
  try {
    const User = require('../modules/database/models/User');
    const user = await User.findById(req.user.id);

    if (!user || !['admin', 'branch_manager'].includes(user.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { status, type, search } = req.query;
    let query = {};
    if (status && status !== 'all') query.status = status;
    if (type && type !== 'all') query.affiliateType = type;
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { fullName: { $regex: search, $options: 'i' } }
      ];
    }

    const affiliates = await Affiliate.find(query).select('-password').sort({ createdAt: -1 });

    const stats = {
      total: affiliates.length,
      active: affiliates.filter(a => a.status === 'active').length,
      pending: affiliates.filter(a => a.status === 'pending').length,
      suspended: affiliates.filter(a => a.status === 'suspended').length,
      totalCommissions: affiliates.reduce((sum, a) => sum + (a.metrics?.totalCommission || 0), 0),
      totalSales: affiliates.reduce((sum, a) => sum + (a.metrics?.totalSales || 0), 0)
    };

    res.json({ success: true, affiliates, stats });
  } catch (error) {
    logger.error('Admin get all affiliates error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get affiliates' });
  }
};

// Admin: Approve affiliate
exports.adminApprove = async (req, res) => {
  try {
    const User = require('../modules/database/models/User');
    const user = await User.findById(req.user.id);

    if (!user || !['admin', 'branch_manager'].includes(user.role)) {
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

    res.json({ success: true, message: 'Affiliate approved successfully', affiliate });
  } catch (error) {
    logger.error('Admin approve affiliate error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to approve affiliate' });
  }
};

// Admin: Suspend affiliate
exports.adminSuspend = async (req, res) => {
  try {
    const User = require('../modules/database/models/User');
    const user = await User.findById(req.user.id);

    if (!user || !['admin', 'branch_manager'].includes(user.role)) {
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

    res.json({ success: true, message: 'Affiliate suspended successfully', affiliate });
  } catch (error) {
    logger.error('Admin suspend affiliate error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to suspend affiliate' });
  }
};
