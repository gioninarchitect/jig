// Authentication & Authorization Middleware
const jwt = require('jsonwebtoken');
const config = require('../config');
const User = require('../modules/database/models/User');
const Section21Document = require('../modules/database/models/Section21Document');

/**
 * Verify JWT token and attach user info to request
 */
const authenticateToken = (req, res, next) => {
  // Check header first, then query param (for downloads opened in new window)
  const token = req.headers['authorization']?.split(' ')[1] || req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
  }
};

/**
 * Check if user has admin role
 */
const requireAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const bypassRoles = ['super_admin', 'owner', 'admin'];
    if (!bypassRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.',
        requiredRole: 'admin',
        userRole: req.user.role
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error checking admin privileges.' });
  }
};

/**
 * Check if user has specific role(s)
 * @param {Array|String} roles - Array of allowed roles or single role string
 */
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      const bypassRoles = ['super_admin', 'owner'];

      if (!bypassRoles.includes(req.user.role) && !allowedRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Insufficient privileges.',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error checking role privileges.' });
    }
  };
};

/**
 * Check if user has specific permission
 * @param {String} permission - Required permission
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Super admins, owners and admins have all permissions
      if (['super_admin', 'owner', 'admin'].includes(user.role)) {
        return next();
      }

      // Check if user has specific permission
      if (!user.permissions || !user.permissions.includes(permission)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required permission: ${permission}`,
          requiredPermission: permission
        });
      }

      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error checking permissions.' });
    }
  };
};

/**
 * Check if user has verified Section 21 document for medical cannabis access
 */
const requireSection21Verification = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    // Check if user has approved Section 21 document
    const hasAccess = await Section21Document.canUserAccessMedicalCannabis(req.user.id);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Section 21 verification required to access medical cannabis products.',
        requiresSection21: true,
        uploadUrl: '/api/v1/section21/upload'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error checking Section 21 verification.' });
  }
};

/**
 * Check if user has access to a specific branch
 * @param {String} paramName - Name of the URL parameter containing the branch ID
 */
const requireBranchAccess = (paramName = 'id') => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, message: 'Authentication required.' });
      }

      const branchId = req.params[paramName];
      if (!branchId) {
        return res.status(400).json({ success: false, message: 'Branch ID is required.' });
      }

      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found.' });
      }

      // Check branch access using the User model method
      if (!user.hasAccessToBranch(branchId)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You do not have access to this branch.',
          branchId
        });
      }

      // Attach the user object to request for later use
      req.branchUser = user;
      next();
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Error checking branch access.' });
    }
  };
};

/**
 * Check if user has one of the inventory management roles
 */
const requireInventoryRole = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    const inventoryRoles = ['super_admin', 'owner', 'admin', 'inventory_manager', 'packer', 'dispatch_manager'];

    if (!inventoryRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Inventory role required.',
        requiredRoles: inventoryRoles,
        userRole: req.user.role
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Error checking inventory role.' });
  }
};

/**
 * Optional authentication - attaches user if token is valid, but doesn't require it
 */
const optionalAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    req.user = decoded;
  } catch (err) {
    // Token invalid, but we continue anyway
  }

  next();
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireRole,
  requirePermission,
  requireSection21Verification,
  requireBranchAccess,
  requireInventoryRole,
  optionalAuth
};
