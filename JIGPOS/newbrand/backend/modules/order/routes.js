// Order Management & Checkout Routes
const express = require('express');
const router = express.Router();
const Order = require('../database/models/Order');
const Cart = require('../database/models/Cart');
const Product = require('../database/models/Product');
const User = require('../database/models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { generateOrderNumber } = require('../../utils/helpers');
const paymentController = require('../payment/controller');

// Create order from cart (checkout)
router.post('/checkout', async (req, res) => {
  try {
    const {
      shippingAddress,
      billingAddress,
      paymentMethod,
      paymentDetails,
      notes,
      guestEmail,
      guestPhone
    } = req.body;

    // Get cart
    const cartQuery = req.user 
      ? { user: req.user._id }
      : { sessionId: req.headers['x-session-id'] || req.cookies?.sessionId };

    const cart = await Cart.findOne(cartQuery)
      .populate('items.product', 'name price stock');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Validate stock availability
    const stockIssues = [];
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        stockIssues.push({
          product: item.product.name,
          available: item.product.stock,
          requested: item.quantity
        });
      }
    }

    if (stockIssues.length > 0) {
      return res.status(400).json({ 
        error: 'Some products are out of stock',
        stockIssues 
      });
    }

    // Create order
    const orderData = {
      orderNumber: generateOrderNumber(),
      user: req.user?._id,
      items: cart.items.map(item => ({
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        size: item.size,
        color: item.color
      })),
      subtotal: cart.subtotal,
      discount: cart.discount,
      shipping: 10, // Calculate based on location
      tax: cart.subtotal * 0.08, // 8% tax
      total: cart.total + 10 + (cart.subtotal * 0.08),
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      paymentMethod,
      status: 'pending',
      statusHistory: [{
        status: 'pending',
        date: new Date(),
        note: 'Order created'
      }],
      notes
    };

    // Add guest info if not authenticated
    if (!req.user) {
      orderData.guestEmail = guestEmail;
      orderData.guestPhone = guestPhone;
    }

    const order = new Order(orderData);

    // Process payment
    let paymentResult;
    if (paymentMethod === 'stripe') {
      paymentResult = await paymentController.processStripePayment({
        amount: order.total,
        paymentMethodId: paymentDetails.paymentMethodId,
        orderId: order._id
      });
    } else if (paymentMethod === 'paypal') {
      paymentResult = await paymentController.processPayPalPayment({
        amount: order.total,
        orderId: order._id
      });
    } else if (paymentMethod === 'cod') {
      paymentResult = { success: true, transactionId: 'COD-' + Date.now() };
    }

    if (!paymentResult.success) {
      return res.status(400).json({ 
        error: 'Payment failed',
        details: paymentResult.error 
      });
    }

    // Payment successful, save order
    order.paymentStatus = paymentMethod === 'cod' ? 'pending' : 'paid';
    order.paymentDetails = {
      method: paymentMethod,
      transactionId: paymentResult.transactionId
    };
    order.status = 'confirmed';
    order.statusHistory.push({
      status: 'confirmed',
      date: new Date(),
      note: 'Payment received'
    });

    await order.save();

    // Update product stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { 
          stock: -item.quantity,
          sold: item.quantity
        }
      });
    }

    // Clear cart
    cart.items = [];
    cart.subtotal = 0;
    cart.discount = 0;
    cart.total = 0;
    cart.itemCount = 0;
    await cart.save();

    // Send confirmation email (implement email service)
    // await emailService.sendOrderConfirmation(order);

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        estimatedDelivery: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) // 5 days
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's orders
router.get('/my-orders', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    const query = { user: req.user._id };
    if (status) query.status = status;

    const orders = await Order.find(query)
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const count = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalOrders: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single order details
router.get('/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    
    const order = await Order.findOne({ orderNumber })
      .populate('user', 'name email')
      .populate('items.product', 'name images');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check authorization
    if (req.user) {
      if (order.user && order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Unauthorized' });
      }
    } else {
      // For guest orders, verify email
      const { email } = req.query;
      if (!email || order.guestEmail !== email) {
        return res.status(403).json({ error: 'Please provide valid order email' });
      }
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Track order
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    const order = await Order.findOne({ orderNumber })
      .select('orderNumber status statusHistory estimatedDelivery shippingAddress guestEmail');
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify access for guest orders
    if (!req.user && order.guestEmail && order.guestEmail !== email) {
      return res.status(403).json({ error: 'Please provide valid order email' });
    }

    res.json({
      orderNumber: order.orderNumber,
      status: order.status,
      statusHistory: order.statusHistory,
      estimatedDelivery: order.estimatedDelivery || new Date(order.createdAt.getTime() + 5 * 24 * 60 * 60 * 1000),
      shippingAddress: {
        city: order.shippingAddress.city,
        state: order.shippingAddress.state,
        country: order.shippingAddress.country
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel order
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check authorization
    if (order.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: `Cannot cancel ${order.status} order` });
    }

    // Restore product stock
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { 
          stock: item.quantity,
          sold: -item.quantity
        }
      });
    }

    // Process refund if paid
    if (order.paymentStatus === 'paid' && order.paymentMethod !== 'cod') {
      const refundResult = await paymentController.processRefund({
        orderId: order._id,
        amount: order.total,
        reason: req.body.reason || 'Customer requested cancellation'
      });

      if (refundResult.success) {
        order.paymentStatus = 'refunded';
        order.refundDetails = {
          amount: order.total,
          date: new Date(),
          transactionId: refundResult.transactionId
        };
      }
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      date: new Date(),
      note: req.body.reason || 'Order cancelled by customer'
    });

    await order.save();

    res.json({
      message: 'Order cancelled successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Routes

// Get all orders (admin)
router.get('/', [auth, admin], async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      paymentStatus,
      startDate,
      endDate,
      search
    } = req.query;

    const query = {};
    
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'guestEmail': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Order.countDocuments(query);

    res.json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalOrders: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update order status (admin)
router.patch('/:id/status', [auth, admin], async (req, res) => {
  try {
    const { status, note, trackingNumber, estimatedDelivery } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const validTransitions = {
      'pending': ['confirmed', 'cancelled'],
      'confirmed': ['processing', 'cancelled'],
      'processing': ['shipped', 'cancelled'],
      'shipped': ['delivered', 'returned'],
      'delivered': ['returned'],
      'cancelled': [],
      'returned': []
    };

    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ 
        error: `Cannot transition from ${order.status} to ${status}` 
      });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      date: new Date(),
      note,
      updatedBy: req.user._id
    });

    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (estimatedDelivery) order.estimatedDelivery = estimatedDelivery;

    await order.save();

    // Send status update email
    // await emailService.sendOrderStatusUpdate(order);

    res.json({
      message: `Order status updated to ${status}`,
      order
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get order statistics (admin)
router.get('/stats/overview', [auth, admin], async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const [
      totalOrders,
      todayOrders,
      monthOrders,
      pendingOrders,
      revenue
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ createdAt: { $gte: today } }),
      Order.countDocuments({ createdAt: { $gte: thisMonth } }),
      Order.countDocuments({ status: { $in: ['pending', 'confirmed', 'processing'] } }),
      Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    res.json({
      totalOrders,
      todayOrders,
      monthOrders,
      pendingOrders,
      totalRevenue: revenue[0]?.total || 0,
      avgOrderValue: totalOrders > 0 ? (revenue[0]?.total || 0) / totalOrders : 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export orders (admin)
router.get('/export', [auth, admin], async (req, res) => {
  try {
    const { format = 'json', ...filters } = req.query;
    
    const orders = await Order.find(filters)
      .populate('user', 'name email')
      .sort('-createdAt');

    if (format === 'csv') {
      // Implement CSV export
      const csv = orders.map(order => ({
        'Order Number': order.orderNumber,
        'Date': order.createdAt,
        'Customer': order.user?.name || order.guestEmail,
        'Total': order.total,
        'Status': order.status,
        'Payment': order.paymentStatus
      }));
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
      // Convert to CSV and send
    } else {
      res.json(orders);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;