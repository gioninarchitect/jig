// Marketing Routes - Campaign management and marketing automation
const express = require('express');
const router = express.Router();
const logger = require('../modules/logger');
const Campaign = require('../modules/database/models/Campaign');
const MarketingPreference = require('../modules/database/models/MarketingPreference');
const User = require('../modules/database/models/User');
const { authenticateToken, requireRole } = require('../middleware/auth');

// ============================================================================
// CAMPAIGN ROUTES
// ============================================================================

// Get all campaigns with filtering and pagination
router.get('/campaigns', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      tag,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (tag) query.tags = tag;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [campaigns, total] = await Promise.all([
      Campaign.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Campaign.countDocuments(query)
    ]);

    res.json({
      success: true,
      campaigns,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error('Get campaigns error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching campaigns'
    });
  }
});

// Get campaign statistics summary
router.get('/campaigns/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const [summary, statusCounts] = await Promise.all([
      Campaign.getPerformanceSummary(start, end),
      Campaign.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ])
    ]);

    res.json({
      success: true,
      summary,
      statusCounts: statusCounts.reduce((acc, s) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      period: { start, end }
    });
  } catch (error) {
    logger.error('Get campaign stats error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching campaign statistics'
    });
  }
});

// Get single campaign
router.get('/campaigns/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email')
      .populate('audience.branches', 'name branchCode')
      .populate('offer.voucherId', 'code discountType discountValue');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    res.json({
      success: true,
      campaign
    });
  } catch (error) {
    logger.error('Get campaign error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching campaign'
    });
  }
});

// Get campaign detailed stats
router.get('/campaigns/:id/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    // Calculate derived stats
    const stats = {
      ...campaign.stats.toObject(),
      openRate: campaign.openRate,
      clickRate: campaign.clickRate,
      conversionRate: campaign.conversionRate,
      unsubscribeRate: campaign.unsubscribeRate,
      clickToOpenRate: campaign.stats.uniqueOpens > 0
        ? Math.round((campaign.stats.uniqueClicks / campaign.stats.uniqueOpens) * 100 * 10) / 10
        : 0,
      averageOrderValue: campaign.stats.converted > 0
        ? Math.round(campaign.stats.conversionValue / campaign.stats.converted * 100) / 100
        : 0
    };

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Get campaign stats error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching campaign statistics'
    });
  }
});

// Create campaign
router.post('/campaigns', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const campaignData = {
      ...req.body,
      createdBy: req.user.id
    };

    const campaign = new Campaign(campaignData);
    await campaign.save();

    logger.info('Campaign created', { campaignId: campaign.campaignId, name: campaign.name, createdBy: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    logger.error('Create campaign error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error creating campaign'
    });
  }
});

// Update campaign
router.put('/campaigns/:id', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only draft or scheduled campaigns can be edited'
      });
    }

    const allowedUpdates = [
      'name', 'description', 'type', 'audience', 'emailContent', 'smsContent',
      'pushContent', 'cta', 'offer', 'isRecurring', 'recurringSettings',
      'abTest', 'tags', 'notes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        campaign[field] = req.body[field];
      }
    });

    await campaign.save();

    res.json({
      success: true,
      message: 'Campaign updated',
      campaign
    });
  } catch (error) {
    logger.error('Update campaign error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error updating campaign'
    });
  }
});

// Schedule campaign
router.post('/campaigns/:id/schedule', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { scheduledFor } = req.body;

    if (!scheduledFor) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled date is required'
      });
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    await campaign.schedule(new Date(scheduledFor), req.user.id);

    logger.info('Campaign scheduled', { campaignId: campaign.campaignId, scheduledFor, scheduledBy: req.user.id });

    res.json({
      success: true,
      message: 'Campaign scheduled',
      campaign
    });
  } catch (error) {
    logger.error('Schedule campaign error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error scheduling campaign'
    });
  }
});

// Send campaign immediately
router.post('/campaigns/:id/send', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    if (!['draft', 'scheduled'].includes(campaign.status)) {
      return res.status(400).json({
        success: false,
        message: 'Campaign cannot be sent in current status'
      });
    }

    // Get audience based on segment
    let recipients = [];
    if (campaign.audience.type === 'manual') {
      recipients = campaign.audience.recipients;
    } else {
      recipients = await getAudienceBySegment(campaign.audience);
    }

    campaign.audience.recipientCount = recipients.length;
    campaign.stats.totalRecipients = recipients.length;
    campaign.status = 'sending';
    campaign.sentAt = new Date();

    await campaign.save();

    // Queue campaign for sending (in a real implementation, this would be a job queue)
    // For now, we just update status
    // TODO: Integrate with Bull queue for actual sending

    logger.info('Campaign sending started', {
      campaignId: campaign.campaignId,
      recipientCount: recipients.length,
      sentBy: req.user.id
    });

    // Mark as sent after "processing"
    campaign.status = 'sent';
    campaign.completedAt = new Date();
    await campaign.save();

    res.json({
      success: true,
      message: `Campaign sent to ${recipients.length} recipients`,
      campaign
    });
  } catch (error) {
    logger.error('Send campaign error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error sending campaign'
    });
  }
});

// Cancel campaign
router.post('/campaigns/:id/cancel', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    await campaign.cancel(req.user.id);

    logger.info('Campaign cancelled', { campaignId: campaign.campaignId, cancelledBy: req.user.id });

    res.json({
      success: true,
      message: 'Campaign cancelled',
      campaign
    });
  } catch (error) {
    logger.error('Cancel campaign error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling campaign'
    });
  }
});

// Record campaign event (open, click, etc.)
router.post('/campaigns/:id/event', async (req, res) => {
  try {
    const { eventType, userId, metadata } = req.body;

    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'Event type is required'
      });
    }

    const campaign = await Campaign.findById(req.params.id);

    if (!campaign) {
      return res.status(404).json({
        success: false,
        message: 'Campaign not found'
      });
    }

    await campaign.recordEvent(eventType, userId, metadata);

    res.json({
      success: true,
      message: 'Event recorded'
    });
  } catch (error) {
    logger.error('Record campaign event error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error recording event'
    });
  }
});

// ============================================================================
// MARKETING PREFERENCES ROUTES
// ============================================================================

// Get subscription stats
router.get('/preferences/stats', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const stats = await MarketingPreference.getSubscriptionStats();

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    logger.error('Get preference stats error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching subscription statistics'
    });
  }
});

// Get user's marketing preferences
router.get('/preferences/:userId', authenticateToken, async (req, res) => {
  try {
    // Allow users to see their own preferences or admin to see any
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const preference = await MarketingPreference.getOrCreate(req.params.userId);

    res.json({
      success: true,
      preference
    });
  } catch (error) {
    logger.error('Get marketing preferences error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching marketing preferences'
    });
  }
});

// Update user's marketing preferences
router.put('/preferences/:userId', authenticateToken, async (req, res) => {
  try {
    // Allow users to update their own preferences or admin to update any
    if (req.user.id !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const preference = await MarketingPreference.getOrCreate(req.params.userId);

    const allowedUpdates = [
      'emailOptIn', 'smsOptIn', 'pushOptIn', 'whatsappOptIn',
      'contentPreferences', 'emailFrequency', 'smsFrequency',
      'preferredSendTime', 'timezone'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        preference[field] = req.body[field];
      }
    });

    await preference.save();

    logger.info('Marketing preferences updated', { userId: req.params.userId, updatedBy: req.user.id });

    res.json({
      success: true,
      message: 'Preferences updated',
      preference
    });
  } catch (error) {
    logger.error('Update marketing preferences error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error updating preferences'
    });
  }
});

// Public unsubscribe endpoint (used from email links)
router.post('/unsubscribe', async (req, res) => {
  try {
    const { email, token, channel, reason } = req.body;

    if (!email && !token) {
      return res.status(400).json({
        success: false,
        message: 'Email or unsubscribe token is required'
      });
    }

    // Find user by email
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
    }
    // TODO: Handle token-based unsubscribe

    if (!user) {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'Unsubscribe request processed'
      });
    }

    const preference = await MarketingPreference.getOrCreate(user._id);

    if (channel) {
      await preference.unsubscribeChannel(channel, reason || 'User request', 'email_link');
    } else {
      await preference.unsubscribeAll(reason || 'User request', 'email_link');
    }

    logger.info('User unsubscribed', { userId: user._id, channel: channel || 'all' });

    res.json({
      success: true,
      message: 'You have been unsubscribed successfully'
    });
  } catch (error) {
    logger.error('Unsubscribe error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error processing unsubscribe request'
    });
  }
});

// Resubscribe endpoint
router.post('/preferences/:userId/resubscribe', authenticateToken, async (req, res) => {
  try {
    const { channels } = req.body;

    const preference = await MarketingPreference.getOrCreate(req.params.userId);

    await preference.resubscribe(channels || ['email'], 'website');

    logger.info('User resubscribed', { userId: req.params.userId, channels: channels || ['email'] });

    res.json({
      success: true,
      message: 'Successfully resubscribed',
      preference
    });
  } catch (error) {
    logger.error('Resubscribe error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error processing resubscribe request'
    });
  }
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function getAudienceBySegment(audience) {
  const query = { isActive: true };
  const { segment, filters } = audience;

  // Apply segment filter
  if (segment) {
    const now = new Date();
    switch (segment) {
      case 'new_users':
        query.createdAt = { $gte: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case 'inactive_30d':
        query.lastLogin = { $lt: new Date(now - 30 * 24 * 60 * 60 * 1000) };
        break;
      case 'inactive_60d':
        query.lastLogin = { $lt: new Date(now - 60 * 24 * 60 * 60 * 1000) };
        break;
      case 'inactive_90d':
        query.lastLogin = { $lt: new Date(now - 90 * 24 * 60 * 60 * 1000) };
        break;
      case 'high_value':
        query['loyalty.totalSpent'] = { $gte: 5000 };
        break;
      case 'loyal_customers':
        // Would need to aggregate orders count
        break;
      case 'wellness_seekers':
        query['loyalty.tier'] = 'wellness_seeker';
        break;
      case 'wellness_advocates':
        query['loyalty.tier'] = 'wellness_advocate';
        break;
      case 'wellness_champions':
        query['loyalty.tier'] = 'wellness_champion';
        break;
      case 'wellness_elite':
        query['loyalty.tier'] = 'wellness_elite';
        break;
      case 'section21_approved':
        query.section21Status = 'approved';
        break;
      case 'lifestyle_members':
        query.isLifestyleMember = true;
        break;
      case 'birthday_month':
        const currentMonth = now.getMonth() + 1;
        query['profile.dateOfBirth'] = {
          $exists: true,
          $expr: { $eq: [{ $month: '$profile.dateOfBirth' }, currentMonth] }
        };
        break;
    }
  }

  // Apply additional filters
  if (filters) {
    if (filters.minTotalSpent) {
      query['loyalty.totalSpent'] = { ...query['loyalty.totalSpent'], $gte: filters.minTotalSpent };
    }
    if (filters.maxTotalSpent) {
      query['loyalty.totalSpent'] = { ...query['loyalty.totalSpent'], $lte: filters.maxTotalSpent };
    }
    if (filters.membershipTiers && filters.membershipTiers.length > 0) {
      query['loyalty.tier'] = { $in: filters.membershipTiers };
    }
    if (filters.hasSection21 !== undefined) {
      query.section21Status = filters.hasSection21 ? 'approved' : { $ne: 'approved' };
    }
    if (filters.isLifestyleMember !== undefined) {
      query.isLifestyleMember = filters.isLifestyleMember;
    }
  }

  // Get users and filter by marketing preferences
  const users = await User.find(query).select('_id email');
  const userIds = users.map(u => u._id);

  // Filter out suppressed users
  const activePreferences = await MarketingPreference.find({
    user: { $in: userIds },
    emailOptIn: true,
    isSuppressed: false
  }).select('user');

  return activePreferences.map(p => p.user);
}

module.exports = router;
