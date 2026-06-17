// Order Controller - Extracted from routes/order.js
// All 22 handler functions as named exports

const logger = require('../modules/logger');
const Order = require('../modules/database/models/Order');
const Product = require('../modules/database/models/Product');
const User = require('../modules/database/models/User');
const Branch = require('../modules/database/models/Branch');
const invoiceGenerator = require('../services/invoiceGenerator');
const emailService = require('../services/emailService');
const config = require('../config');
const VAT_RATE = config.business.vatRate;

// Section 21 gate: an online order containing any medical (cannabis) item requires a verified patient.
// Wellness/lifestyle-only orders are never affected. Returns null if allowed, or an error payload if blocked.
async function section21Block(items, req) {
  try {
    const ids = (items || []).map(i => i.product || i.productId || i.id || i._id).filter(Boolean);
    if (!ids.length) return null;
    const prods = await Product.find({ _id: { $in: ids } }).select('track name').lean();
    const medical = prods.filter(p => p && p.track === 'medical');
    if (!medical.length) return null;
    let patient = null;
    const uid = req.user && (req.user.id || req.user._id);
    if (uid) patient = await User.findById(uid).select('section21Status').lean();
    if (!patient && req.body.customer && req.body.customer.email) {
      patient = await User.findOne({ email: String(req.body.customer.email).toLowerCase() }).select('section21Status').lean();
    }
    if (!patient || patient.section21Status !== 'approved') {
      return { code: 'SECTION21_REQUIRED', message: 'A verified Section 21 authorisation and prescription are required to order medical products.', medicalItems: medical.map(p => p.name) };
    }
    return null;
  } catch (e) { logger.error('section21Block', { error: e.message }); return null; }
}

// 1. Check payment status endpoint
exports.checkPaymentStatus = async (req, res) => {
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
};

// 2. Create order (with proof of payment upload) - Works for guests and logged-in users
exports.createOrder = async (req, res) => {
  try {
    const { orderNumber, customer, items, subtotal, shipping, total, payment, status } = req.body;

    // Section 21 gate — blocks medical items for unverified patients; wellness orders pass through.
    const _s21 = await section21Block(items, req);
    if (_s21) return res.status(403).json({ success: false, ..._s21 });

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
};

// 3. Guest checkout - creates user account + order in one call
exports.guestCheckout = async (req, res) => {
  try {
    const { customer, items, subtotal, shipping, total, payment, shippingAddress } = req.body;

    // Validate required fields
    if (!customer || !customer.email || !customer.firstName || !customer.lastName) {
      return res.status(400).json({
        success: false,
        message: 'Customer details required (firstName, lastName, email)'
      });
    }

    // Section 21 gate — guests can never order medical items (no verified Section 21).
    const _s21g = await section21Block(items, req);
    if (_s21g) return res.status(403).json({ success: false, ..._s21g });

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
};

// 4. Upload payment proof
exports.uploadProof = async (req, res) => {
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
};

// 5. Get user orders
exports.getMyOrders = async (req, res) => {
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
};

// 6. Admin/Staff: Get all orders (supports comma-separated statuses)
exports.getAllOrders = async (req, res) => {
  try {
    // Staff role check - includes packer and dispatch_manager
    const allowedRoles = ['admin', 'owner', 'branch_manager', 'branch_assistant', 'packer', 'dispatch_manager', 'inventory_manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Staff access required'
      });
    }

    const { limit = 50, status, paymentStatus } = req.query;

    const query = {};
    // Support comma-separated statuses (e.g., "confirmed,processing")
    if (status) {
      const statuses = status.split(',').map(s => s.trim());
      query.status = statuses.length > 1 ? { $in: statuses } : statuses[0];
    }
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
};

// 7. Admin: Approve payment by MongoDB _id
exports.approvePaymentById = async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin' && req.user.role !== 'branch_manager') {
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
};

// 8. Admin: Reject payment by MongoDB _id
exports.rejectPaymentById = async (req, res) => {
  try {
    // Admin check
    if (req.user.role !== 'admin' && req.user.role !== 'branch_manager') {
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

    // RESTORE INVENTORY - Add back stock that was deducted when order was created
    let inventoryRestored = 0;
    for (const item of order.items) {
      const productId = item.product || item.productId;
      const quantity = item.quantity;

      if (productId && quantity > 0) {
        try {
          const product = await Product.findById(productId);
          if (product && product.inventory) {
            product.inventory.quantity += quantity;
            await product.save();
            inventoryRestored++;
            logger.info(`Inventory restored: ${item.name} (+${quantity} units) - Order ${order.orderNumber} rejected`);
          }
        } catch (err) {
          logger.error(`Inventory restoration failed for ${item.name}:`, err);
        }
      }
    }

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'cancelled',
      note: `Payment rejected: ${reason}. Inventory restored for ${inventoryRestored} items.`,
      updatedBy: req.user.id,
      updatedAt: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: `Payment rejected. Inventory restored for ${inventoryRestored} items.`,
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
};

// 9. Admin: Approve payment (by orderNumber)
exports.approvePayment = async (req, res) => {
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
};

// 10. Admin: Reject payment (by orderNumber)
exports.rejectPayment = async (req, res) => {
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

    // RESTORE INVENTORY - Add back stock that was deducted when order was created
    let inventoryRestored = 0;
    for (const item of order.items) {
      const productId = item.product || item.productId;
      const quantity = item.quantity;

      if (productId && quantity > 0) {
        try {
          const product = await Product.findById(productId);
          if (product && product.inventory) {
            product.inventory.quantity += quantity;
            await product.save();
            inventoryRestored++;
            logger.info(`Inventory restored: ${item.name} (+${quantity} units) - Order ${order.orderNumber} rejected`);
          }
        } catch (err) {
          logger.error(`Inventory restoration failed for ${item.name}:`, err);
        }
      }
    }

    await order.save();

    res.json({
      success: true,
      message: `Payment rejected. Inventory restored for ${inventoryRestored} items.`
    });
  } catch (error) {
    logger.error('Payment rejection error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting payment'
    });
  }
};

// 11. Generate invoice for order
exports.getInvoice = async (req, res) => {
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
};

// 12. Create order with split payments
exports.createSplitPaymentOrder = async (req, res) => {
  try {
    const { customer, items, subtotal, shipping, total, payments, shippingAddress } = req.body;

    // Validate payments array
    if (!payments || !Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one payment method is required'
      });
    }

    // Validate total paid matches order total
    const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    if (Math.abs(totalPaid - total) > 0.01) {  // Allow small floating point variance
      return res.status(400).json({
        success: false,
        message: `Payment total (R${totalPaid}) does not match order total (R${total})`
      });
    }

    // Create order with split payments
    const order = new Order({
      orderNumber: `Origin-${Date.now()}`,
      user: req.user?.id || null,
      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      },
      shippingAddress: shippingAddress,
      items: items.map(item => ({
        product: item.productId || item.product,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal || item.price * item.quantity
      })),
      subtotal,
      shipping: shipping || { method: 'standard', cost: 0 },
      total,
      payments: payments.map(p => ({
        method: p.method,
        amount: p.amount,
        reference: p.reference,
        status: p.status || 'completed',
        processedAt: new Date(),
        processedBy: req.user?.id
      })),
      status: 'confirmed'
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
          }
        } catch (err) {
          logger.error(`Inventory deduction failed for ${item.name}:`, err);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Order created with split payments',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        payments: order.payments,
        paymentSummary: order.paymentSummary
      }
    });
  } catch (error) {
    logger.error('Split payment order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message
    });
  }
};

// 13. Add payment to existing order
exports.addPayment = async (req, res) => {
  try {
    // Staff check
    const staffRoles = ['admin', 'owner', 'branch_manager', 'branch_assistant'];
    if (!staffRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Staff access required'
      });
    }

    const { orderId } = req.params;
    const { method, amount, reference } = req.body;

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

    // Add payment using instance method
    await order.addPayment({
      method,
      amount,
      reference,
      processedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Payment added successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        payments: order.payments,
        paymentSummary: order.paymentSummary
      }
    });
  } catch (error) {
    logger.error('Add payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error adding payment'
    });
  }
};

// 14. Refund specific payment
exports.refundPayment = async (req, res) => {
  try {
    // Manager/admin check
    if (req.user.role !== 'admin' && req.user.role !== 'owner' && req.user.role !== 'branch_manager') {
      return res.status(403).json({
        success: false,
        message: 'Manager or admin access required'
      });
    }

    const { orderId } = req.params;
    const { paymentIndex, amount, reason } = req.body;

    if (paymentIndex === undefined || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment index and refund amount are required'
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Refund using instance method
    await order.refundPayment(paymentIndex, amount, reason);

    // Add to status history
    order.statusHistory.push({
      status: order.status,
      note: `Refund of R${amount} processed: ${reason}`,
      updatedBy: req.user.id,
      timestamp: new Date()
    });
    await order.save();

    res.json({
      success: true,
      message: `Refund of R${amount} processed successfully`,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        payments: order.payments,
        paymentSummary: order.paymentSummary
      }
    });
  } catch (error) {
    logger.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error processing refund'
    });
  }
};

// 15. Get payment breakdown for order
exports.getPaymentBreakdown = async (req, res) => {
  try {
    const { orderId } = req.params;
    const breakdown = await Order.getPaymentBreakdown(orderId);

    if (!breakdown) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      breakdown
    });
  } catch (error) {
    logger.error('Get payment breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment breakdown'
    });
  }
};

// 16. Update all line items in an order
exports.updateItems = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'owner', 'branch_manager', 'branch_assistant'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Staff access required'
      });
    }

    const { id } = req.params;
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required and must not be empty'
      });
    }

    // Try to find by _id first, then by orderNumber
    let order = await Order.findById(id).catch(() => null);
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow editing pending or processing orders
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit orders with status '${order.status}'. Only pending or processing orders can be edited.`
      });
    }

    // Restore old inventory
    for (const item of order.items) {
      const productId = item.product || item.productId;
      if (productId) {
        try {
          const product = await Product.findById(productId);
          if (product && product.inventory) {
            product.inventory.quantity += item.quantity;
            await product.save();
            logger.info(`Inventory restored: ${item.name} (+${item.quantity} units) - Order ${order.orderNumber} edited`);
          }
        } catch (err) {
          logger.error(`Inventory restoration failed for ${item.name}:`, err);
        }
      }
    }

    // Update items with validation
    const updatedItems = items.map(item => {
      const productId = item.product || item.productId;
      return {
        product: productId,
        name: item.name,
        sku: item.sku || '',
        price: item.price,
        quantity: item.quantity,
        size: item.size || '',
        color: item.color || '',
        subtotal: item.subtotal || item.price * item.quantity
      };
    });

    // Deduct new inventory
    for (const item of updatedItems) {
      const productId = item.product;
      if (productId) {
        try {
          const product = await Product.findById(productId);
          if (!product || !product.inventory || product.inventory.quantity < item.quantity) {
            // Restore what we just restored
            for (const restoreItem of order.items) {
              const restoreProdId = restoreItem.product || restoreItem.productId;
              if (restoreProdId) {
                const restoreProd = await Product.findById(restoreProdId);
                if (restoreProd && restoreProd.inventory) {
                  restoreProd.inventory.quantity += restoreItem.quantity;
                  await restoreProd.save();
                }
              }
            }
            return res.status(400).json({
              success: false,
              message: `Insufficient inventory for ${item.name}`
            });
          }
          product.inventory.quantity -= item.quantity;
          await product.save();
          logger.info(`Inventory deducted: ${item.name} (${item.quantity} units) - Order ${order.orderNumber} edited`);
        } catch (err) {
          logger.error(`Inventory deduction failed for ${item.name}:`, err);
          return res.status(400).json({
            success: false,
            message: `Product validation failed for ${item.name}`
          });
        }
      }
    }

    // Recalculate totals
    const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const taxAmount = newSubtotal * (order.tax?.rate || VAT_RATE);
    const newTotal = newSubtotal + (order.shipping?.cost || 0) + taxAmount - (order.discount?.amount || 0);

    order.items = updatedItems;
    order.subtotal = newSubtotal;
    order.tax = order.tax || {};
    order.tax.amount = taxAmount;
    order.total = newTotal;

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.status,
      note: `Line items edited. Total updated to R${newTotal.toFixed(2)}`,
      updatedBy: req.user.id,
      timestamp: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order items updated successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        status: order.status
      }
    });
  } catch (error) {
    logger.error('Order items update error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating order items',
      error: error.message
    });
  }
};

// 17. Swap or edit a single line item by index
exports.swapItem = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'owner', 'branch_manager', 'branch_assistant'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Staff access required'
      });
    }

    const { id, itemIndex } = req.params;
    const { product, name, sku, price, quantity, size, color } = req.body;

    if (!product || !name || !price || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Product, name, price, and quantity are required'
      });
    }

    const index = parseInt(itemIndex);
    if (isNaN(index) || index < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item index'
      });
    }

    // Try to find by _id first, then by orderNumber
    let order = await Order.findById(id).catch(() => null);
    if (!order) {
      order = await Order.findOne({ orderNumber: id });
    }
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Only allow editing pending or processing orders
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit orders with status '${order.status}'. Only pending or processing orders can be edited.`
      });
    }

    if (index >= order.items.length) {
      return res.status(404).json({
        success: false,
        message: `Item at index ${index} not found`
      });
    }

    // Get old item for inventory restoration
    const oldItem = order.items[index];
    const oldProductId = oldItem.product || oldItem.productId;

    // Restore old item inventory
    if (oldProductId) {
      try {
        const oldProduct = await Product.findById(oldProductId);
        if (oldProduct && oldProduct.inventory) {
          oldProduct.inventory.quantity += oldItem.quantity;
          await oldProduct.save();
          logger.info(`Inventory restored: ${oldItem.name} (+${oldItem.quantity} units) - Order ${order.orderNumber} item swapped`);
        }
      } catch (err) {
        logger.error(`Inventory restoration failed for ${oldItem.name}:`, err);
      }
    }

    // Validate new product exists and has inventory
    try {
      const newProduct = await Product.findById(product);
      if (!newProduct) {
        return res.status(404).json({
          success: false,
          message: 'New product not found'
        });
      }

      if (!newProduct.inventory || newProduct.inventory.quantity < quantity) {
        // Restore old inventory
        if (oldProductId) {
          const oldProduct = await Product.findById(oldProductId);
          if (oldProduct && oldProduct.inventory) {
            oldProduct.inventory.quantity += oldItem.quantity;
            await oldProduct.save();
          }
        }
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for ${name}. Available: ${newProduct.inventory?.quantity || 0}`
        });
      }

      // Deduct new inventory
      newProduct.inventory.quantity -= quantity;
      await newProduct.save();
      logger.info(`Inventory deducted: ${name} (${quantity} units) - Order ${order.orderNumber} item swapped`);
    } catch (err) {
      logger.error(`Product validation failed for ${product}:`, err);
      return res.status(400).json({
        success: false,
        message: 'Product validation failed'
      });
    }

    // Update item at index
    const newSubtotal = price * quantity;
    order.items[index] = {
      product,
      name,
      sku: sku || '',
      price,
      quantity,
      size: size || '',
      color: color || '',
      subtotal: newSubtotal
    };

    // Recalculate order totals
    const orderSubtotal = order.items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
    const taxAmount = orderSubtotal * (order.tax?.rate || VAT_RATE);
    const orderTotal = orderSubtotal + (order.shipping?.cost || 0) + taxAmount - (order.discount?.amount || 0);

    order.subtotal = orderSubtotal;
    order.tax = order.tax || {};
    order.tax.amount = taxAmount;
    order.total = orderTotal;

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: order.status,
      note: `Item ${index} swapped: ${oldItem.name} -> ${name}. Order total: R${orderTotal.toFixed(2)}`,
      updatedBy: req.user.id,
      timestamp: new Date()
    });

    await order.save();

    res.json({
      success: true,
      message: `Item at index ${index} updated successfully`,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        items: order.items,
        subtotal: order.subtotal,
        tax: order.tax,
        shipping: order.shipping,
        total: order.total,
        status: order.status
      }
    });
  } catch (error) {
    logger.error('Order item swap error:', error);
    res.status(500).json({
      success: false,
      message: 'Error swapping order item',
      error: error.message
    });
  }
};

// 18. Start packing an order
exports.startPacking = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'owner', 'branch_manager', 'packer'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Packer access required' });
    }

    // Try to find by _id first, then by orderNumber
    let order = await Order.findById(req.params.orderId).catch(() => null);
    if (!order) {
      order = await Order.findOne({ orderNumber: req.params.orderId });
    }
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'confirmed') {
      return res.status(400).json({ success: false, message: 'Order must be confirmed to start packing' });
    }

    order.status = 'processing';
    order.packingStartedAt = new Date();
    order.packingStartedBy = req.user.id;
    await order.save();

    logger.info(`Order ${order.orderId} packing started by ${req.user.email}`);

    res.json({ success: true, message: 'Packing started', order });
  } catch (error) {
    logger.error('Start packing error:', error);
    res.status(500).json({ success: false, message: 'Error starting packing' });
  }
};

// 19. Complete packing (move to packed status)
exports.completePacking = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'owner', 'branch_manager', 'packer'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Packer access required' });
    }

    const { packingNotes, photoUrl } = req.body;

    // Try to find by _id first, then by orderNumber
    let order = await Order.findById(req.params.orderId).catch(() => null);
    if (!order) {
      order = await Order.findOne({ orderNumber: req.params.orderId });
    }
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'processing') {
      return res.status(400).json({ success: false, message: 'Order must be processing to complete packing' });
    }

    order.status = 'packed';
    order.packedAt = new Date();
    order.packedBy = req.user.id;
    if (packingNotes) order.packingNotes = packingNotes;
    if (photoUrl) order.packingPhotoUrl = photoUrl;
    await order.save();

    logger.info(`Order ${order.orderId} packed by ${req.user.email}`);

    res.json({ success: true, message: 'Packing completed', order });
  } catch (error) {
    logger.error('Complete packing error:', error);
    res.status(500).json({ success: false, message: 'Error completing packing' });
  }
};

// 20. Dispatch order (assign courier and mark dispatched)
exports.dispatch = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'owner', 'branch_manager', 'dispatch_manager', 'dispatch', 'driver', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Dispatch access required' });
    }

    const { courier, trackingNumber, dispatchNotes } = req.body;

    // Try to find by _id first, then by orderNumber
    let order = await Order.findById(req.params.orderId).catch(() => null);
    if (!order) {
      order = await Order.findOne({ orderNumber: req.params.orderId });
    }
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'packed') {
      return res.status(400).json({ success: false, message: 'Order must be packed to dispatch' });
    }

    order.status = 'dispatched';
    order.dispatchedAt = new Date();
    order.dispatchedBy = req.user.id;
    if (courier) order.courier = courier;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (dispatchNotes) order.dispatchNotes = dispatchNotes;
    await order.save();

    logger.info(`Order ${order.orderId} dispatched by ${req.user.email} via ${courier || 'unknown courier'}`);

    res.json({ success: true, message: 'Order dispatched', order });
  } catch (error) {
    logger.error('Dispatch error:', error);
    res.status(500).json({ success: false, message: 'Error dispatching order', error: error.message });
  }
};

// 21. Mark order as delivered
exports.deliver = async (req, res) => {
  try {
    const allowedRoles = ['admin', 'owner', 'branch_manager', 'dispatch_manager', 'dispatch', 'driver', 'manager'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Dispatch access required' });
    }

    const { deliveryNotes, signatureUrl, deliveryPhotoUrl } = req.body;

    // Try to find by _id first, then by orderNumber
    let order = await Order.findById(req.params.orderId).catch(() => null);
    if (!order) {
      order = await Order.findOne({ orderNumber: req.params.orderId });
    }
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.status !== 'dispatched') {
      return res.status(400).json({ success: false, message: 'Order must be dispatched to mark delivered' });
    }

    order.status = 'delivered';
    order.deliveredAt = new Date();
    order.deliveredBy = req.user.id;
    if (deliveryNotes) order.deliveryNotes = deliveryNotes;
    if (signatureUrl) order.deliverySignatureUrl = signatureUrl;
    if (deliveryPhotoUrl) order.deliveryPhotoUrl = deliveryPhotoUrl;
    await order.save();

    logger.info(`Order ${order.orderId} delivered - confirmed by ${req.user.email}`);

    res.json({ success: true, message: 'Order delivered', order });
  } catch (error) {
    logger.error('Deliver error:', error);
    res.status(500).json({ success: false, message: 'Error marking delivered' });
  }
};

// 22. Get order by ID (for PND staff)
exports.getOrder = async (req, res) => {
  try {
    // Try to find by _id first, then by orderNumber
    let order = await Order.findById(req.params.orderId)
      .populate('user', 'email firstName lastName phone')
      .populate('packedBy', 'firstName lastName')
      .populate('dispatchedBy', 'firstName lastName')
      .catch(() => null);

    if (!order) {
      order = await Order.findOne({ orderNumber: req.params.orderId })
        .populate('user', 'email firstName lastName phone')
        .populate('packedBy', 'firstName lastName')
        .populate('dispatchedBy', 'firstName lastName');
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.json({ success: true, order });
  } catch (error) {
    logger.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order' });
  }
};
