// Purchase Limits Controller — Business logic for patient purchase limit tracking and enforcement
const logger = require('../modules/logger');
const PurchaseRecord = require('../modules/database/models/PurchaseRecord');
const User = require('../modules/database/models/User');

// Get patient's current limits and usage
exports.getPatientLimits = async (req, res) => {
  try {
    const patient = await User.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const dailyUsage = await PurchaseRecord.getDailyUsage(req.params.id);
    const monthlyUsage = await PurchaseRecord.getMonthlyUsage(req.params.id);

    const limits = patient.purchaseLimits || { dailyLimit: 150, monthlyLimit: 600 };

    res.json({
      success: true,
      patient: {
        id: patient._id,
        name: `${patient.firstName} ${patient.lastName}`,
        email: patient.email,
        section21Status: patient.section21Status
      },
      limits: {
        daily: {
          limit: limits.dailyLimit,
          used: dailyUsage.totalControlledGrams,
          remaining: Math.max(0, limits.dailyLimit - dailyUsage.totalControlledGrams),
          percentage: Math.round((dailyUsage.totalControlledGrams / limits.dailyLimit) * 100)
        },
        monthly: {
          limit: limits.monthlyLimit,
          used: monthlyUsage.totalControlledGrams,
          remaining: Math.max(0, limits.monthlyLimit - monthlyUsage.totalControlledGrams),
          percentage: Math.round((monthlyUsage.totalControlledGrams / limits.monthlyLimit) * 100)
        }
      },
      stats: {
        dailyPurchases: dailyUsage.totalPurchases,
        monthlyPurchases: monthlyUsage.totalPurchases,
        monthlySpent: monthlyUsage.totalAmount
      }
    });
  } catch (error) {
    logger.error('Get patient limits error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching patient limits' });
  }
};

// Pre-check if a purchase is within limits
exports.checkPurchase = async (req, res) => {
  try {
    const { requestedGrams, products } = req.body;

    if (!requestedGrams && !products) {
      return res.status(400).json({ success: false, message: 'Either requestedGrams or products array is required' });
    }

    const patient = await User.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    let totalGrams = requestedGrams || 0;
    if (products && Array.isArray(products)) {
      totalGrams = products
        .filter(p => p.isControlled)
        .reduce((sum, p) => sum + (p.quantityInGrams || 0), 0);
    }

    const limits = patient.purchaseLimits || { dailyLimit: 150, monthlyLimit: 600 };
    const result = await PurchaseRecord.checkPurchaseLimits(req.params.id, totalGrams, limits);

    res.json({ success: true, ...result });
  } catch (error) {
    logger.error('Check purchase limits error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error checking purchase limits' });
  }
};

// Get patient's purchase history
exports.getPurchaseHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;

    const options = { page: parseInt(page), limit: parseInt(limit) };
    if (startDate) options.startDate = new Date(startDate);
    if (endDate) options.endDate = new Date(endDate);

    const [records, total] = await Promise.all([
      PurchaseRecord.getPatientHistory(req.params.id, options),
      PurchaseRecord.countDocuments({ patient: req.params.id, isVoided: { $ne: true } })
    ]);

    res.json({
      success: true, records, total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error('Get purchase history error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching purchase history' });
  }
};

// Update patient's limits (medical exemption override)
exports.updateLimits = async (req, res) => {
  try {
    const { dailyLimit, monthlyLimit, reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Reason for limit change is required' });
    }

    const patient = await User.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (!patient.purchaseLimits) {
      patient.purchaseLimits = {
        dailyLimit: 150, monthlyLimit: 600,
        currentDayUsage: 0, currentMonthUsage: 0
      };
    }

    const previousLimits = {
      daily: patient.purchaseLimits.dailyLimit,
      monthly: patient.purchaseLimits.monthlyLimit
    };

    if (dailyLimit !== undefined) patient.purchaseLimits.dailyLimit = dailyLimit;
    if (monthlyLimit !== undefined) patient.purchaseLimits.monthlyLimit = monthlyLimit;

    await patient.save();

    logger.info('Patient limits updated', {
      patientId: patient._id, previousLimits,
      newLimits: { daily: patient.purchaseLimits.dailyLimit, monthly: patient.purchaseLimits.monthlyLimit },
      reason, updatedBy: req.user.id
    });

    res.json({ success: true, message: 'Patient limits updated successfully', limits: patient.purchaseLimits });
  } catch (error) {
    logger.error('Update patient limits error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error updating patient limits' });
  }
};

// Record a purchase (called after sale is completed)
exports.recordPurchase = async (req, res) => {
  try {
    const { patient, order, sale, branch, products, totalAmount, overrideReason } = req.body;

    if (!patient || !branch || !products) {
      return res.status(400).json({ success: false, message: 'Patient, branch, and products are required' });
    }

    const patientDoc = await User.findById(patient);
    if (!patientDoc) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const limits = patientDoc.purchaseLimits || { dailyLimit: 150, monthlyLimit: 600 };

    const totalControlledGrams = products
      .filter(p => p.isControlled)
      .reduce((sum, p) => sum + (p.quantityInGrams || 0), 0);

    const totalNonControlledGrams = products
      .filter(p => !p.isControlled)
      .reduce((sum, p) => sum + (p.quantityInGrams || 0), 0);

    const dailyUsage = await PurchaseRecord.getDailyUsage(patient);
    const monthlyUsage = await PurchaseRecord.getMonthlyUsage(patient);

    const record = new PurchaseRecord({
      patient, order, sale, branch,
      processedBy: req.user.id,
      products, totalControlledGrams, totalNonControlledGrams,
      totalAmount: totalAmount || 0,
      purchaseDate: new Date(),
      limitCheck: {
        dailyLimitAtTime: limits.dailyLimit,
        monthlyLimitAtTime: limits.monthlyLimit,
        dailyUsageBeforePurchase: dailyUsage.totalControlledGrams,
        monthlyUsageBeforePurchase: monthlyUsage.totalControlledGrams,
        dailyUsageAfterPurchase: dailyUsage.totalControlledGrams + totalControlledGrams,
        monthlyUsageAfterPurchase: monthlyUsage.totalControlledGrams + totalControlledGrams,
        wasApproached: (dailyUsage.totalControlledGrams + totalControlledGrams) > limits.dailyLimit * 0.8 ||
                       (monthlyUsage.totalControlledGrams + totalControlledGrams) > limits.monthlyLimit * 0.8,
        wasOverridden: !!overrideReason,
        overriddenBy: overrideReason ? req.user.id : undefined,
        overrideReason
      }
    });

    await record.save();

    logger.info('Purchase recorded', {
      recordId: record._id, patient, totalControlledGrams, processedBy: req.user.id
    });

    res.status(201).json({ success: true, message: 'Purchase recorded successfully', record });
  } catch (error) {
    logger.error('Record purchase error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error recording purchase' });
  }
};

// Void a purchase record
exports.voidRecord = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Void reason is required' });
    }

    const record = await PurchaseRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    if (record.isVoided) {
      return res.status(400).json({ success: false, message: 'Record is already voided' });
    }

    await record.void(req.user.id, reason);

    logger.info('Purchase record voided', { recordId: record._id, reason, voidedBy: req.user.id });

    res.json({ success: true, message: 'Purchase record voided', record });
  } catch (error) {
    logger.error('Void purchase record error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error voiding purchase record' });
  }
};

// Get summary of all patients approaching limits
exports.getApproachingLimits = async (req, res) => {
  try {
    const { threshold = 80 } = req.query;

    const patients = await User.find({
      section21Status: 'approved',
      isActive: true
    }).select('firstName lastName email purchaseLimits');

    const patientsApproachingLimits = [];

    for (const patient of patients) {
      const limits = patient.purchaseLimits || { dailyLimit: 150, monthlyLimit: 600 };

      const dailyUsage = await PurchaseRecord.getDailyUsage(patient._id);
      const monthlyUsage = await PurchaseRecord.getMonthlyUsage(patient._id);

      const dailyPercentage = (dailyUsage.totalControlledGrams / limits.dailyLimit) * 100;
      const monthlyPercentage = (monthlyUsage.totalControlledGrams / limits.monthlyLimit) * 100;

      if (dailyPercentage >= parseInt(threshold) || monthlyPercentage >= parseInt(threshold)) {
        patientsApproachingLimits.push({
          patient: {
            id: patient._id,
            name: `${patient.firstName} ${patient.lastName}`,
            email: patient.email
          },
          daily: {
            used: dailyUsage.totalControlledGrams,
            limit: limits.dailyLimit,
            percentage: Math.round(dailyPercentage)
          },
          monthly: {
            used: monthlyUsage.totalControlledGrams,
            limit: limits.monthlyLimit,
            percentage: Math.round(monthlyPercentage)
          }
        });
      }
    }

    patientsApproachingLimits.sort((a, b) => {
      const aMax = Math.max(a.daily.percentage, a.monthly.percentage);
      const bMax = Math.max(b.daily.percentage, b.monthly.percentage);
      return bMax - aMax;
    });

    res.json({
      success: true,
      patients: patientsApproachingLimits,
      count: patientsApproachingLimits.length,
      threshold: parseInt(threshold)
    });
  } catch (error) {
    logger.error('Get approaching limits error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching patients approaching limits' });
  }
};
