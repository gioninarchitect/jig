// Budgets Controller — All business logic for budget routes
const Budget = require('../modules/database/models/Budget');
const Sale = require('../modules/database/models/Sale');

// GET /:year/:month — Get budget for specific month/year
const getByMonth = async (req, res) => {
  try {
    const { year, month } = req.params;
    const { branch } = req.query;

    const query = { year: parseInt(year), month: parseInt(month) };
    if (branch) query.branch = branch;

    const budgets = await Budget.find(query)
      .populate('branch', 'name')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');

    res.json({ success: true, data: budgets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /comparison/:year/:month — Budget vs actuals comparison
const getComparison = async (req, res) => {
  try {
    const { year, month } = req.params;
    const { branch } = req.query;

    const query = { year: parseInt(year), month: parseInt(month) };
    if (branch) query.branch = branch;

    const budgets = await Budget.find(query).populate('branch', 'name');

    // Get actual sales for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const salesQuery = { createdAt: { $gte: startDate, $lte: endDate }, status: 'completed' };
    if (branch) salesQuery.branch = branch;

    const sales = await Sale.aggregate([
      { $match: salesQuery },
      { $group: {
        _id: '$branch',
        totalSales: { $sum: '$total' },
        count: { $sum: 1 }
      }}
    ]);

    // Merge budget with actuals
    const comparison = budgets.map(b => {
      const actual = sales.find(s => s._id?.toString() === b.branch?._id?.toString());
      return {
        branch: b.branch,
        budgeted: b.salesTarget,
        actual: actual?.totalSales || 0,
        variance: (actual?.totalSales || 0) - b.salesTarget,
        variancePercent: b.salesTarget > 0
          ? (((actual?.totalSales || 0) - b.salesTarget) / b.salesTarget * 100).toFixed(1)
          : 0,
        transactionCount: actual?.count || 0
      };
    });

    res.json({ success: true, data: comparison });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST / — Create budget
const create = async (req, res) => {
  try {
    const budget = new Budget({
      ...req.body,
      createdBy: req.user.id
    });
    await budget.save();
    res.status(201).json({ success: true, data: budget });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'Budget already exists for this branch/month/year' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

// PUT /:id — Update budget
const update = async (req, res) => {
  try {
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// POST /:id/approve — Approve budget (owner only)
const approve = async (req, res) => {
  try {
    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user.id, approvedAt: new Date() },
      { new: true }
    );
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /:id/expense — Update actual expense with $inc
const addExpense = async (req, res) => {
  try {
    const { category, amount } = req.body;
    const updatePath = `expenses.${category}.actual`;

    const budget = await Budget.findByIdAndUpdate(
      req.params.id,
      { $inc: { [updatePath]: amount } },
      { new: true }
    );
    if (!budget) {
      return res.status(404).json({ success: false, message: 'Budget not found' });
    }
    res.json({ success: true, data: budget });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

module.exports = {
  getByMonth,
  getComparison,
  create,
  update,
  approve,
  addExpense
};
