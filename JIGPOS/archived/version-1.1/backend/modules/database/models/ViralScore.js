// Viral Score Model based on Epidemiological Formula
const mongoose = require('mongoose');

const viralScoreSchema = new mongoose.Schema({
  // Entity being scored
  entityType: {
    type: String,
    enum: ['product', 'category', 'hamper', 'affiliate', 'campaign'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'entityType'
  },
  
  // Core Viral Metrics (Based on Healthcare Model)
  metrics: {
    // Engagement Velocity (EV) ~ Infection Rate
    engagementVelocity: {
      views: { type: Number, default: 0 },
      cartAdds: { type: Number, default: 0 },
      purchases: { type: Number, default: 0 },
      shares: { type: Number, default: 0 },
      timeWindow: { type: Number, default: 24 }, // hours
      score: { type: Number, default: 0 } // Calculated EV score
    },
    
    // Purchase Conversion Rate (PCR) ~ Transmission Rate
    conversionRate: {
      totalViews: { type: Number, default: 0 },
      totalPurchases: { type: Number, default: 0 },
      rate: { type: Number, default: 0 }, // purchases/views
      score: { type: Number, default: 0 }
    },
    
    // Retention Rate (RR) ~ Recovery/Containment Rate
    retentionRate: {
      repeatPurchases: { type: Number, default: 0 },
      avgTimeOnProduct: { type: Number, default: 0 }, // seconds
      reviewScore: { type: Number, default: 0 }, // 1-5 stars
      returnRate: { type: Number, default: 0 }, // % of returns
      score: { type: Number, default: 0 }
    },
    
    // Trend Relevance (TR) ~ Population Susceptibility
    trendRelevance: {
      trendingCategories: [String],
      searchVolume: { type: Number, default: 0 },
      competitorActivity: { type: Number, default: 0 },
      seasonalFactor: { type: Number, default: 1 },
      score: { type: Number, default: 0 }
    },
    
    // Influencer Factor Impact (IFI) ~ Environmental Factors
    influencerImpact: {
      affiliatePromotions: { type: Number, default: 0 },
      influencerReach: { type: Number, default: 0 },
      socialShares: { type: Number, default: 0 },
      affiliateConversions: { type: Number, default: 0 },
      score: { type: Number, default: 0 }
    }
  },
  
  // Calculated Viral Score (0-100)
  viralScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Viral Trajectory Prediction
  trajectory: {
    trending: {
      type: String,
      enum: ['explosive', 'rising', 'steady', 'declining', 'dormant'],
      default: 'dormant'
    },
    peakPrediction: Date,
    confidenceLevel: { type: Number, default: 0 } // 0-1
  },
  
  // Network Effect Tracking
  networkEffect: {
    primaryInfluencers: [{
      affiliateId: mongoose.Schema.Types.ObjectId,
      impact: Number,
      conversions: Number
    }],
    secondarySpread: { type: Number, default: 0 }, // shares of shares
    viralCoefficient: { type: Number, default: 0 } // K-factor
  },
  
  // Recommendations
  recommendations: {
    targetAudience: [String],
    suggestedInfluencers: [{
      affiliateId: mongoose.Schema.Types.ObjectId,
      matchScore: Number,
      reason: String
    }],
    optimalPromotionTime: Date,
    suggestedBundles: [mongoose.Schema.Types.ObjectId]
  },
  
  // Historical Performance
  history: [{
    date: { type: Date, default: Date.now },
    viralScore: Number,
    metrics: Object,
    events: [String] // Notable events affecting score
  }],
  
  // Meta
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  nextCalculation: Date,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for efficient querying
viralScoreSchema.index({ viralScore: -1 });
viralScoreSchema.index({ entityType: 1, entityId: 1 });
viralScoreSchema.index({ 'trajectory.trending': 1 });
viralScoreSchema.index({ lastCalculated: 1 });

// Calculate Viral Score Method
viralScoreSchema.methods.calculateViralScore = function() {
  const weights = {
    engagementVelocity: 0.40,
    conversionRate: 0.25,
    retentionRate: 0.20,
    trendRelevance: 0.10,
    influencerImpact: 0.05
  };
  
  // Calculate individual scores (0-100 scale)
  this.calculateEngagementVelocity();
  this.calculateConversionRate();
  this.calculateRetentionRate();
  this.calculateTrendRelevance();
  this.calculateInfluencerImpact();
  
  // Apply weighted formula
  this.viralScore = 
    (weights.engagementVelocity * this.metrics.engagementVelocity.score) +
    (weights.conversionRate * this.metrics.conversionRate.score) +
    (weights.retentionRate * this.metrics.retentionRate.score) +
    (weights.trendRelevance * this.metrics.trendRelevance.score) +
    (weights.influencerImpact * this.metrics.influencerImpact.score);
  
  // Determine trajectory
  this.determineTrajectory();
  
  // Calculate viral coefficient (K-factor)
  this.calculateViralCoefficient();
  
  return this.viralScore;
};

// Calculate Engagement Velocity Score
viralScoreSchema.methods.calculateEngagementVelocity = function() {
  const { views, cartAdds, purchases, shares, timeWindow } = this.metrics.engagementVelocity;
  
  // Total engagements per hour
  const totalEngagements = views + (cartAdds * 2) + (purchases * 5) + (shares * 3);
  const engagementsPerHour = totalEngagements / timeWindow;
  
  // Normalize to 0-100 scale (assuming 1000+ engagements/hour = 100)
  this.metrics.engagementVelocity.score = Math.min(100, (engagementsPerHour / 1000) * 100);
};

// Calculate Conversion Rate Score
viralScoreSchema.methods.calculateConversionRate = function() {
  const { totalViews, totalPurchases } = this.metrics.conversionRate;
  
  if (totalViews === 0) {
    this.metrics.conversionRate.score = 0;
    return;
  }
  
  const rate = totalPurchases / totalViews;
  this.metrics.conversionRate.rate = rate;
  
  // Industry average is ~2%, excellent is 10%+
  this.metrics.conversionRate.score = Math.min(100, (rate * 1000)); // 10% = 100 score
};

// Calculate Retention Rate Score
viralScoreSchema.methods.calculateRetentionRate = function() {
  const { repeatPurchases, avgTimeOnProduct, reviewScore, returnRate } = this.metrics.retentionRate;
  
  // Combine multiple retention factors
  const repeatScore = Math.min(100, repeatPurchases * 10); // 10+ repeats = 100
  const timeScore = Math.min(100, (avgTimeOnProduct / 300) * 100); // 5 min = 100
  const reviewNormalized = (reviewScore / 5) * 100; // 5 stars = 100
  const returnPenalty = Math.max(0, 100 - (returnRate * 200)); // 50% returns = 0
  
  this.metrics.retentionRate.score = (repeatScore + timeScore + reviewNormalized + returnPenalty) / 4;
};

// Calculate Trend Relevance Score
viralScoreSchema.methods.calculateTrendRelevance = function() {
  const { searchVolume, competitorActivity, seasonalFactor, trendingCategories } = this.metrics.trendRelevance;
  
  const searchScore = Math.min(100, (searchVolume / 10000) * 100); // 10k searches = 100
  const competitorScore = Math.min(100, competitorActivity * 10); // 10 competitors = 100
  const trendScore = trendingCategories.length * 20; // Each trending category adds 20
  
  this.metrics.trendRelevance.score = ((searchScore + competitorScore + trendScore) / 3) * seasonalFactor;
};

// Calculate Influencer Impact Score
viralScoreSchema.methods.calculateInfluencerImpact = function() {
  const { affiliatePromotions, influencerReach, socialShares, affiliateConversions } = this.metrics.influencerImpact;
  
  const promotionScore = Math.min(100, affiliatePromotions * 5); // 20 promotions = 100
  const reachScore = Math.min(100, (influencerReach / 100000) * 100); // 100k reach = 100
  const shareScore = Math.min(100, (socialShares / 1000) * 100); // 1k shares = 100
  const conversionScore = Math.min(100, affiliateConversions * 2); // 50 conversions = 100
  
  this.metrics.influencerImpact.score = (promotionScore + reachScore + shareScore + conversionScore) / 4;
};

// Determine Viral Trajectory
viralScoreSchema.methods.determineTrajectory = function() {
  const currentScore = this.viralScore;
  const previousScore = this.history.length > 0 ? this.history[this.history.length - 1].viralScore : 0;
  const scoreDelta = currentScore - previousScore;
  const deltaPercentage = previousScore > 0 ? (scoreDelta / previousScore) * 100 : 0;
  
  if (deltaPercentage > 50 && currentScore > 70) {
    this.trajectory.trending = 'explosive';
  } else if (deltaPercentage > 20 && currentScore > 50) {
    this.trajectory.trending = 'rising';
  } else if (Math.abs(deltaPercentage) < 10) {
    this.trajectory.trending = 'steady';
  } else if (deltaPercentage < -20) {
    this.trajectory.trending = 'declining';
  } else {
    this.trajectory.trending = 'dormant';
  }
  
  // Predict peak (simplified - could use ML model)
  if (this.trajectory.trending === 'explosive' || this.trajectory.trending === 'rising') {
    const growthRate = deltaPercentage / 100;
    const daysToSaturation = Math.log(100 / currentScore) / Math.log(1 + growthRate);
    this.trajectory.peakPrediction = new Date(Date.now() + daysToSaturation * 24 * 60 * 60 * 1000);
    this.trajectory.confidenceLevel = Math.min(0.9, this.history.length / 10); // More history = more confidence
  }
};

// Calculate Viral Coefficient (K-factor)
viralScoreSchema.methods.calculateViralCoefficient = function() {
  const invites = this.metrics.engagementVelocity.shares;
  const conversionRate = this.metrics.conversionRate.rate;
  
  // K = invites * conversion rate
  this.networkEffect.viralCoefficient = invites * conversionRate;
};

// Find similar products for bundling
viralScoreSchema.methods.findComplementaryProducts = async function() {
  const similarScores = await this.constructor.find({
    entityType: 'product',
    viralScore: { $gte: this.viralScore - 10, $lte: this.viralScore + 10 },
    _id: { $ne: this._id }
  }).limit(5);
  
  return similarScores.map(s => s.entityId);
};

module.exports = mongoose.model('ViralScore', viralScoreSchema);