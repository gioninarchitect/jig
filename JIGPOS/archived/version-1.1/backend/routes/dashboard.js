// Dashboard API Routes - Real backend functionality
const express = require('express');
const router = express.Router();
const User = require('../modules/database/models/User');
const Order = require('../modules/database/models/Order');
const Affiliate = require('../modules/database/models/Affiliate');

// Middleware to verify user token
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cbdwellness24_secret_key_change_in_production');
    req.userId = decoded.id;
    req.userEmail = decoded.email;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Get dashboard stats for a user
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const userEmail = req.userEmail;
    const userRole = req.userRole;

    console.log('[Dashboard /stats] Request from:', { userId, userEmail, userRole });

    // Get user data
    const user = await User.findById(userId);
    if (!user) {
      console.error('[Dashboard /stats] User not found:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[Dashboard /stats] User found:', user.email);
    
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
        role: user.role
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
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to load dashboard stats' });
  }
});

// Get user's orders with pagination and filtering
router.get('/orders', verifyToken, async (req, res) => {
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
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to load orders' });
  }
});

// Get specific order details
router.get('/orders/:orderNumber', verifyToken, async (req, res) => {
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
    console.error('Get order details error:', error);
    res.status(500).json({ error: 'Failed to load order details' });
  }
});

// Track order status
router.get('/track/:orderNumber', async (req, res) => {
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
    console.error('Track order error:', error);
    res.status(500).json({ error: 'Failed to track order' });
  }
});

// Update user profile
router.put('/profile', verifyToken, async (req, res) => {
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
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get account activity/notifications
router.get('/activity', verifyToken, async (req, res) => {
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
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Failed to load activity' });
  }
});

// Upgrade membership
router.post('/upgrade-membership', verifyToken, async (req, res) => {
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
    console.error('Upgrade membership error:', error);
    res.status(500).json({ error: 'Failed to upgrade membership' });
  }
});

// Get real affiliate stats (no fake numbers)
router.get('/affiliate-stats', async (req, res) => {
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
    console.error('Affiliate stats error:', error);
    res.status(500).json({ error: 'Failed to load affiliate stats' });
  }
});

// ============================================================================
// WELLNESS POINTS ENDPOINTS
// ============================================================================

// Get user's wellness points data
router.get('/points', verifyToken, async (req, res) => {
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
    console.error('Get points error:', error);
    res.status(500).json({ error: 'Failed to load points data' });
  }
});

// Get points history
router.get('/points/history', verifyToken, async (req, res) => {
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
    console.error('Get points history error:', error);
    res.status(500).json({ error: 'Failed to load points history' });
  }
});

// Redeem wellness points
router.post('/points/redeem', verifyToken, async (req, res) => {
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

    // TODO: Create voucher record in Voucher model
    // For now, just return the voucher code

    res.json({
      message: `Successfully redeemed ${points} points`,
      voucherCode,
      voucherValue,
      remainingPoints: user.loyalty.points
    });
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({ error: error.message || 'Failed to redeem points' });
  }
});

module.exports = router;