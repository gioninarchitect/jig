// Stock-sheet writes with approval + datetime-stamped audit trail (GMP change control).
// Operator = req.user (logged-in account). Approver = req.approval (resolved from the override code).
const mongoose = require('mongoose');
const logger = require('../modules/logger');
const db = () => mongoose.connection.db;
const oid = (id) => { try { return new mongoose.Types.ObjectId(id); } catch (e) { return null; } };

async function writeAudit(req, action, product, changes) {
  try {
    await db().collection('stockAudit').insertOne({
      action,
      productId: product._id,
      productName: product.name || '',
      category: product.category || '',
      changes: (changes || []).map(c => ({ field: c[0], from: c[1], to: c[2] })),
      note: String(req.body.note || '').trim(),
      operatorEmail: (req.user && req.user.email) || '',
      operatorRole: (req.user && req.user.role) || '',
      approverRole: (req.approval && req.approval.role) || '',
      approverLabel: (req.approval && req.approval.label) || '',
      approvalCodeId: (req.approval && req.approval.codeId) || null,
      at: new Date()
    });
  } catch (e) { logger.error('writeAudit', { error: e.message }); }
}

exports.manageProduct = async (req, res) => {
  try {
    const _id = oid(req.params.id);
    if (!_id) return res.status(400).json({ success: false, message: 'Bad product id' });
    const before = await db().collection('products').findOne({ _id });
    if (!before) return res.status(404).json({ success: false, message: 'Product not found' });
    const { name, price, quantity, size, category, isActive } = req.body;
    const set = { updatedAt: new Date() };
    const changes = [];
    if (name != null && String(name).trim() && String(name).trim() !== before.name) { set.name = String(name).trim(); changes.push(['name', before.name, set.name]); }
    if (price != null && !isNaN(price) && Number(price) >= 0 && Number(price) !== before.price) { set.price = Number(price); if (before.sellBy === 'gram') set.pricePerGram = Number(price); changes.push(['price', before.price, set.price]); }
    if (quantity != null && !isNaN(quantity) && Number(quantity) >= 0 && Number(quantity) !== (before.inventory && before.inventory.quantity)) { set['inventory.quantity'] = Number(quantity); changes.push(['quantity', before.inventory && before.inventory.quantity, Number(quantity)]); }
    if (size != null && String(size) !== (before.size || '')) { set.size = String(size); changes.push(['size', before.size || '', String(size)]); }
    if (category != null && String(category).trim() && String(category).trim().toLowerCase() !== before.category) { set.category = String(category).trim().toLowerCase(); changes.push(['category', before.category, set.category]); }
    if (isActive != null && !!isActive !== (before.isActive !== false)) { set.isActive = !!isActive; changes.push(['isActive', before.isActive !== false, !!isActive]); }
    await db().collection('products').updateOne({ _id }, { $set: set });
    await writeAudit(req, 'update', before, changes);
    // Read-after-write: confirm what is actually persisted in the DB and return it.
    const after = await db().collection('products').findOne({ _id });
    const saved = { name: after.name, price: after.price, quantity: after.inventory && after.inventory.quantity, size: after.size || '', category: after.category, isActive: after.isActive !== false };
    res.json({ success: true, persisted: true, message: 'Saved to database', approvedBy: req.approval && req.approval.role, saved });
  } catch (e) { logger.error('sm.manageProduct', { error: e.message }); res.status(500).json({ success: false, message: 'Error saving product' }); }
};

exports.createProduct = async (req, res) => {
  try {
    const { name, price, quantity, size, category, brand, sku } = req.body;
    if (!name || price == null) return res.status(400).json({ success: false, message: 'Name and price are required' });
    const now = new Date();
    const slug = String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) + '-' + now.getTime();
    const doc = {
      name: String(name).trim(),
      slug,
      sku: (sku && String(sku).trim()) || ('SKU-' + now.getTime()),
      category: (category ? String(category).trim().toLowerCase() : 'wellness'),
      brand: brand ? String(brand).trim() : '',
      price: Number(price),
      size: size ? String(size) : '',
      inventory: { quantity: Number(quantity) || 0 },
      status: 'active', isActive: true, createdAt: now, updatedAt: now
    };
    const r = await db().collection('products').insertOne(doc);
    await writeAudit(req, 'create', { _id: r.insertedId, name: doc.name, category: doc.category }, [['created', '', doc.name + ' @ R' + doc.price + ' · qty ' + doc.inventory.quantity]]);
    const after = await db().collection('products').findOne({ _id: r.insertedId });
    const saved = after ? { name: after.name, price: after.price, quantity: after.inventory && after.inventory.quantity, category: after.category } : null;
    res.json({ success: true, persisted: !!after, id: r.insertedId, message: 'Product added to database', approvedBy: req.approval && req.approval.role, saved });
  } catch (e) { logger.error('sm.createProduct', { error: e.message }); res.status(500).json({ success: false, message: 'Error creating product' }); }
};

// Delete = archive (soft-delete). Removes from POS + stock sheet, keeps the record for audit/sales history.
exports.deleteProduct = async (req, res) => {
  try {
    const _id = oid(req.params.id);
    if (!_id) return res.status(400).json({ success: false, message: 'Bad product id' });
    const before = await db().collection('products').findOne({ _id });
    if (!before) return res.status(404).json({ success: false, message: 'Product not found' });
    await db().collection('products').updateOne({ _id }, { $set: { isActive: false, status: 'archived', archivedAt: new Date(), archivedBy: (req.approval && req.approval.role) || '', updatedAt: new Date() } });
    await writeAudit(req, 'delete', before, [['deleted', before.name, 'archived']]);
    res.json({ success: true, persisted: true, message: 'Deleted', approvedBy: req.approval && req.approval.role });
  } catch (e) { logger.error('sm.deleteProduct', { error: e.message }); res.status(500).json({ success: false, message: 'Error deleting product' }); }
};

// Bulk delete (multi-select). One approval covers the batch.
exports.bulkDelete = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
    if (!ids.length) return res.status(400).json({ success: false, message: 'No products selected' });
    let deleted = 0;
    for (const id of ids) {
      const _id = oid(id); if (!_id) continue;
      const before = await db().collection('products').findOne({ _id });
      if (!before) continue;
      await db().collection('products').updateOne({ _id }, { $set: { isActive: false, status: 'archived', archivedAt: new Date(), archivedBy: (req.approval && req.approval.role) || '', updatedAt: new Date() } });
      await writeAudit(req, 'delete', before, [['deleted', before.name, 'archived']]);
      deleted++;
    }
    res.json({ success: true, persisted: true, message: `${deleted} deleted`, deleted, approvedBy: req.approval && req.approval.role });
  } catch (e) { logger.error('sm.bulkDelete', { error: e.message }); res.status(500).json({ success: false, message: 'Error deleting products' }); }
};

exports.auditList = async (req, res) => {
  try {
    const rows = await db().collection('stockAudit').find({}).sort({ at: -1 }).limit(200).toArray();
    res.json({ success: true, audit: rows });
  } catch (e) { logger.error('sm.auditList', { error: e.message }); res.status(500).json({ success: false, message: 'Error' }); }
};
