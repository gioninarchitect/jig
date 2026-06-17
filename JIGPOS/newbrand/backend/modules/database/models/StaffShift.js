// Staff Shift Model for Commissions and Wages
const mongoose = require('mongoose');

const staffShiftSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  branch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: true
  },
  // Shift timing
  shiftDate: {
    type: Date,
    required: true
  },
  clockIn: {
    type: Date,
    required: true
  },
  clockOut: Date,
  scheduledStart: Date,
  scheduledEnd: Date,
  // Break tracking
  breaks: [{
    startTime: Date,
    endTime: Date,
    type: { type: String, enum: ['lunch', 'short', 'other'], default: 'short' }
  }],
  // Hours calculation
  regularHours: {
    type: Number,
    default: 0
  },
  overtimeHours: {
    type: Number,
    default: 0
  },
  // Wage info
  hourlyRate: {
    type: Number,
    required: true
  },
  overtimeRate: {
    type: Number // Usually 1.5x or 2x hourlyRate
  },
  // Sales performance
  salesTotal: {
    type: Number,
    default: 0
  },
  transactionCount: {
    type: Number,
    default: 0
  },
  // Commission
  commissionRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  commissionEarned: {
    type: Number,
    default: 0
  },
  // Tips (if applicable)
  tips: {
    type: Number,
    default: 0
  },
  // Calculated pay
  basePay: {
    type: Number,
    default: 0
  },
  overtimePay: {
    type: Number,
    default: 0
  },
  totalPay: {
    type: Number,
    default: 0
  },
  // Status
  status: {
    type: String,
    enum: ['active', 'completed', 'approved', 'paid'],
    default: 'active'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  notes: String
}, {
  timestamps: true
});

// Indexes
staffShiftSchema.index({ staff: 1, shiftDate: 1 });
staffShiftSchema.index({ branch: 1, shiftDate: 1 });
staffShiftSchema.index({ status: 1 });

// Calculate hours and pay before save
staffShiftSchema.pre('save', function(next) {
  if (this.clockIn && this.clockOut) {
    let totalMinutes = (this.clockOut - this.clockIn) / (1000 * 60);

    // Subtract break time
    if (this.breaks && this.breaks.length > 0) {
      this.breaks.forEach(b => {
        if (b.startTime && b.endTime) {
          totalMinutes -= (b.endTime - b.startTime) / (1000 * 60);
        }
      });
    }

    const totalHours = totalMinutes / 60;
    const regularLimit = 8; // Standard 8-hour day

    this.regularHours = Math.min(totalHours, regularLimit);
    this.overtimeHours = Math.max(0, totalHours - regularLimit);

    // Calculate pay
    this.basePay = this.regularHours * this.hourlyRate;
    this.overtimePay = this.overtimeHours * (this.overtimeRate || this.hourlyRate * 1.5);
    this.totalPay = this.basePay + this.overtimePay + this.commissionEarned + this.tips;
  }
  next();
});

module.exports = mongoose.model('StaffShift', staffShiftSchema);
