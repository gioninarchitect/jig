// Supplier Portal Controller — Self-service endpoints for suppliers
const logger = require('../modules/logger');
const Product = require('../modules/database/models/Product');
const PurchaseOrder = require('../modules/database/models/PurchaseOrder');
const Supplier = require('../modules/database/models/Supplier');

// GET /supplier/products — List products submitted by this supplier
exports.getProducts = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const userId = req.user.id;

    // Find supplier linked to this user, or find products submitted by this user
    const products = await Product.find({
      $or: [
        { submittedBy: userId },
        { 'supplier.userId': userId }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, products });
  } catch (error) {
    logger.error('Supplier products fetch error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching supplier products' });
  }
};

// POST /supplier/products — Submit a new product for MDC review
exports.submitProduct = async (req, res) => {
  try {
    const { name, category, price, description, cannabinoids, growMethod } = req.body;

    const product = await Product.create({
      name,
      category,
      price,
      description,
      cannabinoids: cannabinoids || {},
      growMethod: growMethod || 'indoor',
      status: 'pending_review',
      submittedBy: req.user.id,
      source: 'supplier_portal'
    });

    logger.info('Supplier product submitted', { productId: product._id, userId: req.user.id });
    res.status(201).json({ success: true, id: product._id, status: 'pending_review' });
  } catch (error) {
    logger.error('Supplier product submit error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error submitting product' });
  }
};

// GET /supplier/purchase-orders — List POs where this supplier is the vendor
exports.getPurchaseOrders = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const userId = req.user.id;

    // Find supplier record for this user
    const supplier = await Supplier.findOne({ userId }).lean();
    if (!supplier) {
      return res.json({ success: true, purchaseOrders: [] });
    }

    const purchaseOrders = await PurchaseOrder.find({ supplier: supplier._id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({ success: true, purchaseOrders });
  } catch (error) {
    logger.error('Supplier POs fetch error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching purchase orders' });
  }
};

// GET /supplier/documents — List compliance documents for this supplier
exports.getDocuments = async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const userId = req.user.id;

    const supplier = await Supplier.findOne({ userId }).lean();
    if (!supplier) {
      return res.json({ success: true, documents: [] });
    }

    // Return compliance documents from supplier record
    const documents = (supplier.complianceDocuments || [])
      .slice(0, parseInt(limit))
      .map(doc => ({
        _id: doc._id || doc.id,
        name: doc.name || doc.documentName || 'Document',
        type: doc.type || doc.documentType || 'compliance',
        verified: doc.verified || doc.status === 'verified',
        expiryDate: doc.expiryDate || null,
        createdAt: doc.uploadedAt || doc.createdAt
      }));

    res.json({ success: true, documents });
  } catch (error) {
    logger.error('Supplier documents fetch error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error fetching documents' });
  }
};
