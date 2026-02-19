// Branch Inventory Model - Multi-location stock tracking
const mongoose = require('mongoose');

const branchInventorySchema = new mongoose.Schema({
  // References
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
    index: true
  },

  // Stock Levels
  quantity: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  reserved: {
    type: Number,
    default: 0,
    min: 0
  },

  // Thresholds
  lowStockThreshold: {
    type: Number,
    default: 10
  },
  reorderPoint: {
    type: Number,
    default: 20
  },
  reorderQuantity: {
    type: Number,
    default: 50
  },
  maxStock: {
    type: Number,
    default: 500
  },

  // Tracking
  lastRestocked: Date,
  lastRestockQuantity: Number,
  lastSold: Date,
  lastCountedAt: Date,
  lastCountedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // Pricing Override (branch-specific pricing)
  overridePrice: Number,
  overrideCostPrice: Number,

  // Location within branch
  locationCode: String,
  binLocation: String,
  aisle: String,
  shelf: String,

  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  isAvailableForSale: {
    type: Boolean,
    default: true
  },
  discontinuedAt: Date,

  // Stock Movement History (last 10 movements)
  recentMovements: [{
    type: {
      type: String,
      enum: ['sale', 'restock', 'transfer_in', 'transfer_out', 'adjustment', 'return', 'damage', 'theft']
    },
    quantity: Number,
    balanceBefore: Number,
    balanceAfter: Number,
    reference: String,
    notes: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound unique index
branchInventorySchema.index({ branchId: 1, productId: 1 }, { unique: true });

// Index for low stock queries
branchInventorySchema.index({ branchId: 1, quantity: 1, isActive: 1 });

// Virtual for available quantity
branchInventorySchema.virtual('available').get(function() {
  return Math.max(0, this.quantity - this.reserved);
});

// Virtual for stock status
branchInventorySchema.virtual('stockStatus').get(function() {
  if (this.quantity === 0) return 'out_of_stock';
  if (this.quantity <= this.lowStockThreshold) return 'low_stock';
  if (this.quantity >= this.maxStock) return 'overstocked';
  return 'in_stock';
});

// Virtual for needs reorder
branchInventorySchema.virtual('needsReorder').get(function() {
  return this.quantity <= this.reorderPoint && this.isActive;
});

// Method to add stock movement
branchInventorySchema.methods.recordMovement = function(type, quantity, reference, notes, userId) {
  const movement = {
    type,
    quantity,
    balanceBefore: this.quantity,
    balanceAfter: this.quantity + quantity,
    reference,
    notes,
    performedBy: userId
  };

  // Keep only last 10 movements
  if (this.recentMovements.length >= 10) {
    this.recentMovements.shift();
  }

  this.recentMovements.push(movement);

  // Update quantity
  this.quantity += quantity;

  // Update tracking dates
  if (type === 'restock' || type === 'transfer_in') {
    this.lastRestocked = new Date();
    this.lastRestockQuantity = quantity;
  } else if (type === 'sale') {
    this.lastSold = new Date();
  }

  return this.save();
};

// Method to reserve stock
branchInventorySchema.methods.reserveStock = function(quantity) {
  if (this.available < quantity) {
    throw new Error(`Insufficient stock. Available: ${this.available}, Requested: ${quantity}`);
  }
  this.reserved += quantity;
  return this.save();
};

// Method to release reservation
branchInventorySchema.methods.releaseReservation = function(quantity) {
  this.reserved = Math.max(0, this.reserved - quantity);
  return this.save();
};

// Method to deduct stock (for completed sale)
branchInventorySchema.methods.deductStock = function(quantity, saleNumber, userId) {
  if (this.quantity < quantity) {
    throw new Error(`Insufficient stock. Current: ${this.quantity}, Required: ${quantity}`);
  }

  return this.recordMovement('sale', -quantity, saleNumber, `Sale completed`, userId);
};

// Method to adjust stock (for physical count)
branchInventorySchema.methods.adjustStock = function(newQuantity, reason, userId) {
  const difference = newQuantity - this.quantity;
  this.lastCountedAt = new Date();
  this.lastCountedBy = userId;

  return this.recordMovement('adjustment', difference, 'STOCK-COUNT', reason, userId);
};

// Static method to get low stock items for branch
branchInventorySchema.statics.getLowStockItems = function(branchId) {
  return this.find({
    branchId,
    isActive: true,
    $expr: { $lte: ['$quantity', '$lowStockThreshold'] }
  }).populate('productId', 'name sku category price');
};

// Static method to get reorder list
branchInventorySchema.statics.getReorderList = function(branchId) {
  return this.find({
    branchId,
    isActive: true,
    $expr: { $lte: ['$quantity', '$reorderPoint'] }
  }).populate('productId', 'name sku category supplier');
};

// Static method to check stock availability
branchInventorySchema.statics.checkAvailability = async function(branchId, productId, quantity) {
  const inventory = await this.findOne({ branchId, productId, isActive: true });
  if (!inventory) return { available: false, reason: 'Product not stocked at this branch' };
  if (inventory.available < quantity) {
    return {
      available: false,
      reason: 'Insufficient stock',
      currentStock: inventory.available,
      requested: quantity
    };
  }
  return { available: true, currentStock: inventory.available };
};

// Static method to get inventory value for branch
branchInventorySchema.statics.getBranchInventoryValue = async function(branchId) {
  const inventory = await this.find({ branchId, isActive: true }).populate('productId', 'costPrice price');

  const value = inventory.reduce((total, item) => {
    const costPrice = item.overrideCostPrice || item.productId.costPrice || 0;
    return total + (item.quantity * costPrice);
  }, 0);

  const retailValue = inventory.reduce((total, item) => {
    const price = item.overridePrice || item.productId.price || 0;
    return total + (item.quantity * price);
  }, 0);

  return {
    costValue: value,
    retailValue: retailValue,
    potentialProfit: retailValue - value,
    totalItems: inventory.length,
    totalUnits: inventory.reduce((sum, item) => sum + item.quantity, 0)
  };
};

// Indexes for query optimization
branchInventorySchema.index({ branchId: 1, productId: 1 }, { unique: true }); // Prevent duplicate entries + optimize lookups
branchInventorySchema.index({ branchId: 1, isActive: 1 }); // For active inventory queries per branch
branchInventorySchema.index({ quantity: 1 }); // For low stock alerts
branchInventorySchema.index({ lastRestockedAt: -1 }); // For restock tracking

module.exports = mongoose.model('BranchInventory', branchInventorySchema);
