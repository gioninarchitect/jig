// Batch Model - Lot tracking with cannabinoid profiles
const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  // Batch Identifier
  batchId: {
    type: String,
    unique: true,
    index: true
  },

  // Product Reference
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },

  // Supplier Reference
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    index: true
  },

  // Cannabinoid Profile
  cannabinoids: {
    thc: {
      type: Number,
      min: 0,
      max: 100
    },
    cbd: {
      type: Number,
      min: 0,
      max: 100
    },
    cbg: {
      type: Number,
      min: 0,
      max: 100
    },
    cbn: {
      type: Number,
      min: 0,
      max: 100
    },
    thca: {
      type: Number,
      min: 0,
      max: 100
    },
    cbda: {
      type: Number,
      min: 0,
      max: 100
    }
  },

  // Terpene Profile
  terpenes: [{
    name: {
      type: String,
      trim: true
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100
    }
  }],

  // QA Data
  harvestDate: Date,
  testDate: Date,
  expiryDate: Date,
  labCertificateUrl: String,
  labName: String,

  qaStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },
  qaApprovedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  qaApprovedAt: Date,
  qaRejectionReason: String,

  // Inventory Tracking
  initialQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  remainingQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitOfMeasure: {
    type: String,
    enum: ['grams', 'units', 'ml', 'kg'],
    default: 'grams'
  },

  // Location Tracking
  currentLocation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },

  // Movement History
  movements: [{
    fromBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    toBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    },
    quantity: Number,
    movedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    movedAt: {
      type: Date,
      default: Date.now
    },
    transferId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterBranchTransfer'
    },
    reason: String
  }],

  // Sales History
  sales: [{
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    sale: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Sale'
    },
    quantity: Number,
    soldBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    soldAt: {
      type: Date,
      default: Date.now
    },
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch'
    }
  }],

  // Purchase Order Reference
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder'
  },

  // Cost Tracking
  unitCost: {
    type: Number,
    min: 0
  },
  totalCost: {
    type: Number,
    min: 0
  },

  // Additional Info
  notes: String,
  status: {
    type: String,
    enum: ['active', 'depleted', 'expired', 'recalled'],
    default: 'active',
    index: true
  },

  // Created By
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
batchSchema.index({ product: 1, status: 1 });
batchSchema.index({ supplier: 1, createdAt: -1 });
batchSchema.index({ expiryDate: 1, status: 1 });
batchSchema.index({ currentLocation: 1, status: 1 });

// Virtual for total cannabinoid content
batchSchema.virtual('totalCannabinoids').get(function() {
  if (!this.cannabinoids) return 0;
  return (this.cannabinoids.thc || 0) +
         (this.cannabinoids.cbd || 0) +
         (this.cannabinoids.cbg || 0) +
         (this.cannabinoids.cbn || 0);
});

// Generate batch ID before saving
batchSchema.pre('save', async function(next) {
  if (!this.batchId) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('Batch').countDocuments();
    this.batchId = `BATCH-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // Update status based on quantity
  if (this.remainingQuantity <= 0) {
    this.status = 'depleted';
  }

  // Check expiry
  if (this.expiryDate && new Date() > this.expiryDate) {
    this.status = 'expired';
    this.qaStatus = 'expired';
  }

  next();
});

// Method to record a sale
batchSchema.methods.recordSale = async function(quantity, orderId, saleId, soldBy, branch) {
  if (this.remainingQuantity < quantity) {
    throw new Error('Insufficient batch quantity');
  }

  this.remainingQuantity -= quantity;
  this.sales.push({
    order: orderId,
    sale: saleId,
    quantity,
    soldBy,
    branch,
    soldAt: new Date()
  });

  if (this.remainingQuantity <= 0) {
    this.status = 'depleted';
  }

  return this.save();
};

// Method to record a movement
batchSchema.methods.recordMovement = async function(fromBranch, toBranch, quantity, movedBy, transferId, reason) {
  if (this.remainingQuantity < quantity) {
    throw new Error('Insufficient batch quantity for transfer');
  }

  this.movements.push({
    fromBranch,
    toBranch,
    quantity,
    movedBy,
    transferId,
    reason,
    movedAt: new Date()
  });

  this.currentLocation = toBranch;

  return this.save();
};

// Static method to find batches by product with available quantity
batchSchema.statics.findAvailableByProduct = function(productId, branchId = null) {
  const query = {
    product: productId,
    status: 'active',
    qaStatus: 'approved',
    remainingQuantity: { $gt: 0 }
  };

  if (branchId) {
    query.currentLocation = branchId;
  }

  return this.find(query)
    .sort({ expiryDate: 1, createdAt: 1 }) // FIFO - oldest first
    .populate('supplier', 'name supplierId')
    .populate('currentLocation', 'name branchCode');
};

// Static method to get batch trace (full history from supplier to customer)
batchSchema.statics.getFullTrace = async function(batchId) {
  const batch = await this.findById(batchId)
    .populate('product', 'name sku')
    .populate('supplier', 'name supplierId license')
    .populate('purchaseOrder', 'poNumber createdAt')
    .populate('createdBy', 'firstName lastName email')
    .populate('qaApprovedBy', 'firstName lastName email')
    .populate('currentLocation', 'name branchCode')
    .populate('movements.fromBranch', 'name branchCode')
    .populate('movements.toBranch', 'name branchCode')
    .populate('movements.movedBy', 'firstName lastName')
    .populate('sales.order', 'orderNumber')
    .populate('sales.soldBy', 'firstName lastName')
    .populate('sales.branch', 'name branchCode');

  return batch;
};

module.exports = mongoose.model('Batch', batchSchema);
