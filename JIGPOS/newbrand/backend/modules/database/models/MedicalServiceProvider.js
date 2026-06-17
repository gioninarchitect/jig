// Medical Service Provider Model - Section 21 Partners
// 3rd party doctors, clinics, and medical cannabis suppliers
const mongoose = require('mongoose');

const medicalServiceProviderSchema = new mongoose.Schema({
  // Provider Identity
  name: {
    type: String,
    required: true,
    trim: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },

  // Provider Type
  providerType: {
    type: String,
    enum: [
      'prescriber',        // Doctor/Clinic that issues Section 21 prescriptions
      'supplier',          // Medical cannabis supplier
      'pharmacy',          // Licensed pharmacy
      'telehealth',        // Online consultation service
      'testing_lab',       // Cannabis testing laboratory
      'both'               // Prescriber + Supplier
    ],
    required: true
  },

  // Business Details
  registrationNumber: String,   // HPCSA number for doctors, company reg for suppliers
  licenseNumber: String,        // Section 21 license number
  licenseExpiry: Date,
  vatNumber: String,

  // Contact Information
  contact: {
    phone: String,
    alternatePhone: String,
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    website: String
  },

  // Address
  address: {
    street: String,
    suburb: String,
    city: String,
    province: {
      type: String,
      enum: ['Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape', 'Free State',
             'Limpopo', 'Mpumalanga', 'North West', 'Northern Cape']
    },
    postalCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Operating Hours
  operatingHours: {
    monday: { open: String, close: String, closed: Boolean },
    tuesday: { open: String, close: String, closed: Boolean },
    wednesday: { open: String, close: String, closed: Boolean },
    thursday: { open: String, close: String, closed: Boolean },
    friday: { open: String, close: String, closed: Boolean },
    saturday: { open: String, close: String, closed: Boolean },
    sunday: { open: String, close: String, closed: Boolean }
  },

  // Services Offered (for prescribers)
  services: [{
    name: String,
    description: String,
    price: Number,
    duration: Number  // minutes
  }],

  // Consultation Options (for prescribers/telehealth)
  consultationOptions: {
    inPerson: { type: Boolean, default: false },
    telehealth: { type: Boolean, default: false },
    homeVisit: { type: Boolean, default: false },
    bookingUrl: String,
    consultationFee: Number
  },

  // Branches Serviced (which Origin branches they work with)
  servicedBranches: [{
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    isPreferred: { type: Boolean, default: false },
    deliveryDays: [String],  // ['Monday', 'Wednesday', 'Friday']
    minOrderValue: Number,
    leadTimeDays: Number
  }],

  // Products Supplied (for suppliers)
  suppliedProducts: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    sku: String,
    wholesalePrice: Number,
    minOrderQty: Number,
    isActive: { type: Boolean, default: true }
  }],

  // Product Categories Supplied
  productCategories: [{
    type: String,
    enum: ['flower', 'oil', 'capsules', 'topicals', 'edibles', 'vapes', 'tinctures']
  }],

  // Branding
  logoUrl: String,
  bannerUrl: String,
  description: String,
  shortDescription: String,

  // Patient Portal Settings
  showInPatientPortal: {
    type: Boolean,
    default: true
  },
  featuredProvider: {
    type: Boolean,
    default: false
  },
  displayOrder: {
    type: Number,
    default: 0
  },

  // Ratings & Reviews
  rating: {
    average: { type: Number, default: 0, min: 0, max: 5 },
    count: { type: Number, default: 0 }
  },

  // Compliance
  compliance: {
    sahpraApproved: { type: Boolean, default: false },
    section21Certified: { type: Boolean, default: false },
    lastAuditDate: Date,
    auditStatus: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'scheduled'],
      default: 'pending'
    },
    certifications: [String]
  },

  // Integration
  integration: {
    apiEnabled: { type: Boolean, default: false },
    apiKey: String,
    webhookUrl: String,
    prescriptionWebhook: String  // For auto-verification of prescriptions
  },

  // Status
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending',
    index: true
  },
  suspensionReason: String,
  activatedAt: Date,
  activatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Audit
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
medicalServiceProviderSchema.index({ providerType: 1, status: 1 });
medicalServiceProviderSchema.index({ 'servicedBranches.branch': 1 });
medicalServiceProviderSchema.index({ 'address.province': 1 });
medicalServiceProviderSchema.index({ showInPatientPortal: 1, status: 1 });
medicalServiceProviderSchema.index({ featuredProvider: -1, displayOrder: 1 });

// Generate slug before save
medicalServiceProviderSchema.pre('save', function(next) {
  if (this.isModified('name') || !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Virtual for full address
medicalServiceProviderSchema.virtual('fullAddress').get(function() {
  const a = this.address;
  if (!a) return '';
  return [a.street, a.suburb, a.city, a.province, a.postalCode]
    .filter(Boolean)
    .join(', ');
});

// Virtual to check if license is valid
medicalServiceProviderSchema.virtual('isLicenseValid').get(function() {
  if (!this.licenseExpiry) return true;
  return this.licenseExpiry > new Date();
});

// Static: Get providers for patient portal
medicalServiceProviderSchema.statics.getForPatientPortal = function(options = {}) {
  const query = {
    showInPatientPortal: true,
    status: 'active'
  };

  if (options.providerType) query.providerType = options.providerType;
  if (options.province) query['address.province'] = options.province;
  if (options.branch) query['servicedBranches.branch'] = options.branch;

  return this.find(query)
    .select('name slug providerType contact address shortDescription logoUrl rating consultationOptions services featuredProvider')
    .sort({ featuredProvider: -1, displayOrder: 1, 'rating.average': -1 });
};

// Static: Get suppliers for a branch
medicalServiceProviderSchema.statics.getSuppliersForBranch = function(branchId) {
  return this.find({
    providerType: { $in: ['supplier', 'both'] },
    status: 'active',
    'servicedBranches.branch': branchId
  })
  .populate('suppliedProducts.product', 'name sku category')
  .select('name contact suppliedProducts servicedBranches');
};

// Static: Get prescribers by location
medicalServiceProviderSchema.statics.getPrescribersByLocation = function(province, city = null) {
  const query = {
    providerType: { $in: ['prescriber', 'telehealth', 'both'] },
    status: 'active',
    showInPatientPortal: true,
    'address.province': province
  };

  if (city) query['address.city'] = city;

  return this.find(query)
    .select('name slug contact address consultationOptions services rating logoUrl shortDescription')
    .sort({ featuredProvider: -1, 'rating.average': -1 });
};

// Method: Check if provider services a branch
medicalServiceProviderSchema.methods.servicesBranch = function(branchId) {
  return this.servicedBranches.some(sb =>
    sb.branch && sb.branch.toString() === branchId.toString()
  );
};

// Method: Get supplier price for product at branch
medicalServiceProviderSchema.methods.getProductPrice = function(productId, branchId) {
  const branchService = this.servicedBranches.find(sb =>
    sb.branch && sb.branch.toString() === branchId.toString()
  );

  if (!branchService) return null;

  const suppliedProduct = this.suppliedProducts.find(sp =>
    sp.product && sp.product.toString() === productId.toString() && sp.isActive
  );

  return suppliedProduct ? suppliedProduct.wholesalePrice : null;
};

module.exports = mongoose.model('MedicalServiceProvider', medicalServiceProviderSchema);
