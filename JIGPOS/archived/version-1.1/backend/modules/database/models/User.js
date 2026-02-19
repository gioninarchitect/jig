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
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  password: {
    type: String,
    required: true,
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
  
  // Role & Permissions
  role: {
    type: String,
    enum: ['user', 'admin', 'staff_manager', 'staff_assistant'],
    default: 'user'
  },
  permissions: [{
    type: String
  }],

  // Staff-specific fields
  staffInfo: {
    employeeId: String,
    hireDate: Date,
    department: String,
    supervisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    workSchedule: {
      type: String,
      enum: ['full-time', 'part-time', 'contract']
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
  
  // Profile
  profile: {
    phone: String,
    alternatePhone: String,
    dateOfBirth: Date,
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
  
  // Loyalty & Gamification (CBD Wellness Points)
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

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

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

module.exports = mongoose.model('User', userSchema);