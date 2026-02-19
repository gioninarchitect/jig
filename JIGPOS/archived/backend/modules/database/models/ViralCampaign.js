// Viral Campaign Model - Database persistence for viral influencer campaigns
const mongoose = require('mongoose');

const viralCampaignSchema = new mongoose.Schema({
  // Campaign Identification
  campaignId: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,

  // Campaign Type & Strategy
  campaignType: {
    type: String,
    enum: ['product_launch', 'seasonal', 'flash_sale', 'influencer_takeover', 'viral_challenge', 'bundle_promotion'],
    required: true
  },
  strategy: {
    type: String,
    enum: ['explosive_growth', 'steady_build', 'targeted_conversion', 'brand_awareness'],
    default: 'explosive_growth'
  },

  // Products & Targets
  targetProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    targetSales: Number,
    currentSales: { type: Number, default: 0 },
    viralScore: { type: Number, default: 0 }
  }],

  // Influencer Management
  influencers: [{
    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Affiliate',
      required: true
    },
    status: {
      type: String,
      enum: ['invited', 'accepted', 'active', 'completed', 'cancelled'],
      default: 'invited'
    },
    invitedAt: { type: Date, default: Date.now },
    acceptedAt: Date,
    customCommissionRate: Number, // Override default rate
    bonusTarget: Number, // Bonus if they hit this target
    bonusAmount: Number,
    specialInstructions: String,
    contentDeadline: Date,

    // Performance tracking
    uniqueViews: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    conversions: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    commission: { type: Number, default: 0 },

    // Content tracking
    contentSubmitted: [{
      type: String, // URL to content
      submittedAt: { type: Date, default: Date.now },
      platform: String,
      approved: { type: Boolean, default: false },
      views: { type: Number, default: 0 },
      engagement: { type: Number, default: 0 }
    }]
  }],

  // Campaign Timeline
  timeline: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    },
    contentDeadline: Date,
    promotionStart: Date,
    promotionEnd: Date
  },

  // Campaign Goals & KPIs
  goals: {
    totalRevenue: Number,
    totalSales: Number,
    totalReach: Number,
    totalEngagement: Number,
    viralCoefficient: Number, // Target K-factor
    conversionRate: Number // Target conversion %
  },

  // Current Performance
  performance: {
    totalRevenue: { type: Number, default: 0 },
    totalSales: { type: Number, default: 0 },
    totalReach: { type: Number, default: 0 },
    totalEngagement: { type: Number, default: 0 },
    uniqueViewers: { type: Number, default: 0 },
    clickThroughRate: { type: Number, default: 0 },
    conversionRate: { type: Number, default: 0 },
    viralCoefficient: { type: Number, default: 0 },
    costPerAcquisition: { type: Number, default: 0 },
    returnOnAdSpend: { type: Number, default: 0 }
  },

  // Budget & Costs
  budget: {
    totalBudget: Number,
    influencerPayouts: { type: Number, default: 0 },
    bonusPayouts: { type: Number, default: 0 },
    adSpend: { type: Number, default: 0 },
    productionCosts: { type: Number, default: 0 },
    remainingBudget: Number
  },

  // Viral Mechanics
  viralMechanics: {
    hashtags: [String],
    shareIncentives: {
      enabled: { type: Boolean, default: false },
      discountPercentage: Number,
      freeShippingThreshold: Number
    },
    userGeneratedContent: {
      enabled: { type: Boolean, default: false },
      rewardType: String, // 'discount', 'free_product', 'cash'
      rewardValue: Number
    },
    referralBonus: {
      enabled: { type: Boolean, default: false },
      bonusAmount: Number,
      minimumPurchase: Number
    }
  },

  // Content Guidelines
  contentGuidelines: {
    tone: String,
    keyMessages: [String],
    mustInclude: [String],
    mustAvoid: [String],
    brandGuidelines: String,
    exampleContent: [String]
  },

  // Tracking & Analytics
  tracking: {
    primaryCTAUrl: String,
    trackingPixels: [String],
    utmParameters: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String
    }
  },

  // Social Media Integration
  socialMedia: {
    platforms: [{
      platform: {
        type: String,
        enum: ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook', 'linkedin', 'whatsapp']
      },
      targetReach: Number,
      currentReach: { type: Number, default: 0 },
      posts: [{
        url: String,
        views: Number,
        likes: Number,
        shares: Number,
        comments: Number,
        postedAt: Date
      }]
    }],
    totalViralShares: { type: Number, default: 0 },
    crossPlatformReach: { type: Number, default: 0 }
  },

  // Competition & Market Analysis
  marketAnalysis: {
    competitorCampaigns: [{
      competitor: String,
      campaignType: String,
      estimatedBudget: Number,
      performance: String,
      insights: String
    }],
    trendingTopics: [String],
    seasonalFactors: [String],
    targetAudience: {
      demographics: {
        ageRange: String,
        gender: String,
        location: [String],
        interests: [String]
      },
      psychographics: {
        lifestyle: [String],
        values: [String],
        behaviors: [String]
      }
    }
  },

  // Real-time Monitoring
  realTimeData: {
    currentViralScore: { type: Number, default: 0 },
    hourlyMetrics: [{
      hour: Date,
      views: Number,
      clicks: Number,
      sales: Number,
      viralShares: Number
    }],
    alerts: [{
      type: String, // 'viral_spike', 'conversion_drop', 'budget_threshold'
      message: String,
      severity: String, // 'info', 'warning', 'critical'
      triggeredAt: { type: Date, default: Date.now },
      resolved: { type: Boolean, default: false }
    }],
    liveInfluencers: { type: Number, default: 0 },
    trending: { type: Boolean, default: false }
  },

  // Campaign Status
  status: {
    type: String,
    enum: ['planning', 'recruiting', 'active', 'monitoring', 'completed', 'cancelled', 'paused'],
    default: 'planning'
  },

  // Results & Insights
  results: {
    topPerformingInfluencer: mongoose.Schema.Types.ObjectId,
    topPerformingProduct: mongoose.Schema.Types.ObjectId,
    topPerformingPlatform: String,
    viralMoments: [{
      timestamp: Date,
      description: String,
      impact: String,
      metrics: Object
    }],
    lessonsLearned: [String],
    optimizations: [String]
  },

  // A/B Testing
  experiments: [{
    name: String,
    hypothesis: String,
    variants: [{
      name: String,
      traffic: Number, // Percentage
      performance: Object
    }],
    winner: String,
    results: Object
  }],

  // Automation Rules
  automation: {
    autoApproveInfluencers: { type: Boolean, default: false },
    autoInviteThreshold: Number, // Automatically invite influencers above this follower count
    autoPauseIfBudgetExceeds: Number,
    autoBoostIfViralThreshold: Number
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true }
});

// Indexes for efficient querying
viralCampaignSchema.index({ campaignId: 1 });
viralCampaignSchema.index({ status: 1 });
viralCampaignSchema.index({ 'timeline.startDate': 1, 'timeline.endDate': 1 });
viralCampaignSchema.index({ 'performance.totalRevenue': -1 });
viralCampaignSchema.index({ 'realTimeData.currentViralScore': -1 });

// Virtual for campaign duration
viralCampaignSchema.virtual('duration').get(function() {
  if (this.timeline.startDate && this.timeline.endDate) {
    return Math.ceil((this.timeline.endDate - this.timeline.startDate) / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for ROI calculation
viralCampaignSchema.virtual('roi').get(function() {
  const totalSpend = this.budget.influencerPayouts + this.budget.bonusPayouts + this.budget.adSpend;
  if (totalSpend > 0) {
    return ((this.performance.totalRevenue - totalSpend) / totalSpend) * 100;
  }
  return 0;
});

// Virtual for completion percentage
viralCampaignSchema.virtual('completionPercentage').get(function() {
  if (this.goals.totalRevenue && this.performance.totalRevenue) {
    return Math.min(100, (this.performance.totalRevenue / this.goals.totalRevenue) * 100);
  }
  return 0;
});

// Generate unique campaign ID
viralCampaignSchema.methods.generateCampaignId = function() {
  const prefix = 'VIRAL';
  const random = Math.random().toString(36).substr(2, 8).toUpperCase();
  return `${prefix}${random}`;
};

// Calculate overall campaign performance score
viralCampaignSchema.methods.calculatePerformanceScore = function() {
  const weights = {
    revenue: 0.30,
    reach: 0.25,
    engagement: 0.20,
    conversion: 0.15,
    viral: 0.10
  };

  // Normalize each metric to 0-100 scale
  const revenueScore = this.goals.totalRevenue ?
    Math.min(100, (this.performance.totalRevenue / this.goals.totalRevenue) * 100) : 0;

  const reachScore = this.goals.totalReach ?
    Math.min(100, (this.performance.totalReach / this.goals.totalReach) * 100) : 0;

  const engagementScore = this.goals.totalEngagement ?
    Math.min(100, (this.performance.totalEngagement / this.goals.totalEngagement) * 100) : 0;

  const conversionScore = this.goals.conversionRate ?
    Math.min(100, (this.performance.conversionRate / this.goals.conversionRate) * 100) : 0;

  const viralScore = this.goals.viralCoefficient ?
    Math.min(100, (this.performance.viralCoefficient / this.goals.viralCoefficient) * 100) : 0;

  return (
    weights.revenue * revenueScore +
    weights.reach * reachScore +
    weights.engagement * engagementScore +
    weights.conversion * conversionScore +
    weights.viral * viralScore
  );
};

// Add influencer to campaign
viralCampaignSchema.methods.addInfluencer = function(affiliateId, customCommission = null) {
  const existingInfluencer = this.influencers.find(inf => inf.affiliateId.toString() === affiliateId.toString());

  if (existingInfluencer) {
    throw new Error('Influencer already added to campaign');
  }

  this.influencers.push({
    affiliateId,
    customCommissionRate: customCommission,
    status: 'invited'
  });

  return this.save();
};

// Update real-time metrics
viralCampaignSchema.methods.updateRealTimeMetrics = async function(metrics) {
  const currentHour = new Date();
  currentHour.setMinutes(0, 0, 0);

  // Find or create hourly metric entry
  let hourlyMetric = this.realTimeData.hourlyMetrics.find(
    m => m.hour.getTime() === currentHour.getTime()
  );

  if (!hourlyMetric) {
    hourlyMetric = {
      hour: currentHour,
      views: 0,
      clicks: 0,
      sales: 0,
      viralShares: 0
    };
    this.realTimeData.hourlyMetrics.push(hourlyMetric);
  }

  // Update metrics
  hourlyMetric.views += metrics.views || 0;
  hourlyMetric.clicks += metrics.clicks || 0;
  hourlyMetric.sales += metrics.sales || 0;
  hourlyMetric.viralShares += metrics.viralShares || 0;

  // Keep only last 72 hours of data
  const cutoffTime = new Date(Date.now() - 72 * 60 * 60 * 1000);
  this.realTimeData.hourlyMetrics = this.realTimeData.hourlyMetrics
    .filter(m => m.hour > cutoffTime);

  // Check for viral spikes and create alerts
  this.checkForViralSpikes();

  return this.save();
};

// Check for viral spikes and generate alerts
viralCampaignSchema.methods.checkForViralSpikes = function() {
  const recentHours = this.realTimeData.hourlyMetrics.slice(-6); // Last 6 hours
  const avgViews = recentHours.reduce((sum, h) => sum + h.views, 0) / recentHours.length;
  const currentViews = recentHours[recentHours.length - 1]?.views || 0;

  // Viral spike if current hour is 300% above average
  if (currentViews > avgViews * 3 && avgViews > 0) {
    this.realTimeData.alerts.push({
      type: 'viral_spike',
      message: `Viral spike detected! Current hour views: ${currentViews}, Average: ${Math.round(avgViews)}`,
      severity: 'info'
    });

    this.realTimeData.trending = true;
  }

  // Budget threshold alert
  const totalSpend = this.budget.influencerPayouts + this.budget.bonusPayouts;
  if (totalSpend > this.budget.totalBudget * 0.9) {
    this.realTimeData.alerts.push({
      type: 'budget_threshold',
      message: `Campaign is at 90% of budget (${totalSpend}/${this.budget.totalBudget})`,
      severity: 'warning'
    });
  }
};

module.exports = mongoose.model('ViralCampaign', viralCampaignSchema);