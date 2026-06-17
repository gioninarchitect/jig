/**
 * World Model Config Controller
 * CRUD for World Model configuration, audit trail, state sync.
 */

const WorldModelConfig = require('../modules/database/models/WorldModelConfig');
const WorldModelConfigHistory = require('../modules/database/models/WorldModelConfigHistory');
const logger = require('../modules/logger');

// ─── GET current config ─────────────────────────────────────────

exports.getConfig = async (req, res) => {
  try {
    const config = await WorldModelConfig.getConfig();

    // If branch context, return effective config
    const branchId = req.query.branchId || req.user?.branchId;
    const effective = branchId ? config.getEffectiveConfig(branchId) : config.toObject();

    res.json({ success: true, data: effective });
  } catch (error) {
    logger.error('Failed to get World Model config', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve configuration' });
  }
};

// ─── PUT update config (Super Admin + Owner only) ───────────────

exports.updateConfig = async (req, res) => {
  try {
    const config = await WorldModelConfig.getConfig();
    const previousValue = {
      features: config.features?.toObject ? config.features.toObject() : { ...config.features },
      thresholds: config.thresholds?.toObject ? config.thresholds.toObject() : { ...config.thresholds }
    };

    const { features, thresholds, reason } = req.body;

    if (features) {
      for (const [key, val] of Object.entries(features)) {
        if (config.features[key]) {
          Object.assign(config.features[key], val);
        }
      }
    }

    if (thresholds) {
      Object.assign(config.thresholds, thresholds);
    }

    config.version += 1;
    config.updatedBy = req.user.id;
    await config.save();

    // Audit trail
    await WorldModelConfigHistory.create({
      changedBy: req.user.id,
      previousValue,
      newValue: {
        features: config.features?.toObject ? config.features.toObject() : { ...config.features },
        thresholds: config.thresholds?.toObject ? config.thresholds.toObject() : { ...config.thresholds }
      },
      reason: reason || '',
      changeType: 'global'
    });

    // Broadcast config change via WebSocket
    try {
      const websocket = require('../modules/websocket');
      websocket.broadcast('worldmodel:config-updated', {
        version: config.version,
        updatedBy: req.user.id,
        features: config.features
      });
    } catch { /* WebSocket not initialized */ }

    logger.info('World Model config updated', { userId: req.user.id, version: config.version });
    res.json({ success: true, data: config, message: 'Configuration updated' });
  } catch (error) {
    logger.error('Failed to update World Model config', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update configuration' });
  }
};

// ─── GET config change history ──────────────────────────────────

exports.getHistory = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const skip = (page - 1) * limit;

    // Date range filter
    const query = {};
    if (req.query.from) {
      query.changedAt = { $gte: new Date(req.query.from) };
    }
    if (req.query.to) {
      query.changedAt = { ...(query.changedAt || {}), $lte: new Date(req.query.to) };
    }

    const [history, total] = await Promise.all([
      WorldModelConfigHistory.find(query)
        .sort({ changedAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('changedBy', 'firstName lastName email role')
        .populate('branchId', 'name branchCode')
        .lean(),
      WorldModelConfigHistory.countDocuments(query)
    ]);

    res.json({ success: true, data: history, total, page, limit });
  } catch (error) {
    logger.error('Failed to get config history', { error: error.message });
    res.status(500).json({ error: 'Failed to retrieve history' });
  }
};

// ─── POST revert a config change ────────────────────────────────

exports.revertChange = async (req, res) => {
  try {
    const { historyId } = req.params;
    if (!historyId) return res.status(400).json({ error: 'historyId is required' });

    const entry = await WorldModelConfigHistory.findById(historyId).lean();
    if (!entry) return res.status(404).json({ error: 'History entry not found' });

    const config = await WorldModelConfig.getConfig();
    const currentValue = {
      features: config.features?.toObject ? config.features.toObject() : { ...config.features },
      thresholds: config.thresholds?.toObject ? config.thresholds.toObject() : { ...config.thresholds }
    };

    // Revert = apply the previousValue from the history entry
    const revertTo = entry.previousValue;

    if (entry.changeType === 'branch_override' && entry.branchId) {
      // Revert branch override
      const branchId = String(entry.branchId._id || entry.branchId);
      if (revertTo && Object.keys(revertTo).length > 0) {
        config.branchOverrides.set(branchId, revertTo);
      } else {
        config.branchOverrides.delete(branchId);
      }
    } else {
      // Revert global config
      if (revertTo?.features) {
        for (const [key, val] of Object.entries(revertTo.features)) {
          if (config.features[key] && typeof val === 'object') {
            Object.assign(config.features[key], val);
          }
        }
      }
      if (revertTo?.thresholds) {
        Object.assign(config.thresholds, revertTo.thresholds);
      }
    }

    config.version += 1;
    config.updatedBy = req.user.id;
    await config.save();

    // Audit trail for the revert
    const revertDate = new Date(entry.changedAt).toLocaleString('en-ZA');
    await WorldModelConfigHistory.create({
      changedBy: req.user.id,
      previousValue: currentValue,
      newValue: revertTo,
      reason: `Reverted change from ${revertDate}`,
      changeType: entry.changeType,
      branchId: entry.branchId
    });

    // Broadcast
    try {
      const websocket = require('../modules/websocket');
      websocket.broadcast('worldmodel:config-updated', {
        version: config.version,
        updatedBy: req.user.id,
        revert: true
      });
    } catch { /* WebSocket not initialized */ }

    logger.info('Config change reverted', { userId: req.user.id, historyId, version: config.version });
    res.json({ success: true, data: config, message: 'Change reverted successfully' });
  } catch (error) {
    logger.error('Failed to revert config change', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to revert change' });
  }
};

// ─── PUT branch-specific override ───────────────────────────────

exports.setBranchOverride = async (req, res) => {
  try {
    const { branchId } = req.params;
    if (!branchId) return res.status(400).json({ error: 'branchId is required' });

    const config = await WorldModelConfig.getConfig();
    const previousOverride = config.branchOverrides?.get(branchId) || {};

    const { features, thresholds, reason } = req.body;
    const override = { ...previousOverride };
    if (features) override.features = { ...(override.features || {}), ...features };
    if (thresholds) override.thresholds = { ...(override.thresholds || {}), ...thresholds };

    config.branchOverrides.set(branchId, override);
    config.version += 1;
    config.updatedBy = req.user.id;
    await config.save();

    // Audit trail
    await WorldModelConfigHistory.create({
      changedBy: req.user.id,
      previousValue: previousOverride,
      newValue: override,
      reason: reason || '',
      changeType: 'branch_override',
      branchId
    });

    // Broadcast to branch room
    try {
      const websocket = require('../modules/websocket');
      websocket.broadcast('worldmodel:config-updated', {
        version: config.version,
        branchId,
        override
      });
    } catch { /* WebSocket not initialized */ }

    logger.info('Branch override set', { userId: req.user.id, branchId, version: config.version });
    res.json({ success: true, data: config.getEffectiveConfig(branchId), message: 'Branch override applied' });
  } catch (error) {
    logger.error('Failed to set branch override', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to set branch override' });
  }
};

// ─── POST world model state sync ────────────────────────────────

const syncTimestamps = new Map();

exports.syncState = async (req, res) => {
  try {
    const userId = req.user.id;

    // Rate limit: max 1 sync per 30 seconds per user
    const lastSync = syncTimestamps.get(userId);
    const now = Date.now();
    if (lastSync && (now - lastSync) < 30000) {
      return res.status(429).json({
        error: 'Rate limited',
        retryAfter: Math.ceil((30000 - (now - lastSync)) / 1000)
      });
    }
    syncTimestamps.set(userId, now);

    // Clean old entries every 100 syncs
    if (syncTimestamps.size > 1000) {
      const cutoff = now - 60000;
      for (const [key, ts] of syncTimestamps) {
        if (ts < cutoff) syncTimestamps.delete(key);
      }
    }

    const { state, branchId } = req.body;
    if (!state) return res.status(400).json({ error: 'State payload required' });

    const config = await WorldModelConfig.getConfig();
    const effectiveConfig = branchId ? config.getEffectiveConfig(branchId) : config.toObject();

    // Build corrections array — validate client state against server data
    const corrections = [];

    // Check config version
    if (state.configVersion && state.configVersion < config.version) {
      corrections.push({
        type: 'CONFIG_STALE',
        message: 'Client config is outdated',
        serverVersion: config.version,
        clientVersion: state.configVersion
      });
    }

    res.json({
      success: true,
      data: {
        configVersion: config.version,
        corrections,
        serverTime: now,
        config: effectiveConfig
      }
    });
  } catch (error) {
    logger.error('World Model sync failed', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Sync failed' });
  }
};
