// Lead Model - Coming Soon Page & Contact Forms
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // Contact Information
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },
  mobile: {
    type: String,
    required: true,
    trim: true
  },

  // Lead Type
  type: {
    type: String,
    enum: ['waiting-list', 'franchise-application', 'contact-form'],
    required: true,
    index: true
  },

  // Franchise-specific fields
  location: {
    type: String,
    trim: true
  },
  investment: {
    type: String,
    trim: true
  },

  // Lead Management
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'converted', 'rejected'],
    default: 'new',
    index: true
  },

  // Assignment & Notes
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    default: ''
  },

  // Contact Tracking
  contactedAt: Date,
  convertedAt: Date,

  // Source Tracking
  source: {
    type: String,
    default: 'coming-soon-page',
    enum: ['coming-soon-page', 'main-site', 'manual-entry']
  },

  // UTM Parameters (for marketing tracking)
  utm: {
    source: String,
    medium: String,
    campaign: String
  }
}, {
  timestamps: true
});

// Indexes for performance
leadSchema.index({ createdAt: -1 });
leadSchema.index({ status: 1, createdAt: -1 });
leadSchema.index({ type: 1, status: 1 });

// Virtual for days since creation
leadSchema.virtual('daysSinceCreated').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Method to check if lead is stale (not contacted within 48 hours)
leadSchema.methods.isStale = function() {
  if (this.status !== 'new') return false;
  const hoursSinceCreated = (Date.now() - this.createdAt) / (1000 * 60 * 60);
  return hoursSinceCreated > 48;
};

module.exports = mongoose.model('Lead', leadSchema);
