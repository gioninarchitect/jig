// Marketing Preference Model - User opt-in/out preferences for marketing communications
const mongoose = require('mongoose');

const marketingPreferenceSchema = new mongoose.Schema({
  // User Reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },

  // Channel Preferences
  emailOptIn: {
    type: Boolean,
    default: true
  },
  smsOptIn: {
    type: Boolean,
    default: true
  },
  pushOptIn: {
    type: Boolean,
    default: true
  },
  whatsappOptIn: {
    type: Boolean,
    default: false
  },

  // Content Preferences
  contentPreferences: {
    promotions: {
      type: Boolean,
      default: true
    },
    newProducts: {
      type: Boolean,
      default: true
    },
    orderUpdates: {
      type: Boolean,
      default: true
    },
    newsletter: {
      type: Boolean,
      default: true
    },
    events: {
      type: Boolean,
      default: true
    },
    personalizedOffers: {
      type: Boolean,
      default: true
    },
    loyaltyUpdates: {
      type: Boolean,
      default: true
    },
    birthdayOffers: {
      type: Boolean,
      default: true
    }
  },

  // Frequency Preferences
  emailFrequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'never'],
    default: 'weekly'
  },
  smsFrequency: {
    type: String,
    enum: ['immediate', 'weekly', 'monthly', 'never'],
    default: 'weekly'
  },

  // Preferred Send Time
  preferredSendTime: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'any'],
    default: 'any'
  },
  timezone: {
    type: String,
    default: 'Africa/Johannesburg'
  },

  // Unsubscribe History
  unsubscribedAt: Date,
  unsubscribeReason: String,
  unsubscribeSource: {
    type: String,
    enum: ['email_link', 'sms_reply', 'website', 'customer_service', 'gdpr_request']
  },

  // Resubscribe History
  resubscribedAt: Date,
  resubscribeSource: String,

  // Double Opt-In
  doubleOptIn: {
    confirmed: {
      type: Boolean,
      default: false
    },
    confirmedAt: Date,
    confirmationToken: String,
    confirmationSentAt: Date
  },

  // POPIA/GDPR Compliance
  consentDate: {
    type: Date,
    default: Date.now
  },
  consentSource: {
    type: String,
    enum: ['registration', 'checkout', 'newsletter_signup', 'import', 'preference_center'],
    default: 'registration'
  },
  consentIpAddress: String,
  consentUserAgent: String,

  // Suppression
  isSuppressed: {
    type: Boolean,
    default: false,
    index: true
  },
  suppressionReason: {
    type: String,
    enum: ['bounced', 'complained', 'user_request', 'admin_action', 'legal_request']
  },
  suppressedAt: Date,

  // Engagement Tracking
  lastEmailSentAt: Date,
  lastEmailOpenedAt: Date,
  lastEmailClickedAt: Date,
  lastSmsSentAt: Date,
  lastPushSentAt: Date,

  // Engagement Score (0-100)
  engagementScore: {
    type: Number,
    default: 50,
    min: 0,
    max: 100
  },

  // Notes
  notes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
marketingPreferenceSchema.index({ emailOptIn: 1, isSuppressed: 1 });
marketingPreferenceSchema.index({ smsOptIn: 1, isSuppressed: 1 });
marketingPreferenceSchema.index({ engagementScore: -1 });

// Virtual to check if user is actively subscribed to email
marketingPreferenceSchema.virtual('isActiveEmailSubscriber').get(function() {
  return this.emailOptIn && !this.isSuppressed && this.emailFrequency !== 'never';
});

// Virtual to check if user is actively subscribed to SMS
marketingPreferenceSchema.virtual('isActiveSmsSubscriber').get(function() {
  return this.smsOptIn && !this.isSuppressed && this.smsFrequency !== 'never';
});

// Method to unsubscribe from all channels
marketingPreferenceSchema.methods.unsubscribeAll = async function(reason, source = 'website') {
  this.emailOptIn = false;
  this.smsOptIn = false;
  this.pushOptIn = false;
  this.whatsappOptIn = false;
  this.unsubscribedAt = new Date();
  this.unsubscribeReason = reason;
  this.unsubscribeSource = source;

  return this.save();
};

// Method to unsubscribe from specific channel
marketingPreferenceSchema.methods.unsubscribeChannel = async function(channel, reason, source = 'website') {
  switch (channel) {
    case 'email':
      this.emailOptIn = false;
      break;
    case 'sms':
      this.smsOptIn = false;
      break;
    case 'push':
      this.pushOptIn = false;
      break;
    case 'whatsapp':
      this.whatsappOptIn = false;
      break;
  }

  this.unsubscribedAt = new Date();
  this.unsubscribeReason = `${channel}: ${reason}`;
  this.unsubscribeSource = source;

  return this.save();
};

// Method to resubscribe
marketingPreferenceSchema.methods.resubscribe = async function(channels = ['email'], source = 'website') {
  channels.forEach(channel => {
    switch (channel) {
      case 'email':
        this.emailOptIn = true;
        break;
      case 'sms':
        this.smsOptIn = true;
        break;
      case 'push':
        this.pushOptIn = true;
        break;
      case 'whatsapp':
        this.whatsappOptIn = true;
        break;
    }
  });

  this.resubscribedAt = new Date();
  this.resubscribeSource = source;
  this.isSuppressed = false;
  this.suppressionReason = undefined;

  return this.save();
};

// Method to suppress user
marketingPreferenceSchema.methods.suppress = async function(reason) {
  this.isSuppressed = true;
  this.suppressionReason = reason;
  this.suppressedAt = new Date();

  return this.save();
};

// Method to update engagement score based on activity
marketingPreferenceSchema.methods.updateEngagementScore = async function(activityType) {
  const scoreChanges = {
    email_opened: 5,
    email_clicked: 10,
    sms_clicked: 10,
    push_clicked: 10,
    purchase: 15,
    no_activity_30d: -10,
    no_activity_60d: -20,
    unsubscribe: -30
  };

  const change = scoreChanges[activityType] || 0;
  this.engagementScore = Math.max(0, Math.min(100, this.engagementScore + change));

  // Update last activity timestamps
  const now = new Date();
  switch (activityType) {
    case 'email_opened':
      this.lastEmailOpenedAt = now;
      break;
    case 'email_clicked':
      this.lastEmailClickedAt = now;
      break;
  }

  return this.save();
};

// Static method to get or create preferences for a user
marketingPreferenceSchema.statics.getOrCreate = async function(userId) {
  let preference = await this.findOne({ user: userId });

  if (!preference) {
    preference = new this({ user: userId });
    await preference.save();
  }

  return preference;
};

// Static method to find users who can receive marketing
marketingPreferenceSchema.statics.findActiveSubscribers = function(channel = 'email', filters = {}) {
  const query = {
    isSuppressed: false
  };

  switch (channel) {
    case 'email':
      query.emailOptIn = true;
      query.emailFrequency = { $ne: 'never' };
      break;
    case 'sms':
      query.smsOptIn = true;
      query.smsFrequency = { $ne: 'never' };
      break;
    case 'push':
      query.pushOptIn = true;
      break;
  }

  if (filters.minEngagementScore) {
    query.engagementScore = { $gte: filters.minEngagementScore };
  }

  return this.find(query).populate('user', 'firstName lastName email profile.phone');
};

// Static method to get subscription stats
marketingPreferenceSchema.statics.getSubscriptionStats = async function() {
  const total = await this.countDocuments();
  const emailSubscribers = await this.countDocuments({ emailOptIn: true, isSuppressed: false });
  const smsSubscribers = await this.countDocuments({ smsOptIn: true, isSuppressed: false });
  const pushSubscribers = await this.countDocuments({ pushOptIn: true, isSuppressed: false });
  const suppressed = await this.countDocuments({ isSuppressed: true });

  const avgEngagement = await this.aggregate([
    { $match: { isSuppressed: false } },
    { $group: { _id: null, avgScore: { $avg: '$engagementScore' } } }
  ]);

  return {
    total,
    emailSubscribers,
    smsSubscribers,
    pushSubscribers,
    suppressed,
    averageEngagementScore: avgEngagement[0]?.avgScore || 0
  };
};

module.exports = mongoose.model('MarketingPreference', marketingPreferenceSchema);
