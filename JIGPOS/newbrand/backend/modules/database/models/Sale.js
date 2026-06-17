// Sale/Transaction Model - POS sales tracking
const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  // Identifiers
  saleNumber: {
    type: String,
    required: false,
    unique: true,
    index: true,
    sparse: true
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true
  },
  receiptNumber: {
    type: String,
    unique: true,
    sparse: true
  },

  // Offline Mode Support
  offlineId: {
    type: String,
    unique: true,
    sparse: true,
    index: true
  },
  offlineQueuedAt: Date,
  syncedAt: Date,

  // Location & Staff
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true,
    index: true
  },
  tillSessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TillSession'
  },
  cashierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Sales Track
  track: {
    type: String,
    enum: ['lifestyle', 'medical', 'pos'],
    required: true,
    index: true
  },

  // Customer (optional for walk-in)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  customerName: String,
  customerEmail: String,
  customerPhone: String,

  // Order Type
  orderType: {
    type: String,
    enum: ['walk-in', 'dine-in', 'takeaway', 'delivery', 'online'],
    required: true,
    default: 'walk-in'
  },
  tableNumber: String,
  orderNotes: String,

  // Line Items
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    type: {
      type: String,
      enum: ['product', 'menu_item'],
      required: true
    },
    name: {
      type: String,
      required: true
    },
    sku: String,
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    taxRate: {
      type: Number,
      default: 15
    },
    subtotal: Number,
    taxAmount: Number,
    total: Number
  }],

  // Pricing
  subtotal: {
    type: Number,
    required: false
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    required: false
  },
  deliveryFee: {
    type: Number,
    default: 0
  },
  tip: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: false
  },

  // Payment Details
  payments: [{
    method: {
      type: String,
      enum: ['cash', 'card', 'eft', 'instapay', 'webpay', 'voucher'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reference: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'failed'],
      default: 'pending'
    },
    proofOfPayment: String,
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: Date,
    rejectionReason: String,
    speedPointProvider: String,
    speedPointTransactionId: String,
    speedPointResponse: mongoose.Schema.Types.Mixed,
    processedAt: Date
  }],
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded'],
    default: 'pending',
    index: true
  },

  // Status
  status: {
    type: String,
    enum: ['draft', 'pending_payment', 'completed', 'voided', 'refunded'],
    default: 'draft',
    index: true
  },
  voidedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  voidedAt: Date,
  voidReason: String,

  // Refund tracking
  refundedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  refundedAt: Date,
  refundAmount: Number,
  refundReason: String,

  // Documents
  receiptUrl: String,
  invoiceUrl: String,
  invoiceGenerated: { type: Boolean, default: false },

  // Inventory
  inventoryDeducted: { type: Boolean, default: false },
  inventoryDeductedAt: Date,

  // Section 21 Compliance (for medical track)
  section21DocumentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section21Document'
  },
  section21Verified: { type: Boolean, default: false },

  // Notes
  internalNotes: String,
  customerNotes: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
saleSchema.index({ branchId: 1, createdAt: -1 });
saleSchema.index({ cashierId: 1, createdAt: -1 });
saleSchema.index({ track: 1, status: 1 });
saleSchema.index({ paymentStatus: 1, status: 1 });
saleSchema.index({ customerId: 1 });

// Pre-save hook to generate sale number
saleSchema.pre('save', async function(next) {
  if (!this.saleNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const count = await mongoose.model('Sale').countDocuments({
      createdAt: {
        $gte: new Date(year, 0, 1)
      }
    });
    this.saleNumber = `SALE-${year}-${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Pre-save hook to calculate line item totals
saleSchema.pre('save', function(next) {
  // Calculate line item totals
  this.items.forEach(item => {
    const _gross = (item.unitPrice * item.quantity) - (item.discount || 0); // VAT-inclusive line
    const _rate = (item.taxRate || 0) / 100;
    item.taxAmount = _rate > 0 ? (_gross - (_gross / (1 + _rate))) : 0; // VAT portion within
    item.subtotal = _gross - item.taxAmount; // ex-VAT
    item.total = _gross; // what the customer pays (incl VAT)
  });

  // Calculate sale totals
  this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  this.totalTax = this.items.reduce((sum, item) => sum + item.taxAmount, 0);
  this.totalAmount = this.subtotal + this.totalTax + this.deliveryFee + this.tip; // VAT-inclusive

  next();
});

// Virtual for change due (cash payments)
saleSchema.virtual('changeDue').get(function() {
  const totalPaid = this.payments.reduce((sum, p) => p.status === 'approved' ? sum + p.amount : sum, 0);
  return Math.max(0, totalPaid - this.totalAmount);
});

// Virtual for amount outstanding
saleSchema.virtual('amountOutstanding').get(function() {
  const totalPaid = this.payments.reduce((sum, p) => p.status === 'approved' ? sum + p.amount : sum, 0);
  return Math.max(0, this.totalAmount - totalPaid);
});

// Method to generate invoice number
saleSchema.methods.generateInvoiceNumber = async function() {
  if (!this.invoiceNumber) {
    const Branch = mongoose.model('Branch');
    const branch = await Branch.findById(this.branchId);
    const date = new Date();
    const year = date.getFullYear();
    const count = await mongoose.model('Sale').countDocuments({
      branchId: this.branchId,
      invoiceNumber: { $exists: true },
      createdAt: {
        $gte: new Date(year, 0, 1)
      }
    });
    this.invoiceNumber = `INV-${branch.branchCode}-${year}-${String(count + 1).padStart(5, '0')}`;
    await this.save();
  }
  return this.invoiceNumber;
};

// Method to void sale
saleSchema.methods.voidSale = function(userId, reason) {
  this.status = 'voided';
  this.voidedBy = userId;
  this.voidedAt = new Date();
  this.voidReason = reason;
  return this.save();
};

// Method to process refund
saleSchema.methods.processRefund = function(userId, amount, reason) {
  this.status = 'refunded';
  this.refundedBy = userId;
  this.refundedAt = new Date();
  this.refundAmount = amount;
  this.refundReason = reason;
  this.paymentStatus = 'refunded';
  return this.save();
};

// Static method to get today's sales for branch
saleSchema.statics.getTodaySales = function(branchId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return this.find({
    branchId,
    createdAt: { $gte: today },
    status: { $in: ['completed', 'pending_payment'] }
  });
};

// Static method to get sales report
saleSchema.statics.getSalesReport = async function(branchId, startDate, endDate) {
  const sales = await this.aggregate([
    {
      $match: {
        branchId: mongoose.Types.ObjectId(branchId),
        createdAt: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalSales: { $sum: '$totalAmount' },
        totalTransactions: { $sum: 1 },
        averageTransaction: { $avg: '$totalAmount' },
        totalCash: {
          $sum: {
            $reduce: {
              input: '$payments',
              initialValue: 0,
              in: {
                $cond: [
                  { $and: [{ $eq: ['$$this.method', 'cash'] }, { $eq: ['$$this.status', 'approved'] }] },
                  { $add: ['$$value', '$$this.amount'] },
                  '$$value'
                ]
              }
            }
          }
        },
        totalCard: {
          $sum: {
            $reduce: {
              input: '$payments',
              initialValue: 0,
              in: {
                $cond: [
                  { $and: [{ $eq: ['$$this.method', 'card'] }, { $eq: ['$$this.status', 'approved'] }] },
                  { $add: ['$$value', '$$this.amount'] },
                  '$$value'
                ]
              }
            }
          }
        }
      }
    }
  ]);

  return sales[0] || { totalSales: 0, totalTransactions: 0, averageTransaction: 0 };
};

module.exports = mongoose.model('Sale', saleSchema);
