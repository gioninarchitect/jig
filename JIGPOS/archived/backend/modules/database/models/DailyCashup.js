// Daily Cashup Model - End of day branch reconciliation with Smart Ledger
const mongoose = require('mongoose');

// Ledger entry schema for detailed tracking
const ledgerEntrySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['opening_balance', 'sale', 'refund', 'safe_drop', 'banking', 'expense', 'adjustment', 'float_in', 'float_out'],
    required: true
  },
  amount: { type: Number, required: true },
  runningBalance: { type: Number, required: true },
  reference: String, // Sale number, refund number, etc.
  description: String,
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now }
});

const dailyCashupSchema = new mongoose.Schema({
  // Identifiers
  cashupNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },

  // SMART LEDGER - Accumulating balance from previous day
  previousDayCashup: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DailyCashup'
  },
  openingBalance: { type: Number, default: 0 }, // Carried from previous day's closing
  closingBalance: { type: Number, default: 0 }, // End of day balance

  // Detailed ledger entries for audit trail
  ledger: [ledgerEntrySchema],

  // Shift Info
  shiftType: {
    type: String,
    enum: ['day', 'night', 'full'],
    default: 'full'
  },

  // Till Sessions included in this cashup
  tillSessions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TillSession'
  }],

  // Cash Summary (all tills combined)
  totalOpeningFloat: { type: Number, default: 0 },
  totalExpectedCash: { type: Number, default: 0 },
  totalActualCash: { type: Number, default: 0 },
  totalVariance: { type: Number, default: 0 },

  // Cash counted at daily end (manager count)
  managerCashCount: {
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
  managerCashTotal: { type: Number, default: 0 },

  // Sales Summary
  totalSales: { type: Number, default: 0 },
  totalTransactions: { type: Number, default: 0 },

  // Payment Method Breakdown
  cashSales: { type: Number, default: 0 },
  cardSales: { type: Number, default: 0 },
  eftSales: { type: Number, default: 0 },
  instapaySales: { type: Number, default: 0 },

  // Refunds & Voids
  totalRefunds: { type: Number, default: 0 },
  totalVoids: { type: Number, default: 0 },
  refundCount: { type: Number, default: 0 },
  voidCount: { type: Number, default: 0 },

  // Safe Drop (cash removed to safe during day)
  safeDrops: [{
    amount: Number,
    time: Date,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String
  }],
  totalSafeDrops: { type: Number, default: 0 },

  // Banking (cash prepared for bank deposit)
  bankingAmount: { type: Number, default: 0 },
  bankingReference: String,
  bankingPreparedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  bankingPreparedAt: Date,

  // Float for next day
  nextDayFloat: { type: Number, default: 500 },

  // Status & Approval
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'rejected'],
    default: 'draft',
    index: true
  },

  // Staff
  preparedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  submittedAt: Date,
  approvedAt: Date,

  // Notes
  notes: String,
  discrepancyExplanation: String,
  approvalNotes: String

}, {
  timestamps: true
});

// Indexes
dailyCashupSchema.index({ branchId: 1, date: -1 });
dailyCashupSchema.index({ status: 1, date: -1 });

// Pre-save hook to generate cashup number
dailyCashupSchema.pre('save', async function(next) {
  if (!this.cashupNumber) {
    const dateStr = this.date.toISOString().split('T')[0].replace(/-/g, '');
    const count = await mongoose.model('DailyCashup').countDocuments({
      branchId: this.branchId,
      date: {
        $gte: new Date(this.date.setHours(0, 0, 0, 0)),
        $lt: new Date(this.date.setHours(23, 59, 59, 999))
      }
    });
    this.cashupNumber = `CU-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Method to calculate manager cash total from denominations
dailyCashupSchema.methods.calculateManagerCashTotal = function() {
  return (
    (this.managerCashCount.r200 * 200) +
    (this.managerCashCount.r100 * 100) +
    (this.managerCashCount.r50 * 50) +
    (this.managerCashCount.r20 * 20) +
    (this.managerCashCount.r10 * 10) +
    (this.managerCashCount.r5 * 5) +
    (this.managerCashCount.r2 * 2) +
    (this.managerCashCount.r1 * 1) +
    (this.managerCashCount.c50 * 0.50) +
    (this.managerCashCount.c20 * 0.20) +
    (this.managerCashCount.c10 * 0.10) +
    (this.managerCashCount.c5 * 0.05)
  );
};

// Method to populate from till sessions
dailyCashupSchema.methods.populateFromTillSessions = async function() {
  const TillSession = mongoose.model('TillSession');

  const sessions = await TillSession.find({
    _id: { $in: this.tillSessions }
  });

  // Reset totals
  this.totalOpeningFloat = 0;
  this.totalExpectedCash = 0;
  this.totalActualCash = 0;
  this.totalSales = 0;
  this.totalTransactions = 0;
  this.cashSales = 0;
  this.cardSales = 0;
  this.eftSales = 0;
  this.instapaySales = 0;
  this.totalRefunds = 0;
  this.totalVoids = 0;

  // Aggregate from all sessions
  sessions.forEach(session => {
    this.totalOpeningFloat += session.openingFloat || 0;
    this.totalExpectedCash += session.expectedCash || 0;
    this.totalActualCash += session.actualCash || 0;
    this.totalSales += session.totalSales || 0;
    this.totalTransactions += session.transactionCount || 0;
    this.cashSales += session.totalCash || 0;
    this.cardSales += session.totalCard || 0;
    this.eftSales += session.totalEFT || 0;
    this.instapaySales += session.totalInstapay || 0;
    this.totalRefunds += session.totalRefunds || 0;
    this.totalVoids += session.totalVoids || 0;
  });

  this.totalVariance = this.totalActualCash - this.totalExpectedCash;

  return this.save();
};

// Static method to get today's cashup for branch
dailyCashupSchema.statics.getTodaysCashup = function(branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return this.findOne({
    branchId,
    date: { $gte: today, $lt: tomorrow }
  }).populate('preparedBy approvedBy', 'firstName lastName');
};

// Static method to get cashups by date range
dailyCashupSchema.statics.getCashupsByDateRange = function(branchId, startDate, endDate) {
  return this.find({
    branchId,
    date: { $gte: startDate, $lte: endDate }
  })
    .populate('preparedBy approvedBy', 'firstName lastName')
    .populate('branchId', 'name branchCode')
    .sort({ date: -1 });
};

// SMART LEDGER: Initialize from previous day
dailyCashupSchema.statics.initializeFromPreviousDay = async function(branchId, date) {
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date(yesterday);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const previousCashup = await this.findOne({
    branchId,
    date: { $gte: yesterday, $lte: yesterdayEnd },
    status: 'approved'
  }).sort({ date: -1 });

  const openingBalance = previousCashup ? previousCashup.closingBalance : 0;
  const nextDayFloat = previousCashup ? previousCashup.nextDayFloat : 500;

  return {
    previousDayCashup: previousCashup?._id,
    openingBalance,
    totalOpeningFloat: nextDayFloat,
    ledger: [{
      type: 'opening_balance',
      amount: openingBalance,
      runningBalance: openingBalance,
      description: previousCashup
        ? `Carried from ${previousCashup.cashupNumber}`
        : 'Initial opening balance',
      timestamp: new Date()
    }]
  };
};

// Add ledger entry with running balance calculation
dailyCashupSchema.methods.addLedgerEntry = function(type, amount, reference, description, userId) {
  const lastEntry = this.ledger[this.ledger.length - 1];
  const previousBalance = lastEntry ? lastEntry.runningBalance : this.openingBalance;

  // Determine if amount should add or subtract
  const isDebit = ['sale', 'float_in', 'adjustment'].includes(type) && amount > 0;
  const newBalance = isDebit ? previousBalance + Math.abs(amount) : previousBalance - Math.abs(amount);

  this.ledger.push({
    type,
    amount,
    runningBalance: newBalance,
    reference,
    description,
    recordedBy: userId,
    timestamp: new Date()
  });

  this.closingBalance = newBalance;
  return this;
};

// Calculate closing balance from ledger
dailyCashupSchema.methods.recalculateLedger = function() {
  let balance = this.openingBalance;

  this.ledger.forEach(entry => {
    if (['sale', 'float_in'].includes(entry.type)) {
      balance += Math.abs(entry.amount);
    } else if (['refund', 'safe_drop', 'banking', 'expense', 'float_out'].includes(entry.type)) {
      balance -= Math.abs(entry.amount);
    } else if (entry.type === 'adjustment') {
      balance += entry.amount; // Can be positive or negative
    }
    entry.runningBalance = balance;
  });

  this.closingBalance = balance;
  return this;
};

// MULTI-BRANCH SYNC: Get consolidated view across all branches
dailyCashupSchema.statics.getConsolidatedCashup = async function(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const cashups = await this.find({
    date: { $gte: startOfDay, $lte: endOfDay }
  }).populate('branchId', 'name branchCode');

  const consolidated = {
    date,
    branches: cashups.map(c => ({
      branch: c.branchId,
      cashupNumber: c.cashupNumber,
      status: c.status,
      openingBalance: c.openingBalance,
      closingBalance: c.closingBalance,
      totalSales: c.totalSales,
      totalVariance: c.totalVariance
    })),
    totals: {
      openingBalance: cashups.reduce((sum, c) => sum + (c.openingBalance || 0), 0),
      closingBalance: cashups.reduce((sum, c) => sum + (c.closingBalance || 0), 0),
      totalSales: cashups.reduce((sum, c) => sum + (c.totalSales || 0), 0),
      totalVariance: cashups.reduce((sum, c) => sum + (c.totalVariance || 0), 0),
      cashSales: cashups.reduce((sum, c) => sum + (c.cashSales || 0), 0),
      cardSales: cashups.reduce((sum, c) => sum + (c.cardSales || 0), 0),
      totalBanking: cashups.reduce((sum, c) => sum + (c.bankingAmount || 0), 0)
    },
    allApproved: cashups.every(c => c.status === 'approved'),
    pendingCount: cashups.filter(c => c.status !== 'approved').length
  };

  return consolidated;
};

module.exports = mongoose.model('DailyCashup', dailyCashupSchema);
