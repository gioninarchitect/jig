// Staff Shifts Controller — Business logic for staff shift management
const StaffShift = require('../modules/database/models/StaffShift');
const Sale = require('../modules/database/models/Sale');
const User = require('../modules/database/models/User');

// Clock in
async function clockIn(req, res) {
  try {
    const { branch } = req.body;

    // Check for existing active shift
    const existingShift = await StaffShift.findOne({
      staff: req.user.id,
      status: 'active'
    });

    if (existingShift) {
      return res.status(400).json({ success: false, message: 'Already clocked in' });
    }

    // Get staff hourly rate and commission rate from user profile
    const user = await User.findById(req.user.id);

    const shift = new StaffShift({
      staff: req.user.id,
      branch,
      shiftDate: new Date(),
      clockIn: new Date(),
      hourlyRate: user.hourlyRate || 50, // Default R50/hr
      commissionRate: user.commissionRate || 0
    });

    await shift.save();
    res.status(201).json({ success: true, data: shift });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
}

// Clock out
async function clockOut(req, res) {
  try {
    const shift = await StaffShift.findOne({
      staff: req.user.id,
      status: 'active'
    });

    if (!shift) {
      return res.status(404).json({ success: false, message: 'No active shift found' });
    }

    shift.clockOut = new Date();
    shift.status = 'completed';

    // Calculate sales during shift
    const sales = await Sale.aggregate([
      {
        $match: {
          staff: shift.staff,
          createdAt: { $gte: shift.clockIn, $lte: shift.clockOut },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$total' },
          count: { $sum: 1 }
        }
      }
    ]);

    if (sales.length > 0) {
      shift.salesTotal = sales[0].total;
      shift.transactionCount = sales[0].count;
      shift.commissionEarned = (sales[0].total * shift.commissionRate / 100);
    }

    await shift.save();
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Start break
async function startBreak(req, res) {
  try {
    const { type = 'short' } = req.body;

    const shift = await StaffShift.findOne({
      staff: req.user.id,
      status: 'active'
    });

    if (!shift) {
      return res.status(404).json({ success: false, message: 'No active shift found' });
    }

    shift.breaks.push({ startTime: new Date(), type });
    await shift.save();

    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// End break
async function endBreak(req, res) {
  try {
    const shift = await StaffShift.findOne({
      staff: req.user.id,
      status: 'active'
    });

    if (!shift) {
      return res.status(404).json({ success: false, message: 'No active shift found' });
    }

    const currentBreak = shift.breaks.find(b => !b.endTime);
    if (currentBreak) {
      currentBreak.endTime = new Date();
      await shift.save();
    }

    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get my shifts
async function getMyShifts(req, res) {
  try {
    const { startDate, endDate, status } = req.query;

    const query = { staff: req.user.id };
    if (status) query.status = status;
    if (startDate || endDate) {
      query.shiftDate = {};
      if (startDate) query.shiftDate.$gte = new Date(startDate);
      if (endDate) query.shiftDate.$lte = new Date(endDate);
    }

    const shifts = await StaffShift.find(query)
      .populate('branch', 'name')
      .sort('-shiftDate');

    // Calculate totals
    const totals = shifts.reduce((acc, s) => ({
      totalHours: acc.totalHours + s.regularHours + s.overtimeHours,
      totalPay: acc.totalPay + s.totalPay,
      totalCommission: acc.totalCommission + s.commissionEarned,
      totalSales: acc.totalSales + s.salesTotal
    }), { totalHours: 0, totalPay: 0, totalCommission: 0, totalSales: 0 });

    res.json({ success: true, data: { shifts, totals } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Get all shifts (admin)
async function getAll(req, res) {
  try {
    const { branch, staff, startDate, endDate, status } = req.query;

    const query = {};
    if (branch) query.branch = branch;
    if (staff) query.staff = staff;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.shiftDate = {};
      if (startDate) query.shiftDate.$gte = new Date(startDate);
      if (endDate) query.shiftDate.$lte = new Date(endDate);
    }

    const shifts = await StaffShift.find(query)
      .populate('staff', 'name email')
      .populate('branch', 'name')
      .populate('approvedBy', 'name')
      .sort('-shiftDate');

    res.json({ success: true, data: shifts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Approve shift
async function approve(req, res) {
  try {
    const shift = await StaffShift.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() },
      { new: true }
    );
    if (!shift) {
      return res.status(404).json({ success: false, message: 'Shift not found' });
    }
    res.json({ success: true, data: shift });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

// Payroll summary
async function getPayroll(req, res) {
  try {
    const { startDate, endDate, branch } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Start and end dates required' });
    }

    const match = {
      shiftDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $in: ['completed', 'approved'] }
    };
    if (branch) match.branch = branch;

    const payroll = await StaffShift.aggregate([
      { $match: match },
      { $group: {
        _id: '$staff',
        totalShifts: { $sum: 1 },
        regularHours: { $sum: '$regularHours' },
        overtimeHours: { $sum: '$overtimeHours' },
        basePay: { $sum: '$basePay' },
        overtimePay: { $sum: '$overtimePay' },
        commission: { $sum: '$commissionEarned' },
        tips: { $sum: '$tips' },
        totalPay: { $sum: '$totalPay' },
        totalSales: { $sum: '$salesTotal' }
      }},
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'staffInfo'
      }},
      { $unwind: '$staffInfo' },
      { $project: {
        staff: { _id: '$staffInfo._id', name: '$staffInfo.name', email: '$staffInfo.email' },
        totalShifts: 1,
        regularHours: 1,
        overtimeHours: 1,
        basePay: 1,
        overtimePay: 1,
        commission: 1,
        tips: 1,
        totalPay: 1,
        totalSales: 1
      }}
    ]);

    res.json({ success: true, data: payroll });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  clockIn,
  clockOut,
  startBreak,
  endBreak,
  getMyShifts,
  getAll,
  approve,
  getPayroll
};
