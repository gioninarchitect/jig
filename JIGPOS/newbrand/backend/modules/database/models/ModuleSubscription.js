/**
 * Module Subscription Model
 * Tracks which modules each merchant has subscribed to and their billing status
 */

const mongoose = require('mongoose');

const moduleSubscriptionSchema = new mongoose.Schema({
  // Merchant/User who subscribed
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Module details
  moduleId: {
    type: String,
    required: true,
    enum: [
      'section21',          // R2,999/month
      'viral-influencer',   // R499/month
      'retail-store',      // R299/month
      'affiliate',          // R249/month
      'loyalty',            // R199/month
      'vouchers'            // R149/month
    ],
    index: true
  },

  moduleName: {
    type: String,
    required: true
  },

  // Pricing
  monthlyAmount: {
    type: Number,
    required: true
  },

  // Subscription status
  status: {
    type: String,
    enum: [
      'trial',              // 7-day trial active
      'active',             // Paying subscription
      'pending_activation', // Waiting for first payment
      'payment_failed',     // Debit order failed
      'suspended',          // Admin suspended
      'cancelled'           // User cancelled
    ],
    default: 'trial',
    index: true
  },

  // Trial period
  trialStartDate: {
    type: Date,
    default: Date.now
  },

  trialEndDate: {
    type: Date,
    default: function() {
      const date = new Date();
      date.setDate(date.getDate() + 7); // 7-day trial
      return date;
    }
  },

  // Billing dates
  subscriptionStartDate: {
    type: Date // When first payment was made (after trial)
  },

  nextBillingDate: {
    type: Date
  },

  lastBillingDate: {
    type: Date
  },

  cancelledAt: {
    type: Date
  },

  // Payment provider details
  paymentProvider: {
    type: String,
    default: 'payu'
  },

  subscriptionReference: {
    type: String, // PayU subscription ID
    unique: true,
    sparse: true
  },

  // Billing history
  billingHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['success', 'failed', 'pending'],
      required: true
    },
    paymentReference: String,
    failureReason: String
  }],

  // Failed payment tracking
  failedPaymentCount: {
    type: Number,
    default: 0
  },

  lastFailedPaymentDate: {
    type: Date
  },

  // Grace period (3 days after failed payment before suspension)
  gracePeriodEndDate: {
    type: Date
  },

  // Metadata
  notes: String,

  cancelReason: String,

  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Compound index for user + module (user can only have one subscription per module)
moduleSubscriptionSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

// Index for finding subscriptions that need billing
moduleSubscriptionSchema.index({ nextBillingDate: 1, status: 1 });

// ============================================================================
// METHODS
// ============================================================================

/**
 * Check if subscription is in trial period
 */
moduleSubscriptionSchema.methods.isInTrial = function() {
  const now = new Date();
  return this.status === 'trial' && now < this.trialEndDate;
};

/**
 * Check if subscription is active (trial or paid)
 */
moduleSubscriptionSchema.methods.isActive = function() {
  return ['trial', 'active'].includes(this.status);
};

/**
 * Activate subscription after trial (first payment successful)
 */
moduleSubscriptionSchema.methods.activate = async function(paymentReference) {
  this.status = 'active';
  this.subscriptionStartDate = new Date();
  this.nextBillingDate = this.calculateNextBillingDate();

  this.billingHistory.push({
    date: new Date(),
    amount: this.monthlyAmount,
    status: 'success',
    paymentReference
  });

  await this.save();
  return this;
};

/**
 * Record successful payment
 */
moduleSubscriptionSchema.methods.recordPayment = async function(paymentReference) {
  this.lastBillingDate = new Date();
  this.nextBillingDate = this.calculateNextBillingDate();
  this.failedPaymentCount = 0; // Reset failure count
  this.gracePeriodEndDate = null;

  if (this.status === 'payment_failed') {
    this.status = 'active';
  }

  this.billingHistory.push({
    date: new Date(),
    amount: this.monthlyAmount,
    status: 'success',
    paymentReference
  });

  await this.save();
  return this;
};

/**
 * Record failed payment
 */
moduleSubscriptionSchema.methods.recordFailedPayment = async function(failureReason) {
  this.failedPaymentCount += 1;
  this.lastFailedPaymentDate = new Date();
  this.status = 'payment_failed';

  // Set 3-day grace period
  const gracePeriodEnd = new Date();
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 3);
  this.gracePeriodEndDate = gracePeriodEnd;

  this.billingHistory.push({
    date: new Date(),
    amount: this.monthlyAmount,
    status: 'failed',
    failureReason
  });

  await this.save();
  return this;
};

/**
 * Suspend subscription (after grace period or admin action)
 */
moduleSubscriptionSchema.methods.suspend = async function(reason) {
  this.status = 'suspended';
  this.notes = (this.notes || '') + `\nSuspended: ${reason} (${new Date().toISOString()})`;
  await this.save();
  return this;
};

/**
 * Cancel subscription
 */
moduleSubscriptionSchema.methods.cancel = async function(userId, reason) {
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancelReason = reason;
  await this.save();
  return this;
};

/**
 * Calculate next billing date (1 month from now)
 */
moduleSubscriptionSchema.methods.calculateNextBillingDate = function() {
  const nextDate = new Date(this.subscriptionStartDate || Date.now());
  nextDate.setMonth(nextDate.getMonth() + 1);
  return nextDate;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get active modules for a user
 */
moduleSubscriptionSchema.statics.getActiveModules = async function(userId) {
  return this.find({
    userId,
    status: { $in: ['trial', 'active'] }
  });
};

/**
 * Check if user has access to a specific module
 */
moduleSubscriptionSchema.statics.hasModuleAccess = async function(userId, moduleId) {
  const subscription = await this.findOne({
    userId,
    moduleId,
    status: { $in: ['trial', 'active'] }
  });

  return !!subscription;
};

/**
 * Get subscriptions that need billing (due today or overdue)
 */
moduleSubscriptionSchema.statics.getDueBillings = async function() {
  const now = new Date();

  return this.find({
    status: 'active',
    nextBillingDate: { $lte: now }
  });
};

/**
 * Get subscriptions in grace period
 */
moduleSubscriptionSchema.statics.getGracePeriodSubscriptions = async function() {
  const now = new Date();

  return this.find({
    status: 'payment_failed',
    gracePeriodEndDate: { $lte: now }
  });
};

module.exports = mongoose.model('ModuleSubscription', moduleSubscriptionSchema);
