// Compliance Controller — Compliance logging and audit package generation
const mongoose = require('mongoose');
const logger = require('../modules/logger');
const Sale = require('../modules/database/models/Sale');
const StockTake = require('../modules/database/models/StockTake');
const Section21Document = require('../modules/database/models/Section21Document');
const Batch = require('../modules/database/models/Batch');

// In-memory compliance log store (will move to MongoDB model when compliance grows)
// For now, stores logs in a lightweight collection
let ComplianceLog;
try {
  ComplianceLog = mongoose.model('ComplianceLog');
} catch {
  const complianceLogSchema = new mongoose.Schema({
    type: { type: String, required: true },
    result: { type: String, enum: ['BLOCKED', 'WARNING', 'PASSED'], required: true },
    blocks: [{ type: String, message: String, action: String, itemId: String, data: mongoose.Schema.Types.Mixed }],
    warnings: [{ type: String, message: String, itemId: String, data: mongoose.Schema.Types.Mixed }],
    staffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    saleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
    timestamp: Date
  }, { timestamps: true });

  complianceLogSchema.index({ createdAt: -1 });
  complianceLogSchema.index({ type: 1, result: 1 });
  ComplianceLog = mongoose.model('ComplianceLog', complianceLogSchema);
}

// GET /compliance/log — Paginated compliance event log
exports.getLog = async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      ComplianceLog.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      ComplianceLog.countDocuments()
    ]);

    res.json({ success: true, logs, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    logger.error('Compliance log fetch error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching compliance logs' });
  }
};

// POST /compliance/log — Create a compliance event entry
exports.createLog = async (req, res) => {
  try {
    const { type, result, blocks, warnings, staffId, customerId, branchId, saleId, timestamp } = req.body;

    const log = await ComplianceLog.create({
      type,
      result,
      blocks: blocks || [],
      warnings: warnings || [],
      staffId: staffId || null,
      customerId: customerId || null,
      branchId: branchId || null,
      saleId: saleId || null,
      timestamp: timestamp || new Date()
    });

    res.status(201).json({ success: true, id: log._id });
  } catch (error) {
    logger.error('Compliance log create error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error creating compliance log' });
  }
};

// POST /compliance/audit-package — Generate audit package with counts
exports.generateAuditPackage = async (req, res) => {
  try {
    const { dateFrom, dateTo, includeTransactions, includeStocktakes, includeSection21, includeBatchTrace } = req.body;

    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    to.setHours(23, 59, 59, 999);

    const dateFilter = { createdAt: { $gte: from, $lte: to } };

    const [transactionCount, stocktakeCount, section21Count, batchCount] = await Promise.all([
      includeTransactions ? Sale.countDocuments(dateFilter) : Promise.resolve(0),
      includeStocktakes ? StockTake.countDocuments(dateFilter) : Promise.resolve(0),
      includeSection21 ? Section21Document.countDocuments(dateFilter) : Promise.resolve(0),
      includeBatchTrace ? Batch.countDocuments(dateFilter) : Promise.resolve(0)
    ]);

    res.json({
      success: true,
      transactionCount,
      stocktakeCount,
      section21Count,
      batchCount,
      dateFrom,
      dateTo
    });
  } catch (error) {
    logger.error('Audit package generation error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error generating audit package' });
  }
};

// GET /compliance/section21/status — Section 21 compliance status summary
exports.getSection21Status = async (req, res) => {
  try {
    const now = new Date();
    const [total, approved, expired] = await Promise.all([
      Section21Document.countDocuments(),
      Section21Document.countDocuments({ status: 'approved', expiryDate: { $gt: now } }),
      Section21Document.countDocuments({ status: 'approved', expiryDate: { $lte: now } })
    ]);

    res.json({ success: true, total, approved, expired, complianceRate: total > 0 ? Math.round((approved / total) * 100) : 0 });
  } catch (error) {
    logger.error('Section21 status error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching section21 status' });
  }
};
