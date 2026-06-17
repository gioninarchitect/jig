/**
 * World Model Config Change History (Audit Trail)
 * Every config change is logged for compliance and rollback.
 */

const mongoose = require('mongoose');

const worldModelConfigHistorySchema = new mongoose.Schema({
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  changedAt: {
    type: Date,
    default: Date.now
  },
  previousValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  changeType: {
    type: String,
    enum: ['global', 'branch_override'],
    default: 'global'
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  }
}, {
  timestamps: true
});

worldModelConfigHistorySchema.index({ changedAt: -1 });
worldModelConfigHistorySchema.index({ changedBy: 1 });

module.exports = mongoose.model('WorldModelConfigHistory', worldModelConfigHistorySchema);
