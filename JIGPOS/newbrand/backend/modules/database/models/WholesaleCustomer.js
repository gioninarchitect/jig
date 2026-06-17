// Wholesale Customer Model - B2B customers for HQ
const mongoose = require('mongoose');

const wholesaleCustomerSchema = new mongoose.Schema({
  // Business Details
  businessName: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  tradingName: String,
  registrationNumber: {
    type: String,
    trim: true
  },
  vatNumber: {
    type: String,
    trim: true
  },

  // Customer Type
  customerType: {
    type: String,
    enum: ['external', 'internal_branch', 'distributor', 'reseller', 'supplier'],
    default: 'external'
  },
  // If internal branch
  linkedBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },

  // Contact Person
  contactPerson: {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    position: String
  },

  // Additional Contacts
  contacts: [{
    name: String,
    email: String,
    phone: String,
    position: String,
    isPrimary: Boolean
  }],

  // Addresses
  billingAddress: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String,
    country: { type: String, default: 'South Africa' }
  },
  deliveryAddress: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String,
    country: { type: String, default: 'South Africa' }
  },
  sameAsDelivery: {
    type: Boolean,
    default: true
  },

  // Payment Terms
  paymentTerms: {
    type: String,
    enum: ['cod', 'prepaid', '7days', '14days', '30days', '60days'],
    default: 'cod'
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },

  // Pricing Tier
  priceTier: {
    type: String,
    enum: ['standard', 'silver', 'gold', 'platinum', 'custom'],
    default: 'standard'
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 50
  },

  // Custom pricing for specific products
  customPricing: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    customPrice: Number
  }],

  // Account Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'closed'],
    default: 'pending'
  },
  creditHold: {
    type: Boolean,
    default: false
  },
  creditHoldReason: String,

  // Sales Rep Assignment
  salesRep: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Documents
  documents: [{
    type: { type: String, enum: ['registration', 'vat', 'id', 'contract', 'other'] },
    filename: String,
    url: String,
    uploadedAt: Date
  }],

  // Notes
  notes: String,
  internalNotes: String,

  // Statistics (cached)
  stats: {
    totalOrders: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    lastOrderDate: Date,
    averageOrderValue: { type: Number, default: 0 }
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
wholesaleCustomerSchema.index({ businessName: 'text', tradingName: 'text' });
wholesaleCustomerSchema.index({ status: 1, priceTier: 1 });
wholesaleCustomerSchema.index({ linkedBranch: 1 });

// Virtual for available credit
wholesaleCustomerSchema.virtual('availableCredit').get(function() {
  return Math.max(0, this.creditLimit - this.currentBalance);
});

// Check if customer can place order
wholesaleCustomerSchema.methods.canPlaceOrder = function(orderTotal) {
  if (this.status !== 'active') return { allowed: false, reason: 'Account not active' };
  if (this.creditHold) return { allowed: false, reason: this.creditHoldReason || 'Account on credit hold' };
  if (this.paymentTerms === 'cod' || this.paymentTerms === 'prepaid') return { allowed: true };
  if (this.currentBalance + orderTotal > this.creditLimit) {
    return { allowed: false, reason: 'Credit limit exceeded' };
  }
  return { allowed: true };
};

// Update statistics after order
wholesaleCustomerSchema.methods.updateStats = async function(orderTotal) {
  this.stats.totalOrders += 1;
  this.stats.totalSpent += orderTotal;
  this.stats.lastOrderDate = new Date();
  this.stats.averageOrderValue = this.stats.totalSpent / this.stats.totalOrders;
  return this.save();
};

module.exports = mongoose.model('WholesaleCustomer', wholesaleCustomerSchema);
