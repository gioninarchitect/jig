import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '6000'),
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://tntza:tntza@localhost:5432/tntza',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '24h',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.ethereal.email',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  NODE_ENV: process.env.NODE_ENV || 'development',
  EMAIL_DELIVERY_ENABLED: process.env.EMAIL_DELIVERY_ENABLED === 'true',
  ALLOW_STORED_PIN_LOGIN: process.env.ALLOW_STORED_PIN_LOGIN === 'true',
  LOG_AUTH_PINS: process.env.LOG_AUTH_PINS === 'true',
  // ---- FLOCORE rails (W30 SSO / W32 gateway) ----
  // Base URL + basic-auth for the fo.flocore.tech gate (shared with the AI rail).
  FLOCORE_BASE_URL: process.env.FLOCORE_BASE_URL || process.env.FLOCORE_URL || 'https://fo.flocore.tech',
  FLOCORE_BASIC_AUTH: process.env.FLOCORE_BASIC_AUTH || '', // "user:pass" for the gate (/auth/*, AI rails)
  FLOCORE_TENANT_SLUG: process.env.FLOCORE_TENANT_SLUG || 'ilco',
  // OTP SSO: FLOCORE issues+verifies the email code; we mint the local JWT from the
  // matched local user. OFF by default so the branch never changes prod login until Flo flips it.
  FLOCORE_SSO_ENABLED: process.env.FLOCORE_SSO_ENABLED === 'true',
  // Event emit: scoped tenant:ilco W32 bearer (FO stages it as FLOCORE_TOKEN). Emit no-ops until set.
  FLOCORE_SERVICE_TOKEN: process.env.FLOCORE_TOKEN || process.env.FLOCORE_SERVICE_TOKEN || '',
};
