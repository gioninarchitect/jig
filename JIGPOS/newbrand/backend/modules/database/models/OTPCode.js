// OTP Code Model - One-time password for email authentication
const mongoose = require('mongoose');
const crypto = require('crypto');

const otpCodeSchema = new mongoose.Schema({
  // User reference (optional - may not exist for signup)
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },

  // Email address
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true
  },

  // 6-digit OTP code (temporarily stored, cleared after sending)
  code: {
    type: String,
    required: false  // Not required - cleared after email is sent
  },

  // Hashed version of the code for security
  codeHash: {
    type: String,
    required: true
  },

  // Purpose of the OTP
  purpose: {
    type: String,
    enum: ['login', 'signup', 'reset_password', 'verify_email', 'two_factor'],
    default: 'login',
    index: true
  },

  // Expiration (5 minutes from creation)
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },

  // Usage tracking
  isUsed: {
    type: Boolean,
    default: false,
    index: true
  },
  usedAt: Date,

  // Attempt tracking (for rate limiting)
  attempts: {
    type: Number,
    default: 0
  },
  maxAttempts: {
    type: Number,
    default: 5
  },

  // Request metadata
  ipAddress: String,
  userAgent: String,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes for efficient queries
otpCodeSchema.index({ email: 1, isUsed: 1, expiresAt: 1 });
otpCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto-delete expired codes

// Static method to generate a 6-digit OTP
otpCodeSchema.statics.generateCode = function() {
  // Generate 6 random digits using crypto
  const digits = [];
  for (let i = 0; i < 6; i++) {
    digits.push(crypto.randomInt(0, 10));
  }
  return digits.join('');
};

// Static method to hash an OTP code
otpCodeSchema.statics.hashCode = function(code) {
  return crypto.createHash('sha256').update(code).digest('hex');
};

// Static method to create and save a new OTP
otpCodeSchema.statics.createOTP = async function(email, purpose = 'login', userId = null, ipAddress = null, userAgent = null) {
  // Invalidate any existing unused OTPs for this email and purpose
  await this.updateMany(
    { email: email.toLowerCase(), purpose, isUsed: false },
    { isUsed: true }
  );

  // Generate new OTP
  const code = this.generateCode();
  const codeHash = this.hashCode(code);

  // Set expiration to 5 minutes from now
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

  const otp = new this({
    user: userId,
    email: email.toLowerCase(),
    code, // Store plain code temporarily (will be cleared after sending)
    codeHash,
    purpose,
    expiresAt,
    ipAddress,
    userAgent
  });

  await otp.save();

  return {
    otp,
    code // Return plain code for sending via email
  };
};

// Static method to verify an OTP
otpCodeSchema.statics.verifyOTP = async function(email, code, purpose = 'login') {
  const codeHash = this.hashCode(code);

  // Find the most recent unused OTP for this email
  const otp = await this.findOne({
    email: email.toLowerCase(),
    codeHash,
    purpose,
    isUsed: false,
    expiresAt: { $gt: new Date() }
  }).sort({ createdAt: -1 });

  if (!otp) {
    // Check if there's an expired OTP
    const expiredOtp = await this.findOne({
      email: email.toLowerCase(),
      codeHash,
      purpose,
      isUsed: false,
      expiresAt: { $lte: new Date() }
    });

    if (expiredOtp) {
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }

    // Check if there's a wrong code attempt
    const latestOtp = await this.findOne({
      email: email.toLowerCase(),
      purpose,
      isUsed: false,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 });

    if (latestOtp) {
      latestOtp.attempts += 1;
      await latestOtp.save();

      if (latestOtp.attempts >= latestOtp.maxAttempts) {
        latestOtp.isUsed = true;
        await latestOtp.save();
        return { success: false, error: 'Too many invalid attempts. Please request a new OTP.' };
      }

      return { success: false, error: 'Invalid OTP code.' };
    }

    return { success: false, error: 'No valid OTP found. Please request a new one.' };
  }

  // Mark OTP as used
  otp.isUsed = true;
  otp.usedAt = new Date();
  await otp.save();

  return { success: true, otp };
};

// Instance method to check if OTP is expired
otpCodeSchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Instance method to check if max attempts exceeded
otpCodeSchema.methods.hasExceededAttempts = function() {
  return this.attempts >= this.maxAttempts;
};

// Clear plain code after sending (for security)
otpCodeSchema.methods.clearPlainCode = async function() {
  this.code = undefined;
  return this.save();
};

module.exports = mongoose.model('OTPCode', otpCodeSchema);
