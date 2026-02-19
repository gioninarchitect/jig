// Affiliate Model - for influencers and reps
const mongoose = require('mongoose');

const affiliateSchema = new mongoose.Schema({
  // Basic Information
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  
  // Profile Information
  fullName: {
    type: String,
    required: true
  },
  phone: {
    type: String,
    required: true
  },
  socialMedia: {
    instagram: String,
    tiktok: String,
    youtube: String,
    twitter: String,
    facebook: String
  },
  
  // Affiliate Details
  affiliateCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  affiliateType: {
    type: String,
    enum: ['influencer', 'rep', 'soldier', 'ambassador'],
    default: 'soldier'
  },
  commissionRate: {
    type: Number,
    default: 5 // Default 5% for standard affiliates
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Performance Metrics
  metrics: {
    totalSales: {
      type: Number,
      default: 0
    },
    totalCommission: {
      type: Number,
      default: 0
    },
    totalClicks: {
      type: Number,
      default: 0
    },
    conversionRate: {
      type: Number,
      default: 0
    },
    totalOrders: {
      type: Number,
      default: 0
    }
  },
  
  // Banking Information (for payouts)
  payoutDetails: {
    bankName: String,
    accountHolder: String,
    accountNumber: String,
    branchCode: String,
    accountType: String,
    preferredMethod: {
      type: String,
      enum: ['bank', 'paypal', 'crypto'],
      default: 'bank'
    },
    cryptoWallet: String
  },
  
  // Commission History
  commissions: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    orderAmount: Number,
    commissionAmount: Number,
    status: {
      type: String,
      enum: ['pending', 'approved', 'paid', 'cancelled'],
      default: 'pending'
    },
    paidAt: Date,
    paymentReference: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Link Tracking
  links: [{
    customSlug: String,
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    category: String,
    clicks: {
      type: Number,
      default: 0
    },
    conversions: {
      type: Number,
      default: 0
    },
    generatedAt: {
      type: Date,
      default: Date.now
    },
    active: {
      type: Boolean,
      default: true
    }
  }],
  
  // Notifications
  notifications: {
    newSale: {
      type: Boolean,
      default: true
    },
    weeklyReport: {
      type: Boolean,
      default: true
    },
    payoutProcessed: {
      type: Boolean,
      default: true
    }
  },
  
  // Terms Acceptance
  termsAccepted: {
    type: Boolean,
    required: true
  },
  termsAcceptedAt: {
    type: Date,
    required: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Pre-save hook to set commission rate based on affiliate type
affiliateSchema.pre('save', function(next) {
  // Only set commission rate if it's a new affiliate or type changed
  if (this.isNew || this.isModified('affiliateType')) {
    // Commission rate structure:
    // - Influencers: 15% (verified social media presence)
    // - Standard affiliates (rep, soldier, ambassador): 5%
    if (this.affiliateType === 'influencer') {
      this.commissionRate = 15;
    } else {
      this.commissionRate = 5;
    }
  }
  next();
});

// Generate unique affiliate code
affiliateSchema.methods.generateAffiliateCode = function() {
  const prefix = this.affiliateType === 'influencer' ? 'INF' :
                 this.affiliateType === 'ambassador' ? 'AMB' :
                 this.affiliateType === 'rep' ? 'REP' : 'SOL';
  const random = Math.random().toString(36).substr(2, 6).toUpperCase();
  return `${prefix}${random}`;
};

// Generate affiliate link
affiliateSchema.methods.generateLink = function(productId = null, customSlug = null) {
  const baseUrl = process.env.BASE_URL || 'https://loosedraw.co.za';
  if (productId) {
    return `${baseUrl}/p/${productId}?ref=${this.affiliateCode}`;
  }
  if (customSlug) {
    return `${baseUrl}/l/${customSlug}?ref=${this.affiliateCode}`;
  }
  return `${baseUrl}?ref=${this.affiliateCode}`;
};

// Calculate commission
affiliateSchema.methods.calculateCommission = function(orderAmount) {
  return orderAmount * (this.commissionRate / 100);
};

// Update metrics
affiliateSchema.methods.updateMetrics = async function() {
  const approvedCommissions = this.commissions.filter(c => c.status === 'approved' || c.status === 'paid');
  this.metrics.totalSales = approvedCommissions.reduce((sum, c) => sum + c.orderAmount, 0);
  this.metrics.totalCommission = approvedCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  this.metrics.totalOrders = approvedCommissions.length;
  
  if (this.metrics.totalClicks > 0) {
    this.metrics.conversionRate = (this.metrics.totalOrders / this.metrics.totalClicks) * 100;
  }
  
  return this.save();
};

// Virtual for pending commission
affiliateSchema.virtual('pendingCommission').get(function() {
  return this.commissions
    .filter(c => c.status === 'pending')
    .reduce((sum, c) => sum + c.commissionAmount, 0);
});

// Virtual for available balance
affiliateSchema.virtual('availableBalance').get(function() {
  return this.commissions
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.commissionAmount, 0);
});

module.exports = mongoose.model('Affiliate', affiliateSchema);