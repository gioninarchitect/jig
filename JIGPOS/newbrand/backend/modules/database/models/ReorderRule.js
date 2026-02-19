// Auto Reorder Rule Model
const mongoose = require('mongoose');

const reorderRuleSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  // Thresholds
  reorderPoint: {
    type: Number,
    required: true,
    min: 0
  },
  reorderQuantity: {
    type: Number,
    required: true,
    min: 1
  },
  maxStock: {
    type: Number,
    min: 0
  },
  // Supplier preference
  preferredSupplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  // Auto-order settings
  autoOrderEnabled: {
    type: Boolean,
    default: false
  },
  requiresApproval: {
    type: Boolean,
    default: true
  },
  // Lead time for planning
  leadTimeDays: {
    type: Number,
    default: 3,
    min: 0
  },
  // Cost tracking
  lastOrderPrice: Number,
  averageOrderPrice: Number,
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  // Last trigger info
  lastTriggered: Date,
  lastOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient lookups
reorderRuleSchema.index({ product: 1, branch: 1 });
reorderRuleSchema.index({ isActive: 1, autoOrderEnabled: 1 });

module.exports = mongoose.model('ReorderRule', reorderRuleSchema);
