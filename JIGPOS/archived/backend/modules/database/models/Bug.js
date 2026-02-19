// Bug Report Model for UAT Testing
const mongoose = require('mongoose');

const bugSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['bug', 'ui', 'data', 'performance', 'feature'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    required: true,
    default: 'medium'
  },
  description: {
    type: String,
    required: true
  },
  steps: {
    type: String
  },
  status: {
    type: String,
    enum: ['new', 'in_progress', 'review', 'resolved'],
    default: 'new'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  page: {
    url: String,
    pathname: String,
    hash: String,
    title: String,
    component: String,
    section: String
  },
  browser: String,
  device: {
    type: {
      type: String
    },
    isMobile: Boolean,
    platform: String
  },
  screen: {
    width: Number,
    height: Number,
    screenSize: String
  },
  user: {
    email: String,
    role: String
  },
  consoleErrors: [{
    errorType: String,
    message: String,
    file: String,
    line: Number,
    column: Number,
    stack: String,
    timestamp: Date
  }],
  networkLogs: [{
    requestType: String,
    url: String,
    method: String,
    status: mongoose.Schema.Types.Mixed,
    duration: Number,
    error: String,
    timestamp: Date
  }],
  screenshot: {
    type: String // Base64 encoded image
  }
}, {
  timestamps: true
});

// Index for efficient queries
bugSchema.index({ status: 1, priority: -1, timestamp: -1 });
bugSchema.index({ 'user.email': 1 });

const Bug = mongoose.model('Bug', bugSchema);

module.exports = Bug;
