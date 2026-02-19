// Order Model - Max 200 lines
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  // Order Number & References
  orderNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  invoiceNumber: String,
  
  // Customer Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  customer: {
    firstName: String,
    lastName: String,
    email: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    }
  },
  
  // Order Items
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: false // Allow guest checkout without product ObjectId
    },
    name: String,
    sku: String,
    price: {
      type: Number,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    size: String,
    color: String,
    subtotal: Number,
    discount: Number,
    tax: Number,
    total: Number
  }],
  
  // Pricing
  subtotal: {
    type: Number,
    required: true
  },
  discount: {
    amount: {
      type: Number,
      default: 0
    },
    code: String,
    type: String // percentage, fixed, free_shipping
  },
  tax: {
    rate: {
      type: Number,
      default: 0.15
    },
    amount: Number
  },
  shipping: {
    method: {
      type: String,
      enum: ['standard', 'overnight', 'pickup'],
      default: 'standard'
    },
    cost: {
      type: Number,
      default: 0
    },
    trackingNumber: String,
    carrier: String,
    estimatedDelivery: Date
  },
  total: {
    type: Number,
    required: true
  },
  
  // Addresses
  billingAddress: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String,
    country: {
      type: String,
      default: 'South Africa'
    }
  },
  shippingAddress: {
    street: String,
    suburb: String,
    city: String,
    province: String,
    postalCode: String,
    country: {
      type: String,
      default: 'South Africa'
    },
    instructions: String
  },
  
  // Payment (legacy single payment field - kept for backward compatibility)
  payment: {
    method: {
      type: String,
      enum: ['eft', 'card', 'crypto', 'bitcoin', 'cash', 'voucher'],
      required: false // Made optional for split payments
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'paid', 'failed', 'refunded'],
      default: 'pending',
      index: true
    },
    transactionId: String,
    proofOfPayment: {
      url: String,
      uploadedAt: Date,
      verified: Boolean,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      verifiedAt: Date
    },
    paidAt: Date
  },

  // Split Payments (new multi-payment support)
  payments: [{
    method: {
      type: String,
      enum: ['cash', 'card', 'eft', 'voucher', 'account', 'wellness_points', 'crypto', 'bitcoin'],
      required: true
    },
    amount: {
      type: Number,
      required: true,
      min: 0
    },
    reference: String, // Card ref, EFT ref, voucher code
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher'
    },
    processedAt: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    refundedAt: Date,
    refundedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    refundReason: String
  }],

  // Payment Summary (calculated from payments array)
  paymentSummary: {
    totalDue: Number,
    totalPaid: {
      type: Number,
      default: 0
    },
    totalOutstanding: Number,
    isFullyPaid: {
      type: Boolean,
      default: false
    }
  },
  
  // Order Status
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    ],
    default: 'pending',
    index: true
  },
  
  // Status History
  statusHistory: [{
    status: String,
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Fulfillment
  fulfillment: {
    status: {
      type: String,
      enum: ['unfulfilled', 'partial', 'fulfilled'],
      default: 'unfulfilled'
    },
    packedAt: Date,
    shippedAt: Date,
    deliveredAt: Date
  },
  
  // Vouchers & Rewards
  generatedVouchers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Voucher'
  }],
  ldCoinsEarned: {
    type: Number,
    default: 0
  },
  
  // Notes
  customerNotes: String,
  internalNotes: String,
  
  // Flags
  requiresApproval: {
    type: Boolean,
    default: false
  },
  isGift: {
    type: Boolean,
    default: false
  },
  giftMessage: String,
  
  // Membership
  qualifiesForMembership: {
    type: Boolean,
    default: false
  },
  membershipActivated: {
    type: Boolean,
    default: false
  },
  
  // Metadata
  source: {
    type: String,
    enum: ['web', 'mobile', 'admin', 'api'],
    default: 'web'
  },
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'customer.email': 1 });
orderSchema.index({ 'payment.status': 1, status: 1 });
orderSchema.index({ user: 1, createdAt: -1 }); // For user order history sorted by date
orderSchema.index({ status: 1, createdAt: -1 }); // For filtering orders by status

// Generate order number before saving
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    this.orderNumber = 'LD' + Date.now() + Math.floor(Math.random() * 1000);
  }

  // Check membership qualification
  if (this.total >= 300) {
    this.qualifiesForMembership = true;
  }

  // Generate invoice number when order is shipped
  if (this.isModified('status') && this.status === 'shipped' && !this.invoiceNumber) {
    this.invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
  }

  next();
});

module.exports = mongoose.model('Order', orderSchema);