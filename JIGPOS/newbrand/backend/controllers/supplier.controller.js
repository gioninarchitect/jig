// Supplier Controller — Business logic for supplier management and compliance
const logger = require('../modules/logger');
const Supplier = require('../modules/database/models/Supplier');
const Batch = require('../modules/database/models/Batch');
const PurchaseOrder = require('../modules/database/models/PurchaseOrder');

// Get all suppliers with filtering and pagination
exports.getAll = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, complianceStatus, category, search, sort = '-createdAt' } = req.query;

    const query = {};
    if (status) query.status = status;
    if (complianceStatus) query.complianceStatus = complianceStatus;
    if (category) query.productCategories = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { legalName: { $regex: search, $options: 'i' } },
        { supplierId: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find(query)
        .populate('verifiedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName')
        .sort(sort).skip(skip).limit(parseInt(limit)),
      Supplier.countDocuments(query)
    ]);

    res.json({
      success: true, suppliers, total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error('Get suppliers error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching suppliers' });
  }
};

// Get suppliers with expiring licenses
exports.getExpiringLicenses = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const suppliers = await Supplier.findExpiringLicenses(parseInt(days));
    res.json({ success: true, suppliers, count: suppliers.length });
  } catch (error) {
    logger.error('Get expiring licenses error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching suppliers with expiring licenses' });
  }
};

// Get suppliers by product category
exports.getByCategory = async (req, res) => {
  try {
    const suppliers = await Supplier.findByCategory(req.params.category);
    res.json({ success: true, suppliers });
  } catch (error) {
    logger.error('Get suppliers by category error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching suppliers' });
  }
};

// Get single supplier
exports.getById = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id)
      .populate('verifiedBy', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName email');

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }
    res.json({ success: true, supplier });
  } catch (error) {
    logger.error('Get supplier error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching supplier' });
  }
};

// Get supplier's purchase orders
exports.getOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { supplier: req.params.id };
    if (status) query.status = status;

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .sort('-createdAt').skip(skip).limit(parseInt(limit)),
      PurchaseOrder.countDocuments(query)
    ]);

    res.json({
      success: true, orders, total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error('Get supplier orders error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching supplier orders' });
  }
};

// Get supplier's batches
exports.getBatches = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { supplier: req.params.id };
    if (status) query.status = status;

    const [batches, total] = await Promise.all([
      Batch.find(query)
        .populate('product', 'name sku')
        .populate('currentLocation', 'name branchCode')
        .sort('-createdAt').skip(skip).limit(parseInt(limit)),
      Batch.countDocuments(query)
    ]);

    res.json({
      success: true, batches, total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error('Get supplier batches error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching supplier batches' });
  }
};

// Create supplier
exports.create = async (req, res) => {
  try {
    const supplierData = { ...req.body, createdBy: req.user.id };
    const supplier = new Supplier(supplierData);
    await supplier.save();

    logger.info('Supplier created', { supplierId: supplier.supplierId, name: supplier.name, createdBy: req.user.id });

    res.status(201).json({ success: true, message: 'Supplier created successfully', supplier });
  } catch (error) {
    logger.error('Create supplier error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error creating supplier' });
  }
};

// Update supplier
exports.update = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const allowedUpdates = [
      'name', 'legalName', 'tradingAs', 'contactPerson', 'email', 'phone',
      'alternatePhone', 'website', 'address', 'registration', 'license',
      'productCategories', 'bankDetails', 'paymentTerms', 'creditLimit',
      'notes', 'tags'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) supplier[field] = req.body[field];
    });

    await supplier.save();

    logger.info('Supplier updated', { supplierId: supplier.supplierId, updatedBy: req.user.id });

    res.json({ success: true, message: 'Supplier updated successfully', supplier });
  } catch (error) {
    logger.error('Update supplier error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error updating supplier' });
  }
};

// Verify supplier (compliance approval)
exports.verify = async (req, res) => {
  try {
    const { notes } = req.body;
    const supplier = await Supplier.findById(req.params.id);

    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    supplier.complianceStatus = 'approved';
    supplier.verifiedBy = req.user.id;
    supplier.verifiedAt = new Date();
    if (notes) supplier.complianceNotes = notes;

    await supplier.save();

    logger.info('Supplier verified', { supplierId: supplier.supplierId, verifiedBy: req.user.id });

    res.json({ success: true, message: 'Supplier verified successfully', supplier });
  } catch (error) {
    logger.error('Verify supplier error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error verifying supplier' });
  }
};

// Suspend supplier
exports.suspend = async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, message: 'Suspension reason is required' });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    supplier.status = 'suspended';
    supplier.complianceStatus = 'suspended';
    supplier.complianceNotes = reason;
    await supplier.save();

    logger.info('Supplier suspended', { supplierId: supplier.supplierId, reason, suspendedBy: req.user.id });

    res.json({ success: true, message: 'Supplier suspended', supplier });
  } catch (error) {
    logger.error('Suspend supplier error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error suspending supplier' });
  }
};

// Reactivate supplier
exports.reactivate = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    if (supplier.complianceStatus === 'blacklisted') {
      return res.status(400).json({ success: false, message: 'Cannot reactivate a blacklisted supplier' });
    }

    supplier.status = 'active';
    supplier.complianceStatus = 'approved';
    await supplier.save();

    logger.info('Supplier reactivated', { supplierId: supplier.supplierId, reactivatedBy: req.user.id });

    res.json({ success: true, message: 'Supplier reactivated', supplier });
  } catch (error) {
    logger.error('Reactivate supplier error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error reactivating supplier' });
  }
};

// Upload document for supplier
exports.uploadDocument = async (req, res) => {
  try {
    const { type, name, url, expiryDate } = req.body;
    if (!type || !url) {
      return res.status(400).json({ success: false, message: 'Document type and URL are required' });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    supplier.documents.push({
      type, name: name || type, url,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      uploadedAt: new Date(), verified: false
    });

    await supplier.save();

    res.json({ success: true, message: 'Document uploaded successfully', documents: supplier.documents });
  } catch (error) {
    logger.error('Upload supplier document error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error uploading document' });
  }
};

// Get supplier performance summary
exports.getPerformance = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    const [totalBatches, activeBatches, totalPOs, pendingPOs] = await Promise.all([
      Batch.countDocuments({ supplier: supplier._id }),
      Batch.countDocuments({ supplier: supplier._id, status: 'active' }),
      PurchaseOrder.countDocuments({ supplier: supplier._id }),
      PurchaseOrder.countDocuments({ supplier: supplier._id, status: { $in: ['submitted', 'approved', 'ordered'] } })
    ]);

    res.json({
      success: true,
      performance: {
        ...supplier.performance.toObject(),
        totalBatches, activeBatches, totalPOs, pendingPOs
      }
    });
  } catch (error) {
    logger.error('Get supplier performance error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error fetching supplier performance' });
  }
};
