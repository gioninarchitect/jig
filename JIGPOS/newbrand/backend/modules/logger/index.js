/**
 * Winston Logger Configuration
 * Provides structured logging with log levels, file rotation, and JSON formatting
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const config = require('../../config');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Console format (colorized for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Define transports
const transports = [];

// Console transport (always enabled)
transports.push(
  new winston.transports.Console({
    format: consoleFormat,
    level: config.env === 'development' ? 'debug' : 'info'
  })
);

// File transport for errors (always enabled)
transports.push(
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 5242880, // 5MB
    maxFiles: 5
  })
);

// File transport for combined logs (production only)
if (config.env === 'production') {
  transports.push(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  levels,
  format: logFormat,
  transports,
  exitOnError: false
});

// Helper methods for structured logging
logger.logAuth = (action, userId, success, details = {}) => {
  logger.info(`Auth: ${action} - User: ${userId} - Success: ${success}`, details);
};

logger.logSecurity = (event, details = {}) => {
  logger.warn(`Security: ${event}`, details);
};

// Don't log in test environment
if (config.env === 'test') {
  logger.transports.forEach((t) => (t.silent = true));
}

module.exports = logger;
