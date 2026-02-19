// Batch Routes - Lot tracking with cannabinoid profiles
const express = require('express');
const router = express.Router();
const logger = require('../modules/logger');
const Batch = require('../modules/database/models/Batch');
const Product = require('../modules/database/models/Product');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all batches with filtering and pagination
router.get('/', authenticateToken, requireRole(['admin', 'staff_manager', 'staff_assistant']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      product,
      supplier,
      status,
      qaStatus,
      branch,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (product) query.product = product;
    if (supplier) query.supplier = supplier;
    if (status) query.status = status;
    if (qaStatus) query.qaStatus = qaStatus;
    if (branch) query.currentLocation = branch;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [batches, total] = await Promise.all([
      Batch.find(query)
        .populate('product', 'name sku category')
        .populate('supplier', 'name supplierId')
        .populate('currentLocation', 'name branchCode')
        .populate('createdBy', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      Batch.countDocuments(query)
    ]);

    res.json({
      success: true,
      batches,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error('Get batches error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching batches'
    });
  }
});

// Get available batches for a product (for POS batch selection)
router.get('/available/:productId', authenticateToken, async (req, res) => {
  try {
    const { branchId } = req.query;
    const batches = await Batch.findAvailableByProduct(req.params.productId, branchId);

    res.json({
      success: true,
      batches
    });
  } catch (error) {
    logger.error('Get available batches error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching available batches'
    });
  }
});

// Get single batch by ID
router.get('/:id', authenticateToken, requireRole(['admin', 'staff_manager', 'staff_assistant']), async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('product', 'name sku category price')
      .populate('supplier', 'name supplierId contactPerson')
      .populate('currentLocation', 'name branchCode address')
      .populate('createdBy', 'firstName lastName email')
      .populate('qaApprovedBy', 'firstName lastName email')
      .populate('purchaseOrder', 'poNumber');

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.json({
      success: true,
      batch
    });
  } catch (error) {
    logger.error('Get batch error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching batch'
    });
  }
});

// Get full trace for a batch (supplier to sales)
router.get('/:id/trace', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const batch = await Batch.getFullTrace(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    res.json({
      success: true,
      trace: {
        batch: batch,
        summary: {
          batchId: batch.batchId,
          product: batch.product?.name,
          supplier: batch.supplier?.name,
          supplierLicense: batch.supplier?.license?.number,
          initialQuantity: batch.initialQuantity,
          remainingQuantity: batch.remainingQuantity,
          soldQuantity: batch.initialQuantity - batch.remainingQuantity,
          totalMovements: batch.movements?.length || 0,
          totalSales: batch.sales?.length || 0,
          qaStatus: batch.qaStatus,
          expiryDate: batch.expiryDate
        }
      }
    });
  } catch (error) {
    logger.error('Get batch trace error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching batch trace'
    });
  }
});

// Create new batch
router.post('/', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const {
      product,
      supplier,
      cannabinoids,
      terpenes,
      harvestDate,
      testDate,
      expiryDate,
      labCertificateUrl,
      labName,
      initialQuantity,
      unitOfMeasure,
      currentLocation,
      purchaseOrder,
      unitCost,
      notes
    } = req.body;

    // Validate product exists
    const productDoc = await Product.findById(product);
    if (!productDoc) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const batch = new Batch({
      product,
      supplier,
      cannabinoids,
      terpenes,
      harvestDate: harvestDate ? new Date(harvestDate) : undefined,
      testDate: testDate ? new Date(testDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      labCertificateUrl,
      labName,
      initialQuantity,
      remainingQuantity: initialQuantity,
      unitOfMeasure: unitOfMeasure || 'grams',
      currentLocation,
      purchaseOrder,
      unitCost,
      totalCost: unitCost ? unitCost * initialQuantity : undefined,
      notes,
      createdBy: req.user.id
    });

    await batch.save();

    // Populate for response
    await batch.populate([
      { path: 'product', select: 'name sku' },
      { path: 'supplier', select: 'name supplierId' },
      { path: 'currentLocation', select: 'name branchCode' }
    ]);

    logger.info('Batch created', { batchId: batch.batchId, product: productDoc.name, createdBy: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      batch
    });
  } catch (error) {
    logger.error('Create batch error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error creating batch'
    });
  }
});

// Update batch
router.put('/:id', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const allowedUpdates = [
      'cannabinoids',
      'terpenes',
      'harvestDate',
      'testDate',
      'expiryDate',
      'labCertificateUrl',
      'labName',
      'currentLocation',
      'unitCost',
      'notes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        batch[field] = req.body[field];
      }
    });

    // Recalculate total cost if unit cost changed
    if (req.body.unitCost !== undefined) {
      batch.totalCost = req.body.unitCost * batch.initialQuantity;
    }

    await batch.save();

    res.json({
      success: true,
      message: 'Batch updated successfully',
      batch
    });
  } catch (error) {
    logger.error('Update batch error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error updating batch'
    });
  }
});

// Approve batch (QA approval)
router.post('/:id/qa-approve', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    if (batch.qaStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Batch cannot be approved. Current QA status: ${batch.qaStatus}`
      });
    }

    batch.qaStatus = 'approved';
    batch.qaApprovedBy = req.user.id;
    batch.qaApprovedAt = new Date();
    batch.status = 'active';

    await batch.save();

    logger.info('Batch QA approved', { batchId: batch.batchId, approvedBy: req.user.id });

    res.json({
      success: true,
      message: 'Batch approved successfully',
      batch
    });
  } catch (error) {
    logger.error('QA approve batch error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error approving batch'
    });
  }
});

// Reject batch (QA rejection)
router.post('/:id/qa-reject', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    if (batch.qaStatus !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Batch cannot be rejected. Current QA status: ${batch.qaStatus}`
      });
    }

    batch.qaStatus = 'rejected';
    batch.qaRejectionReason = reason;
    batch.status = 'recalled';

    await batch.save();

    logger.info('Batch QA rejected', { batchId: batch.batchId, reason, rejectedBy: req.user.id });

    res.json({
      success: true,
      message: 'Batch rejected',
      batch
    });
  } catch (error) {
    logger.error('QA reject batch error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error rejecting batch'
    });
  }
});

// Record batch movement
router.post('/:id/move', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const { fromBranch, toBranch, quantity, transferId, reason } = req.body;

    if (!toBranch || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'toBranch and quantity are required'
      });
    }

    const batch = await Batch.findById(req.params.id);

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    await batch.recordMovement(
      fromBranch || batch.currentLocation,
      toBranch,
      quantity,
      req.user.id,
      transferId,
      reason
    );

    logger.info('Batch movement recorded', {
      batchId: batch.batchId,
      from: fromBranch,
      to: toBranch,
      quantity,
      movedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Batch movement recorded',
      batch
    });
  } catch (error) {
    logger.error('Record batch movement error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error recording batch movement'
    });
  }
});

// Get batches expiring soon
router.get('/reports/expiring', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const batches = await Batch.find({
      status: 'active',
      expiryDate: {
        $lte: futureDate,
        $gt: new Date()
      }
    })
      .populate('product', 'name sku')
      .populate('currentLocation', 'name branchCode')
      .sort({ expiryDate: 1 });

    res.json({
      success: true,
      batches,
      count: batches.length
    });
  } catch (error) {
    logger.error('Get expiring batches error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching expiring batches'
    });
  }
});

// Get low stock batches
router.get('/reports/low-stock', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const { threshold = 100 } = req.query;

    const batches = await Batch.find({
      status: 'active',
      remainingQuantity: { $lte: parseInt(threshold), $gt: 0 }
    })
      .populate('product', 'name sku')
      .populate('currentLocation', 'name branchCode')
      .sort({ remainingQuantity: 1 });

    res.json({
      success: true,
      batches,
      count: batches.length
    });
  } catch (error) {
    logger.error('Get low stock batches error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching low stock batches'
    });
  }
});

module.exports = router;
