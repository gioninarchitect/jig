const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['order', 'payment', 'system', 'promotional', 'subscription', 'affiliate', 'viral'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  channel: {
    type: String,
    enum: ['email', 'sms', 'push', 'websocket', 'toast'],
    default: 'websocket'
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'read'],
    default: 'pending',
    index: true
  },
  read: {
    type: Boolean,
    default: false,
    index: true
  },
  readAt: Date,
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  link: String,
  expiresAt: Date
}, {
  timestamps: true
});

// Indexes for performance
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ status: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
