/**
 * API Response Utilities
 * Provides standardized response formats for consistency across all endpoints
 */

/**
 * Success response format
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {String} message - Optional success message
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
const success = (res, data = null, message = 'Success', statusCode = 200) => {
  const response = {
    success: true,
    message,
    ...(data && { data })
  };

  return res.status(statusCode).json(response);
};

/**
 * Created response format (for POST requests)
 * @param {Object} res - Express response object
 * @param {*} data - Created resource data
 * @param {String} message - Optional success message
 */
const created = (res, data = null, message = 'Resource created successfully') => {
  return success(res, data, message, 201);
};

/**
 * Error response format
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {*} errors - Optional detailed error information
 */
const error = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    ...(errors && { errors })
  };

  return res.status(statusCode).json(response);
};

/**
 * Bad Request response (400)
 */
const badRequest = (res, message = 'Bad request', errors = null) => {
  return error(res, message, 400, errors);
};

/**
 * Unauthorized response (401)
 */
const unauthorized = (res, message = 'Unauthorized access') => {
  return error(res, message, 401);
};

/**
 * Forbidden response (403)
 */
const forbidden = (res, message = 'Forbidden') => {
  return error(res, message, 403);
};

/**
 * Not Found response (404)
 */
const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

/**
 * Conflict response (409)
 */
const conflict = (res, message = 'Resource already exists') => {
  return error(res, message, 409);
};

/**
 * Validation Error response (422)
 */
const validationError = (res, errors, message = 'Validation failed') => {
  return error(res, message, 422, errors);
};

/**
 * Internal Server Error response (500)
 */
const serverError = (res, message = 'Internal server error') => {
  return error(res, message, 500);
};

/**
 * Paginated response format
 * @param {Object} res - Express response object
 * @param {Array} data - Array of data items
 * @param {Object} pagination - Pagination metadata
 */
const paginated = (res, data, pagination) => {
  const response = {
    success: true,
    data,
    pagination: {
      total: pagination.total || 0,
      page: pagination.page || 1,
      limit: pagination.limit || 10,
      totalPages: Math.ceil((pagination.total || 0) / (pagination.limit || 10)),
      hasMore: pagination.hasMore || false
    }
  };

  return res.status(200).json(response);
};

module.exports = {
  success,
  created,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  validationError,
  serverError,
  paginated
};
