// Section 21 Medical Cannabis Prescription Document Model
const mongoose = require('mongoose');

const section21DocumentSchema = new mongoose.Schema({
  // User Reference
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // Document Information
  documentUrl: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    enum: ['pdf', 'jpg', 'jpeg', 'png'],
    required: true
  },

  // Prescription Details
  prescriptionNumber: String,
  prescribedBy: String,
  issuedDate: {
    type: Date,
    required: true
  },
  expiryDate: {
    type: Date,
    required: true
  },

  // Approval Workflow
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'expired'],
    default: 'pending',
    index: true
  },

  // Admin Review
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  rejectionReason: String,
  adminNotes: String,

  // Expiry Management
  isExpired: {
    type: Boolean,
    default: false,
    index: true
  },
  expiryNotificationSent: {
    type: Boolean,
    default: false
  },
  renewalReminders: [{
    sentAt: Date,
    daysBeforeExpiry: Number
  }],

  // Replacement Tracking (for renewals)
  replacedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section21Document'
  },
  replaces: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Section21Document'
  },

  // Metadata
  ipAddress: String,
  userAgent: String,
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
section21DocumentSchema.index({ userId: 1, status: 1 });
section21DocumentSchema.index({ expiryDate: 1, status: 1 });

// Virtual for days until expiry
section21DocumentSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const now = new Date();
  const diff = this.expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for is expiring soon (within 30 days)
section21DocumentSchema.virtual('isExpiringSoon').get(function() {
  const daysUntil = this.daysUntilExpiry;
  return daysUntil !== null && daysUntil > 0 && daysUntil <= 30;
});

// Method to check if document is valid for purchase
section21DocumentSchema.methods.isValidForPurchase = function() {
  if (this.status !== 'approved') return false;
  if (this.isExpired) return false;

  const now = new Date();
  if (this.expiryDate < now) {
    this.isExpired = true;
    this.status = 'expired';
    this.save();
    return false;
  }

  return true;
};

// Static method to get user's active document
section21DocumentSchema.statics.getUserActiveDocument = async function(userId) {
  const doc = await this.findOne({
    userId,
    status: 'approved',
    isExpired: false,
    expiryDate: { $gt: new Date() }
  }).sort({ expiryDate: -1 });

  return doc;
};

// Static method to check if user can access medical cannabis
section21DocumentSchema.statics.canUserAccessMedicalCannabis = async function(userId) {
  const doc = await this.getUserActiveDocument(userId);
  return doc ? doc.isValidForPurchase() : false;
};

// Pre-save hook to auto-mark as expired
section21DocumentSchema.pre('save', function(next) {
  if (this.expiryDate && this.expiryDate < new Date()) {
    this.isExpired = true;
    if (this.status === 'approved') {
      this.status = 'expired';
    }
  }
  next();
});

module.exports = mongoose.model('Section21Document', section21DocumentSchema);
