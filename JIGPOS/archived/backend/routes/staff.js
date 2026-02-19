const logger = require("../modules/logger");
// Staff Management Routes
const express = require('express');
const router = express.Router();
const User = require('../modules/database/models/User');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Staff role permissions mapping
const STAFF_PERMISSIONS = {
  staff_manager: [
    'view_staff',               // Can see staff list (no edit)
    'view_inventory',          // View inventory
    'manage_inventory',        // Edit stock levels
    'view_orders',             // View all orders
    'update_order_status',     // Update order statuses
    'view_analytics_limited',  // View analytics (no revenue)
    'manage_pos_sync',         // Sync café menus
    'receive_shipments'        // Process incoming stock
  ],
  staff_assistant: [
    'view_menu',               // View product catalog
    'create_orders',           // Create customer orders
    'view_orders',             // View orders
    'update_order_status'      // Update order statuses
  ]
};

// Get all staff members (Admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, role, department, search } = req.query;

    const query = {
      role: { $in: ['staff_manager', 'staff_assistant'] }
    };

    if (role && role.startsWith('staff_')) {
      query.role = role;
    }

    if (department) {
      query['staffInfo.department'] = department;
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'staffInfo.employeeId': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const staff = await User.find(query)
      .select('-password -passwordResetToken -passwordResetExpiry -twoFactorSecret')
      .populate('staffInfo.supervisor', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      staff,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Get staff error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching staff members' });
  }
});

// Get single staff member (Admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const staff = await User.findById(req.params.id)
      .select('-password -passwordResetToken -passwordResetExpiry -twoFactorSecret')
      .populate('staffInfo.supervisor', 'firstName lastName email role');

    if (!staff || !staff.role.startsWith('staff_')) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.json({ success: true, staff });
  } catch (error) {
    logger.error('Get staff member error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching staff member' });
  }
});

// Create new staff member (Admin only)
router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      email,
      password,
      firstName,
      lastName,
      role,
      phone,
      employeeId,
      department,
      supervisor,
      workSchedule
    } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({
        success: false,
        message: 'Email, password, first name, last name, and role are required'
      });
    }

    if (!role.startsWith('staff_')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff role. Must be staff_manager or staff_assistant'
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    // Generate username from email
    const username = email.split('@')[0] + '_staff';

    // Create staff user
    const staff = new User({
      email,
      username,
      password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      role,
      permissions: STAFF_PERMISSIONS[role] || [],
      isActive: true,
      isEmailVerified: true, // Staff accounts are pre-verified
      profile: {
        phone: phone || ''
      },
      staffInfo: {
        employeeId: employeeId || `EMP${Date.now()}`,
        hireDate: new Date(),
        department: department || 'General',
        supervisor: supervisor || null,
        workSchedule: workSchedule || 'full-time'
      }
    });

    await staff.save();

    // Return staff data without password
    const staffData = staff.toObject();
    delete staffData.password;

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      staff: staffData
    });
  } catch (error) {
    logger.error('Create staff error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: error.message || 'Error creating staff member' });
  }
});

// Update staff member (Admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      role,
      phone,
      employeeId,
      department,
      supervisor,
      workSchedule,
      isActive,
      permissions
    } = req.body;

    const staff = await User.findById(req.params.id);

    if (!staff || !staff.role.startsWith('staff_')) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    // Update basic info
    if (firstName) staff.firstName = firstName;
    if (lastName) staff.lastName = lastName;
    if (phone !== undefined) staff.profile.phone = phone;
    if (isActive !== undefined) staff.isActive = isActive;

    // Update role and permissions
    if (role && role.startsWith('staff_')) {
      staff.role = role;
      staff.permissions = permissions || STAFF_PERMISSIONS[role] || [];
    }

    // Update staff info
    if (employeeId) staff.staffInfo.employeeId = employeeId;
    if (department) staff.staffInfo.department = department;
    if (supervisor !== undefined) staff.staffInfo.supervisor = supervisor;
    if (workSchedule) staff.staffInfo.workSchedule = workSchedule;

    await staff.save();

    const staffData = staff.toObject();
    delete staffData.password;

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      staff: staffData
    });
  } catch (error) {
    logger.error('Update staff error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error updating staff member' });
  }
});

// Delete/Deactivate staff member (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { permanent = false } = req.query;

    const staff = await User.findById(req.params.id);

    if (!staff || !staff.role.startsWith('staff_')) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    if (permanent === 'true') {
      // Permanent deletion
      await User.findByIdAndDelete(req.params.id);
      res.json({
        success: true,
        message: 'Staff member permanently deleted'
      });
    } else {
      // Soft delete (deactivate)
      staff.isActive = false;
      await staff.save();
      res.json({
        success: true,
        message: 'Staff member deactivated'
      });
    }
  } catch (error) {
    logger.error('Delete staff error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error deleting staff member' });
  }
});

// Reset staff password (Admin only)
router.post('/:id/reset-password', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password is required and must be at least 8 characters'
      });
    }

    const staff = await User.findById(req.params.id);

    if (!staff || !staff.role.startsWith('staff_')) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    staff.password = newPassword; // Will be hashed by pre-save hook
    staff.passwordResetToken = undefined;
    staff.passwordResetExpiry = undefined;
    await staff.save();

    res.json({
      success: true,
      message: 'Staff password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error resetting password' });
  }
});

// Get staff roles and their permissions
router.get('/meta/roles', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const roles = [
      {
        value: 'staff_manager',
        label: 'Store Manager',
        description: 'Manages daily operations: inventory, orders, POS sync (limited admin dashboard)',
        dashboard: 'admin',
        dashboardAccess: 'Admin dashboard - no financials, no staff management, no Section 21 verification',
        permissions: STAFF_PERMISSIONS.staff_manager
      },
      {
        value: 'staff_assistant',
        label: 'Shop Assistant',
        description: 'Handles customer orders and basic store tasks',
        dashboard: 'admin',
        dashboardAccess: 'Admin dashboard - orders tab only',
        permissions: STAFF_PERMISSIONS.staff_assistant
      }
    ];

    res.json({ success: true, roles });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching staff roles' });
  }
});

module.exports = router;
