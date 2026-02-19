// Wholesale Order Model - B2B orders from HQ
const mongoose = require('mongoose');

const wholesaleOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sku: String,
  name: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  discount: {
    type: Number,
    default: 0
  },
  lineTotal: {
    type: Number,
    required: true
  },
  // For picking/packing
  pickedQty: { type: Number, default: 0 },
  packedQty: { type: Number, default: 0 }
});

const wholesaleOrderSchema = new mongoose.Schema({
  // Order Identifiers
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  quoteNumber: String, // If converted from quote

  // Customer
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WholesaleCustomer',
    required: true
  },

  // Order Type
  orderType: {
    type: String,
    enum: ['standard', 'quote', 'branch_resupply', 'sample', 'return'],
    default: 'standard'
  },

  // If branch resupply
  destinationBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch'
  },

  // Source (HQ warehouse)
  sourceBranch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },

  // Line Items
  items: [wholesaleOrderItemSchema],

  // Totals
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  discountTotal: {
    type: Number,
    default: 0
  },
  vatRate: {
    type: Number,
    default: 15
  },
  vatAmount: {
    type: Number,
    default: 0
  },
  total: {
    type: Number,
    required: true
  },

  // Payment
  paymentTerms: {
    type: String,
    enum: ['cod', 'prepaid', '7days', '14days', '30days', '60days'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue', 'written_off'],
    default: 'pending'
  },
  amountPaid: {
    type: Number,
    default: 0
  },
  dueDate: Date,

  // Payments received
  payments: [{
    amount: Number,
    method: { type: String, enum: ['eft', 'cash', 'card', 'credit_note'] },
    reference: String,
    date: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],

  // Status Workflow
  status: {
    type: String,
    enum: [
      'draft',
      'quote',
      'pending_approval',
      'approved',
      'picking',
      'packed',
      'ready_dispatch',
      'dispatched',
      'delivered',
      'invoiced',
      'completed',
      'cancelled'
    ],
    default: 'draft',
    index: true
  },

  // Workflow timestamps
  quotedAt: Date,
  approvedAt: Date,
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickingStartedAt: Date,
  pickedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  packedAt: Date,
  packedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dispatchedAt: Date,
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  deliveredAt: Date,
  invoicedAt: Date,

  // Delivery
  deliveryMethod: {
    type: String,
    enum: ['collection', 'delivery', 'courier', 'internal_transfer'],
    default: 'collection'
  },
  deliveryAddress: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String
  },
  deliveryNotes: String,
  trackingNumber: String,
  courierName: String,

  // Documents
  taxInvoiceNumber: String,
  taxInvoiceUrl: String,
  deliveryNoteNumber: String,
  deliveryNoteUrl: String,
  proofOfDeliveryUrl: String,

  // Quote specific
  quoteValidUntil: Date,
  quoteNotes: String,

  // Notes
  customerNotes: String,
  internalNotes: String,

  // Created/Modified
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes
wholesaleOrderSchema.index({ customer: 1, status: 1 });
wholesaleOrderSchema.index({ orderType: 1, status: 1 });
wholesaleOrderSchema.index({ dueDate: 1, paymentStatus: 1 });
wholesaleOrderSchema.index({ destinationBranch: 1 });

// Generate order number
wholesaleOrderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await mongoose.model('WholesaleOrder').countDocuments({
      createdAt: { $gte: new Date().setHours(0, 0, 0, 0) }
    });
    const prefix = this.orderType === 'quote' ? 'QT' : 'WO';
    this.orderNumber = `${prefix}-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }
  next();
});

// Calculate totals
wholesaleOrderSchema.pre('save', function(next) {
  // Calculate line totals
  this.items.forEach(item => {
    item.lineTotal = (item.quantity * item.unitPrice) - (item.discount || 0);
  });

  // Calculate order totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.lineTotal, 0);
  this.vatAmount = (this.subtotal - this.discountTotal) * (this.vatRate / 100);
  this.total = this.subtotal - this.discountTotal + this.vatAmount;

  // Update payment status
  if (this.amountPaid >= this.total) {
    this.paymentStatus = 'paid';
  } else if (this.amountPaid > 0) {
    this.paymentStatus = 'partial';
  } else if (this.dueDate && new Date() > this.dueDate) {
    this.paymentStatus = 'overdue';
  }

  next();
});

// Virtual for balance due
wholesaleOrderSchema.virtual('balanceDue').get(function() {
  return Math.max(0, this.total - this.amountPaid);
});

// Convert quote to order
wholesaleOrderSchema.methods.convertToOrder = async function(userId) {
  if (this.orderType !== 'quote') {
    throw new Error('Only quotes can be converted to orders');
  }

  this.quoteNumber = this.orderNumber;
  this.orderNumber = null; // Will regenerate with WO prefix
  this.orderType = 'standard';
  this.status = 'pending_approval';
  this.lastModifiedBy = userId;

  return this.save();
};

// Add payment
wholesaleOrderSchema.methods.addPayment = function(amount, method, reference, userId) {
  this.payments.push({
    amount,
    method,
    reference,
    date: new Date(),
    recordedBy: userId
  });
  this.amountPaid += amount;
  return this.save();
};

// Get overdue orders
wholesaleOrderSchema.statics.getOverdueOrders = function() {
  return this.find({
    paymentStatus: { $in: ['pending', 'partial'] },
    dueDate: { $lt: new Date() },
    status: { $nin: ['cancelled', 'draft', 'quote'] }
  }).populate('customer', 'businessName contactPerson');
};

// Get orders by customer
wholesaleOrderSchema.statics.getCustomerOrders = function(customerId, status) {
  const query = { customer: customerId };
  if (status) query.status = status;
  return this.find(query).sort('-createdAt');
};

// Get branch resupply orders
wholesaleOrderSchema.statics.getBranchResupplyOrders = function(branchId, status) {
  const query = {
    orderType: 'branch_resupply',
    destinationBranch: branchId
  };
  if (status) query.status = status;
  return this.find(query).sort('-createdAt');
};

module.exports = mongoose.model('WholesaleOrder', wholesaleOrderSchema);
