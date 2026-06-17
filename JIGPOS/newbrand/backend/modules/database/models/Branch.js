// Branch/Store Model - Multi-location support
const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  // Identifiers
  branchCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['retail', 'cafe', 'retail-store', 'warehouse', 'hybrid', 'wholesale'],
    required: true,
    default: 'retail'
  },

  // HQ/Wholesale specific
  isHeadquarters: {
    type: Boolean,
    default: false
  },
  suppliesBranches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }],

  // Location
  address: {
    street: String,
    suburb: String,
    city: { type: String, required: true },
    province: String,
    postalCode: String,
    country: { type: String, default: 'South Africa' },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },

  // Contact
  phone: {
    type: String,
    required: true
  },
  email: {
    type: String,
    lowercase: true,
    trim: true
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Operations
  timezone: {
    type: String,
    default: 'Africa/Johannesburg'
  },
  operatingHours: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    open: String,
    close: String,
    closed: { type: Boolean, default: false }
  }],

  // POS Configuration
  tills: [{
    tillNumber: {
      type: String,
      required: true
    },
    name: String,
    isActive: { type: Boolean, default: true },
    speedPointProvider: {
      type: String,
      enum: ['yoco', 'ikhokha', 'paygate', 'manual', 'none'],
      default: 'manual'
    },
    speedPointDeviceId: String,
    speedPointSerialNumber: String
  }],

  // Sales Tracks
  hasLifestyleTrack: {
    type: Boolean,
    default: true
  },
  hasMedicalTrack: {
    type: Boolean,
    default: false
  },

  // Franchise
  isActive: {
    type: Boolean,
    default: true
  },
  franchiseOwnerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isFranchise: {
    type: Boolean,
    default: false
  },

  // Banking Details (for EFT payments)
  bankDetails: {
    bankName: String,
    accountName: String,
    accountNumber: String,
    branchCode: String,
    accountType: { type: String, enum: ['cheque', 'savings', 'current'] }
  },

  // Stats (cached for performance)
  stats: {
    totalSalesToday: { type: Number, default: 0 },
    totalSalesWeek: { type: Number, default: 0 },
    totalSalesMonth: { type: Number, default: 0 },
    totalSalesYear: { type: Number, default: 0 },
    lastSaleAt: Date,
    totalCustomers: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
branchSchema.index({ branchCode: 1 });
branchSchema.index({ city: 1, isActive: 1 });
branchSchema.index({ franchiseOwnerId: 1 });

// Virtual for display name
branchSchema.virtual('displayName').get(function() {
  return `${this.name} (${this.branchCode})`;
});

// Virtual for active tills
branchSchema.virtual('activeTills').get(function() {
  return (this.tills || []).filter(till => till.isActive);
});

// Method to check if branch is open now
branchSchema.methods.isOpenNow = function() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long', timeZone: this.timezone });
  const currentTime = now.toLocaleTimeString('en-US', { hour12: false, timeZone: this.timezone, hour: '2-digit', minute: '2-digit' });

  const todayHours = this.operatingHours.find(h => h.day === dayName);
  if (!todayHours || todayHours.closed) return false;

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
};

// Static method to get all active branches
branchSchema.statics.getActiveBranches = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Static method to get branches by type
branchSchema.statics.getByType = function(type) {
  return this.find({ type, isActive: true });
};

module.exports = mongoose.model('Branch', branchSchema);
