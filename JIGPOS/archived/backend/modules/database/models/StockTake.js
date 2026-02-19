// Stock Take Model - SA GMP Compliant with Photo Verification
const mongoose = require('mongoose');

// Individual line item schema
const stockTakeLineItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: { type: String, required: true },
  sku: { type: String },
  category: { type: String },
  growMethod: { type: String },    // Indoor/Greendoor (from product tags)
  productType: { type: String },   // Pre-roll/Pre-pack/Loose
  tags: [{ type: String }],        // Full product tags array

  // Expected vs Actual
  expectedQty: { type: Number, required: true },  // System SOH
  actualQty: { type: Number },                     // Counted quantity
  unit: { type: String, default: 'g' },           // g, units, ml

  // Variance
  variance: { type: Number, default: 0 },
  variancePercent: { type: Number, default: 0 },
  varianceAcceptable: { type: Boolean, default: true },

  // PHOTO VERIFICATION (REQUIRED)
  scalePhoto: {
    url: { type: String },
    filename: { type: String },
    uploadedAt: { type: Date },
    fileSize: { type: Number }
  },

  // OCR Data (optional - for scale reading)
  ocrDetectedWeight: { type: Number },
  ocrConfidence: { type: Number },
  ocrMatchesManual: { type: Boolean },

  // Per-unit items (for countable items like pre-rolls, edibles)
  isCountable: { type: Boolean, default: false },
  unitCount: { type: Number },
  unitPhotos: [{
    url: { type: String },
    filename: { type: String },
    uploadedAt: { type: Date },
    count: { type: Number }
  }],

  // Validation status
  validationStatus: {
    type: String,
    enum: ['pending', 'valid', 'invalid', 'requires_review'],
    default: 'pending'
  },
  validationErrors: [{ type: String }],

  // Audit
  countedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  countedAt: { type: Date },
  notes: { type: String },

  // Manager review (for variances)
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  reviewedAt: { type: Date },
  reviewNotes: { type: String }
});

// Pre-save validation for line items
stockTakeLineItemSchema.pre('save', function(next) {
  // Calculate variance if actualQty is set
  if (this.actualQty !== undefined && this.actualQty !== null) {
    this.variance = this.actualQty - this.expectedQty;
    this.variancePercent = this.expectedQty > 0
      ? ((this.variance / this.expectedQty) * 100).toFixed(2)
      : 0;

    // Variance threshold: 5% for weighable, 0 for countable
    const threshold = this.isCountable ? 0 : 5;
    this.varianceAcceptable = Math.abs(this.variancePercent) <= threshold;
  }
  next();
});

// Main Stock Take Session schema
const stockTakeSchema = new mongoose.Schema({
  // Identifiers - generated automatically in pre-save hook
  sessionNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },

  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },

  // Type of stock take
  stockTakeType: {
    type: String,
    enum: ['full', 'cycle', 'spot', 'audit'],
    default: 'full'
  },

  // Category filter (optional - for cycle counts)
  categories: [{ type: String }],

  // Session timing
  scheduledDate: { type: Date },
  startedAt: { type: Date },
  completedAt: { type: Date },

  // Status workflow
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'pending_review', 'approved', 'rejected'],
    default: 'scheduled',
    index: true
  },

  // Line items
  lineItems: [stockTakeLineItemSchema],

  // Summary stats (calculated)
  totalItems: { type: Number, default: 0 },
  completedItems: { type: Number, default: 0 },
  itemsWithVariance: { type: Number, default: 0 },
  itemsRequiringReview: { type: Number, default: 0 },
  totalExpectedValue: { type: Number, default: 0 },
  totalActualValue: { type: Number, default: 0 },
  totalVarianceValue: { type: Number, default: 0 },

  // Validation summary
  allPhotosUploaded: { type: Boolean, default: false },
  allWeightsEntered: { type: Boolean, default: false },
  validationComplete: { type: Boolean, default: false },

  // Staff
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // Manager approval
  submittedAt: { type: Date },
  submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  approvalNotes: { type: String },
  rejectionReason: { type: String },

  // Geolocation verification
  location: {
    latitude: { type: Number },
    longitude: { type: Number },
    accuracy: { type: Number },
    capturedAt: { type: Date }
  },

  // Notes and audit
  notes: { type: String },

  // SAHPRA compliance fields
  sahpraReportGenerated: { type: Boolean, default: false },
  sahpraReportDate: { type: Date },
  sahpraReportReference: { type: String }

}, {
  timestamps: true
});

// Indexes
stockTakeSchema.index({ branchId: 1, status: 1 });
stockTakeSchema.index({ branchId: 1, createdAt: -1 });
stockTakeSchema.index({ status: 1, scheduledDate: 1 });

// Pre-save hook to generate session number
stockTakeSchema.pre('save', async function(next) {
  if (!this.sessionNumber) {
    const date = new Date();
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    const count = await mongoose.model('StockTake').countDocuments({
      createdAt: {
        $gte: new Date(date.setHours(0, 0, 0, 0))
      }
    });
    this.sessionNumber = `ST-${dateStr}-${String(count + 1).padStart(3, '0')}`;
  }
  next();
});

// Method to calculate summary stats
stockTakeSchema.methods.calculateSummary = function() {
  this.totalItems = this.lineItems.length;
  this.completedItems = this.lineItems.filter(item =>
    item.actualQty !== undefined && item.actualQty !== null
  ).length;
  this.itemsWithVariance = this.lineItems.filter(item =>
    item.variance !== 0
  ).length;
  this.itemsRequiringReview = this.lineItems.filter(item =>
    !item.varianceAcceptable || item.validationStatus === 'requires_review'
  ).length;

  // Check validation status
  this.allPhotosUploaded = this.lineItems.every(item =>
    item.scalePhoto?.url || (item.isCountable && item.unitPhotos?.length > 0)
  );
  this.allWeightsEntered = this.lineItems.every(item =>
    item.actualQty !== undefined && item.actualQty !== null
  );
  this.validationComplete = this.allPhotosUploaded && this.allWeightsEntered;

  return this;
};

// Method to validate a line item
stockTakeSchema.methods.validateLineItem = function(index) {
  const item = this.lineItems[index];
  const errors = [];

  // Check for required photo
  if (!item.scalePhoto?.url && !item.isCountable) {
    errors.push('Scale photo is required');
  }

  if (item.isCountable && (!item.unitPhotos || item.unitPhotos.length === 0)) {
    errors.push('Unit photo(s) required for countable items');
  }

  // Check for weight entry
  if (item.actualQty === undefined || item.actualQty === null) {
    errors.push('Actual quantity is required');
  }

  // Recalculate variance NOW (don't rely on pre-save hook which runs later)
  if (item.actualQty !== undefined && item.actualQty !== null) {
    item.variance = item.actualQty - item.expectedQty;
    item.variancePercent = item.expectedQty > 0
      ? parseFloat(((item.variance / item.expectedQty) * 100).toFixed(2))
      : 0;
    const threshold = item.isCountable ? 0 : 5;
    item.varianceAcceptable = Math.abs(item.variancePercent) <= threshold;
  }

  // Check OCR match (warning only, not blocking)
  if (item.ocrDetectedWeight && item.actualQty) {
    const ocrDiff = Math.abs(item.ocrDetectedWeight - item.actualQty);
    const ocrDiffPercent = (ocrDiff / item.actualQty) * 100;
    item.ocrMatchesManual = ocrDiffPercent <= 2; // 2% tolerance
    if (!item.ocrMatchesManual) {
      errors.push(`OCR weight (${item.ocrDetectedWeight}g) differs from entered weight (${item.actualQty}g)`);
    }
  }

  // Check variance threshold
  if (!item.varianceAcceptable) {
    errors.push(`Variance of ${item.variancePercent}% exceeds threshold`);
  }

  item.validationErrors = errors;
  item.validationStatus = errors.length === 0 ? 'valid' :
    (errors.some(e => e.includes('required')) ? 'invalid' : 'requires_review');

  return item;
};

// Static method to get active stock take for branch
stockTakeSchema.statics.getActiveSession = function(branchId) {
  return this.findOne({
    branchId,
    status: { $in: ['scheduled', 'in_progress'] }
  })
    .populate('branchId', 'name branchCode')
    .populate('createdBy assignedTo', 'firstName lastName');
};

// Static method to get pending approvals
stockTakeSchema.statics.getPendingApprovals = function(branchId = null) {
  const query = { status: 'pending_review' };
  if (branchId) query.branchId = branchId;

  return this.find(query)
    .populate('branchId', 'name branchCode')
    .populate('submittedBy', 'firstName lastName')
    .sort({ submittedAt: -1 });
};

module.exports = mongoose.model('StockTake', stockTakeSchema);
