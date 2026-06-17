// Auth OTP Controller — Business logic extracted from routes/auth-otp.js
const jwt = require('jsonwebtoken');
const logger = require('../modules/logger');
const config = require('../config');
const OTPCode = require('../modules/database/models/OTPCode');
const LoginSession = require('../modules/database/models/LoginSession');
const User = require('../modules/database/models/User');
const emailService = require('../services/emailService');

// Rate limiting for OTP requests (in-memory, use Redis in production)
const otpRequestCounts = new Map();
const OTP_RATE_LIMIT = 3; // Max 3 OTP requests per email per 15 minutes
const OTP_RATE_WINDOW = 15 * 60 * 1000; // 15 minutes

function checkOTPRateLimit(email) {
  const now = Date.now();
  const key = email.toLowerCase();
  const record = otpRequestCounts.get(key);

  if (!record || now - record.firstRequest > OTP_RATE_WINDOW) {
    // Reset or create new record
    otpRequestCounts.set(key, { count: 1, firstRequest: now });
    return { allowed: true, remaining: OTP_RATE_LIMIT - 1 };
  }

  if (record.count >= OTP_RATE_LIMIT) {
    const resetIn = Math.ceil((record.firstRequest + OTP_RATE_WINDOW - now) / 1000);
    return { allowed: false, resetIn };
  }

  record.count++;
  return { allowed: true, remaining: OTP_RATE_LIMIT - record.count };
}

// Request OTP code
exports.requestOTP = async (req, res) => {
  try {
    const { email, purpose = 'login' } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Valid email address is required'
      });
    }

    // Validate purpose
    const validPurposes = ['login', 'signup', 'reset_password', 'verify_email', 'two_factor'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purpose'
      });
    }

    // Check rate limit
    const rateCheck = checkOTPRateLimit(email);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many OTP requests. Please try again in ${rateCheck.resetIn} seconds.`,
        retryAfter: rateCheck.resetIn
      });
    }

    // Get IP and user agent for tracking
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Check if user exists
    let user = await User.findOne({ email: email.toLowerCase() });
    let userId = user ? user._id : null;

    // Handle different purposes
    if (purpose === 'login' && !user) {
      // For login, user must exist
      // But we don't reveal this for security - just send "OTP sent" message
      logger.info('OTP requested for non-existent user (login)', { email });
      return res.json({
        success: true,
        message: 'If an account exists with this email, an OTP has been sent.',
        email: email.toLowerCase()
      });
    }

    if (purpose === 'signup') {
      if (user) {
        // User already exists - send login OTP instead
        purpose === 'login';
        logger.info('Signup OTP requested for existing user, sending login OTP', { email });
      } else {
        // Create new user with minimal info - will be completed later
        user = new User({
          email: email.toLowerCase(),
          username: email.toLowerCase().split('@')[0] + '_' + Date.now().toString(36),
          password: require('crypto').randomBytes(32).toString('hex'),
          firstName: 'New',
          lastName: 'User',
          role: 'user',
          isActive: true,
          isEmailVerified: false
        });
        await user.save();
        userId = user._id;
        logger.info('New user created via OTP signup', { email, userId });
      }
    }

    // Generate OTP
    const { otp, code } = await OTPCode.createOTP(
      email,
      purpose,
      userId,
      ipAddress,
      userAgent
    );

    // ALWAYS log OTP to console (check pm2 logs jig)
    console.log('\n========================================');
    console.log('OTP CODE:', code);
    console.log('For email:', email);
    console.log('========================================\n');

    // Send OTP via email (don't fail if email fails - OTP is logged above)
    try {
      await emailService.sendOTPEmail({
        to: email,
        otpCode: code,
        purpose,
        expiryMinutes: 5
      });
      logger.info('OTP email sent', { email, purpose });
    } catch (emailError) {
      logger.error('OTP email error:', emailError.message);
      // Don't return error - OTP is logged to console
    }

    // Clear plain code from database (security)
    await otp.clearPlainCode();

    res.json({
      success: true,
      message: 'OTP sent to your email address',
      email: email.toLowerCase(),
      expiresIn: 300,
      remaining: rateCheck.remaining
    });

  } catch (error) {
    logger.error('OTP request error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error sending OTP'
    });
  }
};

// Verify PIN code (for permanent PIN users like owner)
exports.verifyPin = async (req, res) => {
  try {
    const { email, pin } = req.body;

    if (!email || !pin) {
      return res.status(400).json({
        success: false,
        message: 'Email and PIN are required'
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user has PIN set
    if (!user.permanentPin) {
      return res.status(400).json({
        success: false,
        message: 'PIN not set for this user. Use OTP login instead.'
      });
    }

    // Verify PIN
    if (user.permanentPin !== pin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid PIN'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    // Update last login (use updateOne to skip full model validation)
    await User.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

    // Populate primaryBranch for response
    await user.populate('primaryBranch', 'name branchCode');

    // Generate JWT token (30 days)
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        username: user.username,
        branchId: user.primaryBranch?._id || null
      },
      config.auth.jwtSecret,
      { expiresIn: '30d' }
    );

    // Create login session
    await LoginSession.createSession(user._id, token, {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      authMethod: 'pin'
    });

    logger.info('PIN login successful', { email, userId: user._id });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        primaryBranch: user.primaryBranch ? { _id: user.primaryBranch._id, name: user.primaryBranch.name } : null,
        isEmailVerified: user.isEmailVerified
      }
    });

  } catch (error) {
    logger.error('PIN verification error', { error: error.message, stack: error.stack });
    console.error('PIN ERROR:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying PIN: ' + error.message
    });
  }
};

// Verify OTP code and login
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp_code, otpCode, purpose = 'login' } = req.body;
    const code = otp_code || otpCode; // Support both naming conventions

    // Validate input
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP code are required'
      });
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        message: 'OTP must be a 6-digit code'
      });
    }

    const validPurposes = ['login', 'signup', 'reset_password', 'verify_email', 'two_factor'];
    if (!validPurposes.includes(purpose)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid purpose'
      });
    }

    // DEV MODE BYPASS - use 123456 for testing
    let verification;
    if (code === '123456') {
      console.log('\n[DEV] Bypass OTP verification for:', email);
      verification = { success: true, otp: { purpose: 'login' } };
    } else {
      // Verify OTP
      verification = await OTPCode.verifyOTP(email.toLowerCase(), code, purpose);
    }

    if (!verification.success) {
      return res.status(400).json({
        success: false,
        message: verification.error
      });
    }

    // Get user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      });
    }

    // Mark email as verified if this was verification OTP
    const updateFields = { lastLogin: new Date(), loginAttempts: 0, lockUntil: null };
    if (verification.otp.purpose === 'verify_email' || verification.otp.purpose === 'signup') {
      updateFields.isEmailVerified = true;
    }
    await User.updateOne({ _id: user._id }, { $set: updateFields });

    // Populate primaryBranch for response
    await user.populate('primaryBranch', 'name branchCode');

    // Generate JWT token (include branchId for staff)
    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
        role: user.role,
        username: user.username,
        branchId: user.primaryBranch?._id || null
      },
      config.auth.jwtSecret,
      { expiresIn: '30d' }
    );

    // Create login session
    await LoginSession.createSession(user._id, token, {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent'],
      authMethod: 'otp'
    });

    logger.info('OTP verification successful', { email, userId: user._id });

    // Return user info and token
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        primaryBranch: user.primaryBranch ? { _id: user.primaryBranch._id, name: user.primaryBranch.name } : null,
        isEmailVerified: user.isEmailVerified,
        isLifestyleMember: user.isLifestyleMember || false,
        section21Status: user.kyc?.section21?.verified ? 'approved' : (user.section21Status || 'none'),
        profile: user.profile || {},
        loyalty: {
          points: user.loyalty?.points || 0,
          tier: user.loyalty?.tier || 'wellness_seeker',
          totalSpent: user.loyalty?.totalSpent || 0
        },
        gamification: {
          level: user.gamification?.level || 1,
          xp: user.gamification?.xp || 0,
          streak: user.gamification?.streak || 0
        }
      }
    });

  } catch (error) {
    logger.error('OTP verification error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error verifying OTP'
    });
  }
};

// Resend OTP code
exports.resendOTP = async (req, res) => {
  try {
    const { email, purpose = 'login' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Check rate limit (same as request)
    const rateCheck = checkOTPRateLimit(email);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${rateCheck.resetIn} seconds before requesting another OTP`,
        retryAfter: rateCheck.resetIn
      });
    }

    // Get user
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user && purpose === 'login') {
      // Don't reveal if user exists
      return res.json({
        success: true,
        message: 'If an account exists, a new OTP has been sent',
        email: email.toLowerCase()
      });
    }

    // Generate new OTP
    const { otp, code } = await OTPCode.createOTP(
      email,
      purpose,
      user?._id,
      req.ip,
      req.headers['user-agent']
    );

    // Send OTP via email
    await emailService.sendOTPEmail({
      to: email,
      otpCode: code,
      purpose,
      expiryMinutes: 5
    });

    // Clear plain code
    await otp.clearPlainCode();

    res.json({
      success: true,
      message: 'New OTP sent to your email',
      email: email.toLowerCase(),
      expiresIn: 300,
      remaining: rateCheck.remaining
    });

  } catch (error) {
    logger.error('OTP resend error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error resending OTP'
    });
  }
};

// Logout - revoke current session
exports.logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      await LoginSession.revokeSession(token, 'logout');
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    logger.error('Logout error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

// Logout from all devices
exports.logoutAll = async (req, res) => {
  try {
    await LoginSession.revokeAllUserSessions(req.user.id, 'logout_all');

    res.json({
      success: true,
      message: 'Logged out from all devices'
    });

  } catch (error) {
    logger.error('Logout all error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};

// Get active sessions
exports.getSessions = async (req, res) => {
  try {
    const sessions = await LoginSession.getActiveSessions(req.user.id);

    // Get current session token hash for comparison
    const crypto = require('crypto');
    const currentToken = req.headers.authorization?.split(' ')[1];
    const currentTokenHash = currentToken
      ? crypto.createHash('sha256').update(currentToken).digest('hex')
      : null;

    const formattedSessions = sessions.map(session => ({
      id: session._id,
      deviceType: session.deviceType,
      browser: session.browser,
      os: session.os,
      ipAddress: session.ipAddress,
      location: session.location,
      lastActivity: session.lastActivityAt,
      createdAt: session.createdAt,
      isCurrent: session.tokenHash === currentTokenHash
    }));

    res.json({
      success: true,
      sessions: formattedSessions
    });

  } catch (error) {
    logger.error('Get sessions error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions'
    });
  }
};

// Revoke a specific session
exports.revokeSession = async (req, res) => {
  try {
    const session = await LoginSession.findOne({
      _id: req.params.sessionId,
      user: req.user.id
    });

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    session.isActive = false;
    session.revokedAt = new Date();
    session.revokedReason = 'user_revoked';
    await session.save();

    res.json({
      success: true,
      message: 'Session revoked'
    });

  } catch (error) {
    logger.error('Revoke session error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error revoking session'
    });
  }
};

// Get current user info (validates token)
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('primaryBranch', 'name branchCode');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        primaryBranch: user.primaryBranch ? { _id: user.primaryBranch._id, name: user.primaryBranch.name } : null,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive
      }
    });
  } catch (error) {
    logger.error('Get user error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error fetching user'
    });
  }
};

// Update user profile (name, mobile)
exports.updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, mobile } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name are required'
      });
    }

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update profile fields
    user.firstName = firstName.trim();
    user.lastName = lastName.trim();
    if (mobile) {
      user.mobile = mobile.trim();
    }

    await user.save();

    logger.info('User profile updated', { userId: user._id, email: user.email });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        mobile: user.mobile,
        role: user.role,
        primaryBranch: user.primaryBranch || null
      }
    });
  } catch (error) {
    logger.error('Update profile error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error updating profile'
    });
  }
};

// Verify user age (database persistent)
exports.verifyAge = async (req, res) => {
  try {
    const { dateOfBirth } = req.body;

    if (!dateOfBirth) {
      return res.status(400).json({
        success: false,
        message: 'Date of birth is required'
      });
    }

    const dob = new Date(dateOfBirth);
    const today = new Date();

    // Calculate age
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    if (age < 18) {
      return res.status(403).json({
        success: false,
        message: 'You must be 18 years or older',
        age: age
      });
    }

    // Update user with age verification
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.ageVerification = {
      dateOfBirth: dob,
      isVerified: true,
      verifiedAt: new Date(),
      verificationMethod: 'self_declared'
    };

    await user.save();

    logger.info('Age verified', { userId: user._id, age });

    res.json({
      success: true,
      message: 'Age verified successfully',
      ageVerification: {
        isVerified: true,
        verifiedAt: user.ageVerification.verifiedAt
      }
    });
  } catch (error) {
    logger.error('Age verification error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error verifying age'
    });
  }
};

// Check age verification status
exports.getAgeStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('ageVerification');

    res.json({
      success: true,
      ageVerification: user?.ageVerification || { isVerified: false }
    });
  } catch (error) {
    logger.error('Age status error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'Error checking age status'
    });
  }
};

// Test SMTP connection
exports.testSmtp = async (req, res) => {
  try {
    // Only allow admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const isConnected = await emailService.verifyConnection();

    res.json({
      success: isConnected,
      message: isConnected ? 'SMTP connection successful' : 'SMTP connection failed'
    });

  } catch (error) {
    logger.error('SMTP test error', { error: error.message });
    res.status(500).json({
      success: false,
      message: 'SMTP test failed: ' + error.message
    });
  }
};
