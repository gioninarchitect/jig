// Till Session Model - Cash drawer management
const mongoose = require('mongoose');

const tillSessionSchema = new mongoose.Schema({
  // Identifiers
  sessionNumber: {
    type: String,
    unique: true,
    index: true
  },
  tillNumber: {
    type: String,
    required: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },

  // Session Management
  openedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  openedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  closedAt: Date,
  status: {
    type: String,
    enum: ['open', 'closed', 'suspended'],
    default: 'open',
    index: true
  },

  // Cash Management
  openingFloat: {
    type: Number,
    required: true,
    default: 500
  },
  closingCash: Number,
  expectedCash: Number,
  actualCash: Number,
  variance: Number,

  // South African Denominations at closing
  denominations: {
    r200: { type: Number, default: 0 },
    r100: { type: Number, default: 0 },
    r50: { type: Number, default: 0 },
    r20: { type: Number, default: 0 },
    r10: { type: Number, default: 0 },
    r5: { type: Number, default: 0 },
    r2: { type: Number, default: 0 },
    r1: { type: Number, default: 0 },
    c50: { type: Number, default: 0 },
    c20: { type: Number, default: 0 },
    c10: { type: Number, default: 0 },
    c5: { type: Number, default: 0 }
  },

  // Transaction Summary
  transactionCount: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalCash: { type: Number, default: 0 },
  totalCard: { type: Number, default: 0 },
  totalEFT: { type: Number, default: 0 },
  totalInstapay: { type: Number, default: 0 },
  totalRefunds: { type: Number, default: 0 },
  totalVoids: { type: Number, default: 0 },

  // Cash Operations
  cashIns: [{
    amount: Number,
    reason: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],
  cashOuts: [{
    amount: Number,
    reason: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }],

  // Notes & Discrepancies
  openingNotes: String,
  closingNotes: String,
  discrepancyNotes: String,

  // Approval
  requiresApproval: { type: Boolean, default: false },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date
}, {
  timestamps: true
});

// Indexes
tillSessionSchema.index({ branchId: 1, openedAt: -1 });
tillSessionSchema.index({ openedBy: 1, status: 1 });
tillSessionSchema.index({ tillNumber: 1, status: 1 });

// Pre-save hook to generate session number
tillSessionSchema.pre('save', async function(next) {
  if (!this.sessionNumber) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const count = await mongoose.model('TillSession').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0))
      }
    });
    this.sessionNumber = `TILL-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Method to calculate total denominations
tillSessionSchema.methods.calculateDenominationTotal = function() {
  return (
    (this.denominations.r200 * 200) +
    (this.denominations.r100 * 100) +
    (this.denominations.r50 * 50) +
    (this.denominations.r20 * 20) +
    (this.denominations.r10 * 10) +
    (this.denominations.r5 * 5) +
    (this.denominations.r2 * 2) +
    (this.denominations.r1 * 1) +
    (this.denominations.c50 * 0.50) +
    (this.denominations.c20 * 0.20) +
    (this.denominations.c10 * 0.10) +
    (this.denominations.c5 * 0.05)
  );
};

// Method to close session
tillSessionSchema.methods.closeSession = function(closedByUserId, denominations, notes) {
  this.closedBy = closedByUserId;
  this.closedAt = new Date();
  this.status = 'closed';
  this.denominations = denominations;
  this.closingNotes = notes;

  // Calculate actual cash from denominations
  this.actualCash = this.calculateDenominationTotal();

  // Calculate expected cash
  const totalCashIns = this.cashIns.reduce((sum, op) => sum + op.amount, 0);
  const totalCashOuts = this.cashOuts.reduce((sum, op) => sum + op.amount, 0);
  this.expectedCash = this.openingFloat + this.totalCash + totalCashIns - totalCashOuts - this.totalRefunds;

  // Calculate variance
  this.variance = this.actualCash - this.expectedCash;

  // Flag for approval if variance exceeds threshold (R50)
  if (Math.abs(this.variance) > 50) {
    this.requiresApproval = true;
  }

  return this.save();
};

// Static method to get active session for till
tillSessionSchema.statics.getActiveSession = function(branchId, tillNumber) {
  return this.findOne({
    branchId,
    tillNumber,
    status: 'open'
  }).populate('openedBy', 'firstName lastName');
};

// Static method to get today's sessions for branch
tillSessionSchema.statics.getTodaySessions = function(branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    branchId,
    openedAt: { $gte: today }
  }).populate('openedBy closedBy', 'firstName lastName');
};

module.exports = mongoose.model('TillSession', tillSessionSchema);
