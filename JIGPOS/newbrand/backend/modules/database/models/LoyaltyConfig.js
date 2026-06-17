/**
 * Loyalty Configuration Model
 * Stores merchant-specific loyalty program settings
 */

const mongoose = require('mongoose');

const loyaltyConfigSchema = new mongoose.Schema({
  // Merchant identification (for multi-tenant support)
  merchantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Points earning rules
  pointsEarning: {
    enabled: {
      type: Boolean,
      default: true
    },
    // R1 spent = X points (default: 1 point per R1)
    pointsPerRand: {
      type: Number,
      default: 1,
      min: 0
    },
    // Minimum purchase to earn points
    minimumPurchase: {
      type: Number,
      default: 0
    },
    // Points multiplier for specific categories
    categoryMultipliers: [{
      categoryName: String,
      multiplier: {
        type: Number,
        default: 1
      }
    }],
    // Bonus points for first purchase
    firstPurchaseBonus: {
      type: Number,
      default: 0
    },
    // Birthday bonus points
    birthdayBonus: {
      type: Number,
      default: 0
    }
  },

  // Points redemption rules
  pointsRedemption: {
    enabled: {
      type: Boolean,
      default: true
    },
    // Minimum points required to redeem
    minimumPoints: {
      type: Number,
      default: 100
    },
    // Points to currency conversion (e.g., 100 points = R10)
    pointsPerRand: {
      type: Number,
      default: 10 // 10 points = R1
    },
    // Maximum discount percentage from points
    maxDiscountPercent: {
      type: Number,
      default: 50 // Max 50% of order can be paid with points
    }
  },

  // Points expiration
  pointsExpiration: {
    enabled: {
      type: Boolean,
      default: false
    },
    expiryDays: {
      type: Number,
      default: 365 // Points expire after 1 year
    },
    warningDays: {
      type: Number,
      default: 30 // Warn 30 days before expiry
    }
  },

  // Tier thresholds (Wellness Seeker → Advocate → Champion → Elite)
  tiers: {
    wellness_seeker: {
      name: {
        type: String,
        default: 'Wellness Seeker'
      },
      description: {
        type: String,
        default: 'Starting your wellness journey - exploring natural relief'
      },
      minSpend: {
        type: Number,
        default: 0
      },
      benefits: [{
        type: String
      }],
      pointsMultiplier: {
        type: Number,
        default: 1.0
      },
      discountPercent: {
        type: Number,
        default: 0
      }
    },
    wellness_advocate: {
      name: {
        type: String,
        default: 'Wellness Advocate'
      },
      description: {
        type: String,
        default: 'Committed to wellness - building your routine'
      },
      minSpend: {
        type: Number,
        default: 1000
      },
      benefits: [{
        type: String
      }],
      pointsMultiplier: {
        type: Number,
        default: 1.25
      },
      discountPercent: {
        type: Number,
        default: 5
      }
    },
    wellness_champion: {
      name: {
        type: String,
        default: 'Wellness Champion'
      },
      description: {
        type: String,
        default: 'Wellness champion - natural relief is your lifestyle'
      },
      minSpend: {
        type: Number,
        default: 5000
      },
      benefits: [{
        type: String
      }],
      pointsMultiplier: {
        type: Number,
        default: 1.5
      },
      discountPercent: {
        type: Number,
        default: 10
      }
    },
    wellness_elite: {
      name: {
        type: String,
        default: 'Wellness Elite'
      },
      description: {
        type: String,
        default: 'Elite wellness - experiencing the full spectrum of benefits'
      },
      minSpend: {
        type: Number,
        default: 15000
      },
      benefits: [{
        type: String
      }],
      pointsMultiplier: {
        type: Number,
        default: 2.0
      },
      discountPercent: {
        type: Number,
        default: 15
      }
    }
  },

  // Bonus events
  bonusEvents: [{
    name: String,
    description: String,
    startDate: Date,
    endDate: Date,
    pointsMultiplier: {
      type: Number,
      default: 2.0
    },
    active: {
      type: Boolean,
      default: true
    }
  }],

  // Referral program integration
  referralBonus: {
    enabled: {
      type: Boolean,
      default: true
    },
    referrerPoints: {
      type: Number,
      default: 100
    },
    refereePoints: {
      type: Number,
      default: 50
    }
  }

}, {
  timestamps: true
});

// ============================================================================
// METHODS
// ============================================================================

/**
 * Calculate points earned for a purchase
 */
loyaltyConfigSchema.methods.calculatePointsEarned = function(orderAmount, userId, categoryName = null) {
  if (!this.pointsEarning.enabled) return 0;

  // Check minimum purchase
  if (orderAmount < this.pointsEarning.minimumPurchase) return 0;

  // Base points: R1 = X points
  let points = orderAmount * this.pointsEarning.pointsPerRand;

  // Apply category multiplier
  if (categoryName) {
    const categoryMultiplier = this.pointsEarning.categoryMultipliers.find(
      cm => cm.categoryName === categoryName
    );
    if (categoryMultiplier) {
      points *= categoryMultiplier.multiplier;
    }
  }

  return Math.floor(points);
};

/**
 * Calculate tier based on total spend
 */
loyaltyConfigSchema.methods.calculateTier = function(totalSpend) {
  if (totalSpend >= this.tiers.wellness_elite.minSpend) return 'wellness_elite';
  if (totalSpend >= this.tiers.wellness_champion.minSpend) return 'wellness_champion';
  if (totalSpend >= this.tiers.wellness_advocate.minSpend) return 'wellness_advocate';
  return 'wellness_seeker';
};

/**
 * Get tier benefits
 */
loyaltyConfigSchema.methods.getTierBenefits = function(tier) {
  return this.tiers[tier] || this.tiers.wellness_seeker;
};

/**
 * Calculate points value in currency
 */
loyaltyConfigSchema.methods.pointsToRand = function(points) {
  if (!this.pointsRedemption.enabled) return 0;
  return points / this.pointsRedemption.pointsPerRand;
};

/**
 * Calculate maximum discount allowed from points for an order
 */
loyaltyConfigSchema.methods.getMaxPointsDiscount = function(orderAmount) {
  const maxDiscount = (orderAmount * this.pointsRedemption.maxDiscountPercent) / 100;
  return maxDiscount;
};

// ============================================================================
// STATIC METHODS
// ============================================================================

/**
 * Get or create default loyalty config for a merchant
 */
loyaltyConfigSchema.statics.getOrCreateConfig = async function(merchantId) {
  let config = await this.findOne({ merchantId });

  if (!config) {
    config = new this({
      merchantId,
      'tiers.wellness_seeker.benefits': ['Early access to new products', 'Birthday bonus points'],
      'tiers.wellness_advocate.benefits': ['5% discount on all orders', '1.25x points multiplier', 'Priority support'],
      'tiers.wellness_champion.benefits': ['10% discount on all orders', '1.5x points multiplier', 'Free shipping', 'Exclusive product access'],
      'tiers.wellness_elite.benefits': ['15% discount on all orders', '2x points multiplier', 'Free express shipping', 'VIP events access', 'Personal wellness consultant']
    });
    await config.save();
  }

  return config;
};

module.exports = mongoose.model('LoyaltyConfig', loyaltyConfigSchema);
