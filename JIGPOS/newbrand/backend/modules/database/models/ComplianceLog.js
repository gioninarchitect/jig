// Compliance Log Model — SAHPRA compliance audit trail
const mongoose = require('mongoose');

const complianceLogSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['environmental_breach', 'document_upload', 'audit_generated', 'incident', 'waste_disposal', 'inspection'],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
    index: true
  },
  tenantId: {
    type: String,
    index: true,
    default: 'ilco'
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  zoneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CultivationZone'
  },
  batchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CultivationBatch'
  },
  documents: [{
    name: String,
    url: String,
    uploadedAt: { type: Date, default: Date.now },
    expiryDate: Date
  }],
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

complianceLogSchema.index({ tenantId: 1, type: 1, createdAt: -1 });
complianceLogSchema.index({ severity: 1, resolvedAt: 1 });

module.exports = mongoose.model('ComplianceLog', complianceLogSchema);
