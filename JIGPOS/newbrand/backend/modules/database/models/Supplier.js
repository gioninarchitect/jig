// Supplier Model - Supplier management and compliance tracking
const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  // Supplier Identifier
  supplierId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Information
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  legalName: {
    type: String,
    trim: true
  },
  tradingAs: String,

  // Contact Information
  contactPerson: {
    name: String,
    email: String,
    phone: String,
    position: String
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  phone: String,
  alternatePhone: String,
  website: String,

  // Address
  address: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String,
    country: {
      type: String,
      default: 'South Africa'
    }
  },

  // Business Registration
  registration: {
    companyNumber: String,
    vatNumber: String,
    taxNumber: String
  },

  // License & Compliance
  license: {
    number: {
      type: String,
      index: true
    },
    type: {
      type: String,
      enum: ['cultivator', 'processor', 'distributor', 'manufacturer', 'importer']
    },
    issuedDate: Date,
    expiryDate: Date,
    documentUrl: String,
    issuingAuthority: String
  },

  // Compliance Status
  complianceStatus: {
    type: String,
    enum: ['pending', 'approved', 'suspended', 'expired', 'blacklisted'],
    default: 'pending',
    index: true
  },
  complianceNotes: String,

  // Verification
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  lastAuditDate: Date,
  nextAuditDue: Date,

  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['license', 'certificate', 'insurance', 'tax_clearance', 'bbbee', 'other']
    },
    name: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    expiryDate: Date,
    verified: {
      type: Boolean,
      default: false
    }
  }],

  // Product Categories Supplied
  productCategories: [{
    type: String
  }],

  // Banking Details
  bankDetails: {
    bankName: String,
    accountNumber: String,
    branchCode: String,
    accountType: String,
    accountHolder: String
  },

  // Payment Terms
  paymentTerms: {
    type: String,
    enum: ['cod', 'net15', 'net30', 'net60', 'prepaid'],
    default: 'net30'
  },
  creditLimit: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },

  // Performance Metrics
  performance: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    totalOrders: {
      type: Number,
      default: 0
    },
    totalValue: {
      type: Number,
      default: 0
    },
    onTimeDeliveryRate: {
      type: Number,
      min: 0,
      max: 100
    },
    qualityScore: {
      type: Number,
      min: 0,
      max: 100
    },
    defectRate: {
      type: Number,
      min: 0,
      max: 100
    },
    averageLeadTime: Number // in days
  },

  // Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'blacklisted'],
    default: 'active',
    index: true
  },

  // Additional
  notes: String,
  tags: [String],

  // Self-service Portal Access
  portalAccess: {
    enabled: {
      type: Boolean,
      default: false
    },
    username: String,
    passwordHash: String,
    lastLogin: Date
  },

  // Created By
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
supplierSchema.index({ name: 'text', legalName: 'text' });
supplierSchema.index({ status: 1, complianceStatus: 1 });
supplierSchema.index({ 'license.expiryDate': 1 });
supplierSchema.index({ productCategories: 1 });

// Generate supplier ID before saving
supplierSchema.pre('save', async function(next) {
  if (!this.supplierId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Supplier').countDocuments();
    this.supplierId = `SUP-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // Auto-update compliance status based on license expiry
  if (this.license && this.license.expiryDate) {
    const now = new Date();
    if (this.license.expiryDate < now && this.complianceStatus !== 'blacklisted') {
      this.complianceStatus = 'expired';
    }
  }

  next();
});

// Virtual for full address
supplierSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const parts = [
    this.address.street,
    this.address.suburb,
    this.address.city,
    this.address.province,
    this.address.postalCode,
    this.address.country
  ].filter(Boolean);
  return parts.join(', ');
});

// Method to update performance metrics after an order
supplierSchema.methods.updatePerformanceMetrics = async function(orderValue, wasOnTime, qualityScore) {
  this.performance.totalOrders += 1;
  this.performance.totalValue += orderValue;

  // Update on-time delivery rate (rolling average)
  const currentRate = this.performance.onTimeDeliveryRate || 0;
  const totalOrders = this.performance.totalOrders;
  this.performance.onTimeDeliveryRate =
    ((currentRate * (totalOrders - 1)) + (wasOnTime ? 100 : 0)) / totalOrders;

  // Update quality score (rolling average)
  if (qualityScore !== undefined) {
    const currentQuality = this.performance.qualityScore || 0;
    this.performance.qualityScore =
      ((currentQuality * (totalOrders - 1)) + qualityScore) / totalOrders;
  }

  // Calculate overall rating (1-5)
  const onTimeWeight = 0.4;
  const qualityWeight = 0.6;
  this.performance.rating =
    (((this.performance.onTimeDeliveryRate || 0) / 20) * onTimeWeight) +
    (((this.performance.qualityScore || 0) / 20) * qualityWeight);

  return this.save();
};

// Method to check if supplier is in good standing
supplierSchema.methods.isInGoodStanding = function() {
  return this.status === 'active' &&
         this.complianceStatus === 'approved' &&
         (!this.license.expiryDate || this.license.expiryDate > new Date());
};

// Static method to find suppliers by product category
supplierSchema.statics.findByCategory = function(category) {
  return this.find({
    productCategories: category,
    status: 'active',
    complianceStatus: 'approved'
  }).sort({ 'performance.rating': -1 });
};

// Static method to find suppliers with expiring licenses
supplierSchema.statics.findExpiringLicenses = function(daysAhead = 30) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return this.find({
    'license.expiryDate': {
      $lte: futureDate,
      $gt: new Date()
    },
    status: 'active'
  }).sort({ 'license.expiryDate': 1 });
};

module.exports = mongoose.model('Supplier', supplierSchema);
