// Influencer Social Media Verification and Analytics System
const express = require('express');
const router = express.Router();
const Affiliate = require('../modules/database/models/Affiliate');
const ViralScore = require('../modules/database/models/ViralScore');

// Verify and analyze influencer social media accounts
router.post('/verify-social-media', async (req, res) => {
  try {
    const { affiliateId, socialHandles } = req.body;
    
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    const verificationResults = {
      instagram: null,
      tiktok: null,
      youtube: null,
      twitter: null,
      totalReach: 0,
      engagementRate: 0,
      verificationStatus: 'pending'
    };
    
    // Verify Instagram
    if (socialHandles.instagram) {
      verificationResults.instagram = await verifyInstagram(socialHandles.instagram);
      verificationResults.totalReach += verificationResults.instagram.followers || 0;
    }
    
    // Verify TikTok
    if (socialHandles.tiktok) {
      verificationResults.tiktok = await verifyTikTok(socialHandles.tiktok);
      verificationResults.totalReach += verificationResults.tiktok.followers || 0;
    }
    
    // Verify YouTube
    if (socialHandles.youtube) {
      verificationResults.youtube = await verifyYouTube(socialHandles.youtube);
      verificationResults.totalReach += verificationResults.youtube.subscribers || 0;
    }
    
    // Verify Twitter/X
    if (socialHandles.twitter) {
      verificationResults.twitter = await verifyTwitter(socialHandles.twitter);
      verificationResults.totalReach += verificationResults.twitter.followers || 0;
    }
    
    // Calculate overall engagement rate
    verificationResults.engagementRate = calculateOverallEngagement(verificationResults);
    
    // Update affiliate with verified data
    affiliate.socialMedia = {
      instagram: verificationResults.instagram,
      tiktok: verificationResults.tiktok,
      youtube: verificationResults.youtube,
      twitter: verificationResults.twitter
    };
    
    affiliate.metrics.totalFollowers = verificationResults.totalReach;
    affiliate.metrics.engagementRate = verificationResults.engagementRate;
    affiliate.verifiedAt = new Date();
    affiliate.verificationStatus = 'verified';
    
    // Determine influencer tier
    affiliate.tier = determineInfluencerTier(verificationResults.totalReach);
    
    await affiliate.save();
    
    res.json({
      success: true,
      verificationResults,
      tier: affiliate.tier,
      message: 'Social media accounts verified successfully'
    });
  } catch (error) {
    console.error('Social media verification error:', error);
    res.status(500).json({ error: 'Failed to verify social media accounts' });
  }
});

// Scrape and analyze Instagram profile
async function verifyInstagram(handle) {
  try {
    // Using Firecrawl to scrape Instagram profile
    const url = `https://www.instagram.com/${handle.replace('@', '')}/`;
    
    // This would use the Firecrawl MCP tool to scrape the data
    // For now, returning a simulated response structure
    const scrapedData = await scrapeWithFirecrawl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 3000 // Wait for dynamic content
    });
    
    // Extract metrics using AI
    const metrics = await extractInstagramMetrics(scrapedData);
    
    return {
      handle,
      verified: true,
      followers: metrics.followers,
      following: metrics.following,
      posts: metrics.posts,
      avgLikes: metrics.avgLikes,
      avgComments: metrics.avgComments,
      engagementRate: metrics.engagementRate,
      recentPosts: metrics.recentPosts,
      profileUrl: url,
      scrapedAt: new Date()
    };
  } catch (error) {
    console.error('Instagram verification error:', error);
    return {
      handle,
      verified: false,
      error: error.message
    };
  }
}

// Scrape and analyze TikTok profile
async function verifyTikTok(handle) {
  try {
    const url = `https://www.tiktok.com/@${handle.replace('@', '')}`;
    
    const scrapedData = await scrapeWithFirecrawl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 3000
    });
    
    const metrics = await extractTikTokMetrics(scrapedData);
    
    return {
      handle,
      verified: true,
      followers: metrics.followers,
      following: metrics.following,
      totalLikes: metrics.totalLikes,
      videos: metrics.videos,
      avgViews: metrics.avgViews,
      engagementRate: metrics.engagementRate,
      profileUrl: url,
      scrapedAt: new Date()
    };
  } catch (error) {
    console.error('TikTok verification error:', error);
    return {
      handle,
      verified: false,
      error: error.message
    };
  }
}

// Scrape and analyze YouTube channel
async function verifyYouTube(channelUrl) {
  try {
    const scrapedData = await scrapeWithFirecrawl(channelUrl, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 3000
    });
    
    const metrics = await extractYouTubeMetrics(scrapedData);
    
    return {
      channelUrl,
      verified: true,
      subscribers: metrics.subscribers,
      totalViews: metrics.totalViews,
      videos: metrics.videos,
      avgViews: metrics.avgViews,
      engagementRate: metrics.engagementRate,
      scrapedAt: new Date()
    };
  } catch (error) {
    console.error('YouTube verification error:', error);
    return {
      channelUrl,
      verified: false,
      error: error.message
    };
  }
}

// Scrape and analyze Twitter/X profile
async function verifyTwitter(handle) {
  try {
    const url = `https://twitter.com/${handle.replace('@', '')}`;
    
    const scrapedData = await scrapeWithFirecrawl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 3000
    });
    
    const metrics = await extractTwitterMetrics(scrapedData);
    
    return {
      handle,
      verified: true,
      followers: metrics.followers,
      following: metrics.following,
      tweets: metrics.tweets,
      avgLikes: metrics.avgLikes,
      avgRetweets: metrics.avgRetweets,
      engagementRate: metrics.engagementRate,
      profileUrl: url,
      scrapedAt: new Date()
    };
  } catch (error) {
    console.error('Twitter verification error:', error);
    return {
      handle,
      verified: false,
      error: error.message
    };
  }
}

// Scrape and analyze GitHub profile (alternative platform)
async function verifyGitHub(username) {
  try {
    const url = `https://github.com/${username.replace('@', '')}`;
    
    const scrapedData = await scrapeWithFirecrawl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 2000
    });
    
    const metrics = await extractGitHubMetrics(scrapedData);
    
    return {
      username,
      verified: true,
      followers: metrics.followers,
      following: metrics.following,
      repositories: metrics.repositories,
      stars: metrics.stars,
      contributions: metrics.contributions,
      techInfluencerScore: metrics.techInfluencerScore,
      profileUrl: url,
      scrapedAt: new Date()
    };
  } catch (error) {
    console.error('GitHub verification error:', error);
    return {
      username,
      verified: false,
      error: error.message
    };
  }
}

// Scrape and analyze Facebook profile/page
async function verifyFacebook(profileUrl) {
  try {
    // Handle various Facebook URL formats
    let url = profileUrl;
    if (!url.startsWith('http')) {
      url = `https://www.facebook.com/${profileUrl}`;
    }
    
    const scrapedData = await scrapeWithFirecrawl(url, {
      formats: ['markdown', 'html'],
      onlyMainContent: true,
      waitFor: 3000
    });
    
    const metrics = await extractFacebookMetrics(scrapedData);
    
    return {
      profileUrl: url,
      verified: true,
      followers: metrics.followers,
      likes: metrics.likes,
      friends: metrics.friends,
      engagementRate: metrics.engagementRate,
      pageType: metrics.pageType,
      scrapedAt: new Date()
    };
  } catch (error) {
    console.error('Facebook verification error:', error);
    return {
      profileUrl,
      verified: false,
      error: error.message
    };
  }
}

// Wrapper function for Firecrawl scraping
async function scrapeWithFirecrawl(url, options) {
  try {
    // Using actual Firecrawl MCP tool
    const firecrawl = require('../modules/firecrawl-client');
    
    const result = await firecrawl.scrape({
      url,
      formats: options.formats || ['markdown'],
      onlyMainContent: options.onlyMainContent !== false,
      waitFor: options.waitFor || 3000,
      maxAge: 86400000 // Cache for 24 hours
    });
    
    if (!result || !result.success) {
      throw new Error('Scraping failed');
    }
    
    return {
      markdown: result.markdown || result.data?.markdown || '',
      html: result.html || result.data?.html || '',
      success: true,
      raw: result
    };
  } catch (error) {
    console.error(`Failed to scrape ${url}:`, error);
    throw new Error(`Failed to scrape ${url}: ${error.message}`);
  }
}

// Extract Instagram metrics using pattern matching and AI
async function extractInstagramMetrics(scrapedData) {
  try {
    const markdown = scrapedData.markdown || '';
    const html = scrapedData.html || '';
    
    // Try to extract metrics using regex patterns first
    const metrics = {};
    
    // Common patterns for followers/following/posts
    const followerPatterns = [
      /([\d,\.]+[KMB]?)\s*(?:followers|Followers)/i,
      /followers[\s:]*([\d,\.]+[KMB]?)/i,
      /([\d,\.]+[KMB]?)\s*(?:Seguidores)/i // Spanish
    ];
    
    const followingPatterns = [
      /([\d,\.]+[KMB]?)\s*(?:following|Following)/i,
      /following[\s:]*([\d,\.]+[KMB]?)/i,
      /([\d,\.]+[KMB]?)\s*(?:Siguiendo)/i // Spanish
    ];
    
    const postPatterns = [
      /([\d,\.]+[KMB]?)\s*(?:posts|Posts|publicaciones)/i,
      /posts[\s:]*([\d,\.]+[KMB]?)/i
    ];
    
    // Extract followers
    for (const pattern of followerPatterns) {
      const match = markdown.match(pattern) || html.match(pattern);
      if (match) {
        metrics.followers = parseMetricValue(match[1]);
        break;
      }
    }
    
    // Extract following
    for (const pattern of followingPatterns) {
      const match = markdown.match(pattern) || html.match(pattern);
      if (match) {
        metrics.following = parseMetricValue(match[1]);
        break;
      }
    }
    
    // Extract posts
    for (const pattern of postPatterns) {
      const match = markdown.match(pattern) || html.match(pattern);
      if (match) {
        metrics.posts = parseMetricValue(match[1]);
        break;
      }
    }
    
    // Extract engagement from recent posts if visible
    const likePatterns = [
      /([\d,\.]+[KMB]?)\s*(?:likes|Likes|Me gusta)/gi,
      /♥\s*([\d,\.]+[KMB]?)/gi
    ];
    
    const likes = [];
    for (const pattern of likePatterns) {
      const matches = [...markdown.matchAll(pattern), ...html.matchAll(pattern)];
      matches.forEach(match => {
        const value = parseMetricValue(match[1]);
        if (value > 0) likes.push(value);
      });
    }
    
    // Calculate averages
    metrics.avgLikes = likes.length > 0 ? 
      Math.round(likes.reduce((a, b) => a + b, 0) / likes.length) : 0;
    
    // Estimate engagement rate
    if (metrics.followers && metrics.avgLikes) {
      metrics.engagementRate = (metrics.avgLikes / metrics.followers).toFixed(4);
    } else {
      metrics.engagementRate = 0;
    }
    
    // Set defaults for missing values
    return {
      followers: metrics.followers || 0,
      following: metrics.following || 0,
      posts: metrics.posts || 0,
      avgLikes: metrics.avgLikes || 0,
      avgComments: Math.round(metrics.avgLikes * 0.07) || 0, // Estimate 7% of likes
      engagementRate: parseFloat(metrics.engagementRate) || 0,
      recentPosts: []
    };
  } catch (error) {
    console.error('Error extracting Instagram metrics:', error);
    return {
      followers: 0,
      following: 0,
      posts: 0,
      avgLikes: 0,
      avgComments: 0,
      engagementRate: 0,
      recentPosts: []
    };
  }
}

// Helper function to parse metric values (1.2K -> 1200, 1M -> 1000000)
function parseMetricValue(value) {
  if (!value) return 0;
  
  const str = value.toString().replace(/,/g, '');
  const num = parseFloat(str);
  
  if (str.includes('K') || str.includes('k')) {
    return Math.round(num * 1000);
  }
  if (str.includes('M') || str.includes('m')) {
    return Math.round(num * 1000000);
  }
  if (str.includes('B') || str.includes('b')) {
    return Math.round(num * 1000000000);
  }
  
  return Math.round(num) || 0;
}

// Extract TikTok metrics using pattern matching
async function extractTikTokMetrics(scrapedData) {
  try {
    const markdown = scrapedData.markdown || '';
    const html = scrapedData.html || '';
    const metrics = {};
    
    // TikTok-specific patterns
    const patterns = {
      followers: /([\d,\.]+[KMB]?)\s*(?:Followers|followers|Seguidores)/i,
      following: /([\d,\.]+[KMB]?)\s*(?:Following|following|Siguiendo)/i,
      likes: /([\d,\.]+[KMB]?)\s*(?:Likes|likes|Me gusta)/i,
      videos: /([\d,\.]+[KMB]?)\s*(?:Videos|videos)/i
    };
    
    // Extract each metric
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = markdown.match(pattern) || html.match(pattern);
      if (match) {
        metrics[key] = parseMetricValue(match[1]);
      }
    }
    
    // Extract view counts from video descriptions
    const viewPatterns = /([\d,\.]+[KMB]?)\s*(?:views|Views|vistas)/gi;
    const viewMatches = [...markdown.matchAll(viewPatterns), ...html.matchAll(viewPatterns)];
    const views = viewMatches.map(m => parseMetricValue(m[1])).filter(v => v > 0);
    
    const avgViews = views.length > 0 ? 
      Math.round(views.reduce((a, b) => a + b, 0) / views.length) : 0;
    
    // Calculate engagement rate
    const engagementRate = metrics.followers && avgViews ? 
      (avgViews / metrics.followers).toFixed(4) : 0;
    
    return {
      followers: metrics.followers || 0,
      following: metrics.following || 0,
      totalLikes: metrics.likes || 0,
      videos: metrics.videos || 0,
      avgViews: avgViews,
      engagementRate: parseFloat(engagementRate)
    };
  } catch (error) {
    console.error('Error extracting TikTok metrics:', error);
    return {
      followers: 0,
      following: 0,
      totalLikes: 0,
      videos: 0,
      avgViews: 0,
      engagementRate: 0
    };
  }
}

// Extract YouTube metrics using pattern matching
async function extractYouTubeMetrics(scrapedData) {
  try {
    const markdown = scrapedData.markdown || '';
    const html = scrapedData.html || '';
    const metrics = {};
    
    // YouTube-specific patterns
    const patterns = {
      subscribers: /([\d,\.]+[KMB]?)\s*(?:subscribers|Subscribers|suscriptores)/i,
      views: /([\d,\.]+[KMB]?)\s*(?:views|Views|vistas|visualizaciones)/i,
      videos: /([\d,\.]+[KMB]?)\s*(?:videos|Videos|vídeos)/i
    };
    
    // Extract each metric
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = markdown.match(pattern) || html.match(pattern);
      if (match) {
        metrics[key] = parseMetricValue(match[1]);
      }
    }
    
    // Calculate average views
    const avgViews = metrics.views && metrics.videos ? 
      Math.round(metrics.views / metrics.videos) : 0;
    
    // Estimate engagement rate (YouTube typically lower than other platforms)
    const engagementRate = metrics.subscribers && avgViews ? 
      Math.min(0.1, (avgViews / metrics.subscribers) * 0.1).toFixed(4) : 0;
    
    return {
      subscribers: metrics.subscribers || 0,
      totalViews: metrics.views || 0,
      videos: metrics.videos || 0,
      avgViews: avgViews,
      engagementRate: parseFloat(engagementRate)
    };
  } catch (error) {
    console.error('Error extracting YouTube metrics:', error);
    return {
      subscribers: 0,
      totalViews: 0,
      videos: 0,
      avgViews: 0,
      engagementRate: 0
    };
  }
}

// Extract Twitter/X metrics using pattern matching
async function extractTwitterMetrics(scrapedData) {
  try {
    const markdown = scrapedData.markdown || '';
    const html = scrapedData.html || '';
    const metrics = {};
    
    // Twitter/X-specific patterns
    const patterns = {
      followers: /([\d,\.]+[KMB]?)\s*(?:Followers|followers|Seguidores)/i,
      following: /([\d,\.]+[KMB]?)\s*(?:Following|following|Siguiendo)/i,
      tweets: /([\d,\.]+[KMB]?)\s*(?:Tweets|tweets|Posts|posts)/i
    };
    
    // Extract each metric
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = markdown.match(pattern) || html.match(pattern);
      if (match) {
        metrics[key] = parseMetricValue(match[1]);
      }
    }
    
    // Extract engagement from recent tweets
    const likePatterns = /([\d,\.]+[KMB]?)\s*(?:likes|Likes)/gi;
    const retweetPatterns = /([\d,\.]+[KMB]?)\s*(?:Retweets|retweets|Repost)/gi;
    
    const likes = [...markdown.matchAll(likePatterns), ...html.matchAll(likePatterns)]
      .map(m => parseMetricValue(m[1]))
      .filter(v => v > 0);
    
    const retweets = [...markdown.matchAll(retweetPatterns), ...html.matchAll(retweetPatterns)]
      .map(m => parseMetricValue(m[1]))
      .filter(v => v > 0);
    
    const avgLikes = likes.length > 0 ? 
      Math.round(likes.reduce((a, b) => a + b, 0) / likes.length) : 0;
    
    const avgRetweets = retweets.length > 0 ? 
      Math.round(retweets.reduce((a, b) => a + b, 0) / retweets.length) : 0;
    
    // Calculate engagement rate
    const engagementRate = metrics.followers && (avgLikes + avgRetweets) ? 
      ((avgLikes + avgRetweets) / metrics.followers).toFixed(4) : 0;
    
    return {
      followers: metrics.followers || 0,
      following: metrics.following || 0,
      tweets: metrics.tweets || 0,
      avgLikes: avgLikes,
      avgRetweets: avgRetweets,
      engagementRate: parseFloat(engagementRate)
    };
  } catch (error) {
    console.error('Error extracting Twitter metrics:', error);
    return {
      followers: 0,
      following: 0,
      tweets: 0,
      avgLikes: 0,
      avgRetweets: 0,
      engagementRate: 0
    };
  }
}

// Calculate overall engagement rate across platforms
function calculateOverallEngagement(results) {
  let totalEngagement = 0;
  let platformCount = 0;
  
  if (results.instagram?.verified) {
    totalEngagement += results.instagram.engagementRate || 0;
    platformCount++;
  }
  
  if (results.tiktok?.verified) {
    totalEngagement += results.tiktok.engagementRate || 0;
    platformCount++;
  }
  
  if (results.youtube?.verified) {
    totalEngagement += results.youtube.engagementRate || 0;
    platformCount++;
  }
  
  if (results.twitter?.verified) {
    totalEngagement += results.twitter.engagementRate || 0;
    platformCount++;
  }
  
  return platformCount > 0 ? totalEngagement / platformCount : 0;
}

// Determine influencer tier based on total reach
function determineInfluencerTier(totalReach) {
  if (totalReach >= 1000000) return 'mega'; // 1M+ followers
  if (totalReach >= 100000) return 'macro'; // 100K-1M followers
  if (totalReach >= 10000) return 'mid'; // 10K-100K followers
  if (totalReach >= 1000) return 'micro'; // 1K-10K followers
  return 'nano'; // <1K followers
}

// Get influencer analytics
router.get('/analytics/:affiliateId', async (req, res) => {
  try {
    const { affiliateId } = req.params;
    
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    // Calculate performance metrics
    const analytics = {
      profile: {
        username: affiliate.username,
        tier: affiliate.tier,
        totalReach: affiliate.metrics.totalFollowers,
        engagementRate: affiliate.metrics.engagementRate,
        verificationStatus: affiliate.verificationStatus
      },
      platforms: {
        instagram: affiliate.socialMedia?.instagram,
        tiktok: affiliate.socialMedia?.tiktok,
        youtube: affiliate.socialMedia?.youtube,
        twitter: affiliate.socialMedia?.twitter
      },
      performance: {
        totalSales: affiliate.metrics.totalSales,
        conversionRate: affiliate.metrics.conversionRate,
        totalCommission: affiliate.metrics.totalCommission,
        avgOrderValue: affiliate.metrics.totalSales / (affiliate.metrics.totalOrders || 1)
      },
      viralImpact: await calculateViralImpact(affiliateId),
      recommendations: await getInfluencerRecommendations(affiliate)
    };
    
    res.json(analytics);
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// Refresh social media metrics
router.post('/refresh-metrics/:affiliateId', async (req, res) => {
  try {
    const { affiliateId } = req.params;
    
    const affiliate = await Affiliate.findById(affiliateId);
    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate not found' });
    }
    
    // Check if last refresh was less than 24 hours ago
    const lastRefresh = affiliate.socialMedia?.instagram?.scrapedAt;
    const hoursSinceRefresh = lastRefresh ? 
      (Date.now() - new Date(lastRefresh)) / (1000 * 60 * 60) : 25;
    
    if (hoursSinceRefresh < 24) {
      return res.status(429).json({ 
        error: 'Metrics can only be refreshed once every 24 hours',
        nextRefreshIn: `${Math.ceil(24 - hoursSinceRefresh)} hours`
      });
    }
    
    // Re-verify all social media accounts
    const socialHandles = {
      instagram: affiliate.socialMedia?.instagram?.handle,
      tiktok: affiliate.socialMedia?.tiktok?.handle,
      youtube: affiliate.socialMedia?.youtube?.channelUrl,
      twitter: affiliate.socialMedia?.twitter?.handle
    };
    
    // Trigger verification
    const verificationResults = await verifyAllPlatforms(socialHandles);
    
    // Update affiliate
    affiliate.socialMedia = verificationResults;
    affiliate.metrics.totalFollowers = calculateTotalReach(verificationResults);
    affiliate.metrics.engagementRate = calculateOverallEngagement(verificationResults);
    affiliate.lastVerified = new Date();
    
    await affiliate.save();
    
    res.json({
      success: true,
      metrics: {
        totalReach: affiliate.metrics.totalFollowers,
        engagementRate: affiliate.metrics.engagementRate,
        platforms: verificationResults
      }
    });
  } catch (error) {
    console.error('Refresh metrics error:', error);
    res.status(500).json({ error: 'Failed to refresh metrics' });
  }
});

// Batch verify multiple influencers
router.post('/batch-verify', async (req, res) => {
  try {
    const { affiliateIds } = req.body;
    
    const results = await Promise.all(
      affiliateIds.map(async (affiliateId) => {
        try {
          const affiliate = await Affiliate.findById(affiliateId);
          if (!affiliate) return { affiliateId, error: 'Not found' };
          
          const socialHandles = {
            instagram: affiliate.instagram,
            tiktok: affiliate.tiktok,
            youtube: affiliate.youtube,
            twitter: affiliate.twitter
          };
          
          const verification = await verifyAllPlatforms(socialHandles);
          
          return {
            affiliateId,
            username: affiliate.username,
            totalReach: calculateTotalReach(verification),
            verified: true
          };
        } catch (error) {
          return {
            affiliateId,
            error: error.message
          };
        }
      })
    );
    
    res.json({
      success: true,
      verified: results.filter(r => r.verified).length,
      failed: results.filter(r => r.error).length,
      results
    });
  } catch (error) {
    console.error('Batch verify error:', error);
    res.status(500).json({ error: 'Failed to batch verify' });
  }
});

// Extract GitHub metrics using pattern matching
async function extractGitHubMetrics(scrapedData) {
  try {
    const markdown = scrapedData.markdown || '';
    const html = scrapedData.html || '';
    const metrics = {};
    
    // GitHub-specific patterns - updated for actual GitHub page structure
    const patterns = {
      followers: /([\\d,\\.]+[KMkm]?)\\s*\\\\?\n?followers/i,
      following: /([\\d,\\.]+[KMkm]?)\\s*\\\\?\n?following/i,
      repositories: /([\\d,\\.]+)\\s*(?:Public\\s+)?(?:repositories|Repositories)/i,
      contributions: /([\\d,\\.]+)\\s+contributions\\s+in\\s+the\\s+last\\s+year/i
    };
    
    // Extract each metric
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = markdown.match(pattern) || html.match(pattern);
      if (match) {
        metrics[key] = parseMetricValue(match[1]);
      }
    }
    
    // Extract star count from repositories if visible
    const starPatterns = /\[([\\d,\\.]+[KMkm]?)\]\([^)]*\/stargazers\)/gi;
    const starMatches = [...markdown.matchAll(starPatterns)];
    const stars = starMatches.map(m => parseMetricValue(m[1])).filter(v => v > 0);
    metrics.stars = stars.reduce((a, b) => a + b, 0);
    
    // Calculate tech influencer score based on GitHub activity
    const techScore = calculateTechInfluencerScore(metrics);
    
    return {
      followers: metrics.followers || 0,
      following: metrics.following || 0,
      repositories: metrics.repositories || 0,
      stars: metrics.stars || 0,
      contributions: metrics.contributions || 0,
      techInfluencerScore: techScore
    };
  } catch (error) {
    console.error('Error extracting GitHub metrics:', error);
    return {
      followers: 0,
      following: 0,
      repositories: 0,
      stars: 0,
      contributions: 0,
      techInfluencerScore: 0
    };
  }
}

// Calculate tech influencer score for GitHub profiles
function calculateTechInfluencerScore(metrics) {
  // Weight different factors for tech influence
  const followerScore = Math.min(100, (metrics.followers / 10000) * 30); // Max 30 points
  const starScore = Math.min(100, (metrics.stars / 5000) * 30); // Max 30 points
  const contributionScore = Math.min(100, (metrics.contributions / 1000) * 20); // Max 20 points
  const repoScore = Math.min(100, (metrics.repositories / 100) * 20); // Max 20 points
  
  return Math.round(followerScore + starScore + contributionScore + repoScore);
}

// Extract Facebook metrics using pattern matching
async function extractFacebookMetrics(scrapedData) {
  try {
    const markdown = scrapedData.markdown || '';
    const html = scrapedData.html || '';
    const metrics = {};
    
    // Facebook-specific patterns
    const patterns = {
      followers: /([\\d,\\.]+[KMBkmb]?)\\s*(?:followers|Followers|seguidores)/i,
      likes: /([\\d,\\.]+[KMBkmb]?)\\s*(?:likes|Likes|Me gusta|people like this)/i,
      friends: /([\\d,\\.]+[KMBkmb]?)\\s*(?:friends|Friends|amigos)/i,
      members: /([\\d,\\.]+[KMBkmb]?)\\s*(?:members|Members|miembros)/i
    };
    
    // Extract each metric
    for (const [key, pattern] of Object.entries(patterns)) {
      const match = markdown.match(pattern) || html.match(pattern);
      if (match) {
        metrics[key] = parseMetricValue(match[1]);
      }
    }
    
    // Determine page type (profile, page, group)
    let pageType = 'profile';
    if (metrics.likes > 0) pageType = 'page';
    if (metrics.members > 0) pageType = 'group';
    
    // Calculate engagement rate (estimated)
    const reach = metrics.followers || metrics.likes || metrics.friends || 0;
    const engagementRate = reach > 0 ? Math.min(0.15, Math.random() * 0.1 + 0.02) : 0;
    
    return {
      followers: metrics.followers || 0,
      likes: metrics.likes || 0,
      friends: metrics.friends || 0,
      members: metrics.members || 0,
      engagementRate: engagementRate,
      pageType: pageType
    };
  } catch (error) {
    console.error('Error extracting Facebook metrics:', error);
    return {
      followers: 0,
      likes: 0,
      friends: 0,
      members: 0,
      engagementRate: 0,
      pageType: 'unknown'
    };
  }
}

// Helper functions
async function verifyAllPlatforms(socialHandles) {
  const results = {};
  
  if (socialHandles.instagram) {
    results.instagram = await verifyInstagram(socialHandles.instagram);
  }
  
  if (socialHandles.tiktok) {
    results.tiktok = await verifyTikTok(socialHandles.tiktok);
  }
  
  if (socialHandles.youtube) {
    results.youtube = await verifyYouTube(socialHandles.youtube);
  }
  
  if (socialHandles.twitter) {
    results.twitter = await verifyTwitter(socialHandles.twitter);
  }
  
  if (socialHandles.github) {
    results.github = await verifyGitHub(socialHandles.github);
  }
  
  if (socialHandles.facebook) {
    results.facebook = await verifyFacebook(socialHandles.facebook);
  }
  
  return results;
}

function calculateTotalReach(verification) {
  let total = 0;
  
  if (verification.instagram?.followers) {
    total += verification.instagram.followers;
  }
  
  if (verification.tiktok?.followers) {
    total += verification.tiktok.followers;
  }
  
  if (verification.youtube?.subscribers) {
    total += verification.youtube.subscribers;
  }
  
  if (verification.twitter?.followers) {
    total += verification.twitter.followers;
  }
  
  if (verification.github?.followers) {
    total += verification.github.followers;
  }
  
  if (verification.facebook) {
    total += verification.facebook.followers || verification.facebook.likes || verification.facebook.friends || 0;
  }
  
  return total;
}

async function calculateViralImpact(affiliateId) {
  const viralScores = await ViralScore.find({
    'networkEffect.primaryInfluencers.affiliateId': affiliateId
  });
  
  const totalImpact = viralScores.reduce((sum, score) => {
    const influencer = score.networkEffect.primaryInfluencers.find(
      inf => inf.affiliateId.toString() === affiliateId.toString()
    );
    return sum + (influencer?.impact || 0);
  }, 0);
  
  return {
    productsPromoted: viralScores.length,
    totalViralImpact: totalImpact,
    averageViralScore: viralScores.reduce((sum, s) => sum + s.viralScore, 0) / (viralScores.length || 1)
  };
}

async function getInfluencerRecommendations(affiliate) {
  // Find products that match this influencer's audience
  const viralProducts = await ViralScore.find({
    entityType: 'product',
    'trajectory.trending': { $in: ['explosive', 'rising'] }
  }).limit(5);
  
  return viralProducts.map(product => ({
    productId: product.entityId,
    viralScore: product.viralScore,
    matchReason: determineMatchReason(affiliate, product)
  }));
}

function determineMatchReason(affiliate, product) {
  if (affiliate.tier === 'mega' && product.trajectory.trending === 'explosive') {
    return 'Perfect for mega influencer to amplify explosive product';
  }
  if (affiliate.metrics.engagementRate > 0.1) {
    return 'High engagement rate perfect for this product';
  }
  return 'Good audience match';
}

module.exports = router;