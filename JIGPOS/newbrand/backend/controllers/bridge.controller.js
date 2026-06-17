// Server-to-server bridge for the TnT-ZA platform (Owner Dashboard combined view + batch sync).
// Protected by a shared secret header (x-bridge-key), NOT user JWT.
const mongoose = require('mongoose');
const logger = require('../modules/logger');
const db = () => mongoose.connection.db;
const oid = (id) => { try { return new mongoose.Types.ObjectId(id); } catch (e) { return null; } };

// Start of "today" in SAST (UTC+2), returned as a UTC Date instant.
function sastDayStart() {
  const now = new Date();
  const sast = new Date(now.getTime() + 2 * 3600 * 1000);
  sast.setUTCHours(0, 0, 0, 0);
  return new Date(sast.getTime() - 2 * 3600 * 1000);
}

// Retail summary for the Origin store — consumed by the TnT-ZA Owner Dashboard "Retail" tab.
exports.retailSummary = async (req, res) => {
  try {
    const start = sastDayStart();
    const sales = await db().collection('sales')
      .find({ createdAt: { $gte: start } })
      .project({ totalAmount: 1, status: 1, payments: 1, items: 1 }).toArray();

    const completed = sales.filter(s => s.status === 'completed');
    const voided = sales.filter(s => s.status === 'voided' || s.status === 'refunded');
    const todaySales = completed.reduce((a, s) => a + (s.totalAmount || 0), 0);
    const txCount = completed.length;

    const byMethod = {};
    completed.forEach(s => (s.payments || []).forEach(p => { byMethod[p.method] = (byMethod[p.method] || 0) + (p.amount || 0); }));

    const prodMap = {};
    completed.forEach(s => (s.items || []).forEach(i => {
      const k = i.name || i.sku || 'item';
      prodMap[k] = prodMap[k] || { name: k, qty: 0, revenue: 0 };
      prodMap[k].qty += i.quantity || 0;
      prodMap[k].revenue += i.total || 0;
    }));
    const topProducts = Object.values(prodMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    const products = await db().collection('products')
      .find({ isActive: { $ne: false } }).project({ name: 1, inventory: 1, category: 1 }).toArray();
    const activeProducts = products.length;
    const lowStockItems = products.filter(p => (p.inventory?.quantity ?? 0) <= (p.inventory?.lowStockThreshold ?? 5));
    const outOfStock = products.filter(p => (p.inventory?.quantity ?? 0) <= 0).length;

    res.json({
      success: true,
      brand: 'Origin Retail',
      branch: 'Potchefstroom',
      today: {
        sales: Math.round(todaySales * 100) / 100,
        transactions: txCount,
        avgBasket: txCount ? Math.round((todaySales / txCount) * 100) / 100 : 0,
        voided: voided.length,
        byMethod
      },
      products: { active: activeProducts, lowStock: lowStockItems.length, outOfStock },
      lowStockList: lowStockItems.map(p => ({ name: p.name, qty: p.inventory?.quantity ?? 0, category: p.category || '' }))
        .sort((a, b) => a.qty - b.qty).slice(0, 10),
      topProducts,
      generatedAt: new Date()
    });
  } catch (e) {
    logger.error('bridge.retailSummary', { error: e.message });
    res.status(500).json({ success: false, message: 'Error building retail summary' });
  }
};

// Product list for the TnT "Release to till" SKU picker.
exports.products = async (req, res) => {
  try {
    const rows = await db().collection('products')
      .find({ isActive: { $ne: false }, status: { $ne: 'archived' } })
      .project({ name: 1, sku: 1, category: 1, price: 1, track: 1, inventory: 1 }).sort({ name: 1 }).toArray();
    res.json({
      success: true,
      products: rows.map(p => ({ _id: p._id, sku: p.sku, name: p.name, category: p.category, price: p.price, track: p.track, qty: (p.inventory && p.inventory.quantity) || 0 }))
    });
  } catch (e) { logger.error('bridge.products', { error: e.message }); res.status(500).json({ success: false, message: 'Error listing products' }); }
};

// Receive released farm stock from TnT and add it to the mapped Origin product. Idempotent per batchNumber.
exports.stockReceipt = async (req, res) => {
  try {
    const { sku, productId, quantity, batchNumber, strain } = req.body;
    const qty = Number(quantity);
    if ((!sku && !productId) || !qty || qty <= 0 || !batchNumber) {
      return res.status(400).json({ success: false, message: 'sku/productId, a positive quantity and batchNumber are required' });
    }
    // Idempotency — never double-apply the same batch.
    const existing = await db().collection('stockReceipts').findOne({ batchNumber, source: 'tnt' });
    if (existing) return res.json({ success: true, alreadyApplied: true, message: 'Batch already synced', batchNumber, productName: existing.productName, appliedQty: existing.quantity });

    const product = await db().collection('products').findOne(productId ? { _id: oid(productId) } : { sku });
    if (!product) return res.status(404).json({ success: false, message: 'Origin product not found for that SKU' });

    await db().collection('products').updateOne({ _id: product._id }, { $inc: { 'inventory.quantity': qty }, $set: { updatedAt: new Date() } });
    const after = await db().collection('products').findOne({ _id: product._id });
    await db().collection('stockReceipts').insertOne({
      source: 'tnt', batchNumber, strain: strain || '', sku: product.sku, productId: product._id,
      productName: product.name, quantity: qty, newQty: after.inventory && after.inventory.quantity, at: new Date()
    });
    logger.info('TnT stock receipt applied', { batchNumber, sku: product.sku, qty });
    res.json({ success: true, productName: product.name, sku: product.sku, addedQty: qty, newQty: after.inventory && after.inventory.quantity, batchNumber });
  } catch (e) { logger.error('bridge.stockReceipt', { error: e.message }); res.status(500).json({ success: false, message: 'Error applying stock receipt' }); }
};
