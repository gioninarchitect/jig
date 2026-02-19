// Order Routes with Payment Status Check - Max 200 lines
const express = require('express');
const router = express.Router();
const { verifyToken, checkPaymentApproval } = require('../modules/auth/middleware');
const {authenticateToken} = require('../middleware/auth');
const Order = require('../modules/database/models/Order');
const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const logger = require('../modules/logger');
const invoiceGenerator = require('../services/invoiceGenerator');
const emailService = require('../services/emailService');

// Check payment status endpoint
router.post('/check-payment-status', verifyToken, async (req, res) => {
  try {
    const { orderId, email } = req.body;
    
    // Find order
    const order = await Order.findOne({
      orderNumber: orderId,
      'customer.email': email
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check payment status
    if (order.paymentStatus === 'completed') {
      return res.json({
        success: true,
        approved: true,
        message: 'Payment approved',
        membershipActive: true
      });
    } else if (order.paymentStatus === 'failed' || order.paymentStatus === 'rejected') {
      return res.json({
        success: true,
        rejected: true,
        reason: order.paymentNotes || 'Payment verification failed',
        message: 'Payment rejected'
      });
    } else {
      return res.json({
        success: true,
        approved: false,
        rejected: false,
        status: order.paymentStatus,
        message: 'Payment pending approval'
      });
    }
  } catch (error) {
    logger.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking payment status'
    });
  }
});

// Create order (with proof of payment upload) - Works for guests and logged-in users
router.post('/create', async (req, res) => {
  try {
    const { orderNumber, customer, items, subtotal, shipping, total, payment, status } = req.body;

    // Check if user is authenticated (optional)
    const userId = req.headers.authorization ? null : null; // Will add proper auth check later
    
    // Create order
    const order = new Order({
      orderNumber: orderNumber || `CBD-${Date.now()}`,
      user: userId || null,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      },
      items: items.map(item => {
        const productId = item.product || item.productId || item.id || item._id;
        logger.info('[Order Create] Item mapping:', {
          original: item,
          extractedProductId: productId
        });
        return {
          product: productId,
          name: item.name,
          sku: item.sku,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal || item.price * item.quantity
        };
      }),
      subtotal: subtotal,
      shipping: shipping || { method: 'standard', cost: 0 },
      total: total,
      payment: payment || { method: 'eft', status: 'pending' },
      status: status || 'pending'
    });
    
    await order.save();

    // DEDUCT INVENTORY for each item in the order
    for (const item of items) {
      const productId = item.product || item.productId;
      const quantity = item.quantity;

      if (productId) {
        try {
          const product = await Product.findById(productId);
          if (product && product.inventory && product.inventory.quantity >= quantity) {
            product.inventory.quantity -= quantity;
            await product.save();
            logger.info(`Inventory deducted: ${item.name} (${quantity} units) - Order ${order.orderNumber}`);
          } else {
            logger.warn(`Insufficient inventory for ${item.name} - Order ${order.orderNumber}`);
          }
        } catch (err) {
          logger.error(`Inventory deduction failed for ${item.name}:`, err);
        }
      }
    }

    // Send order confirmation email (without invoice - invoice sent after payment verification)
    if (customer && customer.email) {
      try {
        // Send confirmation email (no invoice attachment - invoice sent after payment verification)
        await emailService.sendOrderConfirmation({
          to: customer.email,
          orderNumber: order.orderNumber,
          customerName: `${customer.firstName} ${customer.lastName}`,
          total: order.total,
          items: order.items
          // No pdfBuffer - invoice will be sent after payment is verified by admin
        });

        logger.info(`Order confirmation email sent to ${customer.email} for order ${order.orderNumber}`);
      } catch (emailError) {
        // Don't fail the order if email fails, just log it
        logger.error('Failed to send order confirmation email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      orderId: order._id,
      orderNumber: order.orderNumber,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        payment: {
          method: order.payment.method,
          status: order.payment.status
        }
      }
    });
  } catch (error) {
    logger.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order'
    });
  }
});

// Guest checkout - creates user account + order in one call
router.post('/guest-checkout', async (req, res) => {
  try {
    const { customer, items, subtotal, shipping, total, payment, shippingAddress } = req.body;

    // Validate required fields
    if (!customer || !customer.email || !customer.firstName || !customer.lastName) {
      return res.status(400).json({
        success: false,
        message: 'Customer details required (firstName, lastName, email)'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order must contain at least one item'
      });
    }

    const User = require('../modules/database/models/User');
    const bcrypt = require('bcryptjs');
    const jwt = require('jsonwebtoken');

    // Check if user already exists
    let user = await User.findOne({ email: customer.email.toLowerCase() });
    let isNewUser = false;
    let generatedPassword = null;

    if (!user) {
      // Generate a random password
      generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();
      const hashedPassword = await bcrypt.hash(generatedPassword, 10);

      // Create new user
      user = new User({
        email: customer.email.toLowerCase(),
        password: hashedPassword,
        firstName: customer.firstName,
        lastName: customer.lastName,
        phone: customer.phone || '',
        address: shippingAddress || customer.address || '',
        role: 'user',
        status: 'active',
        loyalty: {
          tier: 'wellness_seeker',
          points: 0,
          totalEarned: 0,
          totalRedeemed: 0
        }
      });

      await user.save();
      isNewUser = true;
      logger.info(`New user created via guest checkout: ${customer.email}`);
    }

    // Create order number
    const orderNumber = `CBD-${Date.now()}`;

    // Create order linked to user
    const order = new Order({
      orderNumber: orderNumber,
      user: user._id,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email.toLowerCase(),
        phone: customer.phone || ''
      },
      shippingAddress: shippingAddress || customer.address || '',
      items: items.map(item => ({
        product: item.productId || item.product,
        name: item.name,
        sku: item.sku || '',
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal || item.price * item.quantity
      })),
      subtotal: subtotal,
      shipping: shipping || { method: 'standard', cost: 0 },
      total: total,
      payment: payment || { method: 'eft', status: 'pending' },
      status: 'pending'
    });

    await order.save();

    // Deduct inventory
    for (const item of items) {
      const productId = item.productId || item.product;
      if (productId) {
        try {
          const product = await Product.findById(productId);
          if (product && product.inventory && product.inventory.quantity >= item.quantity) {
            product.inventory.quantity -= item.quantity;
            await product.save();
            logger.info(`Inventory deducted: ${item.name} (${item.quantity} units) - Order ${orderNumber}`);
          }
        } catch (err) {
          logger.error(`Inventory deduction failed for ${item.name}:`, err);
        }
      }
    }

    // Generate JWT token for auto-login
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    // Send welcome email to new users with login credentials
    if (isNewUser && generatedPassword) {
      try {
        await emailService.sendWelcomeEmail({
          to: customer.email,
          firstName: customer.firstName,
          temporaryPassword: generatedPassword,
          orderNumber: orderNumber
        });
        logger.info(`Welcome email sent to new user: ${customer.email}`);
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
        // Don't fail the order if email fails
      }
    }

    const response = {
      success: true,
      message: isNewUser
        ? 'Order placed and account created successfully!'
        : 'Order placed successfully!',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status
      },
      user: {
        _id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      token: token,
      isNewUser: isNewUser
    };

    // Only include temporary password for new users (should be emailed in production)
    if (isNewUser && generatedPassword) {
      response.temporaryPassword = generatedPassword;
      response.passwordNote = 'Please save this password or change it in your dashboard. In production, this will be emailed to you.';
    }

    res.status(201).json(response);

  } catch (error) {
    logger.error('Guest checkout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing checkout',
      error: error.message
    });
  }
});

// Upload payment proof
router.post('/:orderId/upload-proof', verifyToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { proofUrl } = req.body;
    
    const order = await Order.findOne({
      orderNumber: orderId,
      user: req.user._id
    });
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update payment proof
    order.payment.proofUrl = proofUrl;
    order.payment.proofUploaded = true;
    order.payment.uploadedAt = new Date();
    order.paymentStatus = 'pending_approval';
    
    await order.save();
    
    res.json({
      success: true,
      message: 'Payment proof uploaded successfully',
      requiresApproval: true
    });
  } catch (error) {
    logger.error('Proof upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading payment proof'
    });
  }
});

// Get user orders
router.get('/my-orders', verifyToken, checkPaymentApproval, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// Admin: Get all orders
router.get('/all', authenticateToken, async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin' && req.user.role !== 'staff_manager' && req.user.role !== 'staff_assistant') {
      return res.status(403).json({
        success: false,
        message: 'Staff access required'
      });
    }

    const { limit = 50, status, paymentStatus } = req.query;

    const query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .populate('user', 'email name');

    res.json({
      success: true,
      orders,
      total: orders.length
    });
  } catch (error) {
    logger.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders'
    });
  }
});

// Admin: Approve payment by MongoDB _id
router.post('/:orderId/approve-payment', authenticateToken, async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin' && req.user.role !== 'staff_manager') {
      return res.status(403).json({
        success: false,
        message: 'Admin or manager access required'
      });
    }

    const { orderId } = req.params;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update payment status
    order.payment.status = 'paid';
    if (order.payment.proofOfPayment) {
      order.payment.proofOfPayment.verified = true;
      order.payment.proofOfPayment.verifiedBy = req.user.id;
      order.payment.proofOfPayment.verifiedAt = new Date();
    }
    order.payment.paidAt = new Date();
    order.status = 'processing';

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'processing',
      note: 'Payment approved by admin',
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    await order.save();

    // Send invoice email after payment approval
    if (order.customer && order.customer.email) {
      try {
        // Generate invoice PDF
        let pdfBuffer = null;
        try {
          pdfBuffer = await invoiceGenerator.generateOrderInvoice(order);
        } catch (pdfError) {
          logger.warn('Could not generate invoice PDF:', pdfError.message);
        }

        // Send invoice email
        await emailService.sendOrderConfirmation({
          to: order.customer.email,
          orderNumber: order.orderNumber,
          customerName: `${order.customer.firstName} ${order.customer.lastName}`,
          total: order.total,
          items: order.items,
          pdfBuffer: pdfBuffer
        });

        logger.info(`Invoice email sent to ${order.customer.email} for order ${order.orderNumber}`);
      } catch (emailError) {
        logger.error('Failed to send invoice email:', emailError);
      }
    }

    // Check if order qualifies for membership (R300+) and activate it
    if (order.total >= 300 && order.qualifiesForMembership && !order.membershipActivated) {
      try {
        // Update order to show membership activated
        order.membershipActivated = true;
        await order.save();

        // Update user's membership tier
        const User = require('../modules/database/models/User');
        const user = await User.findById(order.user);
        if (user) {
          user.loyalty = user.loyalty || {};
          user.loyalty.tier = 'wellness_member';
          user.membership = {
            active: true,
            activatedAt: new Date(),
            activatedByOrder: order._id
          };
          await user.save();
          logger.info(`Membership activated for user ${user.email}`);
        }

        // Send membership activation email
        if (order.customer && order.customer.email) {
          await emailService.sendMembershipActivationEmail({
            to: order.customer.email,
            firstName: order.customer.firstName,
            orderNumber: order.orderNumber,
            orderTotal: order.total
          });
          logger.info(`Membership activation email sent to ${order.customer.email}`);
        }
      } catch (membershipError) {
        logger.error('Failed to activate membership:', membershipError);
        // Don't fail the approval if membership activation fails
      }
    }

    res.json({
      success: true,
      message: 'Payment approved successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.payment.status
      }
    });
  } catch (error) {
    logger.error('Approve payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving payment'
    });
  }
});

// Admin: Reject payment by MongoDB _id
router.post('/:orderId/reject-payment', authenticateToken, async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin' && req.user.role !== 'staff_manager') {
      return res.status(403).json({
        success: false,
        message: 'Admin or manager access required'
      });
    }

    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update payment status
    order.payment.status = 'failed';
    if (order.payment.proofOfPayment) {
      order.payment.proofOfPayment.verified = false;
    }
    order.status = 'cancelled';

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'cancelled',
      note: `Payment rejected: ${reason}`,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Payment rejected',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.payment.status
      }
    });
  } catch (error) {
    logger.error('Reject payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting payment'
    });
  }
});

// Admin: Approve payment
router.post('/:orderId/approve', verifyToken, async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    
    const { orderId } = req.params;
    const order = await Order.findOne({ orderNumber: orderId })
      .populate('user');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Approve payment
    order.paymentStatus = 'completed';
    order.payment.approvedAt = new Date();
    order.payment.approvedBy = req.user.id;
    order.status = 'processing';
    
    // Activate membership if applicable
    if (order.hasLifestyleMembership && order.user) {
      order.user.membership = {
        status: 'active',
        type: 'lifestyle',
        startDate: new Date(),
        active: true
      };
      order.user.isLifestyleMember = true;
      await order.user.save();
    }
    
    await order.save();
    
    res.json({
      success: true,
      message: 'Payment approved successfully'
    });
  } catch (error) {
    logger.error('Payment approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving payment'
    });
  }
});

// Admin: Reject payment
router.post('/:orderId/reject', verifyToken, async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const { orderId } = req.params;
    const { reason } = req.body;
    const order = await Order.findOne({ orderNumber: orderId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Reject payment
    order.paymentStatus = 'rejected';
    order.payment.rejectedAt = new Date();
    order.payment.rejectedBy = req.user.id;
    order.paymentNotes = reason || 'Payment rejected by admin';
    order.status = 'cancelled';

    await order.save();

    res.json({
      success: true,
      message: 'Payment rejected successfully'
    });
  } catch (error) {
    logger.error('Payment rejection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting payment'
    });
  }
});

// ============================================================================
// SPLIT PAYMENT ENDPOINTS
// ============================================================================

// Add payment to existing order (split payment support)
router.post('/:orderId/add-payment', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { method, amount, reference, voucherId } = req.body;

    if (!method || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment method and amount are required'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Initialize payments array if not exists
    if (!order.payments) {
      order.payments = [];
    }

    // Add the new payment
    order.payments.push({
      method,
      amount,
      reference,
      voucherId,
      processedAt: new Date(),
      processedBy: req.user.id,
      status: 'completed'
    });

    // Update payment summary
    const totalPaid = order.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    order.paymentSummary = {
      totalDue: order.total,
      totalPaid,
      totalOutstanding: Math.max(0, order.total - totalPaid),
      isFullyPaid: totalPaid >= order.total
    };

    // If fully paid, update order status
    if (order.paymentSummary.isFullyPaid) {
      order.payment.status = 'paid';
      order.payment.paidAt = new Date();
      if (order.status === 'pending') {
        order.status = 'confirmed';
      }
    }

    await order.save();

    logger.info('Payment added to order', {
      orderNumber: order.orderNumber,
      method,
      amount,
      totalPaid,
      isFullyPaid: order.paymentSummary.isFullyPaid,
      addedBy: req.user.id
    });

    res.json({
      success: true,
      message: order.paymentSummary.isFullyPaid ? 'Payment complete' : 'Payment added',
      payments: order.payments,
      paymentSummary: order.paymentSummary
    });
  } catch (error) {
    logger.error('Add payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding payment'
    });
  }
});

// Refund a specific payment
router.post('/:orderId/refund-payment', authenticateToken, async (req, res) => {
  try {
    // Admin/manager check
    if (req.user.role !== 'admin' && req.user.role !== 'staff_manager') {
      return res.status(403).json({
        success: false,
        message: 'Admin or manager access required'
      });
    }

    const { orderId } = req.params;
    const { paymentIndex, reason } = req.body;

    if (paymentIndex === undefined || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Payment index and reason are required'
      });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!order.payments || !order.payments[paymentIndex]) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const payment = order.payments[paymentIndex];

    if (payment.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Payment is already refunded'
      });
    }

    // Mark payment as refunded
    order.payments[paymentIndex].status = 'refunded';
    order.payments[paymentIndex].refundedAt = new Date();
    order.payments[paymentIndex].refundedBy = req.user.id;
    order.payments[paymentIndex].refundReason = reason;

    // Recalculate payment summary
    const totalPaid = order.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);

    order.paymentSummary = {
      totalDue: order.total,
      totalPaid,
      totalOutstanding: Math.max(0, order.total - totalPaid),
      isFullyPaid: totalPaid >= order.total
    };

    // Update order status if no longer fully paid
    if (!order.paymentSummary.isFullyPaid && order.payment.status === 'paid') {
      order.payment.status = 'pending';
    }

    await order.save();

    logger.info('Payment refunded', {
      orderNumber: order.orderNumber,
      paymentIndex,
      refundedAmount: payment.amount,
      reason,
      refundedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Payment refunded successfully',
      refundedPayment: order.payments[paymentIndex],
      paymentSummary: order.paymentSummary
    });
  } catch (error) {
    logger.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refunding payment'
    });
  }
});

// Get order payment details
router.get('/:orderId/payments', authenticateToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .select('orderNumber total payments paymentSummary payment')
      .populate('payments.processedBy', 'firstName lastName')
      .populate('payments.refundedBy', 'firstName lastName')
      .populate('payments.voucherId', 'code discountType discountValue');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      orderNumber: order.orderNumber,
      total: order.total,
      payments: order.payments || [],
      paymentSummary: order.paymentSummary || {
        totalDue: order.total,
        totalPaid: order.payment?.status === 'paid' ? order.total : 0,
        totalOutstanding: order.payment?.status === 'paid' ? 0 : order.total,
        isFullyPaid: order.payment?.status === 'paid'
      },
      legacyPayment: order.payment
    });
  } catch (error) {
    logger.error('Get order payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment details'
    });
  }
});

// Generate invoice for order
router.get('/:orderId/invoice', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find order
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if order is shipped (fulfilled)
    if (order.status !== 'shipped' && order.status !== 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Invoice can only be generated for shipped or delivered orders'
      });
    }

    // Get HQ branch for invoice header (orders don't have specific branch)
    const branch = await Branch.findOne({ status: 'active' }).sort({ createdAt: 1 });

    if (!branch) {
      return res.status(500).json({
        success: false,
        message: 'No active branch found for invoice generation'
      });
    }

    // Generate invoice PDF
    const pdfBuffer = await invoiceGenerator.generateInvoice(order, branch, 'invoice', 'order');

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${order.orderNumber}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);

    // Send PDF
    res.send(pdfBuffer);

  } catch (error) {
    logger.error('Order invoice generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoice',
      error: error.message
    });
  }
});

module.exports = router;