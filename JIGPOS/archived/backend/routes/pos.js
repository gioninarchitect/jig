// POS Routes - Point of Sale operations
const express = require('express');
const router = express.Router();
const logger = require('../modules/logger');
const Sale = require('../modules/database/models/Sale');
const BranchInventory = require('../modules/database/models/BranchInventory');
const TillSession = require('../modules/database/models/TillSession');
const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const { authenticateToken, requireRole } = require('../middleware/auth');
const invoiceGenerator = require('../services/invoiceGenerator');
const emailService = require('../services/emailService');

// Create new sale
router.post('/sale', authenticateToken, async (req, res) => {
  try {
    const {
      branchId,
      track,
      items,
      orderType,
      customerInfo,
      paymentMethod,
      paymentReference,
      proofOfPayment
    } = req.body;

    // Validation
    if (!branchId || !track || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Branch, track, and items are required'
      });
    }

    // Get active till session
    const tillSession = await TillSession.findOne({
      branchId,
      status: 'open'
    });

    // Create sale
    const sale = new Sale({
      branchId,
      tillSessionId: tillSession?._id,
      cashierId: req.user.id,
      track,
      orderType: orderType || 'walk-in',
      customerName: customerInfo?.name,
      customerEmail: customerInfo?.email,
      customerPhone: customerInfo?.phone,
      items: items.map(item => ({
        productId: item.productId,
        type: 'product',
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        taxRate: 15
      }))
    });

    // Calculate total amount manually (pre-save hooks haven't run yet)
    const calculatedSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const calculatedTax = calculatedSubtotal * 0.15;
    const calculatedTotal = calculatedSubtotal + calculatedTax;

    // Add payment if provided
    if (paymentMethod) {
      sale.payments.push({
        method: paymentMethod,
        amount: calculatedTotal,
        reference: paymentReference,
        status: paymentMethod === 'eft' ? 'pending' : 'approved',
        proofOfPayment: proofOfPayment || null,
        processedAt: paymentMethod !== 'eft' ? new Date() : null
      });

      if (paymentMethod !== 'eft') {
        sale.paymentStatus = 'paid';
        sale.status = 'completed';

        // Deduct inventory for instant payments
        // OPTIMIZED: Batch query instead of N+1 queries
        const productIds = sale.items.map(item => item.productId);
        const inventories = await BranchInventory.find({
          branchId,
          productId: { $in: productIds }
        });

        // Create map for O(1) lookup
        const inventoryMap = new Map(inventories.map(inv => [inv.productId.toString(), inv]));

        // Deduct stock for each item
        for (const item of sale.items) {
          try {
            const inventory = inventoryMap.get(item.productId.toString());
            if (inventory) {
              await inventory.deductStock(item.quantity, sale.saleNumber, req.user.id);
            }
          } catch (error) {
            logger.error('POS inventory deduction error', { error: error.message, stack: error.stack });
          }
        }

        sale.inventoryDeducted = true;
        sale.inventoryDeductedAt = new Date();
      } else {
        sale.paymentStatus = 'pending';
        sale.status = 'pending_payment';
      }
    } else {
      sale.status = 'draft';
    }

    await sale.save();

    // Update till session
    if (tillSession && sale.status === 'completed') {
      tillSession.transactionCount += 1;
      tillSession.totalSales += sale.totalAmount;

      if (paymentMethod === 'cash') {
        tillSession.totalCash += sale.totalAmount;
      } else if (paymentMethod === 'card' || paymentMethod === 'instapay') {
        tillSession.totalCard += sale.totalAmount;
      } else if (paymentMethod === 'eft') {
        tillSession.totalEFT += sale.totalAmount;
      }

      await tillSession.save();
    }

    // Send receipt email for completed instant payments (cash, card, instapay)
    if (sale.status === 'completed' && customerInfo?.email) {
      try {
        // Generate receipt PDF
        let pdfBuffer = null;
        try {
          const branch = await Branch.findById(branchId);
          pdfBuffer = await invoiceGenerator.generateInvoice(sale, branch, 'receipt');
        } catch (pdfError) {
          logger.warn('Could not generate receipt PDF:', pdfError.message);
        }

        // Send receipt email with full sale data for SA standard receipt
        await emailService.sendReceipt(
          customerInfo.email,
          pdfBuffer,
          sale.saleNumber,
          sale.totalAmount,
          sale // Pass full sale for detailed receipt template
        );

        logger.info(`Receipt email sent to ${customerInfo.email} for sale ${sale.saleNumber}`);
      } catch (emailError) {
        logger.error('Failed to send receipt email:', emailError);
        // Don't fail the sale if email fails
      }
    }

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      sale: {
        saleNumber: sale.saleNumber,
        _id: sale._id,
        totalAmount: sale.totalAmount,
        status: sale.status,
        paymentStatus: sale.paymentStatus
      }
    });
  } catch (error) {
    logger.error('POS create sale error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error creating sale',
      error: error.message
    });
  }
});

// Get sales for branch (today)
router.get('/sales/today', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager', 'staff_assistant']), async (req, res) => {
  try {
    const { branchId } = req.query;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const sales = await Sale.find({
      branchId,
      createdAt: { $gte: today },
      status: { $in: ['completed', 'pending_payment'] }
    })
      .populate('cashierId', 'firstName lastName')
      .sort({ createdAt: -1 });

    const totalSales = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const completedSales = sales.filter(s => s.status === 'completed').length;
    const pendingPayments = sales.filter(s => s.paymentStatus === 'pending').length;

    res.json({
      success: true,
      sales,
      stats: {
        totalSales,
        totalTransactions: sales.length,
        completedSales,
        pendingPayments
      }
    });
  } catch (error) {
    logger.error('POS get today sales error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching sales'
    });
  }
});

// Approve/Reject EFT payment (Admin only)
router.post('/payment/:saleId/approve', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager']), async (req, res) => {
  try {
    const { saleId } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Find EFT payment
    const eftPayment = sale.payments.find(p => p.method === 'eft' && p.status === 'pending');

    if (!eftPayment) {
      return res.status(400).json({
        success: false,
        message: 'No pending EFT payment found'
      });
    }

    if (action === 'approve') {
      eftPayment.status = 'approved';
      eftPayment.approvedBy = req.user.id;
      eftPayment.approvedAt = new Date();

      sale.paymentStatus = 'paid';
      sale.status = 'completed';

      // Deduct inventory
      if (!sale.inventoryDeducted) {
        for (const item of sale.items) {
          try {
            const inventory = await BranchInventory.findOne({
              branchId: sale.branchId,
              productId: item.productId
            });

            if (inventory) {
              await inventory.deductStock(item.quantity, sale.saleNumber, req.user.id);
            }
          } catch (error) {
            logger.error('POS inventory deduction error', { error: error.message, stack: error.stack });
          }
        }

        sale.inventoryDeducted = true;
        sale.inventoryDeductedAt = new Date();
      }

      // Send receipt/invoice email after payment approval (same as order approval)
      if (sale.customerEmail) {
        try {
          // Generate invoice PDF
          let pdfBuffer = null;
          try {
            const branch = await Branch.findById(sale.branchId);
            pdfBuffer = await invoiceGenerator.generateInvoice(sale, branch, 'receipt');
          } catch (pdfError) {
            logger.warn('Could not generate receipt PDF:', pdfError.message);
          }

          // Send receipt email
          await emailService.sendReceipt(
            sale.customerEmail,
            pdfBuffer,
            sale.saleNumber,
            sale.totalAmount
          );

          logger.info(`Receipt email sent to ${sale.customerEmail} for sale ${sale.saleNumber}`);
        } catch (emailError) {
          logger.error('Failed to send receipt email:', emailError);
          // Don't fail the approval if email fails
        }
      }
    } else if (action === 'reject') {
      eftPayment.status = 'rejected';
      eftPayment.rejectionReason = notes;
      eftPayment.approvedBy = req.user.id;
      eftPayment.approvedAt = new Date();

      sale.paymentStatus = 'pending';
      sale.status = 'voided';
      sale.voidedBy = req.user.id;
      sale.voidedAt = new Date();
      sale.voidReason = notes || 'Payment rejected';
    }

    await sale.save();

    res.json({
      success: true,
      message: `Payment ${action}d successfully`,
      sale: {
        saleNumber: sale.saleNumber,
        status: sale.status,
        paymentStatus: sale.paymentStatus
      }
    });
  } catch (error) {
    logger.error('POS approve payment error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error processing payment approval'
    });
  }
});

// Get pending payments (Admin dashboard)
router.get('/payments/pending', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager']), async (req, res) => {
  try {
    const { branchId } = req.query;

    const query = {
      paymentStatus: 'pending',
      'payments.method': 'eft',
      'payments.status': 'pending'
    };

    if (branchId && branchId !== 'all') {
      query.branchId = branchId;
    }

    const pendingPayments = await Sale.find(query)
      .populate('branchId', 'name branchCode')
      .populate('cashierId', 'firstName lastName')
      .populate('customerId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      pendingPayments,
      total: pendingPayments.length
    });
  } catch (error) {
    logger.error('POS get pending payments error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching pending payments'
    });
  }
});

// Void sale
router.post('/sale/:saleId/void', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager']), async (req, res) => {
  try {
    const { saleId } = req.params;
    const { reason } = req.body;

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'voided') {
      return res.status(400).json({
        success: false,
        message: 'Sale is already voided'
      });
    }

    await sale.voidSale(req.user.id, reason);

    res.json({
      success: true,
      message: 'Sale voided successfully'
    });
  } catch (error) {
    logger.error('POS void sale error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error voiding sale'
    });
  }
});

// Generate invoice PDF
router.get('/sale/:saleId/invoice', authenticateToken, async (req, res) => {
  try {
    const { saleId } = req.params;
    const { download = true } = req.query;

    const sale = await Sale.findById(saleId)
      .populate('branchId')
      .populate('cashierId', 'firstName lastName');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Generate PDF
    const pdfBuffer = await invoiceGenerator.generateInvoice(sale, sale.branchId, 'invoice');

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', download === 'true'
      ? `attachment; filename="Invoice-${sale.saleNumber}.pdf"`
      : `inline; filename="Invoice-${sale.saleNumber}.pdf"`
    );

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('POS generate invoice error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error generating invoice',
      error: error.message
    });
  }
});

// Generate receipt PDF
router.get('/sale/:saleId/receipt', authenticateToken, async (req, res) => {
  try {
    const { saleId } = req.params;
    const { download = true } = req.query;

    const sale = await Sale.findById(saleId)
      .populate('branchId')
      .populate('cashierId', 'firstName lastName');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Generate PDF
    const pdfBuffer = await invoiceGenerator.generateInvoice(sale, sale.branchId, 'receipt');

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', download === 'true'
      ? `attachment; filename="Receipt-${sale.saleNumber}.pdf"`
      : `inline; filename="Receipt-${sale.saleNumber}.pdf"`
    );

    res.send(pdfBuffer);
  } catch (error) {
    logger.error('POS generate receipt error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error generating receipt',
      error: error.message
    });
  }
});

// Get receipt as plain text (for copying)
router.get('/sale/:saleId/receipt-text', authenticateToken, async (req, res) => {
  try {
    const { saleId } = req.params;

    const sale = await Sale.findById(saleId)
      .populate('branchId')
      .populate('cashierId', 'firstName lastName');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Generate plain text receipt
    const branchName = sale.branchId?.name || 'Basotho Medical Herbs';
    const cashierName = sale.cashierId
      ? `${sale.cashierId.firstName || ''} ${sale.cashierId.lastName || ''}`.trim()
      : 'System';

    let receiptText = `
================================
${branchName.toUpperCase()}
================================
Receipt #: ${sale.saleNumber}
Date: ${new Date(sale.createdAt).toLocaleString('en-ZA')}
Cashier: ${cashierName}
--------------------------------
ITEMS:
`;

    sale.items.forEach(item => {
      receiptText += `${item.name}\n`;
      receiptText += `  ${item.quantity} x R${item.unitPrice.toFixed(2)} = R${(item.quantity * item.unitPrice).toFixed(2)}\n`;
    });

    receiptText += `--------------------------------
Subtotal:  R${(sale.subtotal || 0).toFixed(2)}
VAT (15%): R${(sale.totalTax || 0).toFixed(2)}
${sale.totalDiscount > 0 ? `Discount:  -R${sale.totalDiscount.toFixed(2)}\n` : ''}--------------------------------
TOTAL:     R${(sale.totalAmount || 0).toFixed(2)}
--------------------------------
Payment: ${sale.payments?.[0]?.method?.toUpperCase() || 'N/A'}
Status: ${sale.paymentStatus || 'Pending'}
================================
Thank you for your purchase!
www.basothomedicalherbs.ls
================================
`;

    res.json({
      success: true,
      receiptText: receiptText.trim()
    });
  } catch (error) {
    logger.error('POS get receipt text error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error generating receipt text',
      error: error.message
    });
  }
});

// Email invoice/receipt
router.post('/sale/:saleId/email', authenticateToken, async (req, res) => {
  try {
    const { saleId } = req.params;
    const { email, type = 'invoice' } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required'
      });
    }

    const sale = await Sale.findById(saleId).populate('branchId');

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    // Generate PDF
    const pdfBuffer = await invoiceGenerator.generateInvoice(sale, sale.branchId, type);

    // Send email with attachment (pass full sale for SA standard receipt)
    let emailResult;
    if (type === 'receipt') {
      emailResult = await emailService.sendReceipt(
        email,
        pdfBuffer,
        sale.saleNumber,
        sale.totalAmount,
        sale // Pass full sale for detailed receipt template
      );
    } else {
      emailResult = await emailService.sendInvoice(
        email,
        pdfBuffer,
        sale.saleNumber,
        sale.totalAmount
      );
    }

    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} sent to ${email}`,
      messageId: emailResult.messageId
    });
  } catch (error) {
    logger.error('POS email document error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error sending email',
      error: error.message
    });
  }
});

// ============================================
// TILL SESSION MANAGEMENT
// ============================================

// Open till session (Start shift)
router.post('/till/open', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager', 'staff_assistant']), async (req, res) => {
  try {
    const { branchId, tillNumber, openingFloat, openingNotes } = req.body;

    // Validation
    if (!branchId || !tillNumber) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID and Till Number are required'
      });
    }

    // Check if there's already an open session for this till
    const existingSession = await TillSession.findOne({
      branchId,
      tillNumber,
      status: 'open'
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'This till already has an open session',
        session: existingSession
      });
    }

    // Create new till session
    const tillSession = new TillSession({
      branchId,
      tillNumber,
      openedBy: req.user.id,
      openingFloat: openingFloat || 500,
      openingNotes: openingNotes || '',
      status: 'open'
    });

    await tillSession.save();

    res.status(201).json({
      success: true,
      message: 'Till session opened successfully',
      session: {
        sessionNumber: tillSession.sessionNumber,
        _id: tillSession._id,
        tillNumber: tillSession.tillNumber,
        openingFloat: tillSession.openingFloat,
        openedAt: tillSession.openedAt,
        status: tillSession.status
      }
    });
  } catch (error) {
    logger.error('POS open till session error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error opening till session',
      error: error.message
    });
  }
});

// Get active till session
router.get('/till/active', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager', 'staff_assistant']), async (req, res) => {
  try {
    const { branchId, tillNumber } = req.query;

    if (!branchId || !tillNumber) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID and Till Number are required'
      });
    }

    const activeSession = await TillSession.findOne({
      branchId,
      tillNumber,
      status: 'open'
    }).populate('openedBy', 'firstName lastName email');

    if (!activeSession) {
      return res.json({
        success: true,
        session: null,
        message: 'No active session found'
      });
    }

    // Calculate current expected cash
    const totalCashIns = activeSession.cashIns.reduce((sum, op) => sum + op.amount, 0);
    const totalCashOuts = activeSession.cashOuts.reduce((sum, op) => sum + op.amount, 0);
    const expectedCash = activeSession.openingFloat + activeSession.totalCash + totalCashIns - totalCashOuts - activeSession.totalRefunds;

    res.json({
      success: true,
      session: {
        ...activeSession.toObject(),
        currentExpectedCash: expectedCash
      }
    });
  } catch (error) {
    logger.error('POS get active till session error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching active session',
      error: error.message
    });
  }
});

// Close till session (End shift with cash reconciliation)
router.post('/till/close', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager', 'staff_assistant']), async (req, res) => {
  try {
    const { sessionId, denominations, closingNotes } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required'
      });
    }

    if (!denominations) {
      return res.status(400).json({
        success: false,
        message: 'Cash denominations are required for closing'
      });
    }

    const tillSession = await TillSession.findById(sessionId);

    if (!tillSession) {
      return res.status(404).json({
        success: false,
        message: 'Till session not found'
      });
    }

    if (tillSession.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Till session is not open'
      });
    }

    // Close the session with denominations
    await tillSession.closeSession(req.user.id, denominations, closingNotes);

    res.json({
      success: true,
      message: 'Till session closed successfully',
      session: {
        sessionNumber: tillSession.sessionNumber,
        openingFloat: tillSession.openingFloat,
        closedAt: tillSession.closedAt,
        expectedCash: tillSession.expectedCash,
        actualCash: tillSession.actualCash,
        variance: tillSession.variance,
        requiresApproval: tillSession.requiresApproval,
        totalSales: tillSession.totalSales,
        transactionCount: tillSession.transactionCount,
        totalCash: tillSession.totalCash,
        totalCard: tillSession.totalCard,
        totalEFT: tillSession.totalEFT,
        totalInstapay: tillSession.totalInstapay
      }
    });
  } catch (error) {
    logger.error('POS close till session error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error closing till session',
      error: error.message
    });
  }
});

// Record cash-in (add cash to till)
router.post('/till/cash-in', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager', 'staff_assistant']), async (req, res) => {
  try {
    const { sessionId, amount, reason } = req.body;

    if (!sessionId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, amount, and reason are required'
      });
    }

    const tillSession = await TillSession.findById(sessionId);

    if (!tillSession) {
      return res.status(404).json({
        success: false,
        message: 'Till session not found'
      });
    }

    if (tillSession.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Till session is not open'
      });
    }

    // Add cash-in operation
    tillSession.cashIns.push({
      amount: parseFloat(amount),
      reason,
      recordedBy: req.user.id,
      timestamp: new Date()
    });

    await tillSession.save();

    res.json({
      success: true,
      message: 'Cash-in recorded successfully',
      cashIn: tillSession.cashIns[tillSession.cashIns.length - 1]
    });
  } catch (error) {
    logger.error('POS record cash-in error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error recording cash-in',
      error: error.message
    });
  }
});

// Record cash-out (remove cash from till)
router.post('/till/cash-out', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager', 'staff_assistant']), async (req, res) => {
  try {
    const { sessionId, amount, reason } = req.body;

    if (!sessionId || !amount || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Session ID, amount, and reason are required'
      });
    }

    const tillSession = await TillSession.findById(sessionId);

    if (!tillSession) {
      return res.status(404).json({
        success: false,
        message: 'Till session not found'
      });
    }

    if (tillSession.status !== 'open') {
      return res.status(400).json({
        success: false,
        message: 'Till session is not open'
      });
    }

    // Add cash-out operation
    tillSession.cashOuts.push({
      amount: parseFloat(amount),
      reason,
      recordedBy: req.user.id,
      timestamp: new Date()
    });

    await tillSession.save();

    res.json({
      success: true,
      message: 'Cash-out recorded successfully',
      cashOut: tillSession.cashOuts[tillSession.cashOuts.length - 1]
    });
  } catch (error) {
    logger.error('POS record cash-out error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error recording cash-out',
      error: error.message
    });
  }
});

// Get till sessions for branch (today)
router.get('/till/sessions/today', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager']), async (req, res) => {
  try {
    const { branchId } = req.query;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    const sessions = await TillSession.getTodaySessions(branchId);

    res.json({
      success: true,
      sessions,
      total: sessions.length
    });
  } catch (error) {
    logger.error('POS get today sessions error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching sessions',
      error: error.message
    });
  }
});

// Get till session history (for reports)
router.get('/till/sessions/history', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager']), async (req, res) => {
  try {
    const { branchId, startDate, endDate, tillNumber } = req.query;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    const query = {
      branchId,
      status: 'closed'
    };

    if (tillNumber) {
      query.tillNumber = tillNumber;
    }

    if (startDate && endDate) {
      query.closedAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const sessions = await TillSession.find(query)
      .populate('openedBy closedBy', 'firstName lastName')
      .sort({ closedAt: -1 })
      .limit(100);

    // Calculate totals
    const totals = {
      totalSales: sessions.reduce((sum, s) => sum + s.totalSales, 0),
      totalTransactions: sessions.reduce((sum, s) => sum + s.transactionCount, 0),
      totalVariance: sessions.reduce((sum, s) => sum + (s.variance || 0), 0),
      sessionsRequiringApproval: sessions.filter(s => s.requiresApproval).length
    };

    res.json({
      success: true,
      sessions,
      totals,
      count: sessions.length
    });
  } catch (error) {
    logger.error('POS get session history error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching session history',
      error: error.message
    });
  }
});

// Approve till session (Manager only - for variances > R50)
router.post('/till/session/:sessionId/approve', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'staff_manager']), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;

    const tillSession = await TillSession.findById(sessionId);

    if (!tillSession) {
      return res.status(404).json({
        success: false,
        message: 'Till session not found'
      });
    }

    if (!tillSession.requiresApproval) {
      return res.status(400).json({
        success: false,
        message: 'This session does not require approval'
      });
    }

    tillSession.approvedBy = req.user.id;
    tillSession.approvedAt = new Date();
    tillSession.requiresApproval = false;

    if (notes) {
      tillSession.discrepancyNotes = notes;
    }

    await tillSession.save();

    res.json({
      success: true,
      message: 'Till session approved successfully',
      session: {
        sessionNumber: tillSession.sessionNumber,
        variance: tillSession.variance,
        approvedBy: tillSession.approvedBy,
        approvedAt: tillSession.approvedAt
      }
    });
  } catch (error) {
    logger.error('POS approve till session error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error approving till session',
      error: error.message
    });
  }
});

// Get sales with optional filters
router.get('/sales', authenticateToken, async (req, res) => {
  try {
    const { branchId, saleNumber, status, startDate, endDate, limit = 50 } = req.query;

    const filter = {};

    if (branchId) filter.branchId = branchId;
    if (saleNumber) filter.saleNumber = saleNumber;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const sales = await Sale.find(filter)
      .populate('branchId', 'name')
      .populate('cashierId', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      sales: sales
    });
  } catch (error) {
    logger.error('POS get sales error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error retrieving sales',
      error: error.message
    });
  }
});

// Process refund for a sale
router.post('/sale/:saleId/refund', authenticateToken, async (req, res) => {
  try {
    const { saleId } = req.params;
    const { reason, items, refundAmount } = req.body;

    // Validation
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Refund reason is required'
      });
    }

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

    if (sale.status === 'refunded') {
      return res.status(400).json({
        success: false,
        message: 'Sale has already been refunded'
      });
    }

    if (sale.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed sales can be refunded'
      });
    }

    // Calculate refund amount
    const totalRefund = refundAmount || sale.totalAmount;

    // Process refund
    await sale.processRefund(req.user.id, totalRefund, reason);

    // Restore inventory if items specified
    if (items && items.length > 0) {
      for (const item of items) {
        try {
          const inventory = await BranchInventory.findOne({
            branchId: sale.branchId,
            productId: item.productId
          });

          if (inventory) {
            await inventory.addStock(item.quantity, `Refund: ${sale.saleNumber}`, req.user.id);
          }
        } catch (error) {
          logger.error('POS inventory restore error', { error: error.message, stack: error.stack });
        }
      }
    }

    // Update till session if exists
    if (sale.tillSessionId) {
      const tillSession = await TillSession.findById(sale.tillSessionId);
      if (tillSession && tillSession.status === 'open') {
        tillSession.totalRefunds += totalRefund;
        await tillSession.save();
      }
    }

    res.json({
      success: true,
      message: 'Sale refunded successfully',
      sale: {
        saleNumber: sale.saleNumber,
        _id: sale._id,
        refundAmount: totalRefund,
        status: sale.status,
        refundedAt: sale.refundedAt
      }
    });
  } catch (error) {
    logger.error('POS refund error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
});

// Export sales to CSV for accounting software (Xero, QuickBooks, Sage)
router.get('/sales/export/csv', authenticateToken, async (req, res) => {
  try {
    const { startDate, endDate, branchId, format } = req.query;

    // Build query
    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (branchId) {
      query.branchId = branchId;
    }

    // Only export completed sales
    query.status = 'completed';
    query.paymentStatus = 'paid';

    // Fetch sales with branch info
    const sales = await Sale.find(query)
      .populate('branchId', 'name code')
      .sort({ createdAt: 1 });

    if (!sales || sales.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No sales found for the specified criteria'
      });
    }

    // Generate CSV based on format
    let csvContent = '';

    if (format === 'xero') {
      // Xero format: InvoiceNumber,InvoiceDate,DueDate,CustomerName,EmailAddress,PONumber,Description,Quantity,UnitAmount,AccountCode,TaxType,TaxAmount,Total
      csvContent = 'InvoiceNumber,InvoiceDate,DueDate,CustomerName,EmailAddress,PONumber,Description,Quantity,UnitAmount,AccountCode,TaxType,TaxAmount,Total\n';

      sales.forEach(sale => {
        sale.items.forEach(item => {
          const invoiceDate = sale.createdAt.toISOString().split('T')[0];
          const customerName = sale.customerName || 'Walk-in Customer';
          const email = sale.customerEmail || '';
          const description = item.name;
          const quantity = item.quantity;
          const unitPrice = item.unitPrice.toFixed(2);
          const taxAmount = (item.taxAmount || 0).toFixed(2);
          const lineTotal = (item.total || (item.quantity * item.unitPrice)).toFixed(2);

          csvContent += `"${sale.invoiceNumber || sale.saleNumber}","${invoiceDate}","${invoiceDate}","${customerName}","${email}","","${description}",${quantity},${unitPrice},"200","15%",${taxAmount},${lineTotal}\n`;
        });
      });

    } else if (format === 'quickbooks') {
      // QuickBooks format: Date,Transaction Type,Num,Name,Memo/Description,Account,Amount,Tax Code,Tax Amount
      csvContent = 'Date,Transaction Type,Num,Name,Memo/Description,Account,Amount,Tax Code,Tax Amount\n';

      sales.forEach(sale => {
        sale.items.forEach(item => {
          const date = sale.createdAt.toISOString().split('T')[0];
          const customerName = sale.customerName || 'Walk-in Customer';
          const description = item.name;
          const amount = (item.total || (item.quantity * item.unitPrice)).toFixed(2);
          const taxAmount = (item.taxAmount || 0).toFixed(2);

          csvContent += `"${date}","Invoice","${sale.invoiceNumber || sale.saleNumber}","${customerName}","${description}","Sales",${amount},"VAT",${taxAmount}\n`;
        });
      });

    } else if (format === 'sage') {
      // Sage format: Type,Invoice Number,Date,Customer Reference,Description,Net Amount,Tax Code,Tax Rate,Tax Amount,Gross Amount
      csvContent = 'Type,Invoice Number,Date,Customer Reference,Description,Net Amount,Tax Code,Tax Rate,Tax Amount,Gross Amount\n';

      sales.forEach(sale => {
        sale.items.forEach(item => {
          const date = sale.createdAt.toISOString().split('T')[0];
          const customerRef = sale.customerName || 'Walk-in';
          const description = item.name;
          const netAmount = (item.subtotal || (item.quantity * item.unitPrice)).toFixed(2);
          const taxRate = item.taxRate || 15;
          const taxAmount = (item.taxAmount || 0).toFixed(2);
          const grossAmount = (item.total || (item.quantity * item.unitPrice)).toFixed(2);

          csvContent += `"SI","${sale.invoiceNumber || sale.saleNumber}","${date}","${customerRef}","${description}",${netAmount},"T1",${taxRate},${taxAmount},${grossAmount}\n`;
        });
      });

    } else {
      // Generic format - comprehensive for any accounting software
      csvContent = 'Sale Number,Invoice Number,Date,Branch,Customer Name,Customer Email,Item Name,Quantity,Unit Price,Discount,Subtotal,Tax Rate,Tax Amount,Total,Payment Method,Payment Status,Order Type\n';

      sales.forEach(sale => {
        const branchName = sale.branchId?.name || 'Unknown';
        const date = sale.createdAt.toISOString().split('T')[0];
        const paymentMethod = sale.payments[0]?.method || 'N/A';

        sale.items.forEach(item => {
          const customerName = sale.customerName || 'Walk-in Customer';
          const email = sale.customerEmail || '';
          const itemName = item.name;
          const quantity = item.quantity;
          const unitPrice = item.unitPrice.toFixed(2);
          const discount = (item.discount || 0).toFixed(2);
          const subtotal = (item.subtotal || (item.quantity * item.unitPrice)).toFixed(2);
          const taxRate = item.taxRate || 15;
          const taxAmount = (item.taxAmount || 0).toFixed(2);
          const total = (item.total || (item.quantity * item.unitPrice)).toFixed(2);

          csvContent += `"${sale.saleNumber}","${sale.invoiceNumber || ''}","${date}","${branchName}","${customerName}","${email}","${itemName}",${quantity},${unitPrice},${discount},${subtotal},${taxRate},${taxAmount},${total},"${paymentMethod}","${sale.paymentStatus}","${sale.orderType}"\n`;
        });
      });
    }

    // Set headers for file download
    const formatName = format || 'generic';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `sales-export-${formatName}-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);

  } catch (error) {
    logger.error('POS CSV export error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error exporting sales to CSV',
      error: error.message
    });
  }
});

module.exports = router;
