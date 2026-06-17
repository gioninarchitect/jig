// Payments Controller — Admin payment listing
const logger = require('../modules/logger');
const Payment = require('../modules/database/models/Payment');

// GET /payments — List all payments (admin)
exports.getAll = async (req, res) => {
  try {
    const { limit = 50, status, method } = req.query;

    const query = {};
    if (status) query.status = status;
    if (method) query.method = method;

    const payments = await Payment.find(query)
      .populate('orderId', 'orderNumber')
      .populate('userId', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, payments, total: payments.length });
  } catch (error) {
    logger.error('Payments fetch error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching payments' });
  }
};
