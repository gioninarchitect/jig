/**
 * Input Validation Middleware using express-validator
 * Validates and sanitizes user input to prevent XSS, injection attacks, and data integrity issues
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to check validation results
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Authentication Validations
 */
const validateRegister = [
  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must not exceed 255 characters'),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/).withMessage('Must be a valid phone number'),

  validate
];

const validateLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 1 }).withMessage('Password cannot be empty'),

  validate
];

const validateForgotPassword = [
  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  validate
];

const validateResetPassword = [
  body('token')
    .notEmpty().withMessage('Reset token is required')
    .isLength({ min: 20, max: 200 }).withMessage('Invalid reset token format'),

  body('newPassword')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  validate
];

/**
 * Product Validations
 */
const validateProduct = [
  body('name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 3, max: 200 }).withMessage('Product name must be between 3 and 200 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('Description must not exceed 2000 characters'),

  body('price')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number')
    .toFloat(),

  body('category')
    .trim()
    .notEmpty().withMessage('Category is required')
    .isIn(['accessories', 'cbd-oils', 'edibles', 'beverages', 'topicals', 'vaporizers', 'section21'])
    .withMessage('Invalid category'),

  body('inventory.quantity')
    .optional()
    .isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer')
    .toInt(),

  body('inventory.lowStockThreshold')
    .optional()
    .isInt({ min: 0 }).withMessage('Low stock threshold must be a non-negative integer')
    .toInt(),

  validate
];

/**
 * Order Validations
 */
const validateOrder = [
  body('items')
    .isArray({ min: 1 }).withMessage('Order must contain at least one item'),

  body('items.*.productId')
    .notEmpty().withMessage('Product ID is required for each item')
    .isMongoId().withMessage('Invalid product ID format'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 1000 }).withMessage('Quantity must be between 1 and 1000')
    .toInt(),

  body('items.*.price')
    .isFloat({ min: 0 }).withMessage('Price must be a positive number')
    .toFloat(),

  body('shippingAddress')
    .optional()
    .isObject().withMessage('Shipping address must be an object'),

  body('shippingAddress.street')
    .optional()
    .trim()
    .isLength({ min: 3, max: 200 }).withMessage('Street address must be between 3 and 200 characters'),

  body('shippingAddress.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('City must be between 2 and 100 characters'),

  body('shippingAddress.postalCode')
    .optional()
    .trim()
    .matches(/^[0-9]{4}$/).withMessage('Postal code must be 4 digits'),

  validate
];

/**
 * User Update Validations
 */
const validateUserUpdate = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters'),

  body('phone')
    .optional()
    .trim()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]*$/).withMessage('Must be a valid phone number'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  validate
];

/**
 * Query Parameter Validations
 */
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 10000 }).withMessage('Page must be between 1 and 10000')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
    .toInt(),

  validate
];

const validateMongoId = [
  param('id')
    .isMongoId().withMessage('Invalid ID format'),

  validate
];

/**
 * Voucher Validations
 */
const validateVoucher = [
  body('code')
    .trim()
    .toUpperCase()
    .isLength({ min: 3, max: 20 }).withMessage('Voucher code must be between 3 and 20 characters')
    .matches(/^[A-Z0-9]+$/).withMessage('Voucher code can only contain uppercase letters and numbers'),

  body('name')
    .trim()
    .isLength({ min: 3, max: 100 }).withMessage('Voucher name must be between 3 and 100 characters'),

  body('type')
    .isIn(['percentage', 'fixed', 'bogo', 'free_shipping']).withMessage('Invalid voucher type'),

  body('value')
    .isFloat({ min: 0 }).withMessage('Voucher value must be a positive number')
    .toFloat(),

  body('minPurchase')
    .optional()
    .isFloat({ min: 0 }).withMessage('Minimum purchase must be a positive number')
    .toFloat(),

  body('expiryDate')
    .isISO8601().withMessage('Expiry date must be a valid ISO 8601 date')
    .toDate(),

  validate
];

/**
 * Affiliate Validations
 */
const validateAffiliate = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain letters, numbers, underscores, and hyphens'),

  body('email')
    .trim()
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),

  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Company name must be between 2 and 100 characters'),

  validate
];

module.exports = {
  validate,
  validateRegister,
  validateLogin,
  validateForgotPassword,
  validateResetPassword,
  validateProduct,
  validateOrder,
  validateUserUpdate,
  validatePagination,
  validateMongoId,
  validateVoucher,
  validateAffiliate
};
