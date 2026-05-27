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
};
