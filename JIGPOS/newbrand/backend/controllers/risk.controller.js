/**
 * Risk Scoring Controller (P29+P34)
 * Server-side risk calculations — branch, network, cross-domain, staff accountability.
 * P34: In-memory cache with 30-second TTL for risk scores.
 */

const WorldModelConfig = require('../modules/database/models/WorldModelConfig');
const Sale = require('../modules/database/models/Sale');
const TillSession = require('../modules/database/models/TillSession');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Batch = require('../modules/database/models/Batch');
const StaffShift = require('../modules/database/models/StaffShift');
const Section21Document = require('../modules/database/models/Section21Document');
const Branch = require('../modules/database/models/Branch');
const User = require('../modules/database/models/User');
const logger = require('../modules/logger');

// ─── P34: Response cache (30-second TTL) ────────────────────────

const _riskCache = new Map();
const RISK_CACHE_TTL = 30 * 1000; // 30 seconds

function getCached(key) {
  const entry = _riskCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > RISK_CACHE_TTL) {
    _riskCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  _riskCache.set(key, { data, ts: Date.now() });
  // Prevent unbounded growth
  if (_riskCache.size > 200) {
    const oldest = _riskCache.keys().next().value;
    _riskCache.delete(oldest);
  }
}

// ─── Feature gate helper ────────────────────────────────────────

async function requireFeature(featureName, res) {
  const config = await WorldModelConfig.getConfig();
  if (!config.features?.[featureName]?.enabled) {
    res.status(403).json({
      error: `Feature "${featureName}" is disabled`,
      message: 'Enable this feature in World Model configuration'
    });
    return null;
  }
  return config;
}

// ─── GET /risk/branch/:branchId ─────────────────────────────────

exports.getBranchRisk = async (req, res) => {
  try {
    const config = await requireFeature('riskScoring', res);
    if (!config) return;

    const { branchId } = req.params;

    // P34: Check cache
    const cacheKey = `branch_risk_${branchId}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const thresholds = config.thresholds;
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Gather data in parallel
    const [tillSessions, inventory, batches, shifts, s21Docs] = await Promise.all([
      TillSession.find({ branch: branchId, openedAt: { $gte: new Date(now - 30 * 86400000) } }).lean(),
      BranchInventory.find({ branch: branchId }).lean(),
      Batch.find({ branch: branchId, status: { $ne: 'depleted' } }).lean(),
      StaffShift.find({ branch: branchId, date: { $gte: new Date(now - 7 * 86400000) } }).lean(),
      Section21Document.find({ status: 'active' }).lean()
    ]);

    // Score each domain (0-100, higher = more risk)
    const regulatory = scoreRegulatory(s21Docs, thresholds);
    const financial = scoreFinancial(tillSessions, thresholds);
    const inventoryRisk = scoreInventory(inventory, batches, thresholds);
    const staff = scoreStaff(tillSessions, shifts, thresholds);
    const operational = scoreOperational(inventory, thresholds);
    const customer = scoreCustomer(thresholds);

    // Weighted overall
    const weights = { regulatory: 0.25, financial: 0.20, inventory: 0.20, staff: 0.15, operational: 0.10, customer: 0.10 };
    const overall = Math.round(
      regulatory * weights.regulatory +
      financial * weights.financial +
      inventoryRisk * weights.inventory +
      staff * weights.staff +
      operational * weights.operational +
      customer * weights.customer
    );

    const data = {
      branchId,
      overall,
      regulatory,
      financial,
      inventory: inventoryRisk,
      staff,
      operational,
      customer,
      calculatedAt: now
    };

    setCache(cacheKey, data);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Failed to calculate branch risk', { error: error.message, branchId: req.params.branchId });
    res.status(500).json({ error: 'Failed to calculate risk score' });
  }
};

// ─── GET /risk/network ──────────────────────────────────────────

exports.getNetworkRisk = async (req, res) => {
  try {
    const config = await requireFeature('riskScoring', res);
    if (!config) return;

    // P34: Check cache
    const cached = getCached('network_risk');
    if (cached) return res.json({ success: true, data: cached });

    const branches = await Branch.find({ status: 'active' }).select('_id name branchCode').lean();
    const thresholds = config.thresholds;
    const now = new Date();

    const branchScores = await Promise.all(branches.map(async (branch) => {
      try {
        const [tillSessions, inventory, batches] = await Promise.all([
          TillSession.find({ branch: branch._id, openedAt: { $gte: new Date(now - 30 * 86400000) } }).lean(),
          BranchInventory.find({ branch: branch._id }).lean(),
          Batch.find({ branch: branch._id, status: { $ne: 'depleted' } }).lean()
        ]);

        const financial = scoreFinancial(tillSessions, thresholds);
        const inventoryRisk = scoreInventory(inventory, batches, thresholds);
        const overall = Math.round(financial * 0.4 + inventoryRisk * 0.4 + 20 * 0.2);

        return { branchId: branch._id, name: branch.name, branchCode: branch.branchCode, overall, financial, inventory: inventoryRisk };
      } catch {
        return { branchId: branch._id, name: branch.name, branchCode: branch.branchCode, overall: 0, financial: 0, inventory: 0 };
      }
    }));

    branchScores.sort((a, b) => b.overall - a.overall);
    const networkAverage = branchScores.length > 0
      ? Math.round(branchScores.reduce((s, b) => s + b.overall, 0) / branchScores.length)
      : 0;

    const data = {
      branches: branchScores,
      networkAverage,
      highestRisk: branchScores[0] || null,
      calculatedAt: now
    };

    setCache('network_risk', data);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Failed to calculate network risk', { error: error.message });
    res.status(500).json({ error: 'Failed to calculate network risk' });
  }
};

// ─── GET /risk/cross-domain ─────────────────────────────────────

exports.getCrossDomainAlerts = async (req, res) => {
  try {
    const config = await requireFeature('riskScoring', res);
    if (!config) return;

    const branchId = req.query.branchId;
    const now = new Date();
    const alerts = [];

    const [tillSessions, inventory, batches] = await Promise.all([
      TillSession.find(branchId ? { branch: branchId } : {}).sort({ openedAt: -1 }).limit(100).lean(),
      BranchInventory.find(branchId ? { branch: branchId } : {}).lean(),
      Batch.find(branchId ? { branch: branchId } : {}).lean()
    ]);

    // Rule 1: Internal theft pattern — high voids + shrinkage
    const highVoidSessions = tillSessions.filter(s => (s.voidCount || 0) > 3);
    const shrinkageItems = inventory.filter(i => {
      const shrink = (i.systemQuantity || 0) - (i.physicalQuantity || i.quantity || 0);
      return shrink > 5;
    });
    if (highVoidSessions.length > 2 && shrinkageItems.length > 3) {
      alerts.push({
        rule: 'internal_theft_pattern',
        severity: 'critical',
        domains: ['financial', 'inventory'],
        message: 'High void frequency coincides with inventory shrinkage',
        data: { voidSessions: highVoidSessions.length, shrinkageItems: shrinkageItems.length }
      });
    }

    // Rule 2: Batch expiry + no markdown — compliance risk
    const expiringBatches = batches.filter(b => {
      if (!b.expiryDate) return false;
      const daysToExpiry = (new Date(b.expiryDate) - now) / 86400000;
      return daysToExpiry > 0 && daysToExpiry < 14 && !b.markedDown;
    });
    if (expiringBatches.length > 2) {
      alerts.push({
        rule: 'expiry_no_markdown',
        severity: 'warning',
        domains: ['inventory', 'regulatory'],
        message: `${expiringBatches.length} batches expiring within 14 days without markdown`,
        data: { count: expiringBatches.length }
      });
    }

    // Rule 3: Low stock + high demand — operational risk
    const criticalStock = inventory.filter(i => (i.quantity || 0) <= (i.reorderPoint || 5));
    if (criticalStock.length > 5) {
      alerts.push({
        rule: 'stock_demand_mismatch',
        severity: 'warning',
        domains: ['inventory', 'operational'],
        message: `${criticalStock.length} products below reorder point`,
        data: { count: criticalStock.length }
      });
    }

    alerts.sort((a, b) => (a.severity === 'critical' ? -1 : 1) - (b.severity === 'critical' ? -1 : 1));

    res.json({ success: true, data: alerts });
  } catch (error) {
    logger.error('Failed to get cross-domain alerts', { error: error.message });
    res.status(500).json({ error: 'Failed to get cross-domain alerts' });
  }
};

// ─── GET /risk/staff/:staffId ───────────────────────────────────

exports.getStaffScore = async (req, res) => {
  try {
    const config = await requireFeature('staffAccountability', res);
    if (!config) return;

    const { staffId } = req.params;
    const staff = await User.findById(staffId).select('firstName lastName email role').lean();
    if (!staff) return res.status(404).json({ error: 'Staff member not found' });

    const now = new Date();
    const tillSessions = await TillSession.find({ cashier: staffId, openedAt: { $gte: new Date(now - 30 * 86400000) } }).lean();
    const shifts = await StaffShift.find({ user: staffId, date: { $gte: new Date(now - 30 * 86400000) } }).lean();

    // Calculate metrics
    const metrics = {
      tillAccuracy: calcTillAccuracy(tillSessions),
      voidRatio: calcVoidRatio(tillSessions),
      discountCompliance: calcDiscountCompliance(tillSessions),
      speedConsistency: calcSpeedConsistency(tillSessions),
      clockInCompliance: calcClockInCompliance(shifts)
    };

    // Weighted composite
    const weights = { tillAccuracy: 0.25, voidRatio: 0.20, discountCompliance: 0.15, speedConsistency: 0.20, clockInCompliance: 0.20 };
    const composite = Math.round(Object.entries(weights).reduce((sum, [key, w]) => sum + (metrics[key] || 0) * w, 0));

    // Tier
    const tier = composite >= 90 ? 'Exceptional' : composite >= 75 ? 'Good' : composite >= 60 ? 'Satisfactory' : 'Needs Improvement';

    // Achievements
    const achievements = [];
    if (metrics.tillAccuracy >= 98) achievements.push('Perfect Till');
    if (metrics.voidRatio >= 95) achievements.push('Low Void Champion');
    if (metrics.speedConsistency >= 90) achievements.push('Speed Star');
    if (metrics.clockInCompliance >= 95) achievements.push('Always On Time');

    res.json({
      success: true,
      data: {
        staffId,
        staff,
        score: composite,
        tier,
        metrics,
        achievements,
        sessionsAnalyzed: tillSessions.length,
        calculatedAt: now
      }
    });
  } catch (error) {
    logger.error('Failed to get staff score', { error: error.message, staffId: req.params.staffId });
    res.status(500).json({ error: 'Failed to calculate staff score' });
  }
};

// ─── GET /risk/staff/leaderboard/:branchId ──────────────────────

exports.getStaffLeaderboard = async (req, res) => {
  try {
    const config = await requireFeature('staffAccountability', res);
    if (!config) return;

    const { branchId } = req.params;
    const staffMembers = await User.find({
      branch: branchId,
      role: { $in: ['branch_assistant', 'branch_manager'] },
      isActive: { $ne: false }
    }).select('_id firstName lastName role').lean();

    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 86400000);

    const leaderboard = await Promise.all(staffMembers.map(async (member) => {
      const tillSessions = await TillSession.find({ cashier: member._id, openedAt: { $gte: thirtyDaysAgo } }).lean();
      const shifts = await StaffShift.find({ user: member._id, date: { $gte: thirtyDaysAgo } }).lean();

      const metrics = {
        tillAccuracy: calcTillAccuracy(tillSessions),
        voidRatio: calcVoidRatio(tillSessions),
        speedConsistency: calcSpeedConsistency(tillSessions),
        clockInCompliance: calcClockInCompliance(shifts)
      };

      const score = Math.round(
        metrics.tillAccuracy * 0.30 + metrics.voidRatio * 0.25 +
        metrics.speedConsistency * 0.25 + metrics.clockInCompliance * 0.20
      );
      const tier = score >= 90 ? 'Exceptional' : score >= 75 ? 'Good' : score >= 60 ? 'Satisfactory' : 'Needs Improvement';

      return { ...member, score, tier, metrics };
    }));

    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard.forEach((entry, i) => { entry.rank = i + 1; });

    res.json({ success: true, data: leaderboard });
  } catch (error) {
    logger.error('Failed to get staff leaderboard', { error: error.message });
    res.status(500).json({ error: 'Failed to get leaderboard' });
  }
};

// ─── POST /risk/investigate ─────────────────────────────────────

exports.createInvestigation = async (req, res) => {
  try {
    const config = await requireFeature('riskScoring', res);
    if (!config) return;

    const { alertRule, branchId, severity, assignedTo, notes } = req.body;
    if (!alertRule || !branchId) return res.status(400).json({ error: 'alertRule and branchId are required' });

    // Store as a lightweight document (could be its own model, using a generic approach here)
    const investigation = {
      alertRule,
      branchId,
      severity: severity || 'warning',
      assignedTo,
      notes,
      createdBy: req.user.id,
      createdAt: new Date(),
      status: 'open'
    };

    // Notify via WebSocket
    try {
      const websocket = require('../modules/websocket');
      websocket.notifyOwners('risk:investigation-created', { investigation });
      if (assignedTo) {
        websocket.notifyUser(assignedTo, 'risk:investigation-assigned', { investigation });
      }
    } catch { /* WebSocket not initialized */ }

    logger.info('Investigation created', { alertRule, branchId, createdBy: req.user.id });
    res.json({ success: true, data: investigation, message: 'Investigation created' });
  } catch (error) {
    logger.error('Failed to create investigation', { error: error.message });
    res.status(500).json({ error: 'Failed to create investigation' });
  }
};

// ─── Scoring helpers ────────────────────────────────────────────

function scoreRegulatory(docs, thresholds) {
  if (!docs || docs.length === 0) return 20;
  const now = new Date();
  const expired = docs.filter(d => d.expiryDate && new Date(d.expiryDate) < now).length;
  const expiringSoon = docs.filter(d => {
    if (!d.expiryDate) return false;
    const days = (new Date(d.expiryDate) - now) / 86400000;
    return days > 0 && days < 30;
  }).length;
  return Math.min(100, (expired * 25) + (expiringSoon * 10) + 10);
}

function scoreFinancial(sessions, thresholds) {
  if (!sessions || sessions.length === 0) return 10;
  const amberThreshold = thresholds?.tillVarianceAmber || 50;
  const redThreshold = thresholds?.tillVarianceRed || 200;
  const variances = sessions.filter(s => Math.abs(s.variance || 0) > amberThreshold);
  const redVariances = sessions.filter(s => Math.abs(s.variance || 0) > redThreshold);
  const totalVoids = sessions.reduce((sum, s) => sum + (s.voidCount || 0), 0);
  return Math.min(100, (redVariances.length * 15) + (variances.length * 5) + Math.min(totalVoids, 30));
}

function scoreInventory(inventory, batches, thresholds) {
  if (!inventory || inventory.length === 0) return 10;
  const lowStockDays = thresholds?.lowStockDays || 7;
  const lowStock = inventory.filter(i => (i.quantity || 0) <= (i.reorderPoint || 5)).length;
  const ratio = inventory.length > 0 ? lowStock / inventory.length : 0;
  const expiringBatches = (batches || []).filter(b => {
    if (!b.expiryDate) return false;
    return (new Date(b.expiryDate) - new Date()) / 86400000 < 14;
  }).length;
  return Math.min(100, Math.round(ratio * 60) + (expiringBatches * 5) + 5);
}

function scoreStaff(sessions, shifts, thresholds) {
  if (!sessions || sessions.length === 0) return 10;
  const streakThreshold = thresholds?.shiftVarianceStreak || 3;
  const highVariance = sessions.filter(s => Math.abs(s.variance || 0) > (thresholds?.tillVarianceAmber || 50));
  return Math.min(100, (highVariance.length * 8) + 5);
}

function scoreOperational(inventory, thresholds) {
  if (!inventory || inventory.length === 0) return 10;
  const critical = inventory.filter(i => (i.quantity || 0) <= 0).length;
  return Math.min(100, (critical * 12) + 5);
}

function scoreCustomer(thresholds) {
  return 15; // Baseline — enriched with real data as customer endpoints mature
}

// ─── Staff metric helpers ───────────────────────────────────────

function calcTillAccuracy(sessions) {
  if (!sessions || sessions.length === 0) return 100;
  const accurate = sessions.filter(s => Math.abs(s.variance || 0) <= 5).length;
  return Math.round((accurate / sessions.length) * 100);
}

function calcVoidRatio(sessions) {
  if (!sessions || sessions.length === 0) return 100;
  const totalTransactions = sessions.reduce((sum, s) => sum + (s.transactionCount || 1), 0);
  const totalVoids = sessions.reduce((sum, s) => sum + (s.voidCount || 0), 0);
  if (totalTransactions === 0) return 100;
  const ratio = totalVoids / totalTransactions;
  return Math.max(0, Math.round((1 - ratio * 10) * 100));
}

function calcDiscountCompliance(sessions) {
  if (!sessions || sessions.length === 0) return 100;
  const withDiscounts = sessions.filter(s => (s.discountCount || 0) > 0);
  if (withDiscounts.length === 0) return 100;
  const approved = withDiscounts.filter(s => s.discountsApproved !== false).length;
  return Math.round((approved / withDiscounts.length) * 100);
}

function calcSpeedConsistency(sessions) {
  if (!sessions || sessions.length === 0) return 80;
  const avgTimes = sessions.map(s => s.avgTransactionTime || 90).filter(t => t > 0);
  if (avgTimes.length === 0) return 80;
  const inRange = avgTimes.filter(t => t >= 30 && t <= 180).length;
  return Math.round((inRange / avgTimes.length) * 100);
}

function calcClockInCompliance(shifts) {
  if (!shifts || shifts.length === 0) return 80;
  const onTime = shifts.filter(s => {
    if (!s.clockIn || !s.scheduledStart) return true;
    const diff = (new Date(s.clockIn) - new Date(s.scheduledStart)) / 60000;
    return diff <= 5; // within 5 minutes
  }).length;
  return Math.round((onTime / shifts.length) * 100);
}
