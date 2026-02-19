// Viral Score and Recommendation Engine Routes
const express = require('express');
const router = express.Router();
const ViralScore = require('../modules/database/models/ViralScore');
const Product = require('../modules/database/models/Product');
const Affiliate = require('../modules/database/models/Affiliate');
const Order = require('../modules/database/models/Order');
const ViralCampaign = require('../modules/database/models/ViralCampaign');
const jwt = require('jsonwebtoken');

// JWT Authentication Middleware - REQUIRED for all viral routes
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access denied. Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'cbdwellness24_secret_key_change_in_production');
    req.user = decoded;
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

// Admin-only middleware - for campaign management and analytics
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'staff_manager'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Calculate/Update Viral Score for a Product - ADMIN ONLY
router.post('/calculate/:entityType/:entityId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    
    // Find or create viral score record
    let viralScore = await ViralScore.findOne({ entityType, entityId });
    
    if (!viralScore) {
      viralScore = new ViralScore({
        entityType,
        entityId
      });
    }
    
    // Gather metrics based on entity type
    if (entityType === 'product') {
      await updateProductMetrics(viralScore, entityId);
    } else if (entityType === 'category') {
      await updateCategoryMetrics(viralScore, entityId);
    } else if (entityType === 'affiliate') {
      await updateAffiliateMetrics(viralScore, entityId);
    }
    
    // Calculate the viral score
    const score = viralScore.calculateViralScore();
    
    // Save historical data
    viralScore.history.push({
      date: new Date(),
      viralScore: score,
      metrics: viralScore.metrics
    });
    
    // Keep only last 30 days of history
    if (viralScore.history.length > 30) {
      viralScore.history = viralScore.history.slice(-30);
    }
    
    viralScore.lastCalculated = new Date();
    viralScore.nextCalculation = new Date(Date.now() + 3600000); // Next hour
    
    await viralScore.save();
    
    res.json({
      success: true,
      viralScore: score,
      trajectory: viralScore.trajectory,
      networkEffect: viralScore.networkEffect,
      recommendations: viralScore.recommendations
    });
  } catch (error) {
    console.error('Calculate viral score error:', error);
    res.status(500).json({ error: 'Failed to calculate viral score' });
  }
});

// Get Top Viral Products - REQUIRES LOGIN
router.get('/trending/products', authenticateToken, async (req, res) => {
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
    
    res.json({
      trending: products,
      totalFound: trending.length
    });
  } catch (error) {
    console.error('Get trending products error:', error);
    res.status(500).json({ error: 'Failed to get trending products' });
  }
});

// Get Product Recommendations Based on Viral Score - REQUIRES LOGIN
router.get('/recommendations/:productId', authenticateToken, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get the product's viral score
    const productScore = await ViralScore.findOne({
      entityType: 'product',
      entityId: productId
    });
    
    if (!productScore) {
      return res.status(404).json({ error: 'Product viral score not found' });
    }
    
    // Find complementary products with similar viral patterns
    const similarProducts = await productScore.findComplementaryProducts();
    
    // Find best matching influencers
    const influencers = await findBestInfluencers(productScore);
    
    // Calculate optimal promotion strategy
    const strategy = calculatePromotionStrategy(productScore);
    
    res.json({
      product: {
        id: productId,
        viralScore: productScore.viralScore,
        trajectory: productScore.trajectory
      },
      recommendations: {
        bundleWith: similarProducts,
        targetInfluencers: influencers,
        promotionStrategy: strategy,
        estimatedReach: calculateEstimatedReach(productScore, influencers),
        predictedConversions: calculatePredictedConversions(productScore, influencers)
      }
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Match Affiliates/Influencers with Products - ADMIN ONLY
router.post('/match-influencers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { productId, minFollowers = 1000, category } = req.body;
    
    // Get product viral score
    const productScore = await ViralScore.findOne({
      entityType: 'product',
      entityId: productId
    });
    
    if (!productScore) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Find affiliates with matching audience
    const affiliates = await Affiliate.find({
      status: 'active',
      'metrics.totalFollowers': { $gte: minFollowers }
    });
    
    // Calculate match scores
    const matches = await Promise.all(affiliates.map(async (affiliate) => {
      const matchScore = await calculateInfluencerMatchScore(productScore, affiliate);
      return {
        affiliate: {
          id: affiliate._id,
          username: affiliate.username,
          type: affiliate.type,
          followers: affiliate.metrics.totalFollowers,
          engagementRate: calculateEngagementRate(affiliate)
        },
        matchScore,
        estimatedImpact: calculateEstimatedImpact(productScore, affiliate),
        recommendedCommission: calculateRecommendedCommission(matchScore)
      };
    }));
    
    // Sort by match score
    matches.sort((a, b) => b.matchScore - a.matchScore);
    
    res.json({
      topMatches: matches.slice(0, 10),
      totalFound: matches.length
    });
  } catch (error) {
    console.error('Match influencers error:', error);
    res.status(500).json({ error: 'Failed to match influencers' });
  }
});

// Track Viral Spread (Network Effect) - REQUIRES LOGIN
router.post('/track-spread/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { referrer, affiliateCode, shareSource } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    // Track the spread through network
    for (const item of order.items) {
      const viralScore = await ViralScore.findOne({
        entityType: 'product',
        entityId: item.product
      });
      
      if (viralScore) {
        // Update network effect metrics
        if (affiliateCode) {
          const affiliate = await Affiliate.findOne({ affiliateCode });
          if (affiliate) {
            viralScore.networkEffect.primaryInfluencers.push({
              affiliateId: affiliate._id,
              impact: 1,
              conversions: 1
            });
            
            // Update influencer impact metrics
            viralScore.metrics.influencerImpact.affiliateConversions++;
            viralScore.metrics.influencerImpact.affiliatePromotions++;
          }
        }
        
        if (shareSource) {
          viralScore.networkEffect.secondarySpread++;
          viralScore.metrics.influencerImpact.socialShares++;
        }
        
        // Recalculate viral score with new data
        viralScore.calculateViralScore();
        await viralScore.save();
      }
    }
    
    res.json({
      success: true,
      message: 'Viral spread tracked successfully'
    });
  } catch (error) {
    console.error('Track spread error:', error);
    res.status(500).json({ error: 'Failed to track viral spread' });
  }
});

// Get Viral Analytics Dashboard Data - ADMIN ONLY
router.get('/analytics/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get top trending products
    const trendingProducts = await ViralScore.find({
      entityType: 'product',
      'trajectory.trending': { $in: ['explosive', 'rising'] }
    })
    .sort({ viralScore: -1 })
    .limit(5)
    .populate('entityId');
    
    // Get top performing influencers
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
    
    // Calculate overall viral coefficient
    const viralCoefficient = await calculateOverallViralCoefficient();
    
    // Get viral trajectory distribution
    const trajectoryDistribution = await ViralScore.aggregate([
      { $match: { entityType: 'product' } },
      {
        $group: {
          _id: '$trajectory.trending',
          count: { $sum: 1 }
        }
      }
    ]);
    
    res.json({
      metrics: {
        averageViralScore: await calculateAverageViralScore(),
        viralCoefficient,
        totalViralProducts: await ViralScore.countDocuments({ 
          entityType: 'product',
          viralScore: { $gte: 50 }
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
    console.error('Get analytics dashboard error:', error);
    res.status(500).json({ error: 'Failed to get analytics data' });
  }
});

// Helper Functions

async function updateProductMetrics(viralScore, productId) {
  const product = await Product.findById(productId);
  const orders = await Order.find({ 'items.product': productId });
  
  // Calculate engagement velocity (last 24 hours)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentOrders = orders.filter(o => o.createdAt > dayAgo);
  
  viralScore.metrics.engagementVelocity.views = product.analytics?.views || 0;
  viralScore.metrics.engagementVelocity.purchases = recentOrders.length;
  viralScore.metrics.engagementVelocity.cartAdds = product.analytics?.cartAdds || 0;
  
  // Calculate conversion rate
  viralScore.metrics.conversionRate.totalViews = product.analytics?.totalViews || 1;
  viralScore.metrics.conversionRate.totalPurchases = orders.length;
  
  // Calculate retention rate
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
  
  // Update trend relevance
  viralScore.metrics.trendRelevance.trendingCategories = product.categories || [];
  viralScore.metrics.trendRelevance.searchVolume = product.analytics?.searches || 0;
  
  // Update influencer impact
  const affiliateOrders = orders.filter(o => o.affiliateCode);
  viralScore.metrics.influencerImpact.affiliateConversions = affiliateOrders.length;
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
  // Simple matching algorithm - can be enhanced with ML
  let score = 0;
  
  // Match based on performance metrics
  if (affiliate.metrics.conversionRate > 0.05) score += 30;
  if (affiliate.metrics.totalFollowers > 10000) score += 20;
  if (affiliate.type === 'influencer') score += 15;
  
  // Match based on viral trajectory
  if (productScore.trajectory.trending === 'explosive') {
    score += affiliate.metrics.totalFollowers > 50000 ? 35 : 15;
  }
  
  return Math.min(100, score);
}

function determineMatchReason(productScore, affiliate) {
  if (affiliate.metrics.totalFollowers > 50000) {
    return 'High reach influencer perfect for viral products';
  }
  if (affiliate.metrics.conversionRate > 0.1) {
    return 'High conversion specialist';
  }
  if (productScore.trajectory.trending === 'rising') {
    return 'Growth accelerator for rising products';
  }
  return 'General match';
}

function calculatePromotionStrategy(productScore) {
  const strategy = {
    urgency: 'normal',
    recommendedDiscount: 0,
    promotionChannels: [],
    timing: 'immediate'
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
  // Complex matching algorithm
  let score = 0;
  
  // Audience size score (0-25)
  const followerScore = Math.min(25, (affiliate.metrics.totalFollowers / 100000) * 25);
  score += followerScore;
  
  // Engagement rate score (0-25)
  const engagementRate = calculateEngagementRate(affiliate);
  score += Math.min(25, engagementRate * 250); // 10% engagement = 25 points
  
  // Conversion history score (0-25)
  const conversionScore = Math.min(25, affiliate.metrics.conversionRate * 500);
  score += conversionScore;
  
  // Category match score (0-25)
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
  // Simple category matching - can be enhanced
  if (!productScore.metrics.trendRelevance.trendingCategories) return 0.5;
  
  // Check if affiliate has promoted similar categories
  return 0.7; // Placeholder - implement actual category matching
}

function calculateEstimatedImpact(productScore, affiliate) {
  const reach = affiliate.metrics.totalFollowers || 0;
  const conversionRate = affiliate.metrics.conversionRate || 0.02;
  const viralBoost = productScore.networkEffect.viralCoefficient || 1;
  
  return {
    estimatedReach: Math.floor(reach * viralBoost),
    estimatedConversions: Math.floor(reach * conversionRate * viralBoost),
    estimatedRevenue: Math.floor(reach * conversionRate * viralBoost * 500) // Assuming R500 average order
  };
}

function calculateRecommendedCommission(matchScore) {
  // Higher match score = can offer lower commission
  if (matchScore > 80) return 12; // 12% for perfect match
  if (matchScore > 60) return 15; // 15% standard
  if (matchScore > 40) return 18; // 18% for medium match
  return 20; // 20% to incentivize lower matches
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
      affiliate: affiliate ? {
        id: affiliate._id,
        username: affiliate.username,
        type: affiliate.type
      } : null,
      impact: inf.totalImpact,
      conversions: inf.totalConversions
    };
  }));
}

async function getHotProducts() {
  return ViralScore.find({
    entityType: 'product',
    'trajectory.trending': 'explosive'
  })
  .sort({ viralScore: -1 })
  .limit(3)
  .select('entityId viralScore');
}

async function getRisingCategories() {
  // Aggregate by trending categories
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
  // Analysis of best performing times
  return {
    weekday: 'Thursday',
    timeSlot: '19:00-21:00',
    timezone: 'SAST'
  };
}

async function updateCategoryMetrics(viralScore, categoryId) {
  // Implement category metrics calculation
  // Aggregate products in category
}

async function updateAffiliateMetrics(viralScore, affiliateId) {
  // Implement affiliate viral score calculation
  const affiliate = await Affiliate.findById(affiliateId);
  if (affiliate) {
    viralScore.metrics.influencerImpact.influencerReach = affiliate.metrics.totalFollowers || 0;
    viralScore.metrics.influencerImpact.affiliatePromotions = affiliate.links?.length || 0;
  }
}

// Create Viral Campaign - ADMIN ONLY
router.post('/campaigns', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      name,
      description,
      campaignType,
      strategy,
      targetProducts,
      timeline,
      goals,
      budget,
      contentGuidelines
    } = req.body;

    const campaign = new ViralCampaign({
      name,
      description,
      campaignType,
      strategy,
      targetProducts,
      timeline,
      goals,
      budget,
      contentGuidelines,
      createdBy: req.user?.id || '507f1f77bcf86cd799439011' // Fallback user ID
    });

    // Generate unique campaign ID
    campaign.campaignId = campaign.generateCampaignId();

    // Ensure campaign ID is unique
    let existingCampaign = await ViralCampaign.findOne({ campaignId: campaign.campaignId });
    while (existingCampaign) {
      campaign.campaignId = campaign.generateCampaignId();
      existingCampaign = await ViralCampaign.findOne({ campaignId: campaign.campaignId });
    }

    await campaign.save();

    res.status(201).json({
      success: true,
      campaign: {
        id: campaign._id,
        campaignId: campaign.campaignId,
        name: campaign.name,
        status: campaign.status,
        timeline: campaign.timeline
      },
      message: 'Viral campaign created successfully'
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create viral campaign' });
  }
});

// Get All Campaigns - REQUIRES LOGIN
router.get('/campaigns', authenticateToken, async (req, res) => {
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
        id: campaign._id,
        campaignId: campaign.campaignId,
        name: campaign.name,
        status: campaign.status,
        performance: campaign.performance,
        timeline: campaign.timeline,
        influencerCount: campaign.influencers.length,
        productCount: campaign.targetProducts.length,
        roi: campaign.roi,
        completionPercentage: campaign.completionPercentage
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: (parseInt(offset) + parseInt(limit)) < total
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Failed to get campaigns' });
  }
});

// Get Campaign Details - REQUIRES LOGIN
router.get('/campaigns/:campaignId', authenticateToken, async (req, res) => {
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
    console.error('Get campaign details error:', error);
    res.status(500).json({ error: 'Failed to get campaign details' });
  }
});

// Add Influencer to Campaign - ADMIN ONLY
router.post('/campaigns/:campaignId/influencers', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { affiliateId, customCommissionRate, bonusTarget, bonusAmount } = req.body;

    const campaign = await ViralCampaign.findOne({
      $or: [{ campaignId }, { _id: campaignId }]
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Check if affiliate exists and is active
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate || affiliate.status !== 'active') {
      return res.status(400).json({ error: 'Invalid or inactive affiliate' });
    }

    // Add influencer to campaign
    campaign.influencers.push({
      affiliateId,
      customCommissionRate,
      bonusTarget,
      bonusAmount,
      status: 'invited'
    });

    await campaign.save();

    res.json({
      success: true,
      message: 'Influencer added to campaign successfully',
      influencer: {
        affiliateId,
        username: affiliate.username,
        status: 'invited'
      }
    });
  } catch (error) {
    console.error('Add influencer error:', error);
    res.status(500).json({ error: 'Failed to add influencer to campaign' });
  }
});

// Update Campaign Performance - ADMIN ONLY
router.post('/campaigns/:campaignId/track', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { campaignId } = req.params;
    const { affiliateId, metrics } = req.body;

    const campaign = await ViralCampaign.findOne({
      $or: [{ campaignId }, { _id: campaignId }]
    });

    if (!campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Find influencer in campaign
    const influencer = campaign.influencers.find(
      inf => inf.affiliateId.toString() === affiliateId
    );

    if (influencer) {
      // Update influencer metrics
      influencer.clicks += metrics.clicks || 0;
      influencer.conversions += metrics.conversions || 0;
      influencer.revenue += metrics.revenue || 0;
      influencer.uniqueViews += metrics.views || 0;
    }

    // Update campaign-wide performance
    campaign.performance.totalReach += metrics.views || 0;
    campaign.performance.totalEngagement += metrics.clicks || 0;
    campaign.performance.totalSales += metrics.conversions || 0;
    campaign.performance.totalRevenue += metrics.revenue || 0;

    // Update real-time metrics
    await campaign.updateRealTimeMetrics(metrics);

    res.json({
      success: true,
      message: 'Campaign metrics updated successfully',
      performance: campaign.performance
    });
  } catch (error) {
    console.error('Track campaign error:', error);
    res.status(500).json({ error: 'Failed to track campaign metrics' });
  }
});

// Get Campaign Analytics - ADMIN ONLY
router.get('/campaigns/:campaignId/analytics', authenticateToken, requireAdmin, async (req, res) => {
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

    // Calculate analytics based on timeframe
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
          revenue: inf.revenue,
          conversions: inf.conversions,
          clicks: inf.clicks
        })),
      topProducts: campaign.targetProducts
        .sort((a, b) => b.currentSales - a.currentSales)
        .slice(0, 5)
        .map(prod => ({
          name: prod.productId?.name,
          targetSales: prod.targetSales,
          currentSales: prod.currentSales,
          progress: prod.targetSales ? (prod.currentSales / prod.targetSales) * 100 : 0
        })),
      hourlyMetrics: campaign.realTimeData.hourlyMetrics.slice(-24), // Last 24 hours
      alerts: campaign.realTimeData.alerts.filter(alert => !alert.resolved)
    };

    res.json({ analytics });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({ error: 'Failed to get campaign analytics' });
  }
});

// Get Live Campaign Dashboard - ADMIN ONLY
router.get('/campaigns/live/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get active campaigns
    const activeCampaigns = await ViralCampaign.find({
      status: { $in: ['active', 'monitoring'] }
    })
    .select('campaignId name performance realTimeData timeline')
    .sort({ 'realTimeData.currentViralScore': -1 })
    .limit(10);

    // Get trending campaigns (viral spikes in last hour)
    const trendingCampaigns = activeCampaigns.filter(
      campaign => campaign.realTimeData.trending
    );

    // Calculate totals
    const totals = activeCampaigns.reduce((acc, campaign) => {
      acc.totalRevenue += campaign.performance.totalRevenue;
      acc.totalSales += campaign.performance.totalSales;
      acc.totalReach += campaign.performance.totalReach;
      acc.totalEngagement += campaign.performance.totalEngagement;
      return acc;
    }, { totalRevenue: 0, totalSales: 0, totalReach: 0, totalEngagement: 0 });

    // Get recent alerts
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
          campaignId: campaign.campaignId,
          name: campaign.name,
          performance: campaign.performance,
          viralScore: campaign.realTimeData.currentViralScore,
          trending: campaign.realTimeData.trending,
          daysRemaining: Math.max(0, Math.ceil((campaign.timeline.endDate - new Date()) / (1000 * 60 * 60 * 24)))
        })),
        trending: trendingCampaigns.map(campaign => ({
          campaignId: campaign.campaignId,
          name: campaign.name,
          viralScore: campaign.realTimeData.currentViralScore
        })),
        alerts: recentAlerts.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Get live dashboard error:', error);
    res.status(500).json({ error: 'Failed to get live dashboard' });
  }
});

module.exports = router;