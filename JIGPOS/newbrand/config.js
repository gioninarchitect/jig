module.exports = {
  env: process.env.NODE_ENV || 'development',
  auth: {
    bcryptSaltRounds: 10,
    jwtSecret: process.env.JWT_SECRET || 'jig_secret_key_change_in_production',
    jwtExpiresIn: '7d'
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/jig'
  },
  server: {
    port: process.env.PORT || 3001
  },
  email: {
    host: process.env.SMTP_HOST || 'cp73.domains.co.za',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER || 'otp@jig.cleva-ai.co.za',
      pass: process.env.SMTP_PASS
    },
    from: process.env.SMTP_FROM_EMAIL || 'otp@jig.cleva-ai.co.za',
    fromName: process.env.SMTP_FROM_NAME || 'JIG Craft Cannabis',
    adminEmail: 'admin@jig.cleva-ai.co.za'
  },
  otp: {
    host: process.env.OTP_SMTP_HOST || 'cp73.domains.co.za',
    port: parseInt(process.env.OTP_SMTP_PORT) || 465,
    secure: process.env.OTP_SMTP_SECURE === 'true',
    auth: {
      user: process.env.OTP_SMTP_USER || 'otp@jig.cleva-ai.co.za',
      pass: process.env.OTP_SMTP_PASS
    },
    from: process.env.OTP_SMTP_FROM || 'otp@jig.cleva-ai.co.za',
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 10,
    length: parseInt(process.env.OTP_LENGTH) || 6
  }
};
