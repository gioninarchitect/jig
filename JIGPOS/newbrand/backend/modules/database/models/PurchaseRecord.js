// Purchase Record Model - Patient purchase history for limit tracking
const mongoose = require('mongoose');

const purchaseRecordSchema = new mongoose.Schema({
  // Patient Reference
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Order Reference
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },

  // Sale Reference (for POS sales)
  sale: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale'
  },

  // Branch where purchase was made
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },

  // Staff who processed the sale
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Products Purchased
  products: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    productSku: String,
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    },
    batchId: String,
    quantity: {
      type: Number,
      required: true
    },
    quantityInGrams: {
      type: Number,
      required: true
    },
    unitOfMeasure: {
      type: String,
      default: 'grams'
    },
    isControlled: {
      type: Boolean,
      default: false
    },
    category: String,
    price: Number
  }],

  // Totals
  totalControlledGrams: {
    type: Number,
    required: true,
    default: 0,
    index: true
  },
  totalNonControlledGrams: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },

  // Purchase Date (for limit calculations)
  purchaseDate: {
    type: Date,
    default: Date.now,
    index: true
  },

  // Limit Check at Time of Purchase
  limitCheck: {
    dailyLimitAtTime: Number,
    monthlyLimitAtTime: Number,
    dailyUsageBeforePurchase: Number,
    monthlyUsageBeforePurchase: Number,
    dailyUsageAfterPurchase: Number,
    monthlyUsageAfterPurchase: Number,
    wasApproached: Boolean, // Was close to limit
    wasOverridden: Boolean, // Staff override used
    overriddenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    overrideReason: String
  },

  // Voided/Cancelled
  isVoided: {
    type: Boolean,
    default: false
  },
  voidedAt: Date,
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  voidReason: String,

  // Notes
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient limit queries
purchaseRecordSchema.index({ patient: 1, purchaseDate: -1 });
purchaseRecordSchema.index({ patient: 1, purchaseDate: 1, isVoided: 1 });
purchaseRecordSchema.index({ branch: 1, purchaseDate: -1 });

// Static method to get patient's usage for a date range
purchaseRecordSchema.statics.getPatientUsage = async function(patientId, startDate, endDate) {
  const result = await this.aggregate([
    {
      $match: {
        patient: new mongoose.Types.ObjectId(patientId),
        purchaseDate: {
          $gte: startDate,
          $lte: endDate
        },
        isVoided: { $ne: true }
      }
    },
    {
      $group: {
        _id: null,
        totalControlledGrams: { $sum: '$totalControlledGrams' },
        totalPurchases: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' }
      }
    }
  ]);

  return result[0] || { totalControlledGrams: 0, totalPurchases: 0, totalAmount: 0 };
};

// Static method to get daily usage
purchaseRecordSchema.statics.getDailyUsage = async function(patientId, date = new Date()) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.getPatientUsage(patientId, startOfDay, endOfDay);
};

// Static method to get monthly usage
purchaseRecordSchema.statics.getMonthlyUsage = async function(patientId, date = new Date()) {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
  const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

  return this.getPatientUsage(patientId, startOfMonth, endOfMonth);
};

// Static method to check if purchase is within limits
purchaseRecordSchema.statics.checkPurchaseLimits = async function(patientId, requestedGrams, limits) {
  const dailyUsage = await this.getDailyUsage(patientId);
  const monthlyUsage = await this.getMonthlyUsage(patientId);

  const dailyLimit = limits?.dailyLimit || 150;
  const monthlyLimit = limits?.monthlyLimit || 600;

  const dailyAfterPurchase = dailyUsage.totalControlledGrams + requestedGrams;
  const monthlyAfterPurchase = monthlyUsage.totalControlledGrams + requestedGrams;

  const result = {
    canPurchase: true,
    warnings: [],
    errors: [],
    usage: {
      daily: {
        current: dailyUsage.totalControlledGrams,
        afterPurchase: dailyAfterPurchase,
        limit: dailyLimit,
        remaining: dailyLimit - dailyUsage.totalControlledGrams
      },
      monthly: {
        current: monthlyUsage.totalControlledGrams,
        afterPurchase: monthlyAfterPurchase,
        limit: monthlyLimit,
        remaining: monthlyLimit - monthlyUsage.totalControlledGrams
      }
    }
  };

  // Check daily limit
  if (dailyAfterPurchase > dailyLimit) {
    result.canPurchase = false;
    result.errors.push({
      type: 'daily_limit_exceeded',
      message: `Daily limit exceeded. Current: ${dailyUsage.totalControlledGrams}g, Requested: ${requestedGrams}g, Limit: ${dailyLimit}g`
    });
  } else if (dailyAfterPurchase > dailyLimit * 0.8) {
    result.warnings.push({
      type: 'approaching_daily_limit',
      message: `Approaching daily limit. After purchase: ${dailyAfterPurchase}g / ${dailyLimit}g`
    });
  }

  // Check monthly limit
  if (monthlyAfterPurchase > monthlyLimit) {
    result.canPurchase = false;
    result.errors.push({
      type: 'monthly_limit_exceeded',
      message: `Monthly limit exceeded. Current: ${monthlyUsage.totalControlledGrams}g, Requested: ${requestedGrams}g, Limit: ${monthlyLimit}g`
    });
  } else if (monthlyAfterPurchase > monthlyLimit * 0.8) {
    result.warnings.push({
      type: 'approaching_monthly_limit',
      message: `Approaching monthly limit. After purchase: ${monthlyAfterPurchase}g / ${monthlyLimit}g`
    });
  }

  return result;
};

// Static method to get patient purchase history with pagination
purchaseRecordSchema.statics.getPatientHistory = function(patientId, options = {}) {
  const { page = 1, limit = 20, startDate, endDate } = options;

  const query = {
    patient: patientId,
    isVoided: { $ne: true }
  };

  if (startDate || endDate) {
    query.purchaseDate = {};
    if (startDate) query.purchaseDate.$gte = startDate;
    if (endDate) query.purchaseDate.$lte = endDate;
  }

  return this.find(query)
    .populate('branch', 'name branchCode')
    .populate('processedBy', 'firstName lastName')
    .populate('products.product', 'name sku')
    .populate('products.batch', 'batchId')
    .sort({ purchaseDate: -1 })
    .skip((page - 1) * limit)
    .limit(limit);
};

// Method to void a purchase record
purchaseRecordSchema.methods.void = async function(userId, reason) {
  this.isVoided = true;
  this.voidedAt = new Date();
  this.voidedBy = userId;
  this.voidReason = reason;

  return this.save();
};

module.exports = mongoose.model('PurchaseRecord', purchaseRecordSchema);
