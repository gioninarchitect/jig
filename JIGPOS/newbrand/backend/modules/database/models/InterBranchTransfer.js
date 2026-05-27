// Inter-Branch Transfer Model - Stock transfers between branches
const mongoose = require('mongoose');

const interBranchTransferSchema = new mongoose.Schema({
  // Identifiers
  transferNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Branches
  fromBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  toBranchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },

  // Transfer Type
  type: {
    type: String,
    enum: ['stock_transfer', 'emergency_supply', 'rebalancing', 'return', 'wholesale_fulfillment'],
    default: 'stock_transfer'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },

  // Items
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    name: String,
    sku: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitCost: Number,
    totalCost: Number,
    quantityReceived: {
      type: Number,
      default: 0
    },
    variance: Number,
    varianceReason: String
  }],

  // Status
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'in_transit', 'received', 'cancelled', 'partially_received'],
    default: 'pending',
    index: true
  },

  // Workflow
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  dispatchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Dates
  requestedDate: {
    type: Date,
    default: Date.now
  },
  approvedAt: Date,
  dispatchedAt: Date,
  expectedDeliveryDate: Date,
  receivedAt: Date,
  cancelledAt: Date,

  // Shipping
  courierService: String,
  trackingNumber: String,
  shippingCost: {
    type: Number,
    default: 0
  },
  packingList: String,

  // Notes
  requestNotes: String,
  approvalNotes: String,
  dispatchNotes: String,
  receivingNotes: String,
  cancellationReason: String,

  // Inventory Impact
  inventoryDeductedFromSource: {
    type: Boolean,
    default: false
  },
  inventoryAddedToDestination: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes
interBranchTransferSchema.index({ fromBranchId: 1, status: 1 });
interBranchTransferSchema.index({ toBranchId: 1, status: 1 });
interBranchTransferSchema.index({ createdAt: -1 });

// Pre-save hook to generate transfer number
interBranchTransferSchema.pre('save', async function(next) {
  if (!this.transferNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const count = await mongoose.model('InterBranchTransfer').countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1)
      }
    });
    this.transferNumber = `TRF-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate item costs
  this.items.forEach(item => {
    if (item.unitCost) {
      item.totalCost = item.unitCost * item.quantity;
    }
  });

  next();
});

// Virtual for total items
interBranchTransferSchema.virtual('totalItems').get(function() {
  return this.items.reduce((sum, item) => sum + item.quantity, 0);
});

// Virtual for total value
interBranchTransferSchema.virtual('totalValue').get(function() {
  return this.items.reduce((sum, item) => sum + (item.totalCost || 0), 0);
});

// Virtual for is complete
interBranchTransferSchema.virtual('isComplete').get(function() {
  return this.status === 'received' || this.status === 'partially_received';
});

// Method to approve transfer
interBranchTransferSchema.methods.approve = function(userId, notes) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNotes = notes;
  return this.save();
};

// Method to reject transfer
interBranchTransferSchema.methods.reject = function(userId, reason) {
  this.status = 'rejected';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNotes = reason;
  return this.save();
};

// Method to dispatch transfer
interBranchTransferSchema.methods.dispatch = async function(userId, courierService, trackingNumber, notes) {
  if (this.status !== 'approved') {
    throw new Error('Transfer must be approved before dispatch');
  }

  this.status = 'in_transit';
  this.dispatchedBy = userId;
  this.dispatchedAt = new Date();
  this.courierService = courierService;
  this.trackingNumber = trackingNumber;
  this.dispatchNotes = notes;

  // Deduct inventory from source branch
  if (!this.inventoryDeductedFromSource) {
    const BranchInventory = mongoose.model('BranchInventory');

    for (const item of this.items) {
      const inventory = await BranchInventory.findOne({
        branchId: this.fromBranchId,
        productId: item.productId
      });

      if (inventory) {
        await inventory.recordMovement(
          'transfer_out',
          -item.quantity,
          this.transferNumber,
          `Transfer to branch`,
          userId
        );
      }
    }

    this.inventoryDeductedFromSource = true;
  }

  return this.save();
};

// Method to receive transfer
interBranchTransferSchema.methods.receive = async function(userId, receivedItems, notes) {
  if (this.status !== 'in_transit') {
    throw new Error('Transfer must be in transit before receiving');
  }

  // Update received quantities
  receivedItems.forEach(received => {
    const item = this.items.find(i => i.productId.toString() === received.productId.toString());
    if (item) {
      item.quantityReceived = received.quantityReceived;
      item.variance = item.quantity - received.quantityReceived;
      if (item.variance !== 0) {
        item.varianceReason = received.varianceReason || 'Not specified';
      }
    }
  });

  // Check if fully or partially received
  const totalVariance = this.items.reduce((sum, item) => sum + Math.abs(item.variance || 0), 0);
  this.status = totalVariance > 0 ? 'partially_received' : 'received';

  this.receivedBy = userId;
  this.receivedAt = new Date();
  this.receivingNotes = notes;

  // Add inventory to destination branch
  if (!this.inventoryAddedToDestination) {
    const BranchInventory = mongoose.model('BranchInventory');

    for (const item of this.items) {
      const inventory = await BranchInventory.findOne({
        branchId: this.toBranchId,
        productId: item.productId
      });

      if (inventory) {
        await inventory.recordMovement(
          'transfer_in',
          item.quantityReceived || item.quantity,
          this.transferNumber,
          `Transfer from branch`,
          userId
        );
      }
    }

    this.inventoryAddedToDestination = true;
  }

  return this.save();
};

// Method to cancel transfer
interBranchTransferSchema.methods.cancel = async function(userId, reason) {
  if (this.status === 'received' || this.status === 'in_transit') {
    throw new Error('Cannot cancel transfer that is already in transit or received');
  }

  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelledAt = new Date();
  this.cancellationReason = reason;

  return this.save();
};

// Static method to get pending transfers for branch
interBranchTransferSchema.statics.getPendingTransfers = function(branchId, direction = 'both') {
  const query = { status: { $in: ['pending', 'approved'] } };

  if (direction === 'outgoing') {
    query.fromBranchId = branchId;
  } else if (direction === 'incoming') {
    query.toBranchId = branchId;
  } else {
    query.$or = [
      { fromBranchId: branchId },
      { toBranchId: branchId }
    ];
  }

  return this.find(query)
    .populate('fromBranchId toBranchId', 'name branchCode')
    .populate('createdBy approvedBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get in-transit transfers
interBranchTransferSchema.statics.getInTransitTransfers = function(branchId) {
  return this.find({
    toBranchId: branchId,
    status: 'in_transit'
  })
    .populate('fromBranchId', 'name branchCode')
    .populate('dispatchedBy', 'firstName lastName')
    .sort({ dispatchedAt: -1 });
};

module.exports = mongoose.model('InterBranchTransfer', interBranchTransferSchema);
