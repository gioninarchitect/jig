// Lead Management Routes
const express = require('express');
const router = express.Router();
const Lead = require('../modules/database/models/Lead');
const { authenticateToken, requireAdmin, requireRole } = require('../middleware/auth');

// Public endpoint - Submit lead from Coming Soon page
router.post('/', async (req, res) => {
  try {
    const { name, email, mobile, type, location, investment, source, utm } = req.body;

    // Validation
    if (!name || !email || !mobile || !type) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, mobile, and type are required'
      });
    }

    // Validate type
    const validTypes = ['waiting-list', 'franchise-application', 'contact-form'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lead type'
      });
    }

    // Check for duplicate (same email and type within last 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const duplicate = await Lead.findOne({
      email: email.toLowerCase(),
      type,
      createdAt: { $gte: twentyFourHoursAgo }
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted this form recently. Our team will contact you soon.'
      });
    }

    // Create lead
    const lead = new Lead({
      name,
      email: email.toLowerCase(),
      mobile,
      type,
      location: location || null,
      investment: investment || null,
      source: source || 'coming-soon-page',
      utm: utm || {}
    });

    await lead.save();

    res.status(201).json({
      success: true,
      message: 'Thank you! Your submission has been received. We will contact you within 24 hours.',
      leadId: lead._id
    });
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting your information. Please try again.'
    });
  }
});

// Get all leads (Admin and Staff Manager only)
router.get('/', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      type,
      assignedTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};

    // Filters
    if (status && status !== 'all') {
      query.status = status;
    }

    if (type && type !== 'all') {
      query.type = type;
    }

    if (assignedTo && assignedTo !== 'all') {
      query.assignedTo = assignedTo === 'unassigned' ? null : assignedTo;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const leads = await Lead.find(query)
      .populate('assignedTo', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Lead.countDocuments(query);

    // Get status counts
    const statusCounts = await Lead.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      leads,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      },
      stats: {
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        total
      }
    });
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ success: false, message: 'Error fetching leads' });
  }
});

// Get single lead (Admin and Staff Manager only)
router.get('/:id', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email role');

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({ success: true, lead });
  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({ success: false, message: 'Error fetching lead' });
  }
});

// Update lead (Admin and Staff Manager only)
router.put('/:id', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const { status, assignedTo, notes } = req.body;

    const lead = await Lead.findById(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Update fields
    if (status) {
      lead.status = status;

      // Track when lead was first contacted
      if (status === 'contacted' && !lead.contactedAt) {
        lead.contactedAt = new Date();
      }

      // Track conversion
      if (status === 'converted' && !lead.convertedAt) {
        lead.convertedAt = new Date();
      }
    }

    // Validate assignedTo is a staff member (not a customer)
    if (assignedTo !== undefined) {
      if (assignedTo) {
        const User = require('../modules/database/models/User');
        const assignee = await User.findById(assignedTo);

        if (!assignee) {
          return res.status(404).json({
            success: false,
            message: 'Assigned user not found'
          });
        }

        // Only allow assignment to staff members (admin, staff_manager, staff_assistant)
        if (!['admin', 'staff_manager', 'staff_assistant'].includes(assignee.role)) {
          return res.status(403).json({
            success: false,
            message: 'Leads can only be assigned to staff members, not customers'
          });
        }

        lead.assignedTo = assignedTo;
      } else {
        // Allow unassigning (setting to null)
        lead.assignedTo = null;
      }
    }

    if (notes !== undefined) {
      lead.notes = notes;
    }

    await lead.save();

    const updatedLead = await Lead.findById(lead._id)
      .populate('assignedTo', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Lead updated successfully',
      lead: updatedLead
    });
  } catch (error) {
    console.error('Update lead error:', error);
    res.status(500).json({ success: false, message: 'Error updating lead' });
  }
});

// Delete lead (Admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const lead = await Lead.findByIdAndDelete(req.params.id);

    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    res.json({
      success: true,
      message: 'Lead deleted successfully'
    });
  } catch (error) {
    console.error('Delete lead error:', error);
    res.status(500).json({ success: false, message: 'Error deleting lead' });
  }
});

// Get lead statistics (Admin and Staff Manager only)
router.get('/meta/statistics', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Lead.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          newLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'new'] }, 1, 0] }
          },
          contacted: {
            $sum: { $cond: [{ $eq: ['$status', 'contacted'] }, 1, 0] }
          },
          converted: {
            $sum: { $cond: [{ $eq: ['$status', 'converted'] }, 1, 0] }
          },
          waitingList: {
            $sum: { $cond: [{ $eq: ['$type', 'waiting-list'] }, 1, 0] }
          },
          franchiseApps: {
            $sum: { $cond: [{ $eq: ['$type', 'franchise-application'] }, 1, 0] }
          }
        }
      }
    ]);

    const conversionRate = stats[0] && stats[0].total > 0
      ? ((stats[0].converted / stats[0].total) * 100).toFixed(2)
      : 0;

    res.json({
      success: true,
      statistics: stats[0] || {
        total: 0,
        newLeads: 0,
        contacted: 0,
        converted: 0,
        waitingList: 0,
        franchiseApps: 0
      },
      conversionRate: parseFloat(conversionRate)
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({ success: false, message: 'Error fetching statistics' });
  }
});

module.exports = router;
