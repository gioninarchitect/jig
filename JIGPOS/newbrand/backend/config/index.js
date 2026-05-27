// Centralized Configuration Module with Security Validation

/**
 * Validates required environment variables
 * Throws error if any critical variables are missing
 * Note: Uses console directly to avoid circular dependency with logger
 */
function validateConfig() {
  const requiredVars = [];
  const warnings = [];
  const isProduction = process.env.NODE_ENV === 'production';

  // Critical: JWT Secret (required in production)
  if (isProduction && !process.env.JWT_SECRET) {
    requiredVars.push('JWT_SECRET - Required for secure authentication');
  }

  // Critical: Database connection (always required)
  if (!process.env.MONGODB_URI && isProduction) {
    requiredVars.push('MONGODB_URI - Production database connection required');
  }

  // Important: Email configuration (recommended for production)
  if (isProduction) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
      warnings.push('Email configuration incomplete (SMTP_HOST, SMTP_USER, SMTP_PASS) - Email functionality will be limited');
    }
  }

  // Important: Payment gateway (recommended for production)
  if (isProduction) {
    const hasPayfast = process.env.PAYFAST_MERCHANT_ID && process.env.PAYFAST_MERCHANT_KEY;
    const hasStripe = process.env.STRIPE_SECRET_KEY;
    const hasInstapay = process.env.INSTAPAY_MERCHANT_ID && process.env.INSTAPAY_SECRET_KEY;

    if (!hasPayfast && !hasStripe && !hasInstapay) {
      warnings.push('No payment gateway configured (PayFast, Stripe, or Instapay) - Payment processing will not work');
    }
  }

  // Security: Session secret
  if (isProduction && !process.env.SESSION_SECRET) {
    warnings.push('SESSION_SECRET not set - Using default (not recommended for production)');
  }

  // Redis configuration (recommended for production caching)
  if (isProduction && (!process.env.REDIS_HOST || !process.env.REDIS_PASSWORD)) {
    warnings.push('Redis configuration incomplete - Caching and session management may be limited');
  }

  // CORS origins (important for production)
  if (isProduction && !process.env.CORS_ORIGINS) {
    warnings.push('CORS_ORIGINS not set - Using default origins (may block legitimate requests)');
  }

  // Log warnings (using console to avoid circular dependency)
  if (warnings.length > 0) {
    console.log('\n⚠️  Configuration Warnings:');
    warnings.forEach(warning => {
      console.warn(`  - ${warning}`);
    });
    console.log('');
  }

  // Throw error if critical vars are missing
  if (requiredVars.length > 0) {
    const errorMessage = `\n❌ CRITICAL: Missing required environment variables:\n${requiredVars.map(v => `  - ${v}`).join('\n')}\n\nSet these in your .env file before starting the server.\n`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  // Log successful validation
  if (isProduction) {
    console.log('✅ Environment configuration validated successfully for PRODUCTION');
  }
}

// Validate configuration on module load
validateConfig();

/**
 * Get JWT Secret with secure fallback for development only
 */
function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  // Only allow fallback in development (use console to avoid circular dep with logger)
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Config] Using development JWT_SECRET. SET JWT_SECRET in .env for production!');
    return 'dev-secret-DO-NOT-USE-IN-PRODUCTION';
  }

  // Production MUST have JWT_SECRET
  const errorMessage = 'CRITICAL: JWT_SECRET environment variable is required in production. Set it in your .env file.';
  console.error(errorMessage);
  throw new Error(errorMessage);
}

module.exports = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3001,

  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/origin',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    }
  },

  // JWT & Authentication
  auth: {
    jwtSecret: getJwtSecret(),
    jwtExpiry: '7d',
    refreshTokenExpiry: '30d',
    bcryptSaltRounds: 10,
    otpExpiry: 10 * 60 * 1000, // 10 minutes
    maxLoginAttempts: 5,
    lockoutDuration: 30 * 60 * 1000, // 30 minutes
  },
  
  // Email Configuration
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.SMTP_FROM_EMAIL || process.env.EMAIL_FROM || 'otp@cleva-ai.co.za'
  },
  
  // SMS Configuration (Twilio/Clickatell)
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      fromNumber: process.env.TWILIO_PHONE_NUMBER
    },
    clickatell: {
      apiKey: process.env.CLICKATELL_API_KEY
    }
  },
  
  // Payment Gateways
  payment: {
    provider: process.env.PAYMENT_PROVIDER || 'payfast',
    payfast: {
      merchantId: process.env.PAYFAST_MERCHANT_ID,
      merchantKey: process.env.PAYFAST_MERCHANT_KEY,
      passphrase: process.env.PAYFAST_PASSPHRASE,
      testMode: process.env.PAYFAST_TEST_MODE === 'true',
      returnUrl: process.env.PAYFAST_RETURN_URL || 'http://localhost:3000/payment/return',
      cancelUrl: process.env.PAYFAST_CANCEL_URL || 'http://localhost:3000/payment/cancel',
      notifyUrl: process.env.PAYFAST_NOTIFY_URL || 'http://localhost:3000/payment/notify'
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      publicKey: process.env.STRIPE_PUBLIC_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET
    },
    instapay: {
      baseUrl: process.env.INSTAPAY_BASE_URL || 'https://api.instapay.co.za/v2',
      merchantId: process.env.INSTAPAY_MERCHANT_ID,
      secretKey: process.env.INSTAPAY_SECRET_KEY
    },
    payu: {
      baseUrl: process.env.PAYU_BASE_URL || 'https://secure.payu.co.za/api',
      username: process.env.PAYU_USERNAME,
      password: process.env.PAYU_PASSWORD,
      safeKey: process.env.PAYU_SAFE_KEY
    }
  },
  
  // File Upload
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    uploadDir: process.env.UPLOAD_DIR || './uploads',
    tempDir: process.env.TEMP_DIR || './temp'
  },
  
  // Redis Cache
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD,
    db: process.env.REDIS_DB || 0,
    keyPrefix: 'origin:',
    ttl: 3600 // 1 hour default
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    authMaxRequests: 5, // For login/register
    skipSuccessfulRequests: false
  },
  
  // Security
  security: {
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:8080'],
    sessionSecret: process.env.SESSION_SECRET || 'origin-session-secret',
    cookieMaxAge: 24 * 60 * 60 * 1000, // 24 hours
    enableHelmet: true,
    enableCompression: true
  },
  
  // Business Rules
  business: {
    membershipThreshold: 300, // R300 minimum for membership
    vatRate: 0.15, // 15% VAT
    freeShippingThreshold: 1000, // R1000 for free shipping
    overnightShippingCost: 99,
    standardShippingDays: 7,
    overnightShippingDays: 1,
    welcomeBonus: 100, // LD Coins
    referralBonus: 50,
    dailyBonusBase: 50,
    streakMultiplier: 5,
    xpPerLevel: 100,
    comboWindowMs: 5000, // 5 seconds for combo
    mysteryBoxChance: 0.05 // 5% chance
  },
  
  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './logs/app.log',
    maxFiles: 5,
    maxSize: '10m',
    format: 'json'
  },
  
  // API Versioning
  api: {
    version: 'v1',
    prefix: '/api',
    documentation: '/api-docs'
  },
  
  // Third Party Services
  services: {
    googleAnalytics: process.env.GA_TRACKING_ID,
    facebookPixel: process.env.FB_PIXEL_ID,
    sentryDsn: process.env.SENTRY_DSN,
    cloudinaryUrl: process.env.CLOUDINARY_URL
  }
};