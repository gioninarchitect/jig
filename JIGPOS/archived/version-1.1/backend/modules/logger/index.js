// Logger Module - Centralized Logging - Max 200 lines
const winston = require('winston');
const path = require('path');
const config = require('../../config');

class Logger {
  constructor() {
    this.logger = this.createLogger();
  }

  createLogger() {
    const formats = [
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ];

    // Console format for development
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      })
    );

    const transports = [];

    // Console transport
    if (config.env !== 'test') {
      transports.push(
        new winston.transports.Console({
          format: config.env === 'development' ? consoleFormat : winston.format.combine(...formats),
          level: config.logging.level
        })
      );
    }

    // File transport
    if (config.env === 'production') {
      transports.push(
        new winston.transports.File({
          filename: path.join('logs', 'error.log'),
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5
        }),
        new winston.transports.File({
          filename: path.join('logs', 'combined.log'),
          maxsize: 5242880, // 5MB
          maxFiles: 5
        })
      );
    }

    return winston.createLogger({
      level: config.logging.level,
      format: winston.format.combine(...formats),
      transports,
      exceptionHandlers: [
        new winston.transports.File({ filename: path.join('logs', 'exceptions.log') })
      ],
      rejectionHandlers: [
        new winston.transports.File({ filename: path.join('logs', 'rejections.log') })
      ]
    });
  }

  // Log methods
  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  error(message, error = {}) {
    if (error instanceof Error) {
      this.logger.error(message, {
        error: error.message,
        stack: error.stack,
        ...error
      });
    } else {
      this.logger.error(message, error);
    }
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  // HTTP request logging
  logRequest(req, res, responseTime) {
    const log = {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent')
    };

    if (res.statusCode >= 400) {
      this.error('HTTP Error', log);
    } else {
      this.info('HTTP Request', log);
    }
  }

  // Database query logging
  logQuery(operation, collection, query, executionTime) {
    this.debug('Database Query', {
      operation,
      collection,
      query,
      executionTime: `${executionTime}ms`
    });
  }

  // Payment logging
  logPayment(action, data) {
    this.info(`Payment ${action}`, {
      ...data,
      timestamp: new Date().toISOString()
    });
  }

  // Security event logging
  logSecurity(event, details) {
    this.warn(`Security Event: ${event}`, details);
  }

  // Performance logging
  logPerformance(metric, value, unit = 'ms') {
    this.info('Performance Metric', {
      metric,
      value,
      unit
    });
  }

  // Audit logging
  logAudit(action, user, details) {
    this.info('Audit Log', {
      action,
      userId: user?.id,
      userEmail: user?.email,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Error reporting to external service
  async reportError(error, context = {}) {
    // Send to Sentry or similar service
    if (config.services.sentryDsn) {
      // Sentry integration here
    }

    // Log locally
    this.error('Reported Error', {
      error: error.message,
      stack: error.stack,
      context
    });
  }

  // Create child logger with context
  child(meta) {
    return {
      info: (msg, additionalMeta = {}) => this.info(msg, { ...meta, ...additionalMeta }),
      error: (msg, additionalMeta = {}) => this.error(msg, { ...meta, ...additionalMeta }),
      warn: (msg, additionalMeta = {}) => this.warn(msg, { ...meta, ...additionalMeta }),
      debug: (msg, additionalMeta = {}) => this.debug(msg, { ...meta, ...additionalMeta })
    };
  }
}

module.exports = new Logger();