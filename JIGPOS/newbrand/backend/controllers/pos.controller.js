// POS Controller — Business logic extracted from routes/pos.js
const logger = require('../modules/logger');
const Sale = require('../modules/database/models/Sale');
const BranchInventory = require('../modules/database/models/BranchInventory');
const TillSession = require('../modules/database/models/TillSession');
const DailyCashup = require('../modules/database/models/DailyCashup');
const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const invoiceGenerator = require('../services/invoiceGenerator');
const emailService = require('../services/emailService');
const flocoreEmit = require('../services/flocoreEmit');
const { notifyOwners, notifyBranch } = require('../modules/websocket');
const config = require('../config');
const VAT_RATE = config.business.vatRate;

// A cart line's productId must be a Mongo ObjectId (24 hex). The POS grid can produce SYNTHETIC ids
// for quick/pack lines (e.g. 'pack-3g-<id>', 'quick-preroll-<sku>') and stale cached tills can still
// send gram composites ('<id>:30g'). Passing those straight into the Sale schema throws a Cast-to-
// ObjectId ValidationError that 500s the WHOLE sale — a checkout blocker. Coerce to null so the sale
// still records (money + receipt) and only the stock link is dropped for that line.
const isObjectId = v => /^[a-f\d]{24}$/i.test(String(v || ''));

// ============================================
// SALE OPERATIONS
// ============================================

exports.createSale = async (req, res) => {
  try {
    const {
      branchId,
      track,
      items,
      orderType,
      customerInfo,
      paymentMethod,
      paymentReference,
      cardReference,
      paymentNotes,
      proofOfPayment,
      payments
    } = req.body;

    if (!branchId || !track || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Branch, track, and items are required'
      });
    }

    const tillSession = await TillSession.findOne({
      branchId,
      status: 'open'
    });

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
        productId: isObjectId(item.productId) ? item.productId : null,
        type: 'product',
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount || 0,
        taxRate: VAT_RATE * 100
      }))
    });

    const calculatedTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0); // VAT-inclusive
    const calculatedSubtotal = calculatedTotal / (1 + VAT_RATE);
    const calculatedTax = calculatedTotal - calculatedSubtotal;

    // Normalize payment input — supports a single (paymentMethod, cardReference) OR a
    // split-payment `payments[]` array (cash + card + eft). The array path used to be
    // dropped entirely, so SPLIT sales saved as empty drafts: no payment, no stock
    // deducted, R0 recorded — while the till showed "Sale Complete". This unifies both.
    let incomingPayments = [];
    if (Array.isArray(payments) && payments.length > 0) {
      incomingPayments = payments
        .filter(p => p && p.method && (p.amount === undefined || Number(p.amount) > 0))
        .map(p => ({
          method: p.method,
          amount: Number(p.amount) || 0,
          reference: p.reference || p.cardReference || p.paymentReference || null,
          speedPointTransactionId: p.speedPointTransactionId || (p.method === 'card' ? (p.reference || null) : null),
          status: p.method === 'eft' ? 'pending' : 'approved',
          proofOfPayment: p.proofOfPayment || null,
          processedAt: p.method !== 'eft' ? new Date() : null
        }));
    } else if (paymentMethod) {
      incomingPayments = [{
        method: paymentMethod,
        amount: calculatedTotal,
        reference: cardReference || paymentReference,
        speedPointTransactionId: cardReference || null,
        status: paymentMethod === 'eft' ? 'pending' : 'approved',
        proofOfPayment: proofOfPayment || null,
        processedAt: paymentMethod !== 'eft' ? new Date() : null
      }];
    }

    const stockWarnings = [];
    if (incomingPayments.length > 0) {
      incomingPayments.forEach(p => sale.payments.push(p));

      if (paymentNotes) {
        sale.internalNotes = paymentNotes;
      }

      const hasPendingEft = incomingPayments.some(p => p.method === 'eft');

      if (!hasPendingEft) {
        // Fully settled (cash/card/instapay/voucher) → complete the sale + deduct stock.
        sale.paymentStatus = 'paid';
        sale.status = 'completed';

        const productIds = sale.items.map(item => item.productId);
        const inventories = await BranchInventory.find({
          branchId,
          productId: { $in: productIds }
        });

        const inventoryMap = new Map(inventories.map(inv => [inv.productId.toString(), inv]));

        for (const item of sale.items) {
          try {
            if (!item.productId) {
              // Quick/pack or stale-cache line with no valid Product link — sale still records,
              // surface so it's deducted manually on the stock sheet (avoids silent stock drift).
              stockWarnings.push(`${item.name}: not stock-linked — adjust on the stock sheet`);
              continue;
            }
            const inventory = inventoryMap.get(item.productId.toString());
            if (inventory) {
              await inventory.deductStock(item.quantity, sale.saleNumber, req.user.id);
            }
            // Also decrement the product-level stock the POS grid displays, so sold stock shows in the UI
            // and products with no BranchInventory record (e.g. newly added via the stock sheet) still deduct.
            if (item.productId) {
              await Product.updateOne({ _id: item.productId }, { $inc: { 'inventory.quantity': -item.quantity } });
            }
          } catch (error) {
            // Do NOT fail the sale, but SURFACE it — silently swallowing this caused stock drift.
            logger.error('POS inventory deduction error', { error: error.message, stack: error.stack, item: item.name });
            stockWarnings.push(`${item.name}: ${error.message}`);
          }
        }

        sale.inventoryDeducted = true;
        sale.inventoryDeductedAt = new Date();
      } else {
        // Any EFT component → awaits proof/approval before stock moves.
        sale.paymentStatus = incomingPayments.some(p => p.method !== 'eft') ? 'partial' : 'pending';
        sale.status = 'pending_payment';
      }
    } else {
      sale.status = 'draft';
    }

    await sale.save();

    // Emit the completed sale to the FLOCORE event rail (fire-and-forget; no-op until FO provisions
    // the tenant:ilco token). payload.amount = NET goods (Σ qty×price), never tenders. Must NOT block.
    if (sale.status === 'completed') {
      try { flocoreEmit.emitSale(sale); } catch (e) { /* never affects the sale */ }
    }

    // Notify owner dashboard of completed sale
    if (sale.status === 'completed') {
      try {
        notifyOwners('sale:completed', {
          saleNumber: sale.saleNumber,
          branchId: sale.branchId,
          totalAmount: sale.totalAmount,
          items: sale.items.length,
          paymentMethod,
          cashier: req.user.id
        });
        notifyBranch(branchId, 'branch:sale', {
          saleNumber: sale.saleNumber,
          totalAmount: sale.totalAmount
        });
      } catch (wsErr) {
        logger.warn('WebSocket notify error (non-fatal):', wsErr.message);
      }
    }

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

    if (sale.status === 'completed' && customerInfo?.email) {
      try {
        let pdfBuffer = null;
        try {
          const branch = await Branch.findById(branchId);
          pdfBuffer = await invoiceGenerator.generateInvoice(sale, branch, 'receipt');
        } catch (pdfError) {
          logger.warn('Could not generate receipt PDF:', pdfError.message);
        }

        await emailService.sendReceipt(
          customerInfo.email,
          pdfBuffer,
          sale.saleNumber,
          sale.totalAmount,
          sale
        );

        logger.info(`Receipt email sent to ${customerInfo.email} for sale ${sale.saleNumber}`);
      } catch (emailError) {
        logger.error('Failed to send receipt email:', emailError);
      }
    }

    res.status(201).json({
      success: true,
      message: 'Sale created successfully',
      stockWarnings,
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
};

exports.getSalesToday = async (req, res) => {
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
      status: { $in: ['completed', 'pending_payment', 'voided', 'refunded'] }
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
};

exports.approvePayment = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { action, notes } = req.body;

    const sale = await Sale.findById(saleId);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sale not found'
      });
    }

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

      if (sale.customerEmail) {
        try {
          let pdfBuffer = null;
          try {
            const branch = await Branch.findById(sale.branchId);
            pdfBuffer = await invoiceGenerator.generateInvoice(sale, branch, 'receipt');
          } catch (pdfError) {
            logger.warn('Could not generate receipt PDF:', pdfError.message);
          }

          await emailService.sendReceipt(
            sale.customerEmail,
            pdfBuffer,
            sale.saleNumber,
            sale.totalAmount
          );

          logger.info(`Receipt email sent to ${sale.customerEmail} for sale ${sale.saleNumber}`);
        } catch (emailError) {
          logger.error('Failed to send receipt email:', emailError);
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
};

exports.getPendingPayments = async (req, res) => {
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
};

exports.voidSale = async (req, res) => {
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
};

exports.getInvoice = async (req, res) => {
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

    const pdfBuffer = await invoiceGenerator.generateInvoice(sale, sale.branchId, 'invoice');

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
};

exports.getReceipt = async (req, res) => {
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

    const pdfBuffer = await invoiceGenerator.generateInvoice(sale, sale.branchId, 'receipt');

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
};

exports.getReceiptText = async (req, res) => {
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

    const branchName = sale.branchId?.name || 'Origin by ILCO Farming';
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
VAT (${VAT_RATE * 100}%): R${(sale.totalTax || 0).toFixed(2)}
${sale.totalDiscount > 0 ? `Discount:  -R${sale.totalDiscount.toFixed(2)}\n` : ''}--------------------------------
TOTAL:     R${(sale.totalAmount || 0).toFixed(2)}
--------------------------------
Payment: ${sale.payments?.[0]?.method?.toUpperCase() || 'N/A'}
Status: ${sale.paymentStatus || 'Pending'}
================================
Thank you for your purchase!
origin.cleva-ai.co.za
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
};

exports.emailDocument = async (req, res) => {
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

    const pdfBuffer = await invoiceGenerator.generateInvoice(sale, sale.branchId, type);

    let emailResult;
    if (type === 'receipt') {
      emailResult = await emailService.sendReceipt(
        email,
        pdfBuffer,
        sale.saleNumber,
        sale.totalAmount,
        sale
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
};

// ============================================
// TILL SESSION MANAGEMENT
// ============================================

exports.openTill = async (req, res) => {
  try {
    const { branchId, tillNumber, openingFloat, openingNotes } = req.body;

    if (!branchId || !tillNumber) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID and Till Number are required'
      });
    }

    const existingSession = await TillSession.findOne({
      branchId,
      tillNumber,
      status: 'open'
    });

    if (existingSession) {
      const sessionDate = new Date(existingSession.openedAt);
      const isToday = sessionDate.toDateString() === new Date().toDateString();
      if (isToday) {
        // Resume today's open session — never block the cashier
        return res.status(200).json({
          success: true,
          resumed: true,
          message: 'Resumed existing till session',
          session: {
            sessionNumber: existingSession.sessionNumber,
            _id: existingSession._id,
            tillNumber: existingSession.tillNumber,
            openingFloat: existingSession.openingFloat,
            openedAt: existingSession.openedAt,
            status: existingSession.status
          }
        });
      } else {
        // Stale previous-day session — auto-close it and open fresh
        existingSession.status = 'closed';
        existingSession.closedAt = new Date();
        existingSession.closingNotes = 'Auto-closed: stale session from previous day';
        await existingSession.save();
        // Fall through to open new session
      }
    }

    const tillSession = new TillSession({
      branchId,
      tillNumber,
      openedBy: req.user.id,
      openingFloat: (openingFloat != null ? Number(openingFloat) : 0),  // no float by default — set per store
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
};

exports.getActiveTill = async (req, res) => {
  try {
    // Never cache till state — a stale cached response can show a "shift left open" banner
    // long after the shift was actually closed/reopened. Always reflect the live DB.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
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
};

exports.closeTill = async (req, res) => {
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

    
    // Cash-variance control (operator-note + owner-review model - NO manager PIN).
    // Float is optional at open, so a hard PIN gate trapped solo operators. We document & review instead.
    const _dv = { r200:200, r100:100, r50:50, r20:20, r10:10, r5:5, r2:2, r1:1, c50:0.5, c20:0.2, c10:0.1, c5:0.05 };
    let _actual = 0;
    for (const _k in denominations) { const _v = _dv[String(_k).toLowerCase()]; if (_v) _actual += (Number(denominations[_k]) || 0) * _v; }
    // Always recompute expected from the session's real figures - never trust a stale stored expectedCash.
    const _totalCashIns = (tillSession.cashIns || []).reduce((s, op) => s + (op.amount || 0), 0);
    const _totalCashOuts = (tillSession.cashOuts || []).reduce((s, op) => s + (op.amount || 0), 0);
    const _expected = (tillSession.openingFloat || 0) + (tillSession.totalCash || 0) + _totalCashIns - _totalCashOuts - (tillSession.totalRefunds || 0);
    const _variance = _actual - _expected;
    const _hasVariance = Math.abs(_variance) > 0.009;
    const _note = (closingNotes == null) ? '' : String(closingNotes).trim();
    // Any real cash variance MUST carry a note. No PIN, no hard block once the note is present.
    if (_hasVariance && !_note) {
      return res.status(400).json({ success: false, requiresNote: true, message: 'Please add a note explaining the cash variance to close the shift.' });
    }
    // Card reconciliation (optional): compare the Speedpoint batch total to system card sales.
    // Additive — if no card figure is entered, behaviour is identical to before.
    let _cardCounted = null, _cardVariance = 0, _hasCardVar = false;
    const _cardRaw = req.body.cardCounted;
    if (_cardRaw !== undefined && _cardRaw !== null && String(_cardRaw).trim() !== '') {
      _cardCounted = Number(_cardRaw) || 0;
      _cardVariance = _cardCounted - (tillSession.totalCard || 0);
      _hasCardVar = Math.abs(_cardVariance) > 0.009;
      tillSession.cardCounted = _cardCounted;
      tillSession.cardVariance = _cardVariance;
      tillSession.cardNote = (req.body.cardNote == null) ? '' : String(req.body.cardNote).trim();
    }

    const _normDenom = {};
    for (const _dk in (denominations || {})) { _normDenom[String(_dk).toLowerCase()] = Number(denominations[_dk]) || 0; }
    await tillSession.closeSession(req.user.id, _normDenom, closingNotes);

    // On any real cash OR card variance: flag for OWNER review + email ray@ilcofarming.co.za.
    if (_hasVariance || _hasCardVar) {
      try {
        if (!tillSession.requiresApproval) { tillSession.requiresApproval = true; await tillSession.save(); }
      } catch (flagErr) {
        logger.warn('Could not flag till session for owner review (non-fatal):', flagErr.message);
      }
      // Email the owner. Reuse the existing emailService transport (same one used by the takings/Z-report email).
      try {
        let _opName = (req.user && req.user.username) || 'Operator';
        try {
          const _User = require('../modules/database/models/User');
          const _op = await _User.findById(req.user.id).select('firstName lastName').lean();
          if (_op) _opName = [(_op.firstName || ''), (_op.lastName || '')].join(' ').trim() || _opName;
        } catch (_uErr) { /* name lookup must never block the close */ }
        let _branchName = String(tillSession.branchId || '');
        try {
          const _br = await Branch.findById(tillSession.branchId).select('name').lean();
          if (_br && _br.name) _branchName = _br.name;
        } catch (_bErr) { /* branch lookup must never block the close */ }
        const _role = (req.user && req.user.role) || 'unknown';
        const _vAbs = Math.abs(tillSession.variance || _variance);
        const _vSign = ((tillSession.variance || _variance) < 0) ? '-' : '+';
        const _when = new Date(tillSession.closedAt || Date.now()).toLocaleString('en-ZA');
        const _subj = 'Origin POS - cash variance on till close (R' + (tillSession.variance || _variance).toFixed(2) + ')';
        const _html = '<div style="font-family:Arial,sans-serif;color:#1a1a1a">' +
          '<h2 style="color:#C9A84C;margin-bottom:4px">Origin by ILCO - Cash variance on till close</h2>' +
          '<p style="color:#555;margin-top:0">This close has been flagged for your review on the owner dashboard.</p>' +
          '<table cellpadding="6" style="border-collapse:collapse;font-size:14px">' +
          '<tr><td><b>Branch</b></td><td>' + _branchName + '</td></tr>' +
          '<tr><td><b>Till</b></td><td>' + (tillSession.tillNumber || '-') + '</td></tr>' +
          '<tr><td><b>Session</b></td><td>' + (tillSession.sessionNumber || '-') + '</td></tr>' +
          '<tr><td><b>Operator</b></td><td>' + _opName + ' (' + _role + ')</td></tr>' +
          '<tr><td><b>Expected cash</b></td><td>R' + (tillSession.expectedCash || _expected).toFixed(2) + '</td></tr>' +
          '<tr><td><b>Counted cash</b></td><td>R' + (tillSession.actualCash || _actual).toFixed(2) + '</td></tr>' +
          '<tr><td><b>Variance</b></td><td style="color:' + (_vSign === '-' ? '#DC2626' : '#15803d') + ';font-weight:700">' + _vSign + 'R' + _vAbs.toFixed(2) + '</td></tr>' +
          (_hasCardVar ? ('<tr><td><b>Card (system)</b></td><td>R' + (tillSession.totalCard || 0).toFixed(2) + '</td></tr>' +
            '<tr><td><b>Card (counted)</b></td><td>R' + (_cardCounted || 0).toFixed(2) + '</td></tr>' +
            '<tr><td><b>Card variance</b></td><td style="font-weight:700">R' + _cardVariance.toFixed(2) + '</td></tr>') : '') +
          '<tr><td valign="top"><b>Operator note</b></td><td>' + (_note || '(none)') + '</td></tr>' +
          '<tr><td><b>Closed at</b></td><td>' + _when + '</td></tr>' +
          '</table></div>';
        await emailService.sendEmail({ to: 'ray@ilcofarming.co.za', subject: _subj, html: _html });
      } catch (mailErr) {
        logger.warn('Variance close email failed (non-fatal):', mailErr.message);
      }
    }

    // Notify owner dashboard of till closure
    try {
      notifyOwners('till:closed', {
        branchId: tillSession.branchId,
        sessionNumber: tillSession.sessionNumber,
        variance: tillSession.variance,
        closingNotes: tillSession.closingNotes,
        requiresApproval: tillSession.requiresApproval,
        totalSales: tillSession.totalSales,
        transactionCount: tillSession.transactionCount
      });
    } catch (wsErr) {
      logger.warn('WebSocket notify error (non-fatal):', wsErr.message);
    }

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
        totalInstapay: tillSession.totalInstapay,
        cardCounted: tillSession.cardCounted,
        cardVariance: tillSession.cardVariance,
        cardNote: tillSession.cardNote
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
};

exports.recordCashIn = async (req, res) => {
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
};

exports.recordCashOut = async (req, res) => {
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
};

exports.getTodaySessions = async (req, res) => {
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
};

exports.getSessionHistory = async (req, res) => {
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
};

exports.approveSession = async (req, res) => {
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
};

exports.getSales = async (req, res) => {
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
};

exports.refundSale = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { reason, items, refundAmount } = req.body;

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

    const totalRefund = refundAmount || sale.totalAmount;

    await sale.processRefund(req.user.id, totalRefund, reason);

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
};

exports.exportSalesCsv = async (req, res) => {
  try {
    const { startDate, endDate, branchId, format } = req.query;

    const query = {};

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (branchId) {
      query.branchId = branchId;
    }

    query.status = 'completed';
    query.paymentStatus = 'paid';

    const sales = await Sale.find(query)
      .populate('branchId', 'name code')
      .sort({ createdAt: 1 });

    if (!sales || sales.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No sales found for the specified criteria'
      });
    }

    let csvContent = '';

    if (format === 'xero') {
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
};

// ============================================
// DAILY CASHUP / END OF DAY MANAGEMENT
// ============================================

exports.startCashup = async (req, res) => {
  try {
    const { branchId, shiftType = 'full' } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingCashup = await DailyCashup.findOne({
      branchId,
      date: { $gte: today, $lt: tomorrow },
      status: { $ne: 'rejected' }
    });

    if (existingCashup) {
      return res.json({
        success: true,
        message: 'Cashup already exists for today',
        cashup: existingCashup,
        existing: true
      });
    }

    const closedSessions = await TillSession.find({
      branchId,
      status: 'closed',
      closedAt: { $gte: today, $lt: tomorrow }
    });

    if (closedSessions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No closed till sessions found for today. Close all tills before starting daily cashup.'
      });
    }

    const openSessions = await TillSession.find({
      branchId,
      status: 'open'
    });

    if (openSessions.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${openSessions.length} till(s) still open. Close all tills before daily cashup.`,
        openTills: openSessions.map(s => s.tillNumber)
      });
    }

    const cashup = new DailyCashup({
      branchId,
      date: new Date(),
      shiftType,
      tillSessions: closedSessions.map(s => s._id),
      preparedBy: req.user.id,
      status: 'draft'
    });

    await cashup.populateFromTillSessions();

    res.status(201).json({
      success: true,
      message: 'Daily cashup started',
      cashup
    });
  } catch (error) {
    logger.error('Start daily cashup error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error starting daily cashup',
      error: error.message
    });
  }
};

exports.getTodayCashup = async (req, res) => {
  try {
    const { branchId } = req.query;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    const cashup = await DailyCashup.getTodaysCashup(branchId);

    if (!cashup) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const sessions = await TillSession.find({
        branchId,
        openedAt: { $gte: today, $lt: tomorrow }
      }).populate('openedBy closedBy', 'firstName lastName');

      const openCount = sessions.filter(s => s.status === 'open').length;
      const closedCount = sessions.filter(s => s.status === 'closed').length;

      return res.json({
        success: true,
        cashup: null,
        tillSummary: {
          totalSessions: sessions.length,
          openSessions: openCount,
          closedSessions: closedCount,
          sessions: sessions
        },
        message: openCount > 0 ? 'Close all tills to start daily cashup' : 'Ready for daily cashup'
      });
    }

    res.json({
      success: true,
      cashup
    });
  } catch (error) {
    logger.error('Get today cashup error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching cashup',
      error: error.message
    });
  }
};

exports.updateCashup = async (req, res) => {
  try {
    const { cashupId } = req.params;
    const {
      managerCashCount,
      safeDrops,
      bankingAmount,
      bankingReference,
      nextDayFloat,
      notes
    } = req.body;

    const cashup = await DailyCashup.findById(cashupId);

    if (!cashup) {
      return res.status(404).json({
        success: false,
        message: 'Cashup not found'
      });
    }

    if (cashup.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify an approved cashup'
      });
    }

    if (managerCashCount) {
      cashup.managerCashCount = managerCashCount;
      cashup.managerCashTotal = cashup.calculateManagerCashTotal();
    }

    if (safeDrops) {
      cashup.safeDrops = safeDrops;
      cashup.totalSafeDrops = safeDrops.reduce((sum, drop) => sum + (drop.amount || 0), 0);
    }

    if (bankingAmount !== undefined) {
      cashup.bankingAmount = bankingAmount;
      cashup.bankingReference = bankingReference;
      cashup.bankingPreparedBy = req.user.id;
      cashup.bankingPreparedAt = new Date();
    }

    if (nextDayFloat !== undefined) {
      cashup.nextDayFloat = nextDayFloat;
    }

    if (notes) {
      cashup.notes = notes;
    }

    await cashup.save();

    res.json({
      success: true,
      message: 'Cashup updated',
      cashup
    });
  } catch (error) {
    logger.error('Update cashup error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error updating cashup',
      error: error.message
    });
  }
};

exports.submitCashup = async (req, res) => {
  try {
    const { cashupId } = req.params;
    const { discrepancyExplanation } = req.body;

    const cashup = await DailyCashup.findById(cashupId);

    if (!cashup) {
      return res.status(404).json({
        success: false,
        message: 'Cashup not found'
      });
    }

    if (cashup.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Cashup is not in draft status'
      });
    }

    if (cashup.managerCashTotal === 0) {
      return res.status(400).json({
        success: false,
        message: 'Manager cash count is required before submission'
      });
    }

    const finalVariance = cashup.managerCashTotal - cashup.totalExpectedCash + cashup.totalSafeDrops;
    cashup.totalVariance = finalVariance;

    if (Math.abs(finalVariance) > 100 && !discrepancyExplanation) {
      return res.status(400).json({
        success: false,
        message: 'Variance exceeds R100. Please provide an explanation.',
        variance: finalVariance
      });
    }

    if (discrepancyExplanation) {
      cashup.discrepancyExplanation = discrepancyExplanation;
    }

    cashup.status = 'submitted';
    cashup.submittedAt = new Date();

    await cashup.save();

    // Notify owner dashboard of cashup submission
    try {
      notifyOwners('cashup:submitted', {
        branchId: cashup.branchId,
        totalSales: cashup.totalSales,
        totalVariance: cashup.totalVariance,
        status: 'submitted'
      });
    } catch (wsErr) {
      logger.warn('WebSocket notify error (non-fatal):', wsErr.message);
    }

    res.json({
      success: true,
      message: 'Cashup submitted for approval',
      cashup
    });
  } catch (error) {
    logger.error('Submit cashup error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error submitting cashup',
      error: error.message
    });
  }
};

exports.approveCashup = async (req, res) => {
  try {
    const { cashupId } = req.params;
    const { action, approvalNotes } = req.body;

    const cashup = await DailyCashup.findById(cashupId);

    if (!cashup) {
      return res.status(404).json({
        success: false,
        message: 'Cashup not found'
      });
    }

    if (cashup.status !== 'submitted') {
      return res.status(400).json({
        success: false,
        message: 'Cashup must be submitted before approval'
      });
    }

    if (action === 'approve') {
      cashup.status = 'approved';
      cashup.approvedBy = req.user.id;
      cashup.approvedAt = new Date();
      cashup.approvalNotes = approvalNotes;
    } else if (action === 'reject') {
      cashup.status = 'rejected';
      cashup.approvedBy = req.user.id;
      cashup.approvedAt = new Date();
      cashup.approvalNotes = approvalNotes;
    }

    await cashup.save();

    res.json({
      success: true,
      message: `Cashup ${action}d successfully`,
      cashup
    });
  } catch (error) {
    logger.error('Approve cashup error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error processing cashup approval',
      error: error.message
    });
  }
};

exports.getCashupHistory = async (req, res) => {
  try {
    const { branchId, startDate, endDate, status, limit = 30 } = req.query;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    const query = { branchId };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (status) {
      query.status = status;
    }

    const cashups = await DailyCashup.find(query)
      .populate('preparedBy approvedBy', 'firstName lastName')
      .populate('branchId', 'name branchCode')
      .sort({ date: -1 })
      .limit(parseInt(limit));

    const totals = {
      totalSales: cashups.reduce((sum, c) => sum + c.totalSales, 0),
      totalCash: cashups.reduce((sum, c) => sum + c.cashSales, 0),
      totalCard: cashups.reduce((sum, c) => sum + c.cardSales, 0),
      totalVariance: cashups.reduce((sum, c) => sum + c.totalVariance, 0),
      totalBanking: cashups.reduce((sum, c) => sum + c.bankingAmount, 0)
    };

    res.json({
      success: true,
      cashups,
      totals,
      count: cashups.length
    });
  } catch (error) {
    logger.error('Get cashup history error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching cashup history',
      error: error.message
    });
  }
};

exports.getPendingCashups = async (req, res) => {
  try {
    const pendingCashups = await DailyCashup.find({ status: 'submitted' })
      .populate('preparedBy', 'firstName lastName')
      .populate('branchId', 'name branchCode')
      .sort({ submittedAt: -1 });

    res.json({
      success: true,
      pendingCashups,
      count: pendingCashups.length
    });
  } catch (error) {
    logger.error('Get pending cashups error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching pending cashups',
      error: error.message
    });
  }
};

exports.recordSafeDrop = async (req, res) => {
  try {
    const { cashupId } = req.params;
    const { amount, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    const cashup = await DailyCashup.findById(cashupId);

    if (!cashup) {
      return res.status(404).json({
        success: false,
        message: 'Cashup not found'
      });
    }

    if (cashup.status === 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify an approved cashup'
      });
    }

    cashup.safeDrops.push({
      amount: parseFloat(amount),
      time: new Date(),
      recordedBy: req.user.id,
      notes: notes || ''
    });

    cashup.totalSafeDrops = cashup.safeDrops.reduce((sum, drop) => sum + drop.amount, 0);

    await cashup.save();

    res.json({
      success: true,
      message: 'Safe drop recorded',
      safeDrop: cashup.safeDrops[cashup.safeDrops.length - 1],
      totalSafeDrops: cashup.totalSafeDrops
    });
  } catch (error) {
    logger.error('Record safe drop error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error recording safe drop',
      error: error.message
    });
  }
};

exports.getCashupReport = async (req, res) => {
  try {
    const { cashupId } = req.params;

    const cashup = await DailyCashup.findById(cashupId)
      .populate('preparedBy approvedBy', 'firstName lastName email')
      .populate('branchId', 'name branchCode address')
      .populate({
        path: 'tillSessions',
        populate: {
          path: 'openedBy closedBy',
          select: 'firstName lastName'
        }
      });

    if (!cashup) {
      return res.status(404).json({
        success: false,
        message: 'Cashup not found'
      });
    }

    const report = {
      cashup,
      summary: {
        date: cashup.date,
        branch: cashup.branchId?.name || 'Unknown',
        status: cashup.status,
        preparedBy: cashup.preparedBy ? `${cashup.preparedBy.firstName} ${cashup.preparedBy.lastName}` : 'Unknown',
        approvedBy: cashup.approvedBy ? `${cashup.approvedBy.firstName} ${cashup.approvedBy.lastName}` : 'Pending'
      },
      sales: {
        total: cashup.totalSales,
        transactions: cashup.totalTransactions,
        cash: cashup.cashSales,
        card: cashup.cardSales,
        eft: cashup.eftSales,
        instapay: cashup.instapaySales
      },
      cash: {
        openingFloat: cashup.totalOpeningFloat,
        expectedCash: cashup.totalExpectedCash,
        actualCash: cashup.totalActualCash,
        managerCount: cashup.managerCashTotal,
        safeDrops: cashup.totalSafeDrops,
        variance: cashup.totalVariance,
        banking: cashup.bankingAmount,
        nextDayFloat: cashup.nextDayFloat
      },
      tillSessions: cashup.tillSessions.map(s => ({
        sessionNumber: s.sessionNumber,
        tillNumber: s.tillNumber,
        openedBy: s.openedBy ? `${s.openedBy.firstName} ${s.openedBy.lastName}` : 'Unknown',
        closedBy: s.closedBy ? `${s.closedBy.firstName} ${s.closedBy.lastName}` : 'Unknown',
        sales: s.totalSales,
        transactions: s.transactionCount,
        variance: s.variance
      }))
    };

    res.json({
      success: true,
      report
    });
  } catch (error) {
    logger.error('Get cashup report error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error generating cashup report',
      error: error.message
    });
  }
};

// ============================================
// OFFLINE MODE
// ============================================

exports.offlineSync = async (req, res) => {
  try {
    const { offlineId, queuedAt, items, branchId, track, paymentMethod, total, customerInfo } = req.body;

    const existingSale = await Sale.findOne({ offlineId });
    if (existingSale) {
      return res.json({
        success: true,
        message: 'Sale already synced',
        data: existingSale
      });
    }

    let tillSession = await TillSession.findOne({ branchId, status: 'open' });

    const sale = new Sale({
      branchId,
      tillSessionId: tillSession?._id,
      cashierId: req.user.id,
      track,
      orderType: 'walk-in',
      customerName: customerInfo?.name,
      customerPhone: customerInfo?.phone,
      items: items.map(item => ({
        productId: item.productId,
        productName: item.name || item.productName,
        quantity: item.quantity,
        unitPrice: item.price || item.unitPrice,
        lineTotal: (item.price || item.unitPrice) * item.quantity
      })),
      subtotal: total,
      total,
      paymentMethod,
      status: 'completed',
      offlineId,
      offlineQueuedAt: new Date(queuedAt),
      syncedAt: new Date()
    });

    await sale.save();

    for (const item of items) {
      if (item.productId) {
        await BranchInventory.findOneAndUpdate(
          { product: item.productId, branch: branchId },
          { $inc: { quantity: -item.quantity } }
        );

        await Product.findByIdAndUpdate(
          item.productId,
          { $inc: { 'inventory.quantity': -item.quantity } }
        );
      }
    }

    if (tillSession) {
      tillSession.totalSales = (tillSession.totalSales || 0) + total;
      tillSession.transactionCount = (tillSession.transactionCount || 0) + 1;

      if (paymentMethod === 'cash') {
        tillSession.totalCash = (tillSession.totalCash || 0) + total;
      } else if (paymentMethod === 'card') {
        tillSession.totalCard = (tillSession.totalCard || 0) + total;
      }

      await tillSession.save();
    }

    logger.info('Offline sale synced', { offlineId, saleNumber: sale.saleNumber });

    res.json({
      success: true,
      message: 'Offline sale synced successfully',
      data: sale
    });

  } catch (error) {
    logger.error('Offline sync error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error syncing offline sale',
      error: error.message
    });
  }
};

// ===== Admin-PIN-gated VOID and REFUND from the POS till =====
async function _approverByPin(pin) {
  const User = require('../modules/database/models/User');
  if (!pin) return null;
  return User.findOne({ permanentPin: String(pin), role: { $in: ['owner', 'admin', 'super_admin'] }, isActive: true });
}

exports.quickVoid = async (req, res) => {
  try {
    const approver = await _approverByPin(req.body.pin);
    if (!approver) return res.status(403).json({ success: false, message: 'Invalid admin PIN — not authorised' });
    const sale = await Sale.findById(req.params.saleId);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    if (sale.status === 'voided') return res.status(400).json({ success: false, message: 'Sale already voided' });
    await sale.voidSale(approver._id, req.body.reason || 'Voided at till');
    // Reverse this sale's contribution to the till totals (voids must not count as takings)
    try {
      if (sale.tillSessionId) {
        const _ts = await TillSession.findById(sale.tillSessionId);
        if (_ts) {
          const _m = (sale.payments && sale.payments[0] && sale.payments[0].method) || sale.paymentMethod || 'cash';
          const _amt = sale.totalAmount || 0;
          _ts.totalSales = Math.max(0, (_ts.totalSales || 0) - _amt);
          _ts.transactionCount = Math.max(0, (_ts.transactionCount || 0) - 1);
          if (_m === 'cash') _ts.totalCash = Math.max(0, (_ts.totalCash || 0) - _amt);
          else if (_m === 'card' || _m === 'instapay') _ts.totalCard = Math.max(0, (_ts.totalCard || 0) - _amt);
          else if (_m === 'eft') _ts.totalEFT = Math.max(0, (_ts.totalEFT || 0) - _amt);
          await _ts.save();
        }
      }
    } catch (_e) { logger.warn('void till-reversal failed: ' + _e.message); }
    logger.info('POS quick-void', { sale: sale.saleNumber, approver: approver.email, by: req.user && req.user.email });
    res.json({ success: true, message: 'Voided · approved by ' + approver.firstName, approver: approver.firstName + ' ' + approver.lastName });
  } catch (e) {
    logger.error('quickVoid error', { error: e.message });
    res.status(500).json({ success: false, message: 'Error voiding sale' });
  }
};

exports.quickRefund = async (req, res) => {
  try {
    const approver = await _approverByPin(req.body.pin);
    if (!approver) return res.status(403).json({ success: false, message: 'Invalid admin PIN — not authorised' });
    const { reason, items, refundAmount } = req.body;
    const sale = await Sale.findById(req.params.saleId);
    if (!sale) return res.status(404).json({ success: false, message: 'Sale not found' });
    if (sale.status === 'refunded') return res.status(400).json({ success: false, message: 'Sale already refunded' });
    if (sale.status !== 'completed') return res.status(400).json({ success: false, message: 'Only completed sales can be refunded' });
    const totalRefund = refundAmount || sale.totalAmount;
    await sale.processRefund(approver._id, totalRefund, reason || 'Refunded at till');
    if (items && items.length) {
      for (const item of items) {
        try {
          const inv = await BranchInventory.findOne({ branchId: sale.branchId, productId: item.productId });
          if (inv) await inv.addStock(item.quantity, 'Refund: ' + sale.saleNumber, approver._id);
        } catch (err) { logger.error('refund restock error', { error: err.message }); }
      }
    }
    if (sale.tillSessionId) {
      const ts = await TillSession.findById(sale.tillSessionId);
      if (ts && ts.status === 'open') { ts.totalRefunds = (ts.totalRefunds || 0) + totalRefund; await ts.save(); }
    }
    logger.info('POS quick-refund', { sale: sale.saleNumber, approver: approver.email, amount: totalRefund });
    res.json({ success: true, message: 'Refunded R' + totalRefund.toFixed(2) + ' · approved by ' + approver.firstName, approver: approver.firstName + ' ' + approver.lastName, refundAmount: totalRefund });
  } catch (e) {
    logger.error('quickRefund error', { error: e.message });
    res.status(500).json({ success: false, message: 'Error processing refund' });
  }
};

// ===== Day-End Z-Report (PDF + CSV + email) =====
const zreport = require('../services/zreport');
async function _loadZ(sessionId) {
  const session = await TillSession.findById(sessionId).populate('branchId');
  if (!session) return null;
  const sales = await Sale.find({ tillSessionId: sessionId }).sort({ createdAt: 1 }).lean();
  const branchName = (session.branchId && session.branchId.name) || 'Potchefstroom';
  return { session, sales, branchName };
}
exports.getZReportPdf = async (req, res) => {
  try {
    const z = await _loadZ(req.params.sessionId);
    if (!z) return res.status(404).json({ success: false, message: 'Session not found' });
    const pdf = await zreport.buildPdf(z.session, z.sales, z.branchName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="ZReport-' + (z.session.sessionNumber || 'session') + '.pdf"');
    res.send(pdf);
  } catch (e) { logger.error('zreport pdf', { error: e.message }); res.status(500).json({ success: false, message: 'Error generating PDF' }); }
};
exports.getZReportCsv = async (req, res) => {
  try {
    const z = await _loadZ(req.params.sessionId);
    if (!z) return res.status(404).json({ success: false, message: 'Session not found' });
    const csv = zreport.buildCsv(z.session, z.sales);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="ZReport-' + (z.session.sessionNumber || 'session') + '.csv"');
    res.send(csv);
  } catch (e) { logger.error('zreport csv', { error: e.message }); res.status(500).json({ success: false, message: 'Error generating CSV' }); }
};
exports.emailZReport = async (req, res) => {
  try {
    const z = await _loadZ(req.params.sessionId);
    if (!z) return res.status(404).json({ success: false, message: 'Session not found' });
    const recipients = (req.body && req.body.to && req.body.to.length) ? req.body.to : ['originbyilcofarming@gmail.com', 'florisolivier7@gmail.com'];
    const pdf = await zreport.buildPdf(z.session, z.sales, z.branchName);
    const csv = zreport.buildCsv(z.session, z.sales);
    const s = z.session;
    const when = new Date(s.closedAt || Date.now()).toLocaleString('en-ZA');
    const html = '<div style="font-family:Arial,sans-serif"><h2 style="color:#C9A84C">Origin by ILCO — Day-End Z-Report</h2>' +
      '<p>' + z.branchName + ' · ' + when + '</p><table cellpadding="6" style="border-collapse:collapse">' +
      '<tr><td>Cash</td><td align="right">R' + (s.totalCash || 0).toFixed(2) + '</td></tr>' +
      '<tr><td>Card (Speedpoint)</td><td align="right">R' + (s.totalCard || 0).toFixed(2) + '</td></tr>' +
      '<tr><td>Manual EFT</td><td align="right">R' + (s.totalEFT || 0).toFixed(2) + '</td></tr>' +
      '<tr><td><b>Total Sales</b></td><td align="right"><b>R' + (s.totalSales || 0).toFixed(2) + '</b></td></tr>' +
      '<tr><td>Transactions</td><td align="right">' + (s.transactionCount || 0) + '</td></tr>' +
      '<tr><td>Expected Cash</td><td align="right">R' + (s.expectedCash || 0).toFixed(2) + '</td></tr>' +
      '<tr><td>Counted Cash</td><td align="right">R' + (s.actualCash || 0).toFixed(2) + '</td></tr>' +
      '<tr><td>Variance</td><td align="right">R' + (s.variance || 0).toFixed(2) + '</td></tr></table>' +
      '<p>PDF Z-report and CSV of all transactions are attached.</p></div>';
    const sn = s.sessionNumber || 'session';
    await emailService.sendEmail({
      to: recipients.join(','),
      subject: 'Origin Day-End Z-Report — ' + z.branchName + ' — ' + new Date(s.closedAt || Date.now()).toLocaleDateString('en-ZA'),
      html,
      attachments: [
        { filename: 'ZReport-' + sn + '.pdf', content: pdf },
        { filename: 'ZReport-' + sn + '.csv', content: csv }
      ]
    });
    res.json({ success: true, message: 'Report emailed', recipients });
  } catch (e) { logger.error('emailZReport', { error: e.message }); res.status(500).json({ success: false, message: 'Error emailing report: ' + e.message }); }
};
