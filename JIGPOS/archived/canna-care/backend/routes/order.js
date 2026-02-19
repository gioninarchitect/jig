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
      items: items.map(item => ({
        product: item.product || item.productId,
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.subtotal || item.price * item.quantity
      })),
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
      order.payment.proofOfPayment.verifiedBy = req.user._id;
      order.payment.proofOfPayment.verifiedAt = new Date();
    }
    order.payment.paidAt = new Date();
    order.status = 'processing';

    // Add to status history
    if (!order.statusHistory) order.statusHistory = [];
    order.statusHistory.push({
      status: 'processing',
      note: 'Payment approved by admin',
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await order.save();

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
      updatedBy: req.user._id,
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
    order.payment.approvedBy = req.user._id;
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
    order.payment.rejectedBy = req.user._id;
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