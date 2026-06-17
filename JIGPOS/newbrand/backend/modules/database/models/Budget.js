// Budget Model for Monthly Budgeting
const mongoose = require('mongoose');

const budgetCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  budgetedAmount: {
    type: Number,
    required: true,
    min: 0
  },
  actualAmount: {
    type: Number,
    default: 0
  },
  type: {
    type: String,
    enum: ['revenue', 'expense'],
    required: true
  }
});

const budgetSchema = new mongoose.Schema({
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  year: {
    type: Number,
    required: true
  },
  // Revenue targets
  salesTarget: {
    type: Number,
    required: true,
    min: 0
  },
  actualSales: {
    type: Number,
    default: 0
  },
  // Category breakdowns
  categories: [budgetCategorySchema],
  // Expense budgets
  expenses: {
    wages: { budgeted: Number, actual: { type: Number, default: 0 } },
    rent: { budgeted: Number, actual: { type: Number, default: 0 } },
    utilities: { budgeted: Number, actual: { type: Number, default: 0 } },
    inventory: { budgeted: Number, actual: { type: Number, default: 0 } },
    marketing: { budgeted: Number, actual: { type: Number, default: 0 } },
    other: { budgeted: Number, actual: { type: Number, default: 0 } }
  },
  // Calculated fields
  grossProfit: {
    type: Number,
    default: 0
  },
  netProfit: {
    type: Number,
    default: 0
  },
  // Notes
  notes: String,
  // Approval
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'closed'],
    default: 'draft'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Compound index for unique budget per branch/month/year
budgetSchema.index({ branch: 1, month: 1, year: 1 }, { unique: true });

// Calculate variance
budgetSchema.virtual('salesVariance').get(function() {
  return this.actualSales - this.salesTarget;
});

budgetSchema.virtual('salesVariancePercent').get(function() {
  if (this.salesTarget === 0) return 0;
  return ((this.actualSales - this.salesTarget) / this.salesTarget * 100).toFixed(1);
});

module.exports = mongoose.model('Budget', budgetSchema);
