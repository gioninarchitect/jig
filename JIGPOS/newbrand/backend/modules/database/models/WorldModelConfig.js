/**
 * World Model Configuration
 * Central config for all World Model features (World Firsts + scoring + prediction).
 * Singleton per deployment — one config doc, branch overrides via branchOverrides map.
 */

const mongoose = require('mongoose');

const worldModelConfigSchema = new mongoose.Schema({
  version: {
    type: Number,
    default: 1
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ─── Feature toggles ─────────────────────────────────────────
  features: {
    potencyDegradation: {
      enabled: { type: Boolean, default: false },
      autoMarkdown: { type: Boolean, default: false },
      markdownThreshold: { type: Number, default: 20 }
    },
    riskScoring: {
      enabled: { type: Boolean, default: false },
      alertThreshold: { type: Number, default: 70 },
      domains: {
        regulatory: { type: Boolean, default: true },
        financial: { type: Boolean, default: true },
        inventory: { type: Boolean, default: true },
        staff: { type: Boolean, default: true },
        operational: { type: Boolean, default: true },
        customer: { type: Boolean, default: true }
      }
    },
    smartStock: {
      enabled: { type: Boolean, default: false },
      autoReorder: { type: Boolean, default: false },
      interBranchTransfer: { type: Boolean, default: false }
    },
    staffAccountability: {
      enabled: { type: Boolean, default: false },
      varianceThreshold: { type: Number, default: 200 },
      positiveReinforcement: { type: Boolean, default: true }
    },
    complianceCascade: {
      enabled: { type: Boolean, default: false },
      preSaleBlocking: { type: Boolean, default: true },
      auditAlerts: { type: Boolean, default: true }
    },
    demandPrediction: {
      enabled: { type: Boolean, default: false },
      paydayCycleAware: { type: Boolean, default: true },
      seasonalAdjust: { type: Boolean, default: true }
    }
  },

  // ─── Thresholds ───────────────────────────────────────────────
  thresholds: {
    tillVarianceAmber: { type: Number, default: 50 },
    tillVarianceRed: { type: Number, default: 200 },
    lowStockDays: { type: Number, default: 7 },
    criticalStockDays: { type: Number, default: 3 },
    potencyDropPercent: { type: Number, default: 15 },
    supplierConcentration: { type: Number, default: 60 },
    voidRefundFrequency: { type: Number, default: 5 },
    shiftVarianceStreak: { type: Number, default: 3 }
  },

  // ─── Branch-specific overrides ────────────────────────────────
  branchOverrides: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: new Map()
  }
}, {
  timestamps: true
});

/**
 * Get or create the singleton config document
 */
worldModelConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne().sort({ version: -1 });
  if (!config) {
    config = await this.create({});
  }
  return config;
};

/**
 * Get effective config for a branch (base + overrides merged)
 */
worldModelConfigSchema.methods.getEffectiveConfig = function (branchId) {
  const base = this.toObject();
  const override = this.branchOverrides?.get(String(branchId));
  if (!override) return base;

  // Deep merge override into base features/thresholds
  const merged = { ...base };
  if (override.features) {
    merged.features = { ...base.features };
    for (const [key, val] of Object.entries(override.features)) {
      merged.features[key] = { ...base.features[key], ...val };
    }
  }
  if (override.thresholds) {
    merged.thresholds = { ...base.thresholds, ...override.thresholds };
  }
  return merged;
};

module.exports = mongoose.model('WorldModelConfig', worldModelConfigSchema);
