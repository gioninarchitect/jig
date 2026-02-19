// Purchase Order Routes - PO management and goods receiving
const express = require('express');
const router = express.Router();
const logger = require('../modules/logger');
const PurchaseOrder = require('../modules/database/models/PurchaseOrder');
const Batch = require('../modules/database/models/Batch');
const Supplier = require('../modules/database/models/Supplier');
const Product = require('../modules/database/models/Product');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all purchase orders with filtering and pagination
router.get('/', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      supplier,
      paymentStatus,
      priority,
      sort = '-createdAt'
    } = req.query;

    const query = {};

    if (status) query.status = status;
    if (supplier) query.supplier = supplier;
    if (paymentStatus) query.paymentStatus = paymentStatus;
    if (priority) query.priority = priority;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [orders, total] = await Promise.all([
      PurchaseOrder.find(query)
        .populate('supplier', 'name supplierId')
        .populate('createdBy', 'firstName lastName')
        .populate('approvedBy', 'firstName lastName')
        .populate('deliveryBranch', 'name branchCode')
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit)),
      PurchaseOrder.countDocuments(query)
    ]);

    res.json({
      success: true,
      orders,
      total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page)
    });
  } catch (error) {
    logger.error('Get purchase orders error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase orders'
    });
  }
});

// Get POs requiring action
router.get('/requiring-action', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const orders = await PurchaseOrder.findRequiringAction();

    res.json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    logger.error('Get POs requiring action error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching POs requiring action'
    });
  }
});

// Get overdue POs
router.get('/overdue', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const orders = await PurchaseOrder.findOverdue();

    res.json({
      success: true,
      orders,
      count: orders.length
    });
  } catch (error) {
    logger.error('Get overdue POs error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching overdue POs'
    });
  }
});

// Get single purchase order
router.get('/:id', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name supplierId contactPerson email phone address')
      .populate('items.product', 'name sku category')
      .populate('items.receivedBatches', 'batchId remainingQuantity qaStatus')
      .populate('createdBy', 'firstName lastName email')
      .populate('submittedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('orderedBy', 'firstName lastName')
      .populate('receivedBy', 'firstName lastName')
      .populate('deliveryBranch', 'name branchCode address')
      .populate('statusHistory.changedBy', 'firstName lastName');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    logger.error('Get purchase order error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching purchase order'
    });
  }
});

// Create purchase order
router.post('/', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const {
      supplier,
      items,
      taxRate,
      shippingCost,
      discount,
      deliveryBranch,
      expectedDeliveryDate,
      priority,
      notes,
      internalNotes
    } = req.body;

    // Validate supplier
    const supplierDoc = await Supplier.findById(supplier);
    if (!supplierDoc) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    if (!supplierDoc.isInGoodStanding()) {
      return res.status(400).json({
        success: false,
        message: 'Supplier is not in good standing. Please verify compliance status.'
      });
    }

    // Process items - snapshot product info
    const processedItems = await Promise.all(items.map(async (item) => {
      const product = await Product.findById(item.product);
      return {
        product: item.product,
        productName: product?.name || item.productName,
        productSku: product?.sku || item.productSku,
        description: item.description,
        quantity: item.quantity,
        unitOfMeasure: item.unitOfMeasure || 'units',
        unitPrice: item.unitPrice,
        totalPrice: item.quantity * item.unitPrice
      };
    }));

    const order = new PurchaseOrder({
      supplier,
      items: processedItems,
      taxRate: taxRate || 15,
      shippingCost: shippingCost || 0,
      discount: discount || 0,
      deliveryBranch,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : undefined,
      priority: priority || 'normal',
      notes,
      internalNotes,
      createdBy: req.user.id
    });

    // Add initial status history
    order.statusHistory.push({
      status: 'draft',
      changedBy: req.user.id,
      notes: 'PO created'
    });

    await order.save();

    // Populate for response
    await order.populate([
      { path: 'supplier', select: 'name supplierId' },
      { path: 'deliveryBranch', select: 'name branchCode' }
    ]);

    logger.info('Purchase order created', { poNumber: order.poNumber, supplier: supplierDoc.name, createdBy: req.user.id });

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      order
    });
  } catch (error) {
    logger.error('Create purchase order error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error creating purchase order'
    });
  }
});

// Update purchase order (draft only)
router.put('/:id', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (order.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft POs can be edited'
      });
    }

    const allowedUpdates = [
      'items', 'taxRate', 'shippingCost', 'discount', 'deliveryBranch',
      'expectedDeliveryDate', 'priority', 'notes', 'internalNotes'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        order[field] = req.body[field];
      }
    });

    await order.save();

    res.json({
      success: true,
      message: 'Purchase order updated',
      order
    });
  } catch (error) {
    logger.error('Update purchase order error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error updating purchase order'
    });
  }
});

// Submit PO for approval
router.post('/:id/submit', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    await order.submit(req.user.id);

    logger.info('PO submitted for approval', { poNumber: order.poNumber, submittedBy: req.user.id });

    res.json({
      success: true,
      message: 'Purchase order submitted for approval',
      order
    });
  } catch (error) {
    logger.error('Submit PO error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error submitting purchase order'
    });
  }
});

// Approve PO
router.post('/:id/approve', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { notes } = req.body;
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    await order.approve(req.user.id, notes);

    logger.info('PO approved', { poNumber: order.poNumber, approvedBy: req.user.id });

    res.json({
      success: true,
      message: 'Purchase order approved',
      order
    });
  } catch (error) {
    logger.error('Approve PO error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error approving purchase order'
    });
  }
});

// Reject PO
router.post('/:id/reject', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    await order.reject(req.user.id, reason);

    logger.info('PO rejected', { poNumber: order.poNumber, reason, rejectedBy: req.user.id });

    res.json({
      success: true,
      message: 'Purchase order rejected and returned to draft',
      order
    });
  } catch (error) {
    logger.error('Reject PO error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error rejecting purchase order'
    });
  }
});

// Mark PO as ordered
router.post('/:id/mark-ordered', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const { supplierReference } = req.body;
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    await order.markOrdered(req.user.id, supplierReference);

    logger.info('PO marked as ordered', { poNumber: order.poNumber, orderedBy: req.user.id });

    res.json({
      success: true,
      message: 'Purchase order marked as ordered',
      order
    });
  } catch (error) {
    logger.error('Mark PO ordered error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error marking purchase order as ordered'
    });
  }
});

// Receive goods for a line item (creates batch)
router.post('/:id/receive', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const {
      itemId,
      quantity,
      cannabinoids,
      terpenes,
      harvestDate,
      testDate,
      expiryDate,
      labCertificateUrl,
      labName,
      notes
    } = req.body;

    if (!itemId || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Item ID and quantity are required'
      });
    }

    const order = await PurchaseOrder.findById(req.params.id)
      .populate('supplier');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    const item = order.items.id(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in purchase order'
      });
    }

    // Create batch for received goods
    const batch = new Batch({
      product: item.product,
      supplier: order.supplier._id,
      purchaseOrder: order._id,
      cannabinoids,
      terpenes,
      harvestDate: harvestDate ? new Date(harvestDate) : undefined,
      testDate: testDate ? new Date(testDate) : undefined,
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      labCertificateUrl,
      labName,
      initialQuantity: quantity,
      remainingQuantity: quantity,
      unitOfMeasure: item.unitOfMeasure,
      currentLocation: order.deliveryBranch,
      unitCost: item.unitPrice,
      totalCost: item.unitPrice * quantity,
      notes,
      createdBy: req.user.id,
      qaStatus: 'pending'
    });

    await batch.save();

    // Update PO with received goods
    await order.receiveGoods(itemId, quantity, batch._id, req.user.id, notes);

    // Update supplier metrics
    await Supplier.findByIdAndUpdate(order.supplier._id, {
      $inc: { 'performance.totalOrders': 0 } // Just touch the document for now
    });

    logger.info('Goods received', {
      poNumber: order.poNumber,
      batchId: batch.batchId,
      quantity,
      receivedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Goods received and batch created',
      batch,
      order
    });
  } catch (error) {
    logger.error('Receive goods error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error receiving goods'
    });
  }
});

// Cancel PO
router.post('/:id/cancel', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Cancellation reason is required'
      });
    }

    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    await order.cancel(req.user.id, reason);

    logger.info('PO cancelled', { poNumber: order.poNumber, reason, cancelledBy: req.user.id });

    res.json({
      success: true,
      message: 'Purchase order cancelled',
      order
    });
  } catch (error) {
    logger.error('Cancel PO error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: error.message || 'Error cancelling purchase order'
    });
  }
});

// Add document to PO
router.post('/:id/documents', authenticateToken, requireRole(['admin', 'staff_manager']), async (req, res) => {
  try {
    const { type, name, url } = req.body;

    if (!type || !url) {
      return res.status(400).json({
        success: false,
        message: 'Document type and URL are required'
      });
    }

    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    order.documents.push({
      type,
      name: name || type,
      url,
      uploadedBy: req.user.id
    });

    await order.save();

    res.json({
      success: true,
      message: 'Document added',
      documents: order.documents
    });
  } catch (error) {
    logger.error('Add PO document error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error adding document'
    });
  }
});

// Record payment
router.post('/:id/payment', authenticateToken, requireRole(['admin']), async (req, res) => {
  try {
    const { amount, method, reference } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount is required'
      });
    }

    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    order.payments.push({
      amount,
      method: method || 'eft',
      reference,
      paidAt: new Date(),
      recordedBy: req.user.id
    });

    // Update payment status
    const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= order.total) {
      order.paymentStatus = 'paid';
    } else if (totalPaid > 0) {
      order.paymentStatus = 'partial';
    }

    await order.save();

    logger.info('PO payment recorded', { poNumber: order.poNumber, amount, recordedBy: req.user.id });

    res.json({
      success: true,
      message: 'Payment recorded',
      order
    });
  } catch (error) {
    logger.error('Record PO payment error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error recording payment'
    });
  }
});

module.exports = router;
