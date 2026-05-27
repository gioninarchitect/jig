// Campaign Model - Marketing automation and customer engagement
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  // Campaign Identifier
  campaignId: {
    type: String,
    unique: true,
    index: true
  },

  // Basic Info
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,

  // Campaign Type
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'combined'],
    required: true
  },

  // Targeting / Audience
  audience: {
    type: {
      type: String,
      enum: ['all', 'segment', 'custom', 'manual'],
      default: 'all'
    },
    segment: {
      type: String,
      enum: [
        'new_users',           // Registered in last 30 days
        'inactive_30d',        // No purchase in 30 days
        'inactive_60d',        // No purchase in 60 days
        'inactive_90d',        // No purchase in 90 days
        'high_value',          // Top 20% by spend
        'loyal_customers',     // 5+ purchases
        'wellness_seekers',    // Bronze tier
        'wellness_advocates',  // Silver tier
        'wellness_champions',  // Gold tier
        'wellness_elite',      // Platinum tier
        'birthday_month',      // Birthday this month
        'section21_approved',  // Medical cannabis approved
        'lifestyle_members'    // Lifestyle members
      ]
    },
    filters: {
      minPurchases: Number,
      maxPurchases: Number,
      minTotalSpent: Number,
      maxTotalSpent: Number,
      minDaysSinceLastPurchase: Number,
      maxDaysSinceLastPurchase: Number,
      productCategories: [String],
      branches: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch'
      }],
      membershipTiers: [String],
      hasSection21: Boolean,
      isLifestyleMember: Boolean,
      registeredAfter: Date,
      registeredBefore: Date
    },
    // Manual recipient list
    recipients: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    // Calculated recipient count
    recipientCount: {
      type: Number,
      default: 0
    }
  },

  // Email Content
  emailContent: {
    subject: String,
    preheader: String, // Preview text
    fromName: {
      type: String,
      default: 'Origin by ILCO Farming'
    },
    fromEmail: {
      type: String,
      default: 'origin@cleva-ai.co.za'
    },
    replyTo: String,
    body: String, // HTML content
    plainText: String,
    templateId: String // Reference to email template if using templates
  },

  // SMS Content
  smsContent: {
    message: String, // Max 160 chars for single SMS
    senderId: {
      type: String,
      default: 'BMH'
    }
  },

  // Push Notification Content
  pushContent: {
    title: String,
    body: String,
    imageUrl: String,
    actionUrl: String,
    data: mongoose.Schema.Types.Mixed // Additional data payload
  },

  // Call to Action
  cta: {
    text: String,
    url: String,
    trackClicks: {
      type: Boolean,
      default: true
    }
  },

  // Attached Offer/Voucher
  offer: {
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher'
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed', 'free_shipping']
    },
    discountValue: Number,
    minimumPurchase: Number,
    expiryDays: Number
  },

  // Scheduling
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled', 'failed'],
    default: 'draft',
    index: true
  },
  scheduledFor: {
    type: Date,
    index: true
  },
  sentAt: Date,
  completedAt: Date,

  // Recurring Campaign Settings
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringSettings: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly']
    },
    dayOfWeek: Number, // 0-6 for weekly
    dayOfMonth: Number, // 1-31 for monthly
    time: String, // HH:mm format
    endDate: Date,
    lastRun: Date,
    nextRun: Date
  },

  // A/B Testing
  abTest: {
    enabled: {
      type: Boolean,
      default: false
    },
    variants: [{
      name: String,
      percentage: Number, // Percentage of audience
      subject: String,
      body: String,
      stats: {
        sent: Number,
        opened: Number,
        clicked: Number
      }
    }],
    winnerCriteria: {
      type: String,
      enum: ['open_rate', 'click_rate', 'conversion_rate']
    },
    testDuration: Number // Hours before selecting winner
  },

  // Campaign Statistics
  stats: {
    // Sending
    totalRecipients: {
      type: Number,
      default: 0
    },
    sent: {
      type: Number,
      default: 0
    },
    failed: {
      type: Number,
      default: 0
    },
    bounced: {
      type: Number,
      default: 0
    },

    // Engagement
    delivered: {
      type: Number,
      default: 0
    },
    opened: {
      type: Number,
      default: 0
    },
    uniqueOpens: {
      type: Number,
      default: 0
    },
    clicked: {
      type: Number,
      default: 0
    },
    uniqueClicks: {
      type: Number,
      default: 0
    },

    // Conversions
    converted: {
      type: Number,
      default: 0
    },
    conversionValue: {
      type: Number,
      default: 0
    },

    // Negative Actions
    unsubscribed: {
      type: Number,
      default: 0
    },
    complained: {
      type: Number,
      default: 0
    }
  },

  // Tracking Events
  events: [{
    type: {
      type: String,
      enum: ['sent', 'delivered', 'opened', 'clicked', 'converted', 'unsubscribed', 'bounced', 'complained']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: mongoose.Schema.Types.Mixed // Click URL, device info, etc.
  }],

  // Created By
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Tags for organization
  tags: [String],

  // Notes
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
campaignSchema.index({ status: 1, scheduledFor: 1 });
campaignSchema.index({ createdAt: -1 });
campaignSchema.index({ type: 1, status: 1 });
campaignSchema.index({ tags: 1 });

// Generate campaign ID before saving
campaignSchema.pre('save', async function(next) {
  if (!this.campaignId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Campaign').countDocuments();
    this.campaignId = `CAMP-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Virtual for open rate
campaignSchema.virtual('openRate').get(function() {
  if (!this.stats.delivered || this.stats.delivered === 0) return 0;
  return Math.round((this.stats.uniqueOpens / this.stats.delivered) * 100 * 10) / 10;
});

// Virtual for click rate
campaignSchema.virtual('clickRate').get(function() {
  if (!this.stats.delivered || this.stats.delivered === 0) return 0;
  return Math.round((this.stats.uniqueClicks / this.stats.delivered) * 100 * 10) / 10;
});

// Virtual for conversion rate
campaignSchema.virtual('conversionRate').get(function() {
  if (!this.stats.delivered || this.stats.delivered === 0) return 0;
  return Math.round((this.stats.converted / this.stats.delivered) * 100 * 10) / 10;
});

// Virtual for unsubscribe rate
campaignSchema.virtual('unsubscribeRate').get(function() {
  if (!this.stats.delivered || this.stats.delivered === 0) return 0;
  return Math.round((this.stats.unsubscribed / this.stats.delivered) * 100 * 10) / 10;
});

// Method to schedule campaign
campaignSchema.methods.schedule = async function(sendDate, userId) {
  if (this.status !== 'draft') {
    throw new Error('Only draft campaigns can be scheduled');
  }

  if (sendDate < new Date()) {
    throw new Error('Scheduled date must be in the future');
  }

  this.status = 'scheduled';
  this.scheduledFor = sendDate;

  return this.save();
};

// Method to cancel scheduled campaign
campaignSchema.methods.cancel = async function(userId) {
  if (!['scheduled', 'draft'].includes(this.status)) {
    throw new Error('Only scheduled or draft campaigns can be cancelled');
  }

  this.status = 'cancelled';

  return this.save();
};

// Method to record an event
campaignSchema.methods.recordEvent = async function(eventType, userId, metadata = {}) {
  this.events.push({
    type: eventType,
    user: userId,
    metadata
  });

  // Update stats
  switch (eventType) {
    case 'sent':
      this.stats.sent += 1;
      break;
    case 'delivered':
      this.stats.delivered += 1;
      break;
    case 'opened':
      this.stats.opened += 1;
      // Check if this is first open by this user
      const hasOpened = this.events.some(e =>
        e.type === 'opened' &&
        e.user &&
        e.user.toString() === userId.toString() &&
        e.timestamp < new Date()
      );
      if (!hasOpened) {
        this.stats.uniqueOpens += 1;
      }
      break;
    case 'clicked':
      this.stats.clicked += 1;
      // Check if this is first click by this user
      const hasClicked = this.events.some(e =>
        e.type === 'clicked' &&
        e.user &&
        e.user.toString() === userId.toString() &&
        e.timestamp < new Date()
      );
      if (!hasClicked) {
        this.stats.uniqueClicks += 1;
      }
      break;
    case 'converted':
      this.stats.converted += 1;
      if (metadata.value) {
        this.stats.conversionValue += metadata.value;
      }
      break;
    case 'unsubscribed':
      this.stats.unsubscribed += 1;
      break;
    case 'bounced':
      this.stats.bounced += 1;
      break;
    case 'complained':
      this.stats.complained += 1;
      break;
  }

  return this.save();
};

// Static method to find campaigns due for sending
campaignSchema.statics.findDueForSending = function() {
  return this.find({
    status: 'scheduled',
    scheduledFor: { $lte: new Date() }
  }).sort({ scheduledFor: 1 });
};

// Static method to get campaign performance summary
campaignSchema.statics.getPerformanceSummary = async function(startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        status: 'sent',
        sentAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: '$type',
        totalCampaigns: { $sum: 1 },
        totalSent: { $sum: '$stats.sent' },
        totalDelivered: { $sum: '$stats.delivered' },
        totalOpened: { $sum: '$stats.uniqueOpens' },
        totalClicked: { $sum: '$stats.uniqueClicks' },
        totalConverted: { $sum: '$stats.converted' },
        totalConversionValue: { $sum: '$stats.conversionValue' },
        totalUnsubscribed: { $sum: '$stats.unsubscribed' }
      }
    }
  ]);
};

module.exports = mongoose.model('Campaign', campaignSchema);
