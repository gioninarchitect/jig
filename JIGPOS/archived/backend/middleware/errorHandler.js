/**
 * Global Error Handler Middleware
 * Centralizes error handling and prevents information leakage in production
 */

const config = require('../config');
const logger = require('../modules/logger');

/**
 * Custom error classes
 */
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Handle known operational errors
 */
const handleOperationalError = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err.message,
    ...(config.env === 'development' && { stack: err.stack })
  });
};

/**
 * Handle MongoDB errors
 */
const handleMongoError = (err, res) => {
  // Duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    return res.status(409).json({
      success: false,
      error: `${field ? field.charAt(0).toUpperCase() + field.slice(1) : 'Field'} already exists`
    });
  }

  // Validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors
    });
  }

  // Cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: `Invalid ${err.path}: ${err.value}`
    });
  }

  // Generic MongoDB error
  return res.status(500).json({
    success: false,
    error: config.env === 'production' ? 'Database error' : err.message
  });
};

/**
 * Handle JWT errors
 */
const handleJWTError = (err, res) => {
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication token has expired'
    });
  }

  return null;
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  // Set default error properties
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Internal Server Error';

  // Log error
  if (config.env !== 'test') {
    logger.error(`${req.method} ${req.path} - ${err.message}`, {
      statusCode: err.statusCode,
      stack: config.env === 'development' ? err.stack : undefined,
      user: req.user?.id
    });
  }

  // Handle specific error types
  if (err.isOperational) {
    return handleOperationalError(err, res);
  }

  // Handle JWT errors
  const jwtResponse = handleJWTError(err, res);
  if (jwtResponse !== null) return jwtResponse;

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'ValidationError' || err.name === 'CastError' || err.code === 11000) {
    return handleMongoError(err, res);
  }

  // Handle unknown errors
  res.status(err.statusCode).json({
    success: false,
    error: config.env === 'production'
      ? 'An unexpected error occurred'
      : err.message,
    ...(config.env === 'development' && {
      stack: err.stack,
      details: err
    })
  });
};

/**
 * 404 Not Found handler
 */
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors automatically
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  globalErrorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
};
