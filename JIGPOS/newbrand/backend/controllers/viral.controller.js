// Viral Score Controller — Business logic for viral scoring and recommendation engine
const logger = require('../modules/logger');
const ViralScore = require('../modules/database/models/ViralScore');
const Product = require('../modules/database/models/Product');
const Affiliate = require('../modules/database/models/Affiliate');
const Order = require('../modules/database/models/Order');
const ViralCampaign = require('../modules/database/models/ViralCampaign');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function updateProductMetrics(viralScore, productId) {
  const product = await Product.findById(productId);
  const orders = await Order.find({ 'items.product': productId });

  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter(o => o.createdAt > dayAgo);

  viralScore.metrics.engagementVelocity.views = product.analytics?.views || 0;
  viralScore.metrics.engagementVelocity.purchases = recentOrders.length;
  viralScore.metrics.engagementVelocity.cartAdds = product.analytics?.cartAdds || 0;

  viralScore.metrics.conversionRate.totalViews = product.analytics?.totalViews || 1;
  viralScore.metrics.conversionRate.totalPurchases = orders.length;

  const customerPurchases = {};
  orders.forEach(order => {
    const email = order.customer?.email;
    if (email) {
      customerPurchases[email] = (customerPurchases[email] || 0) + 1;
    }
  });

  const repeatCustomers = Object.values(customerPurchases).filter(count => count > 1).length;
  viralScore.metrics.retentionRate.repeatPurchases = repeatCustomers;
  viralScore.metrics.retentionRate.reviewScore = product.rating || 0;

  viralScore.metrics.trendRelevance.trendingCategories = product.categories || [];
  viralScore.metrics.trendRelevance.searchVolume = product.analytics?.searches || 0;

  const affiliateOrders = orders.filter(o => o.affiliateCode);
  viralScore.metrics.influencerImpact.affiliateConversions = affiliateOrders.length;
}

async function updateCategoryMetrics(viralScore, categoryId) {
  // Aggregate products in category
}

async function updateAffiliateMetrics(viralScore, affiliateId) {
  const affiliate = await Affiliate.findById(affiliateId);
  if (affiliate) {
    viralScore.metrics.influencerImpact.influencerReach = affiliate.metrics.totalFollowers || 0;
    viralScore.metrics.influencerImpact.affiliatePromotions = affiliate.links?.length || 0;
  }
}

async function findBestInfluencers(productScore) {
  const affiliates = await Affiliate.find({ status: 'active' })
    .sort({ 'metrics.totalSales': -1 })
    .limit(20);

  const scored = affiliates.map(affiliate => ({
    affiliateId: affiliate._id,
    username: affiliate.username,
    matchScore: calculateAffiliateProductMatch(productScore, affiliate),
    reason: determineMatchReason(productScore, affiliate)
  }));

  return scored.sort((a, b) => b.matchScore - a.matchScore).slice(0, 5);
}

function calculateAffiliateProductMatch(productScore, affiliate) {
  let score = 0;
  if (affiliate.metrics.conversionRate > 0.05) score += 30;
  if (affiliate.metrics.totalFollowers > 10000) score += 20;
  if (affiliate.type === 'influencer') score += 15;
  if (productScore.trajectory.trending === 'explosive') {
    score += affiliate.metrics.totalFollowers > 50000 ? 35 : 15;
  }
  return Math.min(100, score);
}

function determineMatchReason(productScore, affiliate) {
  if (affiliate.metrics.totalFollowers > 50000) return 'High reach influencer perfect for viral products';
  if (affiliate.metrics.conversionRate > 0.1) return 'High conversion specialist';
  if (productScore.trajectory.trending === 'rising') return 'Growth accelerator for rising products';
  return 'General match';
}

function calculatePromotionStrategy(productScore) {
  const strategy = {
    urgency: 'normal', recommendedDiscount: 0, promotionChannels: [], timing: 'immediate'
  };
  if (productScore.trajectory.trending === 'explosive') {
    strategy.urgency = 'high';
    strategy.recommendedDiscount = 10;
    strategy.promotionChannels = ['instagram', 'tiktok', 'whatsapp'];
    strategy.timing = 'immediate';
  } else if (productScore.trajectory.trending === 'rising') {
    strategy.urgency = 'medium';
    strategy.recommendedDiscount = 15;
    strategy.promotionChannels = ['instagram', 'email'];
    strategy.timing = 'peak_hours';
  }
  return strategy;
}

function calculateEstimatedReach(productScore, influencers) {
  const baseReach = productScore.metrics.engagementVelocity.views || 0;
  const influencerReach = influencers.reduce((sum, inf) => sum + (inf.followers || 0), 0);
  const viralMultiplier = productScore.networkEffect.viralCoefficient || 1;
  return Math.floor((baseReach + influencerReach) * viralMultiplier);
}

function calculatePredictedConversions(productScore, influencers) {
  const conversionRate = productScore.metrics.conversionRate.rate || 0.02;
  const estimatedReach = calculateEstimatedReach(productScore, influencers);
  return Math.floor(estimatedReach * conversionRate);
}

async function calculateInfluencerMatchScore(productScore, affiliate) {
  let score = 0;
  const followerScore = Math.min(25, (affiliate.metrics.totalFollowers / 100000) * 25);
  score += followerScore;
  const engagementRate = calculateEngagementRate(affiliate);
  score += Math.min(25, engagementRate * 250);
  const conversionScore = Math.min(25, affiliate.metrics.conversionRate * 500);
  score += conversionScore;
  const categoryMatch = calculateCategoryMatch(productScore, affiliate);
  score += categoryMatch * 25;
  return score;
}

function calculateEngagementRate(affiliate) {
  if (!affiliate.metrics.totalFollowers) return 0;
  const totalEngagements = affiliate.metrics.totalClicks + (affiliate.metrics.totalSales * 10);
  return totalEngagements / affiliate.metrics.totalFollowers;
}

function calculateCategoryMatch(productScore, affiliate) {
  if (!productScore.metrics.trendRelevance.trendingCategories) return 0.5;
  return 0.7;
}

function calculateEstimatedImpact(productScore, affiliate) {
  const reach = affiliate.metrics.totalFollowers || 0;
  const conversionRate = affiliate.metrics.conversionRate || 0.02;
  const viralBoost = productScore.networkEffect.viralCoefficient || 1;
  return {
    estimatedReach: Math.floor(reach * viralBoost),
    estimatedConversions: Math.floor(reach * conversionRate * viralBoost),
    estimatedRevenue: Math.floor(reach * conversionRate * viralBoost * 500)
  };
}

function calculateRecommendedCommission(matchScore) {
  if (matchScore > 80) return 12;
  if (matchScore > 60) return 15;
  if (matchScore > 40) return 18;
  return 20;
}

async function calculateOverallViralCoefficient() {
  const scores = await ViralScore.find({ entityType: 'product' });
  const totalK = scores.reduce((sum, score) => sum + (score.networkEffect.viralCoefficient || 0), 0);
  return scores.length > 0 ? totalK / scores.length : 0;
}

async function calculateAverageViralScore() {
  const result = await ViralScore.aggregate([
    { $match: { entityType: 'product' } },
    { $group: { _id: null, avgScore: { $avg: '$viralScore' } } }
  ]);
  return result[0]?.avgScore || 0;
}

function formatTrendingProduct(scoreDoc) {
  return {
    productId: scoreDoc.entityId,
    viralScore: scoreDoc.viralScore,
    trajectory: scoreDoc.trajectory.trending,
    metrics: {
      engagement: scoreDoc.metrics.engagementVelocity.score,
      conversion: scoreDoc.metrics.conversionRate.score,
      influencerImpact: scoreDoc.metrics.influencerImpact.score
    }
  };
}

async function populateInfluencerData(topInfluencers) {
  return Promise.all(topInfluencers.map(async (inf) => {
    const affiliate = await Affiliate.findById(inf._id);
    return {
      affiliate: affiliate ? { id: affiliate._id, username: affiliate.username, type: affiliate.type } : null,
      impact: inf.totalImpact,
      conversions: inf.totalConversions
    };
  }));
}

async function getHotProducts() {
  return ViralScore.find({
    entityType: 'product',
    'trajectory.trending': 'explosive'
  }).sort({ viralScore: -1 }).limit(3).select('entityId viralScore');
}

async function getRisingCategories() {
  const categories = await ViralScore.aggregate([
    { $match: { entityType: 'product' } },
    { $unwind: '$metrics.trendRelevance.trendingCategories' },
    {
      $group: {
        _id: '$metrics.trendRelevance.trendingCategories',
        avgScore: { $avg: '$viralScore' },
        count: { $sum: 1 }
      }
    },
    { $sort: { avgScore: -1 } },
    { $limit: 5 }
  ]);
  return categories;
}

async function getOptimalPromotionTimes() {
  return { weekday: 'Thursday', timeSlot: '19:00-21:00', timezone: 'SAST' };
}

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// Calculate/Update Viral Score for a Product
exports.calculate = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    let viralScore = await ViralScore.findOne({ entityType, entityId });
    if (!viralScore) {
      viralScore = new ViralScore({ entityType, entityId });
    }

    if (entityType === 'product') await updateProductMetrics(viralScore, entityId);
    else if (entityType === 'category') await updateCategoryMetrics(viralScore, entityId);
    else if (entityType === 'affiliate') await updateAffiliateMetrics(viralScore, entityId);

    const score = viralScore.calculateViralScore();

    viralScore.history.push({ date: new Date(), viralScore: score, metrics: viralScore.metrics });
    if (viralScore.history.length > 30) {
      viralScore.history = viralScore.history.slice(-30);
    }

    viralScore.lastCalculated = new Date();
    viralScore.nextCalculation = new Date(Date.now() + 3600000);

    await viralScore.save();

    res.json({
      success: true,
      viralScore: score,
      trajectory: viralScore.trajectory,
      networkEffect: viralScore.networkEffect,
      recommendations: viralScore.recommendations
    });
  } catch (error) {
    logger.error('Calculate viral score error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to calculate viral score' });
  }
};

// Get Top Viral Products
exports.getTrendingProducts = async (req, res) => {
  try {
    const { limit = 10, category, minScore = 50 } = req.query;

    const query = {
      entityType: 'product',
      viralScore: { $gte: minScore },
      isActive: true,
      'trajectory.trending': { $in: ['explosive', 'rising'] }
    };

    const trending = await ViralScore.find(query)
      .sort({ viralScore: -1 })
      .limit(parseInt(limit))
      .populate('entityId');

    const products = await Promise.all(trending.map(async (score) => {
      const product = await Product.findById(score.entityId);
      return {
        product,
        viralScore: score.viralScore,
        trajectory: score.trajectory,
        influencerImpact: score.metrics.influencerImpact
      };
    }));

    res.json({ trending: products, totalFound: trending.length });
  } catch (error) {
    logger.error('Get trending products error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get trending products' });
  }
};

// Get Product Recommendations Based on Viral Score
exports.getRecommendations = async (req, res) => {
  try {
    const { productId } = req.params;

    const productScore = await ViralScore.findOne({ entityType: 'product', entityId: productId });
    if (!productScore) {
      return res.status(404).json({ error: 'Product viral score not found' });
    }

    const similarProducts = await productScore.findComplementaryProducts();
    const influencers = await findBestInfluencers(productScore);
    const strategy = calculatePromotionStrategy(productScore);

    res.json({
      product: { id: productId, viralScore: productScore.viralScore, trajectory: productScore.trajectory },
      recommendations: {
        bundleWith: similarProducts,
        targetInfluencers: influencers,
        promotionStrategy: strategy,
        estimatedReach: calculateEstimatedReach(productScore, influencers),
        predictedConversions: calculatePredictedConversions(productScore, influencers)
      }
    });
  } catch (error) {
    logger.error('Get recommendations error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
};

// Match Affiliates/Influencers with Products
exports.matchInfluencers = async (req, res) => {
  try {
    const { productId, minFollowers = 1000, category } = req.body;

    const productScore = await ViralScore.findOne({ entityType: 'product', entityId: productId });
    if (!productScore) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const affiliates = await Affiliate.find({
      status: 'active',
      'metrics.totalFollowers': { $gte: minFollowers }
    });

    const matches = await Promise.all(affiliates.map(async (affiliate) => {
      const matchScore = await calculateInfluencerMatchScore(productScore, affiliate);
      return {
        affiliate: {
          id: affiliate._id, username: affiliate.username,
          type: affiliate.type, followers: affiliate.metrics.totalFollowers,
          engagementRate: calculateEngagementRate(affiliate)
        },
        matchScore,
        estimatedImpact: calculateEstimatedImpact(productScore, affiliate),
        recommendedCommission: calculateRecommendedCommission(matchScore)
      };
    }));

    matches.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ topMatches: matches.slice(0, 10), totalFound: matches.length });
  } catch (error) {
    logger.error('Match influencers error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to match influencers' });
  }
};

// Track Viral Spread (Network Effect)
exports.trackSpread = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { referrer, affiliateCode, shareSource } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    for (const item of order.items) {
      const viralScore = await ViralScore.findOne({ entityType: 'product', entityId: item.product });

      if (viralScore) {
        if (affiliateCode) {
          const affiliate = await Affiliate.findOne({ affiliateCode });
          if (affiliate) {
            viralScore.networkEffect.primaryInfluencers.push({
              affiliateId: affiliate._id, impact: 1, conversions: 1
            });
            viralScore.metrics.influencerImpact.affiliateConversions++;
            viralScore.metrics.influencerImpact.affiliatePromotions++;
          }
        }

        if (shareSource) {
          viralScore.networkEffect.secondarySpread++;
          viralScore.metrics.influencerImpact.socialShares++;
        }

        viralScore.calculateViralScore();
        await viralScore.save();
      }
    }

    res.json({ success: true, message: 'Viral spread tracked successfully' });
  } catch (error) {
    logger.error('Track spread error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to track viral spread' });
  }
};

// Get Viral Analytics Dashboard Data
exports.getAnalyticsDashboard = async (req, res) => {
  try {
    const trendingProducts = await ViralScore.find({
      entityType: 'product',
      'trajectory.trending': { $in: ['explosive', 'rising'] }
    }).sort({ viralScore: -1 }).limit(5).populate('entityId');

    const topInfluencers = await ViralScore.aggregate([
      { $match: { entityType: 'product' } },
      { $unwind: '$networkEffect.primaryInfluencers' },
      {
        $group: {
          _id: '$networkEffect.primaryInfluencers.affiliateId',
          totalImpact: { $sum: '$networkEffect.primaryInfluencers.impact' },
          totalConversions: { $sum: '$networkEffect.primaryInfluencers.conversions' }
        }
      },
      { $sort: { totalImpact: -1 } },
      { $limit: 10 }
    ]);

    const viralCoefficient = await calculateOverallViralCoefficient();

    const trajectoryDistribution = await ViralScore.aggregate([
      { $match: { entityType: 'product' } },
      { $group: { _id: '$trajectory.trending', count: { $sum: 1 } } }
    ]);

    res.json({
      metrics: {
        averageViralScore: await calculateAverageViralScore(),
        viralCoefficient,
        totalViralProducts: await ViralScore.countDocuments({
          entityType: 'product', viralScore: { $gte: 50 }
        })
      },
      trendingProducts: trendingProducts.map(formatTrendingProduct),
      topInfluencers: await populateInfluencerData(topInfluencers),
      trajectoryDistribution,
      recommendations: {
        hotProducts: await getHotProducts(),
        risingCategories: await getRisingCategories(),
        optimalPromotionTimes: await getOptimalPromotionTimes()
      }
    });
  } catch (error) {
    logger.error('Get analytics dashboard error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get analytics data' });
  }
};

// Create Viral Campaign
exports.createCampaign = async (req, res) => {
  try {
    const { name, description, campaignType, strategy, targetProducts, timeline, goals, budget, contentGuidelines } = req.body;

    const campaign = new ViralCampaign({
      name, description, campaignType, strategy, targetProducts,
      timeline, goals, budget, contentGuidelines,
      createdBy: req.user?.id || '507f1f77bcf86cd799439011'
    });

    campaign.campaignId = campaign.generateCampaignId();
    let existingCampaign = await ViralCampaign.findOne({ campaignId: campaign.campaignId });
    while (existingCampaign) {
      campaign.campaignId = campaign.generateCampaignId();
      existingCampaign = await ViralCampaign.findOne({ campaignId: campaign.campaignId });
    }

    await campaign.save();

    res.status(201).json({
      success: true,
      campaign: {
        id: campaign._id, campaignId: campaign.campaignId,
        name: campaign.name, status: campaign.status, timeline: campaign.timeline
      },
      message: 'Viral campaign created successfully'
    });
  } catch (error) {
    logger.error('Create campaign error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create viral campaign' });
  }
};

// Get All Campaigns
exports.getCampaigns = async (req, res) => {
  try {
    const { status, limit = 20, offset = 0 } = req.query;

    const query = {};
    if (status) query.status = status;

    const campaigns = await ViralCampaign.find(query)
      .populate('targetProducts.productId', 'name price images')
      .populate('influencers.affiliateId', 'username affiliateType metrics')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset));

    const total = await ViralCampaign.countDocuments(query);

    res.json({
      campaigns: campaigns.map(campaign => ({
        id: campaign._id, campaignId: campaign.campaignId,
        name: campaign.name, status: campaign.status,
        performance: campaign.performance, timeline: campaign.timeline,
        influencerCount: campaign.influencers.length,
        productCount: campaign.targetProducts.length,
        roi: campaign.roi, completionPercentage: campaign.completionPercentage
      })),
      pagination: {
        total, limit: parseInt(limit), offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    logger.error('Get campaigns error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
};

// Get Campaign Details
exports.getCampaignDetails = async (req, res) => {
  try {
    const { campaignId } = req.params;

    const campaign = await ViralCampaign.findOne({
      $or: [{ campaignId }, { _id: campaignId }]
    })
    .populate('targetProducts.productId')
    .populate('influencers.affiliateId', 'username fullName affiliateType socialMedia metrics')
    .populate('createdBy', 'username email');

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    res.json({
      campaign: {
        ...campaign.toObject(),
        performanceScore: campaign.calculatePerformanceScore(),
        roi: campaign.roi,
        duration: campaign.duration,
        completionPercentage: campaign.completionPercentage
      }
    });
  } catch (error) {
    logger.error('Get campaign details error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get campaign details' });
  }
};

// Add Influencer to Campaign
exports.addInfluencer = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { affiliateId, customCommissionRate, bonusTarget, bonusAmount } = req.body;

    const campaign = await ViralCampaign.findOne({
      $or: [{ campaignId }, { _id: campaignId }]
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate || affiliate.status !== 'active') {
      return res.status(400).json({ error: 'Invalid or inactive affiliate' });
    }

    campaign.influencers.push({
      affiliateId, customCommissionRate, bonusTarget, bonusAmount, status: 'invited'
    });

    await campaign.save();

    res.json({
      success: true,
      message: 'Influencer added to campaign successfully',
      influencer: { affiliateId, username: affiliate.username, status: 'invited' }
    });
  } catch (error) {
    logger.error('Add influencer error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to add influencer to campaign' });
  }
};

// Update Campaign Performance
exports.trackCampaign = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { affiliateId, metrics } = req.body;

    const campaign = await ViralCampaign.findOne({
      $or: [{ campaignId }, { _id: campaignId }]
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const influencer = campaign.influencers.find(
      inf => inf.affiliateId.toString() === affiliateId
    );

    if (influencer) {
      influencer.clicks += metrics.clicks || 0;
      influencer.conversions += metrics.conversions || 0;
      influencer.revenue += metrics.revenue || 0;
      influencer.uniqueViews += metrics.views || 0;
    }

    campaign.performance.totalReach += metrics.views || 0;
    campaign.performance.totalEngagement += metrics.clicks || 0;
    campaign.performance.totalSales += metrics.conversions || 0;
    campaign.performance.totalRevenue += metrics.revenue || 0;

    await campaign.updateRealTimeMetrics(metrics);

    res.json({
      success: true,
      message: 'Campaign metrics updated successfully',
      performance: campaign.performance
    });
  } catch (error) {
    logger.error('Track campaign error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to track campaign metrics' });
  }
};

// Get Campaign Analytics
exports.getCampaignAnalytics = async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { timeframe = '24h' } = req.query;

    const campaign = await ViralCampaign.findOne({
      $or: [{ campaignId }, { _id: campaignId }]
    })
    .populate('influencers.affiliateId', 'username affiliateType')
    .populate('targetProducts.productId', 'name price');

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const analytics = {
      overview: {
        performanceScore: campaign.calculatePerformanceScore(),
        roi: campaign.roi,
        completionPercentage: campaign.completionPercentage,
        status: campaign.status,
        daysRemaining: Math.max(0, Math.ceil((campaign.timeline.endDate - new Date()) / (1000 * 60 * 60 * 24)))
      },
      performance: campaign.performance,
      topInfluencers: campaign.influencers
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(inf => ({
          username: inf.affiliateId?.username,
          revenue: inf.revenue, conversions: inf.conversions, clicks: inf.clicks
        })),
      topProducts: campaign.targetProducts
        .sort((a, b) => b.currentSales - a.currentSales)
        .slice(0, 5)
        .map(prod => ({
          name: prod.productId?.name,
          targetSales: prod.targetSales, currentSales: prod.currentSales,
          progress: prod.targetSales ? (prod.currentSales / prod.targetSales) * 100 : 0
        })),
      hourlyMetrics: campaign.realTimeData.hourlyMetrics.slice(-24),
      alerts: campaign.realTimeData.alerts.filter(alert => !alert.resolved)
    };

    res.json({ analytics });
  } catch (error) {
    logger.error('Get campaign analytics error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get campaign analytics' });
  }
};

// Get Live Campaign Dashboard
exports.getLiveDashboard = async (req, res) => {
  try {
    const activeCampaigns = await ViralCampaign.find({
      status: { $in: ['active', 'monitoring'] }
    })
    .select('campaignId name performance realTimeData timeline')
    .sort({ 'realTimeData.currentViralScore': -1 })
    .limit(10);

    const trendingCampaigns = activeCampaigns.filter(campaign => campaign.realTimeData.trending);

    const totals = activeCampaigns.reduce((acc, campaign) => {
      acc.totalRevenue += campaign.performance.totalRevenue;
      acc.totalSales += campaign.performance.totalSales;
      acc.totalReach += campaign.performance.totalReach;
      acc.totalEngagement += campaign.performance.totalEngagement;
      return acc;
    }, { totalRevenue: 0, totalSales: 0, totalReach: 0, totalEngagement: 0 });

    const recentAlerts = [];
    activeCampaigns.forEach(campaign => {
      const campaignAlerts = campaign.realTimeData.alerts
        .filter(alert => !alert.resolved)
        .map(alert => ({
          ...alert.toObject(),
          campaignName: campaign.name,
          campaignId: campaign.campaignId
        }));
      recentAlerts.push(...campaignAlerts);
    });

    res.json({
      dashboard: {
        totals,
        activeCampaigns: activeCampaigns.length,
        trendingCampaigns: trendingCampaigns.length,
        campaigns: activeCampaigns.map(campaign => ({
          campaignId: campaign.campaignId, name: campaign.name,
          performance: campaign.performance,
          viralScore: campaign.realTimeData.currentViralScore,
          trending: campaign.realTimeData.trending,
          daysRemaining: Math.max(0, Math.ceil((campaign.timeline.endDate - new Date()) / (1000 * 60 * 60 * 24)))
        })),
        trending: trendingCampaigns.map(campaign => ({
          campaignId: campaign.campaignId, name: campaign.name,
          viralScore: campaign.realTimeData.currentViralScore
        })),
        alerts: recentAlerts.slice(0, 10)
      }
    });
  } catch (error) {
    logger.error('Get live dashboard error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get live dashboard' });
  }
};
