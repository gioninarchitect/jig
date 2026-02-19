// Purchase Order Model - PO management and goods receiving
const mongoose = require('mongoose');

const purchaseOrderSchema = new mongoose.Schema({
  // PO Identifier
  poNumber: {
    type: String,
    unique: true,
    index: true
  },

  // Supplier Reference
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true,
    index: true
  },

  // Line Items
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String, // Snapshot at time of order
    productSku: String,
    description: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitOfMeasure: {
      type: String,
      enum: ['units', 'grams', 'kg', 'ml', 'liters'],
      default: 'units'
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0
    },
    totalPrice: Number,

    // Receiving
    receivedQuantity: {
      type: Number,
      default: 0
    },
    receivedBatches: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch'
    }],
    receivingNotes: String
  }],

  // Totals
  subtotal: {
    type: Number,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 15 // 15% VAT
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    default: 0
  },
  currency: {
    type: String,
    default: 'ZAR'
  },

  // Workflow Status
  status: {
    type: String,
    enum: ['draft', 'submitted', 'approved', 'ordered', 'partial', 'received', 'cancelled'],
    default: 'draft',
    index: true
  },

  // Status History
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    notes: String
  }],

  // Creation & Submission
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  submittedAt: Date,

  // Approval
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalNotes: String,

  // Rejection
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,
  rejectionReason: String,

  // Ordering
  orderedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  orderedAt: Date,
  supplierReference: String, // Supplier's order number

  // Delivery
  deliveryBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  deliveryNotes: String,

  // Receiving
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: Date,
  receivingNotes: String,

  // Documents
  documents: [{
    type: {
      type: String,
      enum: ['quote', 'invoice', 'delivery_note', 'packing_list', 'certificate', 'other']
    },
    name: String,
    url: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Payment
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid'
  },
  paymentDueDate: Date,
  payments: [{
    amount: Number,
    method: String,
    reference: String,
    paidAt: Date,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // Additional
  notes: String,
  internalNotes: String,
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  tags: [String]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
purchaseOrderSchema.index({ supplier: 1, status: 1 });
purchaseOrderSchema.index({ createdAt: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1, status: 1 });
purchaseOrderSchema.index({ paymentStatus: 1, paymentDueDate: 1 });

// Generate PO number before saving
purchaseOrderSchema.pre('save', async function(next) {
  if (!this.poNumber) {
    const year = new Date().getFullYear();
    const count = await mongoose.model('PurchaseOrder').countDocuments();
    this.poNumber = `PO-${year}-${String(count + 1).padStart(6, '0')}`;
  }

  // Calculate totals
  this.subtotal = this.items.reduce((sum, item) => {
    item.totalPrice = item.quantity * item.unitPrice;
    return sum + item.totalPrice;
  }, 0);

  this.taxAmount = (this.subtotal - this.discount) * (this.taxRate / 100);
  this.total = this.subtotal - this.discount + this.taxAmount + this.shippingCost;

  next();
});

// Virtual for receiving progress
purchaseOrderSchema.virtual('receivingProgress').get(function() {
  if (!this.items || this.items.length === 0) return 0;

  const totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  const receivedQuantity = this.items.reduce((sum, item) => sum + (item.receivedQuantity || 0), 0);

  return Math.round((receivedQuantity / totalQuantity) * 100);
});

// Virtual for payment progress
purchaseOrderSchema.virtual('paymentProgress').get(function() {
  if (!this.payments || this.payments.length === 0) return 0;

  const totalPaid = this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return Math.round((totalPaid / this.total) * 100);
});

// Method to submit for approval
purchaseOrderSchema.methods.submit = async function(userId) {
  if (this.status !== 'draft') {
    throw new Error('Only draft POs can be submitted');
  }

  this.status = 'submitted';
  this.submittedBy = userId;
  this.submittedAt = new Date();

  this.statusHistory.push({
    status: 'submitted',
    changedBy: userId,
    notes: 'Submitted for approval'
  });

  return this.save();
};

// Method to approve
purchaseOrderSchema.methods.approve = async function(userId, notes = '') {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted POs can be approved');
  }

  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  this.approvalNotes = notes;

  this.statusHistory.push({
    status: 'approved',
    changedBy: userId,
    notes: notes || 'Approved'
  });

  return this.save();
};

// Method to reject
purchaseOrderSchema.methods.reject = async function(userId, reason) {
  if (this.status !== 'submitted') {
    throw new Error('Only submitted POs can be rejected');
  }

  this.status = 'draft'; // Return to draft for revision
  this.rejectedBy = userId;
  this.rejectedAt = new Date();
  this.rejectionReason = reason;

  this.statusHistory.push({
    status: 'rejected',
    changedBy: userId,
    notes: reason
  });

  return this.save();
};

// Method to mark as ordered
purchaseOrderSchema.methods.markOrdered = async function(userId, supplierReference = '') {
  if (this.status !== 'approved') {
    throw new Error('Only approved POs can be marked as ordered');
  }

  this.status = 'ordered';
  this.orderedBy = userId;
  this.orderedAt = new Date();
  this.supplierReference = supplierReference;

  this.statusHistory.push({
    status: 'ordered',
    changedBy: userId,
    notes: supplierReference ? `Supplier ref: ${supplierReference}` : 'Order placed with supplier'
  });

  return this.save();
};

// Method to receive goods (partial or full)
purchaseOrderSchema.methods.receiveGoods = async function(itemId, quantity, batchId, userId, notes = '') {
  const item = this.items.id(itemId);
  if (!item) {
    throw new Error('Item not found in PO');
  }

  const remainingToReceive = item.quantity - item.receivedQuantity;
  if (quantity > remainingToReceive) {
    throw new Error(`Cannot receive more than ordered. Remaining: ${remainingToReceive}`);
  }

  item.receivedQuantity += quantity;
  if (batchId) {
    item.receivedBatches.push(batchId);
  }
  if (notes) {
    item.receivingNotes = (item.receivingNotes || '') + '\n' + notes;
  }

  // Update PO status
  const allReceived = this.items.every(i => i.receivedQuantity >= i.quantity);
  const anyReceived = this.items.some(i => i.receivedQuantity > 0);

  if (allReceived) {
    this.status = 'received';
    this.receivedAt = new Date();
    this.receivedBy = userId;
  } else if (anyReceived) {
    this.status = 'partial';
  }

  this.statusHistory.push({
    status: this.status,
    changedBy: userId,
    notes: `Received ${quantity} ${item.unitOfMeasure} of ${item.productName}`
  });

  return this.save();
};

// Method to cancel
purchaseOrderSchema.methods.cancel = async function(userId, reason) {
  if (['received', 'cancelled'].includes(this.status)) {
    throw new Error('Cannot cancel a received or already cancelled PO');
  }

  this.status = 'cancelled';

  this.statusHistory.push({
    status: 'cancelled',
    changedBy: userId,
    notes: reason
  });

  return this.save();
};

// Static method to find POs needing attention
purchaseOrderSchema.statics.findRequiringAction = function() {
  return this.find({
    status: { $in: ['submitted', 'ordered'] }
  })
  .populate('supplier', 'name supplierId')
  .populate('createdBy', 'firstName lastName')
  .sort({ createdAt: -1 });
};

// Static method to find overdue POs
purchaseOrderSchema.statics.findOverdue = function() {
  return this.find({
    status: 'ordered',
    expectedDeliveryDate: { $lt: new Date() }
  })
  .populate('supplier', 'name supplierId contactPerson')
  .sort({ expectedDeliveryDate: 1 });
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
