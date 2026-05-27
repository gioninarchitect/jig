// Cultivation Batch Model — Seed-to-harvest lifecycle tracking
const mongoose = require('mongoose');

const cultivationBatchSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  strain: {
    type: String,
    required: true,
    trim: true
  },
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CultivationZone',
    required: true,
    index: true
  },
  tenantId: {
    type: String,
    index: true,
    default: 'ilco'
  },
  phase: {
    type: String,
    enum: ['propagation', 'vegetative', 'flowering', 'harvest_ready', 'harvested', 'processing', 'complete'],
    default: 'propagation',
    index: true
  },
  plantCount: {
    type: Number,
    required: true,
    min: 1
  },
  plantCountDestroyed: {
    type: Number,
    default: 0,
    min: 0
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  phaseTransitions: [{
    from: String,
    to: String,
    date: { type: Date, default: Date.now },
    notes: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  projectedHarvestDate: Date,
  targetYield: {
    type: Number,
    default: 0
  },
  nutrientLog: [{
    date: { type: Date, default: Date.now },
    product: String,
    amount: String,
    notes: String
  }],
  pestLog: [{
    date: { type: Date, default: Date.now },
    observation: String,
    action: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  notes: String,
  complianceChecklist: {
    environmentalRecords: { type: Boolean, default: false },
    batchDocumentation: { type: Boolean, default: false },
    pestManagement: { type: Boolean, default: false },
    harvestReady: { type: Boolean, default: false }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'destroyed'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto-generate batchId on creation
cultivationBatchSchema.pre('save', async function(next) {
  if (this.isNew && !this.batchId) {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
        $lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
      }
    });
    this.batchId = `OR-B-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Virtual: days in current phase
cultivationBatchSchema.virtual('daysInPhase').get(function() {
  const lastTransition = this.phaseTransitions && this.phaseTransitions.length > 0
    ? this.phaseTransitions[this.phaseTransitions.length - 1].date
    : this.startDate;
  return Math.floor((Date.now() - new Date(lastTransition).getTime()) / (1000 * 60 * 60 * 24));
});

cultivationBatchSchema.index({ tenantId: 1, phase: 1, status: 1 });
cultivationBatchSchema.index({ zoneId: 1, status: 1 });

module.exports = mongoose.model('CultivationBatch', cultivationBatchSchema);
