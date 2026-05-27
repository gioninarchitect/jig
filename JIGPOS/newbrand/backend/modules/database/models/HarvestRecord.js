// Harvest Record Model — Harvest + yield tracking with SAHPRA compliance
const mongoose = require('mongoose');

const harvestRecordSchema = new mongoose.Schema({
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CultivationBatch',
    required: true,
    index: true
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
  harvestDate: {
    type: Date,
    default: Date.now
  },
  strain: {
    type: String,
    required: true
  },
  plantCount: {
    type: Number,
    required: true,
    min: 1
  },
  wetWeight: {
    type: Number,
    required: true,
    min: 0
  },
  dryWeight: {
    type: Number,
    default: 0,
    min: 0
  },
  trimWeight: {
    type: Number,
    default: 0,
    min: 0
  },
  wasteWeight: {
    type: Number,
    default: 0,
    min: 0
  },
  yieldPercent: {
    type: Number,
    default: 0
  },
  qualityGrade: {
    type: String,
    enum: ['A', 'B', 'C'],
    default: 'B'
  },
  labResults: {
    status: {
      type: String,
      enum: ['pending', 'passed', 'failed', 'not_required'],
      default: 'pending'
    },
    thc: Number,
    cbd: Number,
    terpeneProfile: String,
    microbiologyPassed: Boolean,
    certificateUrl: String
  },
  scalePhoto: {
    url: String,
    filename: String,
    uploadedAt: Date
  },
  notes: String,
  harvestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Auto-calculate yield percent before saving
harvestRecordSchema.pre('save', function(next) {
  if (this.wetWeight > 0 && this.dryWeight > 0) {
    this.yieldPercent = Math.round((this.dryWeight / this.wetWeight) * 10000) / 100;
  }
  next();
});

harvestRecordSchema.index({ tenantId: 1, harvestDate: -1 });
harvestRecordSchema.index({ strain: 1, harvestDate: -1 });

module.exports = mongoose.model('HarvestRecord', harvestRecordSchema);
