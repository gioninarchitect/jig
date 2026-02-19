// Dashboard Controller — Business logic extracted from routes/dashboard.js
const logger = require('../modules/logger');
const config = require('../config');
const User = require('../modules/database/models/User');
const Order = require('../modules/database/models/Order');
const Affiliate = require('../modules/database/models/Affiliate');
const Voucher = require('../modules/database/models/Voucher');
const Sale = require('../modules/database/models/Sale');
const TillSession = require('../modules/database/models/TillSession');
const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Batch = require('../modules/database/models/Batch');
const PurchaseOrder = require('../modules/database/models/PurchaseOrder');
const Supplier = require('../modules/database/models/Supplier');
const Section21Document = require('../modules/database/models/Section21Document');
const StaffShift = require('../modules/database/models/StaffShift');
const DailyCashup = require('../modules/database/models/DailyCashup');

// Get dashboard stats for a user
exports.getStats = async (req, res) => {
  try {
    const userId = req.userId;
    const userEmail = req.userEmail;
    const userRole = req.userRole;

    logger.info('[Dashboard /stats] Request from:', { userId, userEmail, userRole });

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      console.error('[Dashboard /stats] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    logger.info('[Dashboard /stats] User found:', user.email);

    // Get user orders
    const orders = await Order.find({
      $or: [
        { user: userId },
        { 'customer.email': userEmail }
      ]
    }).sort({ createdAt: -1 });

    // Calculate stats
    const totalOrders = orders.length;
    const totalSpent = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'confirmed').length;
    const completedOrders = orders.filter(o => o.status === 'delivered').length;

    // Recent orders (last 10)
    const recentOrders = orders.slice(0, 10).map(order => ({
      orderNumber: order.orderNumber,
      date: order.createdAt,
      items: order.items?.length || 0,
      total: order.total,
      status: order.status,
      trackingNumber: order.shipping?.trackingNumber,
      estimatedDelivery: order.shipping?.estimatedDelivery
    }));

    res.json({
      user: {
        name: user.firstName ? `${user.firstName} ${user.lastName}` : user.username || 'Member',
        email: user.email,
        phone: user.profile?.phone || '',
        membershipLevel: user.loyalty?.tier || 'bronze',
        isLifestyle: user.isLifestyleMember || false,
        ldCoins: user.loyalty?.ldCoins || 0,
        memberSince: user.memberSince || user.createdAt,
        role: user.role,
        section21Status: user.section21Status || 'none',
        createdAt: user.createdAt
      },
      stats: {
        totalOrders,
        totalSpent,
        pendingOrders,
        completedOrders,
        loyaltyPoints: user.loyalty?.ldCoins || 0
      },
      recentOrders
    });
  } catch (error) {
    logger.error('Dashboard stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
};

// Owner dashboard stats - business overview
exports.getOwnerStats = async (req, res) => {
  try {
    // Check if user is owner or admin
    if (!['owner', 'admin'].includes(req.userRole)) {
      return res.status(403).json({ success: false, message: 'Access denied. Owner role required.' });
    }

    const Branch = require('../modules/database/models/Branch');
    const Product = require('../modules/database/models/Product');
    const BranchInventory = require('../modules/database/models/BranchInventory');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's orders
    const todayOrders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow }
    });

    const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const todayOrderCount = todayOrders.length;

    // Get branches
    const branches = await Branch.find({});
    const activeBranches = branches.filter(b => b.isActive).length;
    const totalBranches = branches.length;

    // Get inventory value
    const products = await Product.find({ status: 'active' });
    let inventoryValue = 0;
    let lowStockCount = 0;

    for (const product of products) {
      const qty = product.inventory?.quantity || 0;
      const costPrice = product.costPrice || product.price || 0;
      inventoryValue += qty * costPrice;

      const threshold = product.inventory?.lowStockThreshold || 10;
      if (qty > 0 && qty <= threshold) {
        lowStockCount++;
      }
    }

    res.json({
      success: true,
      data: {
        todayRevenue,
        todayOrders: todayOrderCount,
        inventoryValue,
        lowStockCount,
        activeBranches,
        totalBranches
      }
    });
  } catch (error) {
    logger.error('Owner stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Failed to load owner stats' });
  }
};

// Get user's orders with pagination and filtering
exports.getOrders = async (req, res) => {
  try {
    const userId = req.userId;
    const userEmail = req.userEmail;
    const { page = 1, limit = 10, status } = req.query;

    const query = {
      $or: [
        { user: userId },
        { 'customer.email': userEmail }
      ]
    };

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('items.product', 'name image');

    const totalOrders = await Order.countDocuments(query);

    const formattedOrders = orders.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      date: order.createdAt,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.quantity * item.price
      })),
      subtotal: order.subtotal,
      shipping: order.shipping?.cost || 0,
      total: order.total,
      status: order.status,
      paymentStatus: order.payment?.status,
      trackingNumber: order.shipping?.trackingNumber,
      estimatedDelivery: order.shipping?.estimatedDelivery,
      shippingAddress: order.shippingAddress
    }));

    res.json({
      orders: formattedOrders,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasNext: page * limit < totalOrders,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Get orders error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load orders' });
  }
};

// Get specific order details
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const userId = req.userId;
    const userEmail = req.userEmail;

    const order = await Order.findOne({
      orderNumber,
      $or: [
        { user: userId },
        { 'customer.email': userEmail }
      ]
    }).populate('items.product', 'name image sku');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      order: {
        id: order._id,
        orderNumber: order.orderNumber,
        date: order.createdAt,
        status: order.status,
        statusHistory: order.statusHistory,
        items: order.items,
        customer: order.customer,
        billing: order.billingAddress,
        shipping: {
          address: order.shippingAddress,
          method: order.shipping?.method,
          cost: order.shipping?.cost,
          trackingNumber: order.shipping?.trackingNumber,
          estimatedDelivery: order.shipping?.estimatedDelivery,
          carrier: order.shipping?.carrier
        },
        payment: {
          method: order.payment?.method,
          status: order.payment?.status,
          paidAt: order.payment?.paidAt
        },
        totals: {
          subtotal: order.subtotal,
          shipping: order.shipping?.cost || 0,
          tax: order.tax?.amount || 0,
          discount: order.discount?.amount || 0,
          total: order.total
        },
        notes: order.customerNotes
      }
    });
  } catch (error) {
    logger.error('Get order details error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load order details' });
  }
};

// Track order status
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const order = await Order.findOne({ orderNumber })
      .select('orderNumber status statusHistory shipping customer createdAt');

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Calculate delivery timeline
    const timeline = [
      { status: 'pending', label: 'Order Placed', completed: true, date: order.createdAt },
      { status: 'confirmed', label: 'Payment Confirmed', completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status) },
      { status: 'processing', label: 'Processing', completed: ['processing', 'shipped', 'delivered'].includes(order.status) },
      { status: 'shipped', label: 'Shipped', completed: ['shipped', 'delivered'].includes(order.status) },
      { status: 'delivered', label: 'Delivered', completed: order.status === 'delivered' }
    ];

    // Add dates from status history
    order.statusHistory.forEach(history => {
      const timelineItem = timeline.find(t => t.status === history.status);
      if (timelineItem && !timelineItem.date) {
        timelineItem.date = history.timestamp;
      }
    });

    res.json({
      orderNumber: order.orderNumber,
      currentStatus: order.status,
      timeline,
      tracking: {
        trackingNumber: order.shipping?.trackingNumber,
        carrier: order.shipping?.carrier,
        estimatedDelivery: order.shipping?.estimatedDelivery
      },
      customer: {
        name: order.customer?.firstName ? `${order.customer.firstName} ${order.customer.lastName}` : 'Customer',
        email: order.customer?.email
      }
    });
  } catch (error) {
    logger.error('Track order error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to track order' });
  }
};

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.userId;
    const { name, firstName, lastName, phone, email } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user data
    if (name) {
      const nameParts = name.split(' ');
      user.firstName = nameParts[0];
      user.lastName = nameParts.slice(1).join(' ');
    }
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;
    if (email && email !== user.email) {
      // Check if email is already taken
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      user.email = email;
    }

    user.updatedAt = new Date();
    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.firstName ? `${user.firstName} ${user.lastName}` : user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        membershipLevel: user.membershipLevel,
        isLifestyle: user.isLifestyle,
        ldCoins: user.ldCoins
      }
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// Get account activity/notifications
exports.getActivity = async (req, res) => {
  try {
    const userId = req.userId;
    const userEmail = req.userEmail;
    const { limit = 20 } = req.query;

    // Get recent orders for activity
    const recentOrders = await Order.find({
      $or: [
        { user: userId },
        { 'customer.email': userEmail }
      ]
    })
    .sort({ updatedAt: -1 })
    .limit(parseInt(limit))
    .select('orderNumber status statusHistory total createdAt updatedAt');

    const activities = [];

    // Add order activities
    recentOrders.forEach(order => {
      // Latest status change
      if (order.statusHistory.length > 0) {
        const latestStatus = order.statusHistory[order.statusHistory.length - 1];
        activities.push({
          type: 'order_status',
          title: `Order ${order.orderNumber}`,
          description: `Status updated to ${order.status}`,
          time: latestStatus.timestamp || order.updatedAt,
          orderNumber: order.orderNumber,
          status: order.status
        });
      } else {
        activities.push({
          type: 'order_placed',
          title: `Order ${order.orderNumber}`,
          description: `Order placed for R${order.total.toLocaleString()}`,
          time: order.createdAt,
          orderNumber: order.orderNumber,
          amount: order.total
        });
      }
    });

    // Sort by time
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({ activities: activities.slice(0, parseInt(limit)) });
  } catch (error) {
    logger.error('Get activity error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load activity' });
  }
};

// Upgrade membership
exports.upgradeMembership = async (req, res) => {
  try {
    const userId = req.userId;
    const { level = 'lifestyle' } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.isLifestyle) {
      return res.status(400).json({ error: 'Already a lifestyle member' });
    }

    // Check if user has qualifying orders (R300+)
    const qualifyingOrder = await Order.findOne({
      $or: [
        { user: userId },
        { 'customer.email': user.email }
      ],
      total: { $gte: 300 },
      'payment.status': 'paid'
    });

    if (!qualifyingOrder) {
      return res.status(400).json({
        error: 'No qualifying orders found. Purchase R300+ to qualify for lifestyle membership.'
      });
    }

    // Upgrade user
    user.isLifestyle = true;
    user.membershipLevel = 'Gold';
    user.memberSince = new Date();
    user.ldCoins += 50; // Bonus coins for upgrade
    await user.save();

    res.json({
      message: 'Membership upgraded successfully!',
      user: {
        isLifestyle: user.isLifestyle,
        membershipLevel: user.membershipLevel,
        ldCoins: user.ldCoins,
        memberSince: user.memberSince
      }
    });
  } catch (error) {
    logger.error('Upgrade membership error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to upgrade membership' });
  }
};

// Get real affiliate stats (no fake numbers)
exports.getAffiliateStats = async (req, res) => {
  try {
    // Get actual affiliate stats from database
    const totalAffiliates = await Affiliate.countDocuments();
    const activeAffiliates = await Affiliate.countDocuments({ status: 'active' });

    // Calculate total commissions paid
    const commissionStats = await Affiliate.aggregate([
      {
        $group: {
          _id: null,
          totalCommissionsPaid: {
            $sum: {
              $sum: {
                $map: {
                  input: { $filter: { input: '$commissions', cond: { $eq: ['$$this.status', 'paid'] } } },
                  as: 'commission',
                  in: '$$commission.commissionAmount'
                }
              }
            }
          }
        }
      }
    ]);

    const totalCommissionsPaid = commissionStats[0]?.totalCommissionsPaid || 0;

    res.json({
      totalAffiliates: totalAffiliates || 0,
      activeAffiliates: activeAffiliates || 0,
      totalCommissionsPaid: Math.round(totalCommissionsPaid)
    });
  } catch (error) {
    logger.error('Affiliate stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load affiliate stats' });
  }
};

// Get user's wellness points data
exports.getPoints = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      loyalty: {
        points: user.loyalty?.points || 0,
        tier: user.loyalty?.tier || 'wellness_seeker',
        totalSpent: user.loyalty?.totalSpent || 0,
        totalEarned: user.loyalty?.totalEarned || 0
      }
    });
  } catch (error) {
    logger.error('Get points error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load points data' });
  }
};

// Get points history
exports.getPointsHistory = async (req, res) => {
  try {
    const userId = req.userId;
    const { limit = 50 } = req.query;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get points history, sorted by most recent
    const history = (user.loyalty?.pointsHistory || [])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, parseInt(limit));

    res.json({
      history,
      currentBalance: user.loyalty?.points || 0
    });
  } catch (error) {
    logger.error('Get points history error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load points history' });
  }
};

// Redeem wellness points
exports.redeemPoints = async (req, res) => {
  try {
    const userId = req.userId;
    const { points } = req.body;

    if (!points || points < 100) {
      return res.status(400).json({ error: 'Minimum 100 points required for redemption' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user has enough points
    if ((user.loyalty?.points || 0) < points) {
      return res.status(400).json({ error: 'Insufficient points balance' });
    }

    // Redeem points and create voucher
    const voucherValue = points / 10; // 10 points = R1
    const voucherCode = `WP${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // Redeem points using User model method
    await user.redeemPoints(points, `Redeemed for R${voucherValue.toFixed(2)} voucher`);

    // Create voucher record
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // Expires in 30 days

    const voucher = new Voucher({
      code: voucherCode,
      name: `Wellness Points Voucher - R${voucherValue.toFixed(2)}`,
      description: `Redeemed from ${points} wellness points`,
      type: 'fixed',
      value: voucherValue,
      minPurchase: 0,
      expiryDate,
      redemptionLimit: 'single_use',
      maxRedemptions: 1,
      status: 'active',
      excludedCategories: ['section21'], // Cannot be used on medical cannabis
      createdBy: req.userId
    });

    await voucher.save();

    res.json({
      message: `Successfully redeemed ${points} points`,
      voucherCode,
      voucherValue,
      remainingPoints: user.loyalty.points,
      expiryDate: voucher.expiryDate
    });
  } catch (error) {
    logger.error('Redeem points error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: error.message || 'Failed to redeem points' });
  }
};

// Get user's purchase limits
exports.getPurchaseLimits = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if daily/monthly usage needs to be reset
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    let needsSave = false;

    // Reset daily usage if last reset was before today
    if (!user.purchaseLimits?.lastDayReset || new Date(user.purchaseLimits.lastDayReset) < today) {
      if (!user.purchaseLimits) user.purchaseLimits = {};
      user.purchaseLimits.currentDayUsage = 0;
      user.purchaseLimits.lastDayReset = now;
      needsSave = true;
    }

    // Reset monthly usage if last reset was before this month
    if (!user.purchaseLimits?.lastMonthReset || new Date(user.purchaseLimits.lastMonthReset) < thisMonth) {
      if (!user.purchaseLimits) user.purchaseLimits = {};
      user.purchaseLimits.currentMonthUsage = 0;
      user.purchaseLimits.lastMonthReset = now;
      needsSave = true;
    }

    if (needsSave) {
      await user.save();
    }

    res.json({
      purchaseLimits: {
        enabled: user.purchaseLimits?.enabled || false,
        dailyLimit: user.purchaseLimits?.dailyLimit || 150,
        monthlyLimit: user.purchaseLimits?.monthlyLimit || 600,
        currentDayUsage: user.purchaseLimits?.currentDayUsage || 0,
        currentMonthUsage: user.purchaseLimits?.currentMonthUsage || 0,
        lastDayReset: user.purchaseLimits?.lastDayReset,
        lastMonthReset: user.purchaseLimits?.lastMonthReset,
        exemptionReason: user.purchaseLimits?.exemptionReason
      }
    });
  } catch (error) {
    logger.error('Get purchase limits error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load purchase limits' });
  }
};

// Check if a purchase is within limits (used by POS before checkout)
exports.checkPurchaseLimits = async (req, res) => {
  try {
    const { patientId, gramsToAdd } = req.body;

    if (!patientId || gramsToAdd === undefined) {
      return res.status(400).json({ error: 'Patient ID and grams required' });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // If limits not enabled, allow purchase
    if (!patient.purchaseLimits?.enabled) {
      return res.json({
        allowed: true,
        message: 'Purchase limits not enabled for this patient'
      });
    }

    // Check daily limit
    const currentDayUsage = patient.purchaseLimits.currentDayUsage || 0;
    const dailyLimit = patient.purchaseLimits.dailyLimit || 150;
    const newDayTotal = currentDayUsage + gramsToAdd;

    // Check monthly limit
    const currentMonthUsage = patient.purchaseLimits.currentMonthUsage || 0;
    const monthlyLimit = patient.purchaseLimits.monthlyLimit || 600;
    const newMonthTotal = currentMonthUsage + gramsToAdd;

    if (newDayTotal > dailyLimit) {
      return res.json({
        allowed: false,
        reason: 'daily_limit_exceeded',
        message: `This purchase would exceed the daily limit of ${dailyLimit}g`,
        currentUsage: currentDayUsage,
        limit: dailyLimit,
        requested: gramsToAdd,
        remaining: Math.max(0, dailyLimit - currentDayUsage)
      });
    }

    if (newMonthTotal > monthlyLimit) {
      return res.json({
        allowed: false,
        reason: 'monthly_limit_exceeded',
        message: `This purchase would exceed the monthly limit of ${monthlyLimit}g`,
        currentUsage: currentMonthUsage,
        limit: monthlyLimit,
        requested: gramsToAdd,
        remaining: Math.max(0, monthlyLimit - currentMonthUsage)
      });
    }

    res.json({
      allowed: true,
      dailyAfterPurchase: newDayTotal,
      dailyRemaining: dailyLimit - newDayTotal,
      monthlyAfterPurchase: newMonthTotal,
      monthlyRemaining: monthlyLimit - newMonthTotal
    });
  } catch (error) {
    logger.error('Check purchase limits error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to check purchase limits' });
  }
};

// Update purchase limits (admin only)
exports.updatePurchaseLimits = async (req, res) => {
  try {
    // Check if requester is admin or owner
    const reqUser = await User.findById(req.userId);
    if (!reqUser || !['admin', 'owner'].includes(reqUser.role)) {
      return res.status(403).json({ error: 'Only admin or owner can modify purchase limits' });
    }

    const { userId } = req.params;
    const { enabled, dailyLimit, monthlyLimit, exemptionReason } = req.body;

    const patient = await User.findById(userId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Initialize purchaseLimits if not exists
    if (!patient.purchaseLimits) {
      patient.purchaseLimits = {};
    }

    // Update fields
    if (enabled !== undefined) patient.purchaseLimits.enabled = enabled;
    if (dailyLimit !== undefined) patient.purchaseLimits.dailyLimit = dailyLimit;
    if (monthlyLimit !== undefined) patient.purchaseLimits.monthlyLimit = monthlyLimit;
    if (exemptionReason !== undefined) {
      patient.purchaseLimits.exemptionReason = exemptionReason;
      patient.purchaseLimits.exemptionApprovedBy = req.userId;
    }

    await patient.save();

    logger.info('Purchase limits updated', {
      patientId: userId,
      updatedBy: req.userId,
      changes: { enabled, dailyLimit, monthlyLimit, exemptionReason }
    });

    res.json({
      message: 'Purchase limits updated successfully',
      purchaseLimits: patient.purchaseLimits
    });
  } catch (error) {
    logger.error('Update purchase limits error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update purchase limits' });
  }
};

// Record a purchase against patient limits (called after successful POS transaction)
exports.recordPurchase = async (req, res) => {
  try {
    const { patientId, gramsUsed, orderId } = req.body;

    if (!patientId || gramsUsed === undefined) {
      return res.status(400).json({ error: 'Patient ID and grams required' });
    }

    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // If limits not enabled, just return success
    if (!patient.purchaseLimits?.enabled) {
      return res.json({
        recorded: true,
        message: 'Purchase limits not enabled, no tracking needed'
      });
    }

    // Initialize if needed
    if (!patient.purchaseLimits) {
      patient.purchaseLimits = {};
    }

    // Update usage
    patient.purchaseLimits.currentDayUsage = (patient.purchaseLimits.currentDayUsage || 0) + gramsUsed;
    patient.purchaseLimits.currentMonthUsage = (patient.purchaseLimits.currentMonthUsage || 0) + gramsUsed;

    await patient.save();

    logger.info('Purchase recorded against limits', {
      patientId,
      gramsUsed,
      orderId,
      newDayUsage: patient.purchaseLimits.currentDayUsage,
      newMonthUsage: patient.purchaseLimits.currentMonthUsage
    });

    res.json({
      recorded: true,
      currentDayUsage: patient.purchaseLimits.currentDayUsage,
      currentMonthUsage: patient.purchaseLimits.currentMonthUsage,
      dailyRemaining: Math.max(0, (patient.purchaseLimits.dailyLimit || 150) - patient.purchaseLimits.currentDayUsage),
      monthlyRemaining: Math.max(0, (patient.purchaseLimits.monthlyLimit || 600) - patient.purchaseLimits.currentMonthUsage)
    });
  } catch (error) {
    logger.error('Record purchase error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to record purchase against limits' });
  }
};

// ============================================================================
// ROLE-SPECIFIC KPI DASHBOARD
// ============================================================================

function getDateRanges() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  return { now, startOfDay, startOfWeek, startOfMonth, startOfLastMonth, endOfLastMonth };
}

function getSaleBranchFilter(user) {
  const allBranchRoles = ['super_admin', 'owner', 'admin'];
  if (allBranchRoles.includes(user.role)) return {};
  const branchIds = [];
  if (user.primaryBranch) branchIds.push(user.primaryBranch);
  if (user.assignedBranches && user.assignedBranches.length > 0) {
    user.assignedBranches.forEach(ab => { if (ab.branch) branchIds.push(ab.branch); });
  }
  if (branchIds.length === 0) return { branchId: null };
  return { branchId: { $in: branchIds } };
}

exports.getKPIs = async (req, res) => {
  try {
    const userId = req.userId;
    const userRole = req.userRole;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const dates = getDateRanges();
    let kpis = {};

    switch (userRole) {
      case 'super_admin': kpis = await kpiSuperAdmin(dates); break;
      case 'owner': kpis = await kpiOwner(dates); break;
      case 'admin': kpis = await kpiAdmin(dates); break;
      case 'branch_manager': kpis = await kpiBranchManager(user, dates); break;
      case 'inventory_manager': kpis = await kpiInventoryManager(dates); break;
      case 'branch_assistant': kpis = await kpiStaffAssistant(user, dates); break;
      case 'packer': kpis = await kpiPacker(dates); break;
      case 'dispatch_manager': kpis = await kpiDispatchManager(dates); break;
      case 'supplier': kpis = await kpiSupplier(user); break;
      case 'user': default: kpis = await kpiCustomer(user); break;
    }

    res.json({ success: true, role: userRole, kpis });
  } catch (error) {
    logger.error('KPI endpoint error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to load KPI data' });
  }
};

async function kpiSuperAdmin(dates) {
  const { startOfDay, startOfWeek, startOfMonth } = dates;
  const [todaySales, weekSales, monthSales, totalUsers, newUsers, branchSales, pendingCashups, pendingPOs, pendingS21] = await Promise.all([
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfDay }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfWeek }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    User.countDocuments({ isActive: true }),
    User.countDocuments({ createdAt: { $gte: startOfWeek } }),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfDay }, status: 'completed' } }, { $group: { _id: '$branchId', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    TillSession.countDocuments({ status: 'closed', 'approval.status': 'pending' }),
    PurchaseOrder.countDocuments({ status: { $in: ['submitted', 'approved'] } }),
    Section21Document.countDocuments({ status: 'pending' })
  ]);
  let branchComparison = [];
  if (branchSales.length > 0) {
    const branches = await Branch.find({ _id: { $in: branchSales.map(b => b._id) } }).select('name branchCode');
    const map = {}; branches.forEach(b => { map[b._id.toString()] = b.name || b.branchCode; });
    branchComparison = branchSales.map(b => ({ name: map[b._id?.toString()] || 'Unknown', revenue: b.total || 0, transactions: b.count || 0 }));
  }
  return {
    revenueToday: todaySales[0]?.total || 0, transactionsToday: todaySales[0]?.count || 0,
    revenueWeek: weekSales[0]?.total || 0, revenueMonth: monthSales[0]?.total || 0,
    totalActiveUsers: totalUsers, newUsersThisWeek: newUsers, branchComparison,
    pendingApprovals: { cashups: pendingCashups, purchaseOrders: pendingPOs, section21Docs: pendingS21 }
  };
}

async function kpiOwner(dates) {
  const { startOfMonth, startOfLastMonth, endOfLastMonth } = dates;
  const [monthRev, lastMonthRev, branchRevs, topProducts, bottomProducts, pendingCashups, expenses] = await Promise.all([
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } }, { $group: { _id: '$branchId', revenue: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } }, { $unwind: '$items' }, { $group: { _id: '$items.name', revenue: { $sum: '$items.total' }, qty: { $sum: '$items.quantity' } } }, { $sort: { revenue: -1 } }, { $limit: 10 }]),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfMonth }, status: 'completed' } }, { $unwind: '$items' }, { $group: { _id: '$items.name', revenue: { $sum: '$items.total' }, qty: { $sum: '$items.quantity' } } }, { $sort: { revenue: 1 } }, { $limit: 10 }]),
    TillSession.countDocuments({ status: 'closed', 'approval.status': 'pending' }),
    PurchaseOrder.aggregate([{ $match: { createdAt: { $gte: startOfMonth }, status: { $in: ['received', 'ordered'] } } }, { $group: { _id: null, total: { $sum: '$totals.total' } } }])
  ]);
  const thisM = monthRev[0]?.total || 0;
  const lastM = lastMonthRev[0]?.total || 0;
  const growth = lastM > 0 ? (((thisM - lastM) / lastM) * 100).toFixed(1) : 0;
  let branchComparison = [];
  if (branchRevs.length > 0) {
    const branches = await Branch.find({ _id: { $in: branchRevs.map(b => b._id) } }).select('name branchCode');
    const map = {}; branches.forEach(b => { map[b._id.toString()] = b.name || b.branchCode; });
    branchComparison = branchRevs.map(b => ({ name: map[b._id?.toString()] || 'Unknown', revenue: b.revenue || 0, transactions: b.count || 0 }));
  }
  return {
    revenueMonth: thisM, revenueLastMonth: lastM, growthPercent: parseFloat(growth),
    expensesMonth: expenses[0]?.total || 0, branchComparison,
    topProducts: topProducts.map(p => ({ name: p._id, revenue: p.revenue, qty: p.qty })),
    bottomProducts: bottomProducts.map(p => ({ name: p._id, revenue: p.revenue, qty: p.qty })),
    pendingCashups, transactionsMonth: monthRev[0]?.count || 0
  };
}

async function kpiAdmin(dates) {
  const { startOfDay } = dates;
  const [todaySales, todayOrders, pendingOrders, lowStock, expiring, staffSales, pendingPOs] = await Promise.all([
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfDay }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Order.countDocuments({ createdAt: { $gte: startOfDay } }),
    Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'processing'] } }),
    Product.countDocuments({ status: 'active', $expr: { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] } }),
    Batch.countDocuments({ status: 'active', expiryDate: { $lte: new Date(Date.now() + 30*24*60*60*1000), $gte: new Date() } }),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfDay }, status: 'completed' } }, { $group: { _id: '$cashierId', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }, { $sort: { total: -1 } }, { $limit: 10 }]),
    PurchaseOrder.countDocuments({ status: { $in: ['draft', 'submitted'] } })
  ]);
  let staffPerformance = [];
  if (staffSales.length > 0) {
    const staff = await User.find({ _id: { $in: staffSales.map(s => s._id) } }).select('firstName lastName');
    const map = {}; staff.forEach(u => { map[u._id.toString()] = `${u.firstName} ${u.lastName}`; });
    staffPerformance = staffSales.map(s => ({ name: map[s._id?.toString()] || 'Unknown', sales: s.total || 0, transactions: s.count || 0 }));
  }
  return {
    salesToday: todaySales[0]?.total || 0, transactionsToday: todaySales[0]?.count || 0,
    onlineOrdersToday: todayOrders, pendingOrders, lowStockAlerts: lowStock,
    expiringStockAlerts: expiring, staffPerformance, pendingPurchaseOrders: pendingPOs
  };
}

async function kpiBranchManager(user, dates) {
  const { startOfDay } = dates;
  const bf = getSaleBranchFilter(user);
  const [todaySales, tills, cashups, lowStock, staffCount] = await Promise.all([
    Sale.aggregate([{ $match: { ...bf, createdAt: { $gte: startOfDay }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    TillSession.find({ ...bf, status: { $in: ['open', 'closed'] }, createdAt: { $gte: startOfDay } }).select('tillNumber status').lean(),
    TillSession.aggregate([{ $match: { ...bf, createdAt: { $gte: startOfDay } } }, { $group: { _id: '$approval.status', count: { $sum: 1 } } }]),
    BranchInventory.countDocuments({ ...(bf.branchId ? { branchId: bf.branchId } : {}), $expr: { $lte: ['$quantity', '$lowStockThreshold'] } }),
    User.countDocuments({ role: { $in: ['branch_assistant', 'branch_manager'] }, isActive: true, $or: [{ primaryBranch: user.primaryBranch }, { 'assignedBranches.branch': user.primaryBranch }] })
  ]);
  const cm = {}; cashups.forEach(c => { cm[c._id || 'none'] = c.count; });
  return {
    branchSalesToday: todaySales[0]?.total || 0, branchTransactionsToday: todaySales[0]?.count || 0,
    tillsOpen: tills.filter(t => t.status === 'open').length, tillsClosed: tills.filter(t => t.status === 'closed').length,
    cashupsPending: cm['pending'] || 0, cashupsSubmitted: cm['submitted'] || 0, cashupsApproved: cm['approved'] || 0,
    lowStockAlerts: lowStock, staffOnShift: staffCount
  };
}

async function kpiInventoryManager(dates) {
  const { startOfDay } = dates;
  const [belowReorder, pendingBatches, stockValue, pendingPOs, approvedPOs, expiring, movements] = await Promise.all([
    Product.countDocuments({ status: 'active', $expr: { $lte: ['$inventory.quantity', '$inventory.lowStockThreshold'] } }),
    Batch.countDocuments({ qaStatus: 'pending' }),
    Product.aggregate([{ $match: { status: 'active' } }, { $group: { _id: '$category', totalValue: { $sum: { $multiply: ['$price', '$inventory.quantity'] } }, count: { $sum: 1 } } }, { $sort: { totalValue: -1 } }]),
    PurchaseOrder.countDocuments({ status: { $in: ['draft', 'submitted'] } }),
    PurchaseOrder.countDocuments({ status: 'approved' }),
    Batch.countDocuments({ status: 'active', expiryDate: { $lte: new Date(Date.now() + 30*24*60*60*1000), $gte: new Date() } }),
    Sale.aggregate([{ $match: { createdAt: { $gte: startOfDay }, status: 'completed' } }, { $unwind: '$items' }, { $group: { _id: null, totalOut: { $sum: '$items.quantity' } } }])
  ]);
  return {
    itemsBelowReorder: belowReorder, pendingBatchQA: pendingBatches,
    stockValueByCategory: stockValue.map(c => ({ category: c._id || 'Uncategorized', value: c.totalValue || 0, products: c.count })),
    purchaseOrders: { pending: pendingPOs, approved: approvedPOs },
    stockMovementToday: { out: movements[0]?.totalOut || 0 }, expiringItems30Days: expiring
  };
}

async function kpiStaffAssistant(user, dates) {
  const { startOfDay } = dates;
  const [mySales, activeTill] = await Promise.all([
    Sale.aggregate([{ $match: { cashierId: user._id, createdAt: { $gte: startOfDay }, status: 'completed' } }, { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 }, items: { $sum: { $size: '$items' } } } }]),
    TillSession.findOne({ openedBy: user._id, status: 'open' }).select('openedAt transactionSummary').lean()
  ]);
  const cnt = mySales[0]?.count || 0;
  const tot = mySales[0]?.total || 0;
  return {
    mySalesToday: tot, myTransactionsToday: cnt, itemsSoldToday: mySales[0]?.items || 0,
    avgTransactionValue: cnt > 0 ? Math.round((tot / cnt) * 100) / 100 : 0,
    tillBalance: activeTill?.transactionSummary?.totalSales || 0, shiftStartTime: activeTill?.openedAt || null
  };
}

async function kpiPacker(dates) {
  const { startOfDay } = dates;
  const [toPack, packed, total] = await Promise.all([
    Order.countDocuments({ status: 'processing', 'fulfillment.status': { $in: ['pending', 'picking'] } }),
    Order.countDocuments({ 'fulfillment.packedAt': { $gte: startOfDay } }),
    Order.countDocuments({ status: { $in: ['processing', 'packed'] }, createdAt: { $gte: startOfDay } })
  ]);
  return { ordersToPack: toPack, packedToday: packed, totalOrdersToday: total };
}

async function kpiDispatchManager(dates) {
  const { startOfDay } = dates;
  const [ready, dispatched, transit] = await Promise.all([
    Order.countDocuments({ status: 'packed' }),
    Order.countDocuments({ 'fulfillment.shippedAt': { $gte: startOfDay } }),
    Order.countDocuments({ status: 'shipped' })
  ]);
  return { readyForDispatch: ready, dispatchedToday: dispatched, inTransit: transit };
}

async function kpiSupplier(user) {
  const supplier = await Supplier.findOne({ $or: [{ 'portal.userId': user._id }, { email: user.email }, { 'contactPerson.email': user.email }] }).lean();
  if (!supplier) return { activePOs: 0, pendingDeliveries: 0, totalPaidValue: 0 };
  const [active, pending, paid] = await Promise.all([
    PurchaseOrder.countDocuments({ supplier: supplier._id, status: { $in: ['approved', 'ordered'] } }),
    PurchaseOrder.countDocuments({ supplier: supplier._id, status: 'ordered' }),
    PurchaseOrder.aggregate([{ $match: { supplier: supplier._id, paymentStatus: 'paid' } }, { $group: { _id: null, total: { $sum: '$totals.total' } } }])
  ]);
  return { activePOs: active, pendingDeliveries: pending, totalPaidValue: paid[0]?.total || 0 };
}

async function kpiCustomer(user) {
  const [orderCount, totalSpent] = await Promise.all([
    Order.countDocuments({ $or: [{ user: user._id }, { 'customer.email': user.email }] }),
    Order.aggregate([{ $match: { $or: [{ user: user._id }, { 'customer.email': user.email }], status: { $ne: 'cancelled' } } }, { $group: { _id: null, total: { $sum: '$total' } } }])
  ]);
  return {
    totalOrders: orderCount, totalSpent: totalSpent[0]?.total || 0,
    pointsBalance: user.loyalty?.points || 0, tier: user.loyalty?.tier || 'wellness_seeker',
    section21Status: user.section21Status || 'none'
  };
}

// ============================================================================
// OWNER 360 — STAFF OVERVIEW
// ============================================================================

exports.staffOverview = async (req, res) => {
  try {
    const staffRoles = ['branch_manager', 'branch_assistant', 'packer', 'dispatch_manager', 'inventory_manager'];
    const totalStaff = await User.countDocuments({ role: { $in: staffRoles }, isActive: true });

    // Check for shifts today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayShifts = await StaffShift.find({
      shiftDate: { $gte: today, $lt: tomorrow }
    }).select('staff clockIn clockOut breaks').lean();

    const hasShiftData = todayShifts.length > 0;

    let activeToday = 0;
    let onBreak = 0;

    if (hasShiftData) {
      const now = new Date();
      todayShifts.forEach(shift => {
        if (shift.clockIn && !shift.clockOut) {
          // Currently clocked in
          const currentlyOnBreak = shift.breaks?.some(b => b.startTime && !b.endTime);
          if (currentlyOnBreak) {
            onBreak++;
          } else {
            activeToday++;
          }
        } else if (shift.clockIn && shift.clockOut) {
          // Completed shift today
          activeToday++;
        }
      });
    }

    res.json({
      success: true,
      data: {
        totalStaff,
        activeToday,
        onBreak,
        hasShiftData
      }
    });
  } catch (error) {
    logger.error('Staff overview error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Failed to load staff overview' });
  }
};

// ============================================================================
// OWNER 360 — BRANCH COMPARISON
// ============================================================================

exports.branchComparison = async (req, res) => {
  try {
    const branches = await Branch.find({}).select('name branchCode isActive').lean();
    const branchIds = branches.map(b => b._id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaySales, monthSales, inventoryStats, staffCounts, lastCashups] = await Promise.all([
      Sale.aggregate([
        { $match: { branchId: { $in: branchIds }, createdAt: { $gte: today, $lt: tomorrow }, status: 'completed' } },
        { $group: { _id: '$branchId', revenue: { $sum: '$totalAmount' }, transactions: { $sum: 1 } } }
      ]),
      Sale.aggregate([
        { $match: { branchId: { $in: branchIds }, createdAt: { $gte: monthStart }, status: 'completed' } },
        { $group: { _id: '$branchId', revenue: { $sum: '$totalAmount' }, transactions: { $sum: 1 } } }
      ]),
      BranchInventory.aggregate([
        { $match: { branchId: { $in: branchIds }, isActive: true } },
        { $lookup: { from: 'products', localField: 'productId', foreignField: '_id', as: 'product' } },
        { $unwind: { path: '$product', preserveNullAndEmptyArrays: true } },
        { $group: {
          _id: '$branchId',
          totalItems: { $sum: 1 },
          totalQty: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$product.price', 0] }] } }
        }}
      ]),
      User.aggregate([
        { $match: { isActive: true, role: { $in: ['branch_manager', 'branch_assistant', 'packer', 'dispatch_manager', 'inventory_manager'] } } },
        { $group: { _id: '$primaryBranch', count: { $sum: 1 } } }
      ]),
      DailyCashup.aggregate([
        { $sort: { createdAt: -1 } },
        { $group: { _id: '$branchId', lastStatus: { $first: '$status' }, lastDate: { $first: '$createdAt' } } }
      ])
    ]);

    const toMap = (arr) => {
      const m = {};
      arr.forEach(item => { if (item._id) m[item._id.toString()] = item; });
      return m;
    };
    const todayMap = toMap(todaySales);
    const monthMap = toMap(monthSales);
    const invMap = toMap(inventoryStats);
    const staffMap = toMap(staffCounts);
    const cashupMap = toMap(lastCashups);

    const result = branches.map(b => {
      const id = b._id.toString();
      return {
        _id: b._id,
        name: b.name,
        branchCode: b.branchCode,
        isActive: b.isActive,
        todayRevenue: todayMap[id]?.revenue || 0,
        todayTransactions: todayMap[id]?.transactions || 0,
        monthRevenue: monthMap[id]?.revenue || 0,
        monthTransactions: monthMap[id]?.transactions || 0,
        stockItems: invMap[id]?.totalItems || 0,
        stockQty: invMap[id]?.totalQty || 0,
        stockValue: invMap[id]?.totalValue || 0,
        staffCount: staffMap[id]?.count || 0,
        lastCashupStatus: cashupMap[id]?.lastStatus || 'none',
        lastCashupDate: cashupMap[id]?.lastDate || null
      };
    });

    res.json({ success: true, branches: result });
  } catch (error) {
    logger.error('Branch comparison error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Failed to load branch comparison' });
  }
};
