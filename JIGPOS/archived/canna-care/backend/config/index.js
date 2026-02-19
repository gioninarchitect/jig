// Centralized Configuration Module
module.exports = {
  // Environment
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  
  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/loosedraw',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    }
  },
  
  // JWT & Authentication
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'loosedraw-secret-key-change-in-production',
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
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    from: process.env.EMAIL_FROM || 'noreply@loosedraw.co.za'
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
    keyPrefix: 'loosedraw:',
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
    sessionSecret: process.env.SESSION_SECRET || 'loosedraw-session-secret',
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