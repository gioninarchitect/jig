// User Model - Max 200 lines
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Authentication
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    minlength: 8
  },
  
  // Personal Information
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  mobile: {
    type: String,
    trim: true
  },

  // Role & Permissions
  role: {
    type: String,
    enum: [
      'user',                 // Customer / Patient
      'super_admin',          // System administrator (platform owner - florisolivier7@gmail.com)
      'owner',                // Business owner - strategic oversight, P&L, all branches
      'admin',                // Operations administrator - reports to owner, daily ops, all branches
      'inventory_manager',    // Receiving, stock control, adjustments, assign jobs
      'packer',               // Break bulk, label, quality check, pack
      'dispatch_manager',     // Pick, verify, dispatch, courier handoff
      'branch_manager',       // Branch manager - branch operations, cashups, local staff
      'branch_assistant',      // POS/till operations
      'pharmacy_admin',        // Partner pharmacy admin - staff/queue management
      'responsible_pharmacist', // Responsible pharmacist - dispensing sign-off
      'pharmacist',            // Pharmacist - arrival scans, OTP collection, handover
      'pharmacy_assistant',    // Pharmacy assistant - limited pickup/return actions
      'supplier'              // Supplier portal access (cultivator, processor, distributor, etc.)
    ],
    default: 'user'
  },
  permissions: [{
    type: String
  }],

  // Branch Assignment (for staff roles)
  assignedBranches: [{
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    isPrimary: {
      type: Boolean,
      default: false
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Primary branch (for quick access)
  primaryBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },

  // Staff-specific fields
  staffInfo: {
    employeeId: String,
    hireDate: Date,
    department: {
      type: String,
      enum: ['sales', 'inventory', 'dispatch', 'management', 'admin', 'pharmacy']
    },
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    workSchedule: {
      type: String,
      enum: ['full-time', 'part-time', 'contract']
    },
    canAccessAllBranches: {
      type: Boolean,
      default: false
    }
  },
  
  // Membership
  isLifestyleMember: {
    type: Boolean,
    default: false
  },
  memberSince: Date,
  membershipSource: String,
  membershipExpiry: Date,

  // Section 21 Medical Cannabis Status
  section21Status: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected', 'expired'],
    default: 'none'
  },

  // Purchase Limits (for patients - configurable)
  purchaseLimits: {
    enabled: { type: Boolean, default: false },       // Toggle purchase limit tracking
    dailyLimit: { type: Number, default: 150 },       // grams per day
    monthlyLimit: { type: Number, default: 600 },     // grams per month
    currentDayUsage: { type: Number, default: 0 },    // grams used today
    currentMonthUsage: { type: Number, default: 0 },  // grams used this month
    lastDayReset: { type: Date },                     // Last daily reset
    lastMonthReset: { type: Date },                   // Last monthly reset
    exemptionReason: String,                          // Medical exemption if limits overridden
    exemptionApprovedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Guest checkout flag (user created from checkout, not registration)
  isGuestAccount: {
    type: Boolean,
    default: false
  },
  guestConvertedAt: Date,  // When guest upgraded to full account

  // Account Status
  isActive: {
    type: Boolean,
    default: true
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailVerificationToken: String,
  emailVerificationExpiry: Date,
  
  // Security
  permanentPin: String, // Permanent PIN for quick login (owner/admin)
  passwordResetToken: String,
  passwordResetExpiry: Date,
  twoFactorSecret: String,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  lastLogin: Date,
  
  // Age Verification (required for cannabis access)
  ageVerification: {
    dateOfBirth: Date,
    isVerified: { type: Boolean, default: false },
    verifiedAt: Date,
    verificationMethod: { type: String, enum: ['self_declared', 'id_document', 'admin'], default: 'self_declared' }
  },

  // Profile
  profile: {
    phone: String,
    alternatePhone: String,
    dateOfBirth: Date,  // Legacy - use ageVerification.dateOfBirth
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'prefer_not_to_say']
    },
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
    avatarUrl: String,
    language: {
      type: String,
      default: 'en'
    }
  },
  
  // KYC Documents
  kyc: {
    idDocument: {
      url: String,
      verified: Boolean,
      uploadedAt: Date
    },
    section21: {
      url: String,
      verified: Boolean,
      uploadedAt: Date
    },
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  },
  
  // Loyalty & Gamification (BMH Wellness Points)
  loyalty: {
    points: {
      type: Number,
      default: 0
    },
    tier: {
      type: String,
      enum: ['wellness_seeker', 'wellness_advocate', 'wellness_champion', 'wellness_elite']
      // No default - only set for customer accounts, not admin/staff
      // Tiers: Seeker (R0-999), Advocate (R1k-4.9k), Champion (R5k-14.9k), Elite (R15k+)
    },
    totalSpent: {
      type: Number,
      default: 0
    },
    totalEarned: {
      type: Number,
      default: 0
    },
    pointsHistory: [{
      amount: Number,
      type: {
        type: String,
        enum: ['earned', 'redeemed', 'expired', 'adjusted']
      },
      reason: String,
      orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      },
      createdAt: {
        type: Date,
        default: Date.now
      },
      expiresAt: Date
    }]
  },
  
  // Gamification
  gamification: {
    level: {
      type: Number,
      default: 1
    },
    xp: {
      type: Number,
      default: 0
    },
    streak: {
      type: Number,
      default: 0
    },
    lastVisit: Date,
    achievements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Achievement'
    }]
  },
  
  // Referrals
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true
  },
  
  // Preferences
  preferences: {
    newsletter: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1, isActive: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ 'loyalty.tier': 1 });
userSchema.index({ primaryBranch: 1 });
userSchema.index({ 'assignedBranches.branch': 1 });
userSchema.index({ role: 1, primaryBranch: 1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for assigned branch IDs
userSchema.virtual('branchIds').get(function() {
  return (this.assignedBranches || []).map(ab => ab.branch);
});

// Method to check if user has access to a branch
userSchema.methods.hasAccessToBranch = function(branchId) {
  // Super admin, owners and admins have access to all branches
  if (['super_admin', 'owner', 'admin'].includes(this.role)) return true;

  // Check if user has canAccessAllBranches flag
  if (this.staffInfo?.canAccessAllBranches) return true;

  // Check assigned branches
  const branchIdStr = branchId.toString();
  return (this.assignedBranches || []).some(ab =>
    ab.branch && ab.branch.toString() === branchIdStr
  );
};

// Method to assign user to a branch
userSchema.methods.assignToBranch = async function(branchId, isPrimary = false, assignedById = null) {
  const existingAssignment = this.assignedBranches.find(
    ab => ab.branch && ab.branch.toString() === branchId.toString()
  );

  if (existingAssignment) {
    existingAssignment.isPrimary = isPrimary;
  } else {
    this.assignedBranches.push({
      branch: branchId,
      isPrimary,
      assignedBy: assignedById
    });
  }

  // Update primary branch if this is set as primary
  if (isPrimary) {
    this.primaryBranch = branchId;
    // Remove primary flag from other branches
    this.assignedBranches.forEach(ab => {
      if (ab.branch.toString() !== branchId.toString()) {
        ab.isPrimary = false;
      }
    });
  }

  // If no primary set yet, make the first one primary
  if (!this.primaryBranch && this.assignedBranches.length > 0) {
    this.primaryBranch = this.assignedBranches[0].branch;
    this.assignedBranches[0].isPrimary = true;
  }

  return this.save();
};

// Method to remove user from a branch
userSchema.methods.removeFromBranch = async function(branchId) {
  this.assignedBranches = this.assignedBranches.filter(
    ab => ab.branch && ab.branch.toString() !== branchId.toString()
  );

  // Update primary branch if removed
  if (this.primaryBranch && this.primaryBranch.toString() === branchId.toString()) {
    if (this.assignedBranches.length > 0) {
      this.primaryBranch = this.assignedBranches[0].branch;
      this.assignedBranches[0].isPrimary = true;
    } else {
      this.primaryBranch = null;
    }
  }

  return this.save();
};

// Static method to get staff for a branch
userSchema.statics.getStaffForBranch = function(branchId) {
  return this.find({
    isActive: true,
    $or: [
      { 'assignedBranches.branch': branchId },
      { primaryBranch: branchId },
      { 'staffInfo.canAccessAllBranches': true },
      { role: { $in: ['super_admin', 'owner', 'admin'] } }
    ]
  }).select('-password -passwordResetToken -twoFactorSecret');
};

// Static method to get users by role
userSchema.statics.getByRole = function(role) {
  return this.find({ role, isActive: true }).select('-password');
};

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is locked
userSchema.methods.isLocked = function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
};

// ============================================================================
// LOYALTY POINTS METHODS
// ============================================================================

/**
 * Add loyalty points to user account
 */
userSchema.methods.addPoints = async function(amount, reason, orderId = null, expiresAt = null) {
  this.loyalty.points += amount;
  this.loyalty.totalEarned += amount;

  this.loyalty.pointsHistory.push({
    amount,
    type: 'earned',
    reason,
    orderId,
    expiresAt
  });

  return this.save();
};

/**
 * Redeem loyalty points
 */
userSchema.methods.redeemPoints = async function(amount, reason, orderId = null) {
  if (this.loyalty.points < amount) {
    throw new Error('Insufficient points');
  }

  this.loyalty.points -= amount;

  this.loyalty.pointsHistory.push({
    amount: -amount,
    type: 'redeemed',
    reason,
    orderId
  });

  return this.save();
};

/**
 * Adjust points (admin override)
 */
userSchema.methods.adjustPoints = async function(amount, reason) {
  this.loyalty.points += amount;

  this.loyalty.pointsHistory.push({
    amount,
    type: 'adjusted',
    reason
  });

  if (amount > 0) {
    this.loyalty.totalEarned += amount;
  }

  return this.save();
};

/**
 * Update loyalty tier based on total spend
 */
userSchema.methods.updateLoyaltyTier = async function() {
  const LoyaltyConfig = require('./LoyaltyConfig');
  const config = await LoyaltyConfig.getOrCreateConfig(this._id);

  const newTier = config.calculateTier(this.loyalty.totalSpent);

  if (this.loyalty.tier !== newTier) {
    this.loyalty.tier = newTier;
    await this.save();
  }

  return this.loyalty.tier;
};

/**
 * Record purchase and earn points
 */
userSchema.methods.recordPurchase = async function(orderAmount, orderId, categoryName = null) {
  const LoyaltyConfig = require('./LoyaltyConfig');
  const config = await LoyaltyConfig.getOrCreateConfig(this._id);

  // Update total spent
  this.loyalty.totalSpent += orderAmount;

  // Calculate points earned
  const pointsEarned = config.calculatePointsEarned(orderAmount, this._id, categoryName);

  // Apply tier multiplier
  const tierBenefits = config.getTierBenefits(this.loyalty.tier);
  const multipliedPoints = Math.floor(pointsEarned * tierBenefits.pointsMultiplier);

  // Add points
  if (multipliedPoints > 0) {
    // Calculate expiry if enabled
    let expiresAt = null;
    if (config.pointsExpiration.enabled) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + config.pointsExpiration.expiryDays);
    }

    await this.addPoints(
      multipliedPoints,
      `Purchase of R${orderAmount.toFixed(2)} (${this.loyalty.tier} tier ${tierBenefits.pointsMultiplier}x multiplier)`,
      orderId,
      expiresAt
    );
  }

  // Update tier
  await this.updateLoyaltyTier();

  return {
    pointsEarned: multipliedPoints,
    newBalance: this.loyalty.points,
    tier: this.loyalty.tier
  };
};

// Database Indexes for Performance
// Note: email and username already have unique indexes defined in schema
userSchema.index({ role: 1 }); // For role-based queries (admin checks)
userSchema.index({ 'loyalty.referralCode': 1 }); // For referral lookups
userSchema.index({ isActive: 1, role: 1 }); // Compound index for active user + role queries
userSchema.index({ loginAttempts: 1, lockUntil: 1 }); // For login security checks
userSchema.index({ createdAt: -1 }); // For sorting users by registration date
userSchema.index({ lastLogin: -1 }); // For activity tracking

module.exports = mongoose.model('User', userSchema);
