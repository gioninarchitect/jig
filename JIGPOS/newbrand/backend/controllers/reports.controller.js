// Reports Controller - Business logic for bi-weekly reporting
const Order = require('../modules/database/models/Order');
const Sale = require('../modules/database/models/Sale');
const Product = require('../modules/database/models/Product');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Branch = require('../modules/database/models/Branch');
const User = require('../modules/database/models/User');
const TillSession = require('../modules/database/models/TillSession');
const logger = require('../modules/logger');

// Helper function to convert data to CSV
function toCSV(headers, rows) {
  const headerLine = headers.join(',');
  const dataLines = rows.map(row =>
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma or quote
      const str = String(cell ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  );
  return [headerLine, ...dataLines].join('\n');
}

/**
 * GET /api/v1/reports/sales
 * Sales summary by branch and date range
 * Query params: startDate, endDate (ISO format), branchCode (optional)
 */
async function getSales(req, res) {
  try {
    const { startDate, endDate, branchCode } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Build match stage for aggregation
    const matchStage = {
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' }
    };

    // Filter by branch if provided
    if (branchCode) {
      matchStage.branchCode = branchCode.toUpperCase();
    }

    // Aggregate sales data by branch
    const salesReport = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$branchCode',
          totalSales: { $sum: '$total' },
          totalOrders: { $sum: 1 },
          averageOrderValue: { $avg: '$total' },
          totalSubtotal: { $sum: '$subtotal' },
          totalDiscount: { $sum: '$discount.amount' },
          totalTax: { $sum: '$tax.amount' },
          completedOrders: {
            $sum: {
              $cond: [{ $eq: ['$payment.status', 'paid'] }, 1, 0]
            }
          },
          pendingOrders: {
            $sum: {
              $cond: [{ $eq: ['$payment.status', 'pending'] }, 1, 0]
            }
          }
        }
      },
      { $sort: { totalSales: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        branchCode: branchCode || 'all',
        salesReport,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating sales report'
    });
  }
}

/**
 * GET /api/v1/reports/inventory
 * Inventory/stock levels by branch
 * Query params: branchCode (optional), category (optional), lowStockOnly (optional)
 */
async function getInventory(req, res) {
  try {
    const { branchCode, category, lowStockOnly } = req.query;

    const matchStage = { status: 'active' };

    // Filter by category if provided
    if (category) {
      matchStage.category = category;
    }

    // Get products with inventory details
    const inventoryReport = await Product.aggregate([
      { $match: matchStage },
      {
        $project: {
          name: 1,
          sku: 1,
          category: 1,
          price: 1,
          inventory: 1,
          status: 1
        }
      },
      { $sort: { category: 1, name: 1 } }
    ]);

    // Filter for low stock if requested
    let filteredReport = inventoryReport;
    if (lowStockOnly === 'true') {
      filteredReport = inventoryReport.filter(
        product => product.inventory.quantity <= product.inventory.lowStockThreshold
      );
    }

    // Calculate totals
    const totals = filteredReport.reduce(
      (acc, product) => ({
        totalItems: acc.totalItems + product.inventory.quantity,
        lowStockItems: acc.lowStockItems + (
          product.inventory.quantity <= product.inventory.lowStockThreshold ? 1 : 0
        ),
        outOfStockItems: acc.outOfStockItems + (product.inventory.quantity === 0 ? 1 : 0),
        totalValue: acc.totalValue + (product.inventory.quantity * product.price)
      }),
      { totalItems: 0, lowStockItems: 0, outOfStockItems: 0, totalValue: 0 }
    );

    res.json({
      success: true,
      data: {
        filters: { branchCode: branchCode || 'all', category: category || 'all' },
        inventory: filteredReport,
        summary: totals,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating inventory report'
    });
  }
}

/**
 * GET /api/v1/reports/orders
 * Order summary by branch, status, and payment method
 * Query params: startDate, endDate (ISO format), branchCode (optional), status (optional)
 */
async function getOrders(req, res) {
  try {
    const { startDate, endDate, branchCode, status } = req.query;

    // Validate dates
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate and endDate are required'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }

    // Build match stage
    const matchStage = {
      createdAt: { $gte: start, $lte: end }
    };

    if (branchCode) {
      matchStage.branchCode = branchCode.toUpperCase();
    }

    if (status) {
      matchStage.status = status;
    }

    // Aggregate order data
    const orderReport = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            branchCode: '$branchCode',
            status: '$status'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          averageAmount: { $avg: '$total' }
        }
      },
      { $sort: { '_id.branchCode': 1, '_id.status': 1 } }
    ]);

    // Get payment method breakdown
    const paymentMethodReport = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$payments' },
      {
        $group: {
          _id: {
            branchCode: '$branchCode',
            method: '$payments.method',
            status: '$payments.status'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$payments.amount' }
        }
      },
      { $sort: { '_id.branchCode': 1 } }
    ]);

    // Overall summary
    const overallSummary = await Order.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageOrderValue: { $avg: '$total' },
          totalTax: { $sum: '$tax.amount' },
          totalDiscount: { $sum: '$discount.amount' },
          paidOrders: {
            $sum: {
              $cond: [{ $eq: ['$paymentSummary.isFullyPaid', true] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        filters: { branchCode: branchCode || 'all', status: status || 'all' },
        ordersByStatus: orderReport,
        paymentMethods: paymentMethodReport,
        summary: overallSummary[0] || {},
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Orders report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating orders report'
    });
  }
}

/**
 * GET /api/v1/reports/branches
 * Summary stats for all active branches
 */
async function getBranches(req, res) {
  try {
    const branches = await Branch.find({ isActive: true })
      .select('branchCode name city type stats')
      .sort({ name: 1 });

    // Enrich with recent data
    const enrichedBranches = await Promise.all(
      branches.map(async (branch) => {
        const recentOrders = await Order.findOne(
          { branchCode: branch.branchCode },
          'total createdAt',
          { sort: { createdAt: -1 } }
        );

        return {
          ...branch.toObject(),
          lastOrderAt: recentOrders?.createdAt,
          lastOrderAmount: recentOrders?.total
        };
      })
    );

    res.json({
      success: true,
      data: {
        branches: enrichedBranches,
        totalBranches: enrichedBranches.length,
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Branches report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating branches report'
    });
  }
}

/**
 * GET /api/v1/reports/staff
 * Staff performance report
 * Query params: startDate, endDate, branchId (optional)
 */
async function getStaff(req, res) {
  try {
    const { startDate, endDate, branchId } = req.query;

    // Default to last 30 days if no dates provided
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);

    // Get staff users
    const staffQuery = {
      role: { $in: ['branch_assistant', 'branch_manager', 'admin'] },
      status: 'active'
    };
    if (branchId) {
      staffQuery.branchId = branchId;
    }

    const staff = await User.find(staffQuery)
      .select('name email role branchId createdAt lastLogin')
      .lean();

    // Get till sessions for each staff member
    const staffWithStats = await Promise.all(
      staff.map(async (user) => {
        const tillSessions = await TillSession.find({
          operator: user._id,
          openedAt: { $gte: start, $lte: end }
        }).lean();

        const totalSessions = tillSessions.length;
        const totalSales = tillSessions.reduce((sum, s) => sum + (s.salesTotal || 0), 0);
        const totalTransactions = tillSessions.reduce((sum, s) => sum + (s.transactionCount || 0), 0);
        const avgSessionDuration = tillSessions.length > 0
          ? tillSessions.reduce((sum, s) => {
              if (s.closedAt && s.openedAt) {
                return sum + (new Date(s.closedAt) - new Date(s.openedAt));
              }
              return sum;
            }, 0) / tillSessions.length / (1000 * 60 * 60) // Convert to hours
          : 0;

        return {
          ...user,
          stats: {
            totalSessions,
            totalSales,
            totalTransactions,
            avgSessionDuration: avgSessionDuration.toFixed(2),
            avgTransactionsPerSession: totalSessions > 0 ? (totalTransactions / totalSessions).toFixed(1) : 0,
            avgSalesPerSession: totalSessions > 0 ? (totalSales / totalSessions).toFixed(2) : 0
          }
        };
      })
    );

    // Sort by total sales
    staffWithStats.sort((a, b) => b.stats.totalSales - a.stats.totalSales);

    res.json({
      success: true,
      data: {
        period: { startDate: start, endDate: end },
        staff: staffWithStats,
        summary: {
          totalStaff: staffWithStats.length,
          totalSales: staffWithStats.reduce((sum, s) => sum + s.stats.totalSales, 0),
          totalTransactions: staffWithStats.reduce((sum, s) => sum + s.stats.totalTransactions, 0),
          totalSessions: staffWithStats.reduce((sum, s) => sum + s.stats.totalSessions, 0)
        },
        timestamp: new Date()
      }
    });
  } catch (error) {
    logger.error('Staff report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating staff report'
    });
  }
}

// ============================================
// CSV EXPORT ENDPOINTS
// ============================================

/**
 * GET /api/v1/reports/sales/csv
 * Export sales report as CSV - includes POS sales with branch info
 */
async function getSalesCSV(req, res) {
  try {
    const { startDate, endDate, branchId } = req.query;

    // Default to last 30 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);

    const matchStage = {
      createdAt: { $gte: start, $lte: end },
      paymentStatus: { $ne: 'cancelled' }
    };

    if (branchId) {
      matchStage.branchId = branchId;
    }

    // Get POS sales with branch info
    const sales = await Sale.find(matchStage)
      .populate('branchId', 'name branchCode')
      .populate('cashierId', 'name')
      .populate('customerId', 'name email phone')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Date', 'Time', 'Sale Number', 'Branch', 'Cashier', 'Customer',
      'Order Type', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total',
      'Payment Method', 'Payment Status'
    ];

    const rows = sales.map(sale => {
      const branchName = sale.branchId?.name || 'Unknown Branch';
      const cashierName = sale.cashierId?.name || 'Unknown';
      const customerName = sale.customerId?.name || sale.customerName || 'Walk-in';

      return [
        new Date(sale.createdAt).toLocaleDateString('en-ZA'),
        new Date(sale.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
        sale.saleNumber || sale.invoiceNumber || sale._id.toString().slice(-8).toUpperCase(),
        branchName,
        cashierName,
        customerName,
        sale.orderType || 'walk-in',
        sale.items?.length || 0,
        (sale.subtotal || 0).toFixed(2),
        (sale.discountTotal || 0).toFixed(2),
        (sale.taxTotal || 0).toFixed(2),
        (sale.grandTotal || sale.total || 0).toFixed(2),
        sale.payments?.map(p => p.method).join('+') || '',
        sale.paymentStatus || 'pending'
      ];
    });

    const csv = toCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="sales-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Sales CSV export error:', error);
    res.status(500).json({ success: false, message: 'Error exporting sales report' });
  }
}

/**
 * GET /api/v1/reports/inventory/csv
 * Export inventory report as CSV
 */
async function getInventoryCSV(req, res) {
  try {
    const { branchCode, category, lowStockOnly } = req.query;

    const matchStage = { status: 'active' };
    if (category) {
      matchStage.category = category;
    }

    let products = await Product.find(matchStage)
      .select('name sku barcode category price costPrice inventory status')
      .sort({ category: 1, name: 1 })
      .lean();

    if (lowStockOnly === 'true') {
      products = products.filter(
        p => (p.inventory?.quantity || 0) <= (p.inventory?.lowStockThreshold || 10)
      );
    }

    const headers = [
      'SKU', 'Barcode', 'Product Name', 'Category', 'Quantity', 'Low Stock Threshold',
      'Unit', 'Cost Price', 'Sell Price', 'Stock Value', 'Status'
    ];

    const rows = products.map(p => [
      p.sku || '',
      p.barcode || '',
      p.name,
      p.category || '',
      p.inventory?.quantity || 0,
      p.inventory?.lowStockThreshold || 10,
      p.inventory?.unit || 'unit',
      (p.costPrice || 0).toFixed(2),
      (p.price || 0).toFixed(2),
      ((p.inventory?.quantity || 0) * (p.costPrice || 0)).toFixed(2),
      p.status || 'active'
    ]);

    const csv = toCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inventory-report-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Inventory CSV export error:', error);
    res.status(500).json({ success: false, message: 'Error exporting inventory report' });
  }
}

/**
 * GET /api/v1/reports/orders/csv
 * Export orders report as CSV - combines online orders and POS sales with branch info
 */
async function getOrdersCSV(req, res) {
  try {
    const { startDate, endDate, branchId, status } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);

    // Get POS Sales with branch info
    const saleMatch = {
      createdAt: { $gte: start, $lte: end }
    };
    if (branchId) {
      saleMatch.branchId = branchId;
    }
    if (status) {
      saleMatch.paymentStatus = status;
    }

    const sales = await Sale.find(saleMatch)
      .populate('branchId', 'name branchCode')
      .populate('cashierId', 'name')
      .populate('customerId', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    // Get Online Orders
    const orderMatch = {
      createdAt: { $gte: start, $lte: end }
    };
    if (status) {
      orderMatch.status = status;
    }

    const orders = await Order.find(orderMatch)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    const headers = [
      'Date', 'Time', 'Order/Sale #', 'Source', 'Branch', 'Staff',
      'Customer', 'Items', 'Subtotal', 'Discount', 'Tax', 'Total',
      'Status', 'Payment Method'
    ];

    // Format POS sales rows
    const saleRows = sales.map(sale => [
      new Date(sale.createdAt).toLocaleDateString('en-ZA'),
      new Date(sale.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
      sale.saleNumber || sale.invoiceNumber || sale._id.toString().slice(-8).toUpperCase(),
      'POS',
      sale.branchId?.name || 'Unknown',
      sale.cashierId?.name || '-',
      sale.customerId?.name || sale.customerName || 'Walk-in',
      sale.items?.length || 0,
      (sale.subtotal || 0).toFixed(2),
      (sale.discountTotal || 0).toFixed(2),
      (sale.taxTotal || 0).toFixed(2),
      (sale.grandTotal || sale.total || 0).toFixed(2),
      sale.paymentStatus || 'pending',
      sale.payments?.map(p => p.method).join('+') || ''
    ]);

    // Format Online order rows
    const orderRows = orders.map(order => {
      const customerName = order.customer?.firstName
        ? `${order.customer.firstName} ${order.customer.lastName || ''}`.trim()
        : order.user?.name || 'Guest';

      return [
        new Date(order.createdAt).toLocaleDateString('en-ZA'),
        new Date(order.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }),
        order.orderNumber || order._id.toString().slice(-8).toUpperCase(),
        'Online',
        '-',
        '-',
        customerName,
        order.items?.length || 0,
        (order.subtotal || 0).toFixed(2),
        (order.discount?.amount || 0).toFixed(2),
        (order.tax?.amount || 0).toFixed(2),
        (order.total || 0).toFixed(2),
        order.status || 'pending',
        order.payments?.[0]?.method || order.paymentMethod || ''
      ];
    });

    // Combine and sort by date
    const allRows = [...saleRows, ...orderRows].sort((a, b) => {
      const dateA = new Date(`${a[0]} ${a[1]}`);
      const dateB = new Date(`${b[0]} ${b[1]}`);
      return dateB - dateA;
    });

    const csv = toCSV(headers, allRows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="orders-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Orders CSV export error:', error);
    res.status(500).json({ success: false, message: 'Error exporting orders report' });
  }
}

/**
 * GET /api/v1/reports/staff/csv
 * Export staff performance report as CSV
 */
async function getStaffCSV(req, res) {
  try {
    const { startDate, endDate, branchId } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);

    const staffQuery = {
      role: { $in: ['branch_assistant', 'branch_manager', 'admin'] },
      status: 'active'
    };
    if (branchId) {
      staffQuery.branchId = branchId;
    }

    const staff = await User.find(staffQuery)
      .select('name email role branchId')
      .lean();

    const staffWithStats = await Promise.all(
      staff.map(async (user) => {
        const tillSessions = await TillSession.find({
          operator: user._id,
          openedAt: { $gte: start, $lte: end }
        }).lean();

        const totalSessions = tillSessions.length;
        const totalSales = tillSessions.reduce((sum, s) => sum + (s.salesTotal || 0), 0);
        const totalTransactions = tillSessions.reduce((sum, s) => sum + (s.transactionCount || 0), 0);

        return {
          name: user.name,
          email: user.email,
          role: user.role,
          totalSessions,
          totalSales,
          totalTransactions,
          avgSalesPerSession: totalSessions > 0 ? totalSales / totalSessions : 0
        };
      })
    );

    staffWithStats.sort((a, b) => b.totalSales - a.totalSales);

    const headers = [
      'Name', 'Email', 'Role', 'Total Sessions', 'Total Sales (R)',
      'Total Transactions', 'Avg Sales/Session (R)'
    ];

    const rows = staffWithStats.map(s => [
      s.name,
      s.email,
      s.role,
      s.totalSessions,
      s.totalSales.toFixed(2),
      s.totalTransactions,
      s.avgSalesPerSession.toFixed(2)
    ]);

    const csv = toCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="staff-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Staff CSV export error:', error);
    res.status(500).json({ success: false, message: 'Error exporting staff report' });
  }
}

/**
 * GET /api/v1/reports/products/csv
 * Export top products report as CSV
 */
async function getProductsCSV(req, res) {
  try {
    const { startDate, endDate, branchCode, limit = 50 } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end - 30 * 24 * 60 * 60 * 1000);

    const matchStage = {
      createdAt: { $gte: start, $lte: end },
      status: { $ne: 'cancelled' }
    };

    if (branchCode) {
      matchStage.branchCode = branchCode.toUpperCase();
    }

    // Aggregate product sales
    const productSales = await Order.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          productName: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const headers = [
      'Rank', 'Product Name', 'SKU', 'Units Sold', 'Revenue (R)', 'Order Count'
    ];

    const rows = productSales.map((p, index) => [
      index + 1,
      p.productName || 'Unknown',
      p.sku || '',
      p.totalQuantity,
      p.totalRevenue.toFixed(2),
      p.orderCount
    ]);

    const csv = toCSV(headers, rows);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="products-report-${start.toISOString().split('T')[0]}-to-${end.toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    logger.error('Products CSV export error:', error);
    res.status(500).json({ success: false, message: 'Error exporting products report' });
  }
}

module.exports = {
  getSales,
  getInventory,
  getOrders,
  getBranches,
  getStaff,
  getSalesCSV,
  getInventoryCSV,
  getOrdersCSV,
  getStaffCSV,
  getProductsCSV
};
