// Inventory Management Routes
const express = require('express');
const router = express.Router();
const Product = require('../database/models/Product');
const Order = require('../database/models/Order');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');

// Get inventory overview
router.get('/overview', [auth, admin], async (req, res) => {
  try {
    const [
      totalProducts,
      totalStock,
      lowStock,
      outOfStock,
      totalValue
    ] = await Promise.all([
      Product.countDocuments(),
      Product.aggregate([
        { $group: { _id: null, total: { $sum: '$stock' } } }
      ]),
      Product.countDocuments({ 
        stock: { $gt: 0, $lte: 10 },
        trackInventory: true 
      }),
      Product.countDocuments({ stock: 0, trackInventory: true }),
      Product.aggregate([
        { $group: { 
          _id: null, 
          value: { $sum: { $multiply: ['$stock', '$price'] } }
        }}
      ])
    ]);

    res.json({
      totalProducts,
      totalStock: totalStock[0]?.total || 0,
      lowStockCount: lowStock,
      outOfStockCount: outOfStock,
      totalInventoryValue: totalValue[0]?.value || 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get low stock products
router.get('/low-stock', [auth, admin], async (req, res) => {
  try {
    const { threshold = 10, page = 1, limit = 20 } = req.query;

    const products = await Product.find({
      stock: { $gt: 0, $lte: parseInt(threshold) },
      trackInventory: true
    })
    .select('name sku stock price category images')
    .sort('stock')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const count = await Product.countDocuments({
      stock: { $gt: 0, $lte: parseInt(threshold) },
      trackInventory: true
    });

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalProducts: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get out of stock products
router.get('/out-of-stock', [auth, admin], async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const products = await Product.find({
      stock: 0,
      trackInventory: true
    })
    .select('name sku stock price category images updatedAt')
    .sort('-updatedAt')
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const count = await Product.countDocuments({
      stock: 0,
      trackInventory: true
    });

    res.json({
      products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalProducts: count
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock movements history
router.get('/movements', [auth, admin], async (req, res) => {
  try {
    const { 
      productId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};
    
    if (productId) query.product = productId;
    if (type) query.type = type;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // For now, we'll simulate stock movements from orders
    // In production, you'd have a StockMovement collection
    const orders = await Order.find(query)
      .populate('items.product', 'name sku')
      .sort('-createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const movements = [];
    orders.forEach(order => {
      order.items.forEach(item => {
        movements.push({
          _id: `${order._id}-${item._id}`,
          product: item.product,
          type: order.status === 'cancelled' ? 'restock' : 'sale',
          quantity: item.quantity,
          reference: order.orderNumber,
          date: order.createdAt,
          notes: `Order ${order.orderNumber}`
        });
      });
    });

    res.json({
      movements,
      totalPages: Math.ceil(movements.length / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Adjust stock
router.post('/adjust', [auth, admin], async (req, res) => {
  try {
    const { productId, adjustment, reason, notes } = req.body;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const oldStock = product.stock;
    const newStock = Math.max(0, oldStock + adjustment);
    
    product.stock = newStock;
    
    // Add to stock history
    if (!product.stockHistory) product.stockHistory = [];
    product.stockHistory.push({
      date: new Date(),
      oldStock,
      newStock,
      adjustment,
      reason,
      notes,
      adjustedBy: req.user._id
    });

    await product.save();

    res.json({
      message: 'Stock adjusted successfully',
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        oldStock,
        newStock,
        adjustment
      }
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Bulk stock update
router.post('/bulk-update', [auth, admin], async (req, res) => {
  try {
    const { updates } = req.body; // Array of { productId, stock }

    const results = [];
    const errors = [];

    for (const update of updates) {
      try {
        const product = await Product.findByIdAndUpdate(
          update.productId,
          { 
            stock: update.stock,
            $push: {
              stockHistory: {
                date: new Date(),
                oldStock: '$stock',
                newStock: update.stock,
                reason: 'Bulk update',
                adjustedBy: req.user._id
              }
            }
          },
          { new: true }
        ).select('name sku stock');

        if (product) {
          results.push({
            productId: product._id,
            name: product.name,
            sku: product.sku,
            stock: product.stock
          });
        } else {
          errors.push({
            productId: update.productId,
            error: 'Product not found'
          });
        }
      } catch (err) {
        errors.push({
          productId: update.productId,
          error: err.message
        });
      }
    }

    res.json({
      message: `Updated ${results.length} products`,
      results,
      errors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Set reorder points
router.post('/reorder-points', [auth, admin], async (req, res) => {
  try {
    const { productId, reorderPoint, reorderQuantity } = req.body;

    const product = await Product.findByIdAndUpdate(
      productId,
      {
        reorderPoint,
        reorderQuantity
      },
      { new: true }
    ).select('name sku stock reorderPoint reorderQuantity');

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({
      message: 'Reorder points updated',
      product
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get products needing reorder
router.get('/reorder-needed', [auth, admin], async (req, res) => {
  try {
    const products = await Product.find({
      $expr: {
        $and: [
          { $gt: ['$reorderPoint', 0] },
          { $lte: ['$stock', '$reorderPoint'] }
        ]
      }
    })
    .select('name sku stock reorderPoint reorderQuantity supplier price')
    .sort('stock');

    const totalReorderValue = products.reduce((sum, product) => {
      return sum + (product.reorderQuantity * product.price);
    }, 0);

    res.json({
      products,
      count: products.length,
      totalReorderValue
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock valuation report
router.get('/valuation', [auth, admin], async (req, res) => {
  try {
    const { groupBy = 'category' } = req.query;

    const aggregation = [
      {
        $group: {
          _id: `$${groupBy}`,
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$stock', '$price'] } },
          productCount: { $sum: 1 },
          avgPrice: { $avg: '$price' }
        }
      },
      { $sort: { totalValue: -1 } }
    ];

    const valuation = await Product.aggregate(aggregation);

    const totals = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalStock: { $sum: '$stock' },
          totalValue: { $sum: { $multiply: ['$stock', '$price'] } }
        }
      }
    ]);

    res.json({
      valuation,
      totals: totals[0] || { totalStock: 0, totalValue: 0 },
      groupedBy: groupBy
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stock forecast based on sales
router.get('/forecast/:productId', [auth, admin], async (req, res) => {
  try {
    const { productId } = req.params;
    const { days = 30 } = req.query;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Calculate average daily sales from orders
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orders = await Order.aggregate([
      { $match: { 
        createdAt: { $gte: startDate },
        status: { $ne: 'cancelled' }
      }},
      { $unwind: '$items' },
      { $match: { 'items.product': product._id } },
      { $group: {
        _id: null,
        totalSold: { $sum: '$items.quantity' }
      }}
    ]);

    const totalSold = orders[0]?.totalSold || 0;
    const avgDailySales = totalSold / days;
    const daysUntilStockout = product.stock > 0 
      ? Math.floor(product.stock / avgDailySales)
      : 0;

    res.json({
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku,
        currentStock: product.stock
      },
      analytics: {
        periodDays: days,
        totalSold,
        avgDailySales: avgDailySales.toFixed(2),
        daysUntilStockout,
        stockoutDate: daysUntilStockout > 0 
          ? new Date(Date.now() + daysUntilStockout * 24 * 60 * 60 * 1000)
          : null,
        recommendedReorder: Math.ceil(avgDailySales * 30) // 30-day supply
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Export inventory report
router.get('/export', [auth, admin], async (req, res) => {
  try {
    const { format = 'json' } = req.query;

    const products = await Product.find()
      .select('name sku category stock price reorderPoint')
      .sort('category name');

    if (format === 'csv') {
      // Implement CSV export
      const csv = products.map(p => ({
        'Product Name': p.name,
        'SKU': p.sku,
        'Category': p.category,
        'Stock': p.stock,
        'Price': p.price,
        'Value': p.stock * p.price,
        'Reorder Point': p.reorderPoint || 'N/A'
      }));
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=inventory.csv');
      // Convert to CSV format
    } else {
      res.json(products);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;