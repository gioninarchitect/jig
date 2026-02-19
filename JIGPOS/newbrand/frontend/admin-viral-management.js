// Admin Viral Marketing & Influencer Management JavaScript

// Global state
let currentViralSection = 'campaigns';
let allInfluencers = [];
let allCampaigns = [];
let allProductScores = [];

// Show viral section tabs
function showViralSection(section) {
  currentViralSection = section;

  // Hide all sections
  document.getElementById('viral-campaigns-section').style.display = 'none';
  document.getElementById('viral-influencers-section').style.display = 'none';
  document.getElementById('viral-products-section').style.display = 'none';
  document.getElementById('viral-analytics-section').style.display = 'none';

  // Show selected section
  document.getElementById(`viral-${section}-section`).style.display = 'block';

  // Update active tab
  const tabs = document.querySelectorAll('#viral-tab .tab-nav .tab');
  tabs.forEach((tab, index) => {
    tab.classList.remove('active');
    const sectionNames = ['campaigns', 'influencers', 'products', 'analytics'];
    if (sectionNames[index] === section) {
      tab.classList.add('active');
    }
  });

  // Load data for the section
  switch(section) {
    case 'campaigns':
      loadViralCampaigns();
      break;
    case 'influencers':
      loadInfluencers();
      break;
    case 'products':
      loadProductScores();
      break;
    case 'analytics':
      loadViralAnalytics();
      break;
  }
}

// Load viral stats
async function loadViralStats() {
  try {
    const token = sessionStorage.getItem('adminToken');

    // Load affiliates (influencers)
    const affiliatesResponse = await fetch(`${API_URL}/affiliate/admin/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const affiliatesData = await affiliatesResponse.json();

    const activeInfluencers = affiliatesData.affiliates?.filter(a =>
      a.status === 'active' && a.affiliateType === 'influencer'
    ).length || 0;

    document.getElementById('viralActiveInfluencers').textContent = activeInfluencers;

    // Load viral campaigns
    const campaignsResponse = await fetch(`${API_URL}/viral/campaigns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const campaignsData = await campaignsResponse.json();

    const activeCampaigns = campaignsData.campaigns?.filter(c =>
      c.status === 'active'
    ).length || 0;

    document.getElementById('viralActiveCampaigns').textContent = activeCampaigns;

    // Calculate total reach
    let totalReach = 0;
    affiliatesData.affiliates?.forEach(a => {
      if (a.status === 'active' && a.affiliateType === 'influencer') {
        totalReach += (a.metrics?.totalClicks || 0);
      }
    });

    document.getElementById('viralTotalReach').textContent = totalReach.toLocaleString();

    // Load viral trending products (scores)
    const scoresResponse = await fetch(`${API_URL}/viral/trending?minScore=0`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const scoresData = await scoresResponse.json();

    const totalScore = scoresData.trending?.reduce((sum, s) => sum + (s.viralScore || 0), 0) || 0;
    document.getElementById('viralTotalScore').textContent = Math.round(totalScore);

  } catch (error) {
    console.error('Load viral stats error:', error);
  }
}

// Load viral campaigns
async function loadViralCampaigns() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/viral/campaigns`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    allCampaigns = data.campaigns || [];

    displayCampaigns(allCampaigns);
  } catch (error) {
    console.error('Load campaigns error:', error);
    document.getElementById('campaignsTableBody').innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 40px; color: #d9534f;">
        Failed to load campaigns
      </td></tr>
    `;
  }
}

// Display campaigns in table
function displayCampaigns(campaigns) {
  const tbody = document.getElementById('campaignsTableBody');

  if (!campaigns || campaigns.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 40px; color: #999;">
        No campaigns found. Create your first campaign!
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = campaigns.map(campaign => `
    <tr>
      <td>${campaign.name || 'Unnamed'}</td>
      <td><span class="badge badge-${campaign.status === 'active' ? 'success' : campaign.status === 'draft' ? 'warning' : 'secondary'}">${campaign.status}</span></td>
      <td>${campaign.products?.length || 0}</td>
      <td>${campaign.influencers?.length || 0}</td>
      <td>${(campaign.totalReach || 0).toLocaleString()}</td>
      <td>${formatDate(new Date(campaign.startDate))}</td>
      <td>${formatDate(new Date(campaign.endDate))}</td>
      <td>
        <div style="display:flex;gap:6px;align-items:center;">
            <button class="action-btn view-btn" onclick="viewCampaign('${campaign._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-eye"></i> View</button>
            <button class="action-btn approve-btn" onclick="editCampaign('${campaign._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-pen"></i> Edit</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Load influencers
async function loadInfluencers() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/affiliate/admin/all`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    allInfluencers = data.affiliates?.filter(a => a.affiliateType === 'influencer') || [];

    displayInfluencers(allInfluencers);
  } catch (error) {
    console.error('Load influencers error:', error);
    document.getElementById('influencersTableBody').innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 40px; color: #d9534f;">
        Failed to load influencers
      </td></tr>
    `;
  }
}

// Display influencers
function displayInfluencers(influencers) {
  const tbody = document.getElementById('influencersTableBody');

  if (!influencers || influencers.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 40px; color: #999;">
        No influencers found
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = influencers.map(inf => {
    const tier = determineInfluencerTier(inf.metrics?.totalClicks || 0);
    const platform = inf.socialMedia?.instagram ? 'Instagram' :
                    inf.socialMedia?.tiktok ? 'TikTok' :
                    inf.socialMedia?.youtube ? 'YouTube' : 'Other';

    return `
      <tr>
        <td>${inf.username || inf.fullName}</td>
        <td><span class="badge badge-primary">${tier}</span></td>
        <td>${(inf.metrics?.totalClicks || 0).toLocaleString()}</td>
        <td>${platform}</td>
        <td>${inf.commissionRate}%</td>
        <td>R${(inf.metrics?.totalSales || 0).toFixed(2)}</td>
        <td><span class="badge badge-${inf.status === 'active' ? 'success' : 'warning'}">${inf.status}</span></td>
        <td>
          <button class="action-btn view-btn" onclick="viewInfluencer('${inf._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-eye"></i> View</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Determine influencer tier
function determineInfluencerTier(followers) {
  if (followers >= 1000000) return 'Mega';
  if (followers >= 500000) return 'Macro';
  if (followers >= 100000) return 'Mid-Tier';
  if (followers >= 10000) return 'Micro';
  if (followers >= 1000) return 'Nano';
  return 'Standard';
}

// Load product scores
async function loadProductScores() {
  try {
    const token = sessionStorage.getItem('adminToken');
    const response = await fetch(`${API_URL}/viral/trending?minScore=0`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const data = await response.json();
    allProductScores = data.trending || [];

    displayProductScores(allProductScores);
  } catch (error) {
    console.error('Load product scores error:', error);
    document.getElementById('productScoresTableBody').innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 40px; color: #d9534f;">
        Failed to load product scores
      </td></tr>
    `;
  }
}

// Display product scores
function displayProductScores(scores) {
  const tbody = document.getElementById('productScoresTableBody');

  if (!scores || scores.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="8" style="text-align: center; padding: 40px; color: #999;">
        No product scores available
      </td></tr>
    `;
    return;
  }

  tbody.innerHTML = scores.slice(0, 50).map(score => {
    const engagementRate = score.metrics?.totalViews > 0
      ? ((score.metrics.totalEngagements / score.metrics.totalViews) * 100).toFixed(2)
      : 0;

    return `
      <tr>
        <td>${score.productId?.name || 'Unknown Product'}</td>
        <td><strong style="color: ${score.viralScore > 70 ? '#4CAF50' : score.viralScore > 40 ? '#ff9800' : '#999'};">${score.viralScore.toFixed(1)}</strong></td>
        <td>${(score.metrics?.totalViews || 0).toLocaleString()}</td>
        <td>${(score.metrics?.totalShares || 0).toLocaleString()}</td>
        <td>${(score.metrics?.totalPurchases || 0).toLocaleString()}</td>
        <td>${engagementRate}%</td>
        <td>${score.trending ? '<span class="badge badge-success">Yes</span>' : '<span class="badge badge-secondary">No</span>'}</td>
        <td>
          <button class="action-btn view-btn" onclick="viewProductScore('${score._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-chart-bar"></i> View</button>
        </td>
      </tr>
    `;
  }).join('');
}

// Load viral analytics
async function loadViralAnalytics() {
  try {
    const token = sessionStorage.getItem('adminToken');

    // For now, show placeholder data
    // In production, this would call a dedicated analytics endpoint
    document.getElementById('analyticsImpressions').textContent = '0';
    document.getElementById('analyticsCTR').textContent = '0%';
    document.getElementById('analyticsConversion').textContent = '0%';
    document.getElementById('analyticsRevenue').textContent = 'R0';

    document.getElementById('topContentList').innerHTML = `
      <p style="color: #999; text-align: center; padding: 20px;">No analytics data available yet</p>
    `;
  } catch (error) {
    console.error('Load analytics error:', error);
  }
}

// Filter functions
function filterCampaigns() {
  const searchTerm = document.getElementById('campaignSearch').value.toLowerCase();
  const filtered = allCampaigns.filter(c =>
    (c.name || '').toLowerCase().includes(searchTerm) ||
    (c.status || '').toLowerCase().includes(searchTerm)
  );
  displayCampaigns(filtered);
}

function filterInfluencers() {
  const searchTerm = document.getElementById('influencerSearch').value.toLowerCase();
  const tierFilter = document.getElementById('influencerTierFilter').value;

  const filtered = allInfluencers.filter(inf => {
    const matchesSearch = (inf.username || '').toLowerCase().includes(searchTerm) ||
                         (inf.fullName || '').toLowerCase().includes(searchTerm) ||
                         (inf.email || '').toLowerCase().includes(searchTerm);

    if (tierFilter === 'all') return matchesSearch;

    const tier = determineInfluencerTier(inf.metrics?.totalClicks || 0).toLowerCase();
    return matchesSearch && tier.includes(tierFilter);
  });

  displayInfluencers(filtered);
}

// Placeholder action functions
function createViralCampaign() {
  showToast('Info', 'Campaign creation coming soon', 'info');
}

function viewCampaign(id) {
  showToast('Info', `Viewing campaign ${id}`, 'info');
}

function editCampaign(id) {
  showToast('Info', `Editing campaign ${id}`, 'info');
}

function viewInfluencer(id) {
  showToast('Info', `Viewing influencer ${id}`, 'info');
}

function viewProductScore(id) {
  showToast('Info', `Viewing product score ${id}`, 'info');
}

function recalculateAllScores() {
  showToast('Info', 'Recalculating all viral scores...', 'info');
}

// Format date helper
function formatDate(date) {
  if (!(date instanceof Date) || isNaN(date)) return 'N/A';
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Initialize when viral tab is opened
document.addEventListener('DOMContentLoaded', () => {
  // Listen for tab changes
  const viralTab = document.querySelector('[onclick*="showMainTab(\'viral\')"]');
  if (viralTab) {
    viralTab.addEventListener('click', () => {
      setTimeout(() => {
        loadViralStats();
        loadViralCampaigns();
      }, 100);
    });
  }
});
