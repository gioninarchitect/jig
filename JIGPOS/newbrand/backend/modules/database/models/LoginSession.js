// Login Session Model - Track active user sessions
const mongoose = require('mongoose');

const loginSessionSchema = new mongoose.Schema({
  // User reference
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // JWT token (hashed for security)
  tokenHash: {
    type: String,
    required: true,
    index: true
  },

  // Session metadata
  ipAddress: String,
  userAgent: String,
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet', 'unknown'],
    default: 'unknown'
  },
  browser: String,
  os: String,

  // Location (optional - from IP geolocation)
  location: {
    city: String,
    country: String,
    countryCode: String
  },

  // Session timing
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  lastActivityAt: {
    type: Date,
    default: Date.now
  },

  // Session status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  revokedAt: Date,
  revokedReason: String,

  // Authentication method
  authMethod: {
    type: String,
    enum: ['password', 'otp', 'pin', 'social', 'api_key'],
    default: 'otp'
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
loginSessionSchema.index({ user: 1, isActive: 1 });
loginSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Static method to create a session
loginSessionSchema.statics.createSession = async function(userId, token, metadata = {}) {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  // Parse user agent if provided
  let deviceType = 'unknown';
  let browser = null;
  let os = null;

  if (metadata.userAgent) {
    const ua = metadata.userAgent.toLowerCase();
    if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
      deviceType = 'mobile';
    } else if (ua.includes('tablet') || ua.includes('ipad')) {
      deviceType = 'tablet';
    } else {
      deviceType = 'desktop';
    }

    // Simple browser detection
    if (ua.includes('chrome')) browser = 'Chrome';
    else if (ua.includes('firefox')) browser = 'Firefox';
    else if (ua.includes('safari')) browser = 'Safari';
    else if (ua.includes('edge')) browser = 'Edge';

    // Simple OS detection
    if (ua.includes('windows')) os = 'Windows';
    else if (ua.includes('mac')) os = 'macOS';
    else if (ua.includes('linux')) os = 'Linux';
    else if (ua.includes('android')) os = 'Android';
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';
  }

  // Set expiration to 24 hours
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const session = new this({
    user: userId,
    tokenHash,
    ipAddress: metadata.ipAddress,
    userAgent: metadata.userAgent,
    deviceType,
    browser,
    os,
    expiresAt,
    authMethod: metadata.authMethod || 'otp'
  });

  await session.save();
  return session;
};

// Static method to validate a session
loginSessionSchema.statics.validateSession = async function(token) {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const session = await this.findOne({
    tokenHash,
    isActive: true,
    expiresAt: { $gt: new Date() }
  });

  if (session) {
    // Update last activity
    session.lastActivityAt = new Date();
    await session.save();
  }

  return session;
};

// Static method to revoke a session
loginSessionSchema.statics.revokeSession = async function(token, reason = 'logout') {
  const crypto = require('crypto');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  return this.findOneAndUpdate(
    { tokenHash },
    {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason
    },
    { new: true }
  );
};

// Static method to revoke all sessions for a user
loginSessionSchema.statics.revokeAllUserSessions = async function(userId, reason = 'security') {
  return this.updateMany(
    { user: userId, isActive: true },
    {
      isActive: false,
      revokedAt: new Date(),
      revokedReason: reason
    }
  );
};

// Static method to get active sessions for a user
loginSessionSchema.statics.getActiveSessions = async function(userId) {
  return this.find({
    user: userId,
    isActive: true,
    expiresAt: { $gt: new Date() }
  }).sort({ lastActivityAt: -1 });
};

// Instance method to check if session is valid
loginSessionSchema.methods.isValid = function() {
  return this.isActive && new Date() < this.expiresAt;
};

module.exports = mongoose.model('LoginSession', loginSessionSchema);
