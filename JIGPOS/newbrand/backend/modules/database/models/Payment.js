const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'ZAR'
  },
  method: {
    type: String,
    enum: ['eft', 'card', 'crypto', 'cash', 'voucher', 'subscription'],
    required: true
  },
  provider: {
    type: String,
    enum: ['instapay', 'payu', 'manual'],
    default: 'manual'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true
  },
  transactionId: {
    type: String,
    index: true,
    sparse: true
  },
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  proofOfPayment: {
    url: String,
    uploadedAt: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  failureReason: String,
  processedAt: Date,
  refundedAt: Date
}, {
  timestamps: true
});

// Indexes for performance
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ transactionId: 1 }, { sparse: true });

module.exports = mongoose.model('Payment', paymentSchema);
