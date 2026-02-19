/**
 * Module Subscription Routes
 * Handles subscription to paid modules with 7-day trial and recurring billing
 */

const express = require('express');
const router = express.Router();
const ModuleSubscription = require('../modules/database/models/ModuleSubscription');
const User = require('../modules/database/models/User');
const paymentService = require('../modules/payment/service');
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const logger = require('../modules/logger');

// Module pricing configuration
const MODULE_PRICING = {
  'section21': {
    name: 'Section 21 Compliance (Zaya Health)',
    price: 2999,
    description: 'Legal Section 21 medical cannabis compliance system'
  },
  'viral-influencer': {
    name: 'Viral Influencer Marketing',
    price: 499,
    description: 'AI-powered influencer verification and campaign management'
  },
  'drive-through': {
    name: 'Drive-Through Orders',
    price: 2999,
    description: 'GPS-enabled order-ahead system with staff queue management'
  },
  'affiliate': {
    name: 'Affiliate Marketing',
    price: 249,
    description: 'Commission-based affiliate program with tracking'
  },
  'loyalty': {
    name: 'Loyalty Points & Tiers',
    price: 199,
    description: 'Gamified loyalty system with custom tier benefits'
  },
  'vouchers': {
    name: 'Vouchers & Coupons',
    price: 149,
    description: 'Advanced voucher system with analytics'
  }
};

// ============================================================================
// PUBLIC ROUTES - Module Catalog
// ============================================================================

// GET /api/v1/subscriptions/modules - List available modules
router.get('/modules', async (req, res) => {
  try {
    const modules = Object.keys(MODULE_PRICING).map(moduleId => ({
      id: moduleId,
      ...MODULE_PRICING[moduleId]
    }));

    res.json({
      success: true,
      modules
    });
  } catch (error) {
    logger.error('Get modules error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching modules'
    });
  }
});

// ============================================================================
// USER ROUTES - Subscription Management
// ============================================================================

// GET /api/v1/subscriptions/my - Get user's active subscriptions
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const subscriptions = await ModuleSubscription.find({
      userId: req.user.id,
      status: { $in: ['trial', 'active', 'payment_failed'] }
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    logger.error('Get user subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching subscriptions'
    });
  }
});

// POST /api/v1/subscriptions/subscribe - Subscribe to a module
router.post('/subscribe', authenticateToken, async (req, res) => {
  try {
    const { moduleId } = req.body;

    // Validate module
    if (!MODULE_PRICING[moduleId]) {
      return res.status(400).json({
        success: false,
        error: 'Invalid module ID'
      });
    }

    // Check if already subscribed
    const existing = await ModuleSubscription.findOne({
      userId: req.user.id,
      moduleId,
      status: { $in: ['trial', 'active', 'pending_activation'] }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'Already subscribed to this module'
      });
    }

    // Get user details
    const user = await User.findById(req.user.id);

    // Create subscription in PayU (with 7-day trial)
    const paymentResult = await paymentService.createModuleSubscription({
      userId: req.user.id,
      moduleId,
      moduleName: MODULE_PRICING[moduleId].name,
      monthlyAmount: MODULE_PRICING[moduleId].price,
      trialDays: 7,
      customerEmail: user.email,
      customerPhone: user.phone || user.mobile
    });

    // Create subscription record in database
    const subscription = new ModuleSubscription({
      userId: req.user.id,
      moduleId,
      moduleName: MODULE_PRICING[moduleId].name,
      monthlyAmount: MODULE_PRICING[moduleId].price,
      status: 'trial', // Starts in trial
      subscriptionReference: paymentResult.subscriptionId
    });

    await subscription.save();

    logger.info('Module subscription created', {
      userId: req.user.id,
      moduleId,
      subscriptionId: paymentResult.subscriptionId
    });

    res.json({
      success: true,
      message: `7-day free trial started for ${MODULE_PRICING[moduleId].name}`,
      subscription: {
        id: subscription._id,
        moduleId: subscription.moduleId,
        moduleName: subscription.moduleName,
        status: subscription.status,
        trialEndDate: subscription.trialEndDate,
        monthlyAmount: subscription.monthlyAmount
      },
      payment: {
        paymentUrl: paymentResult.paymentUrl, // For setting up debit order
        subscriptionId: paymentResult.subscriptionId
      }
    });
  } catch (error) {
    logger.error('Subscribe to module error:', error);
    res.status(500).json({
      success: false,
      error: 'Error creating subscription',
      details: error.message
    });
  }
});

// POST /api/v1/subscriptions/:id/cancel - Cancel subscription
router.post('/:id/cancel', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await ModuleSubscription.findById(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    // Verify ownership
    if (subscription.userId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to cancel this subscription'
      });
    }

    // Cancel in payment provider
    if (subscription.subscriptionReference) {
      await paymentService.cancelModuleSubscription(subscription.subscriptionReference);
    }

    // Cancel in database
    await subscription.cancel(req.user.id, reason || 'User requested cancellation');

    logger.info('Subscription cancelled', {
      userId: req.user.id,
      subscriptionId: id
    });

    res.json({
      success: true,
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    logger.error('Cancel subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Error cancelling subscription'
    });
  }
});

// GET /api/v1/subscriptions/:moduleId/check - Check if user has access to module
router.get('/:moduleId/check', authenticateToken, async (req, res) => {
  try {
    const { moduleId } = req.params;

    const hasAccess = await ModuleSubscription.hasModuleAccess(req.user.id, moduleId);

    res.json({
      success: true,
      moduleId,
      hasAccess
    });
  } catch (error) {
    logger.error('Check module access error:', error);
    res.status(500).json({
      success: false,
      error: 'Error checking access'
    });
  }
});

// ============================================================================
// WEBHOOK ROUTE - Payment Notifications from PayU
// ============================================================================

// POST /api/v1/subscriptions/webhook/payu - Handle PayU webhook notifications
router.post('/webhook/payu', async (req, res) => {
  try {
    const webhookData = req.body;

    logger.info('PayU webhook received', { data: webhookData });

    // Verify webhook authenticity
    const isValid = await paymentService.providers.payu.verifyWebhook(webhookData, req.headers);
    if (!isValid) {
      logger.warn('Invalid PayU webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Process webhook
    const processed = await paymentService.providers.payu.processWebhook(webhookData);

    // Find subscription by reference
    const subscription = await ModuleSubscription.findOne({
      subscriptionReference: processed.reference
    });

    if (!subscription) {
      logger.warn('Subscription not found for webhook', { reference: processed.reference });
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Handle payment status
    if (processed.status === 'success') {
      if (subscription.status === 'trial' || subscription.status === 'pending_activation') {
        // First payment after trial - activate subscription
        await subscription.activate(processed.reference);
        logger.info('Subscription activated', { subscriptionId: subscription._id });
      } else {
        // Recurring payment successful
        await subscription.recordPayment(processed.reference);
        logger.info('Subscription payment recorded', { subscriptionId: subscription._id });
      }
    } else if (processed.status === 'failed') {
      // Payment failed
      await subscription.recordFailedPayment(webhookData.FailureReason || 'Payment declined');
      logger.warn('Subscription payment failed', {
        subscriptionId: subscription._id,
        reason: webhookData.FailureReason
      });
    }

    res.json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
});

// ============================================================================
// ADMIN ROUTES - Subscription Management
// ============================================================================

// GET /api/v1/subscriptions/admin/all - List all subscriptions (admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, moduleId, page = 1, limit = 50 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (moduleId) query.moduleId = moduleId;

    const subscriptions = await ModuleSubscription.find(query)
      .populate('userId', 'email firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await ModuleSubscription.countDocuments(query);

    res.json({
      success: true,
      subscriptions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Admin get subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: 'Error fetching subscriptions'
    });
  }
});

// POST /api/v1/subscriptions/admin/:id/suspend - Suspend subscription (admin only)
router.post('/admin/:id/suspend', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const subscription = await ModuleSubscription.findById(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found'
      });
    }

    await subscription.suspend(reason || 'Admin suspension');

    logger.info('Subscription suspended by admin', {
      adminId: req.user.id,
      subscriptionId: id
    });

    res.json({
      success: true,
      message: 'Subscription suspended'
    });
  } catch (error) {
    logger.error('Admin suspend subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Error suspending subscription'
    });
  }
});

module.exports = router;
