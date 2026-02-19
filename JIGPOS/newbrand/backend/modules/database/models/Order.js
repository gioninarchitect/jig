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
  
  // Split Payments - supports multiple payment methods per order
  payments: [{
    method: {
      type: String,
      enum: ['cash', 'card', 'eft', 'voucher', 'account', 'wellness_points', 'crypto', 'bitcoin'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reference: String,  // card ref, EFT ref, voucher code
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    processedAt: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
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
    refundedAmount: {
      type: Number,
      default: 0
    },
    refundedAt: Date,
    refundReason: String
  }],

  // Payment Summary - calculated from payments array
  paymentSummary: {
    totalDue: Number,
    totalPaid: {
      type: Number,
      default: 0
    },
    totalRefunded: {
      type: Number,
      default: 0
    },
    outstanding: {
      type: Number,
      default: 0
    },
    isFullyPaid: {
      type: Boolean,
      default: false
    },
    paidAt: Date  // When fully paid
  },

  // Legacy single payment field for backward compatibility
  payment: {
    method: {
      type: String,
      enum: ['eft', 'card', 'crypto', 'bitcoin', 'cash', 'voucher']
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
  
  // Order Status
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'processing',
      'packed',
      'dispatched',
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

  // Pack & Dispatch (PND) Fields
  packingStartedAt: Date,
  packingStartedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  packedAt: Date,
  packedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  packingNotes: String,
  packingPhotoUrl: String,

  dispatchedAt: Date,
  dispatchedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  courier: String,
  trackingNumber: String,
  dispatchNotes: String,

  deliveredAt: Date,
  deliveredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryNotes: String,
  deliverySignatureUrl: String,
  deliveryPhotoUrl: String,

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
    this.orderNumber = 'JIG' + Date.now() + Math.floor(Math.random() * 1000);
  }

  // Check membership qualification
  if (this.total >= 300) {
    this.qualifiesForMembership = true;
  }

  // Generate invoice number when order is shipped
  if (this.isModified('status') && this.status === 'shipped' && !this.invoiceNumber) {
    this.invoiceNumber = 'INV-' + new Date().getFullYear() + '-' + String(Date.now()).slice(-6);
  }

  // Calculate payment summary from payments array
  if (this.payments && this.payments.length > 0) {
    const totalPaid = this.payments
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + (p.amount || 0), 0);

    const totalRefunded = this.payments
      .reduce((sum, p) => sum + (p.refundedAmount || 0), 0);

    const totalDue = this.total || 0;
    const outstanding = totalDue - totalPaid + totalRefunded;

    this.paymentSummary = {
      totalDue,
      totalPaid,
      totalRefunded,
      outstanding: Math.max(0, outstanding),
      isFullyPaid: outstanding <= 0,
      paidAt: outstanding <= 0 && !this.paymentSummary?.paidAt ? new Date() : this.paymentSummary?.paidAt
    };

    // Sync legacy payment field with primary payment method
    if (!this.payment?.method && this.payments[0]) {
      this.payment = {
        method: this.payments[0].method,
        status: this.paymentSummary.isFullyPaid ? 'paid' : 'pending',
        transactionId: this.payments[0].reference,
        paidAt: this.paymentSummary.paidAt
      };
    }
  }

  next();
});

// Instance method to add a payment
orderSchema.methods.addPayment = async function(paymentData) {
  this.payments.push({
    method: paymentData.method,
    amount: paymentData.amount,
    reference: paymentData.reference,
    status: paymentData.status || 'completed',
    processedAt: new Date(),
    processedBy: paymentData.processedBy
  });
  return this.save();
};

// Instance method to refund a specific payment
orderSchema.methods.refundPayment = async function(paymentIndex, amount, reason) {
  if (!this.payments[paymentIndex]) {
    throw new Error('Payment not found');
  }

  const payment = this.payments[paymentIndex];
  const maxRefund = payment.amount - (payment.refundedAmount || 0);

  if (amount > maxRefund) {
    throw new Error(`Maximum refundable amount is R${maxRefund}`);
  }

  payment.refundedAmount = (payment.refundedAmount || 0) + amount;
  payment.refundedAt = new Date();
  payment.refundReason = reason;

  if (payment.refundedAmount >= payment.amount) {
    payment.status = 'refunded';
  }

  return this.save();
};

// Static method to get payment breakdown for an order
orderSchema.statics.getPaymentBreakdown = async function(orderId) {
  const order = await this.findById(orderId);
  if (!order) return null;

  return {
    orderId: order._id,
    orderNumber: order.orderNumber,
    total: order.total,
    payments: order.payments.map(p => ({
      method: p.method,
      amount: p.amount,
      status: p.status,
      reference: p.reference,
      processedAt: p.processedAt,
      refundedAmount: p.refundedAmount || 0
    })),
    summary: order.paymentSummary
  };
};

module.exports = mongoose.model('Order', orderSchema);