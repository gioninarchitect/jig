// Stock Take Controller — Business logic extracted from routes/stocktake.js
const fs = require('fs');
const path = require('path');
const logger = require('../modules/logger');
const StockTake = require('../modules/database/models/StockTake');
const Product = require('../modules/database/models/Product');
const BranchInventory = require('../modules/database/models/BranchInventory');
const visionService = require('../modules/vision');

// Create new stock take session
exports.createSession = async (req, res) => {
  try {
    const {
      branchId,
      stockTakeType = 'full',
      categories,
      scheduledDate,
      assignedTo,
      notes
    } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'Branch ID is required'
      });
    }

    // Check for existing active session
    const existingSession = await StockTake.getActiveSession(branchId);
    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'An active stock take session already exists for this branch',
        session: existingSession
      });
    }

    // Get products for the branch
    let query = { status: 'active' };
    if (categories && categories.length > 0) {
      query.category = { $in: categories };
    }

    const products = await Product.find(query).select('_id name sku category price tags subcategory supplier');

    // Get current inventory for each product
    const inventories = await BranchInventory.find({
      branchId,
      productId: { $in: products.map(p => p._id) }
    });

    const inventoryMap = new Map(inventories.map(inv => [inv.productId.toString(), inv]));

    // Create line items from products
    const lineItems = products.map(product => {
      const inventory = inventoryMap.get(product._id.toString());
      // Only loose flower is measured in grams — everything else is countable (units)
      const tags = product.tags || [];
      const isFlower = product.category?.toLowerCase() === 'flower';
      const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack');
      const isCountable = !isFlower || isPreRollOrPack;

      // Extract grow method from tags (indoor/greendoor)
      const growMethod = tags.find(t => ['indoor', 'greendoor'].includes((t || '').toLowerCase())) || '';

      // Determine product type from name/tags
      const nameLower = (product.name || '').toLowerCase();
      let productType = 'loose';  // Default
      if (tags.includes('pre-roll') || nameLower.includes('pre roll') || nameLower.includes('preroll') || nameLower.includes('joint')) {
        productType = 'pre-roll';
      } else if (tags.includes('pre-pack') || nameLower.includes('5g') || nameLower.includes('3g') || nameLower.includes('pre pack')) {
        productType = 'pre-pack';
      }

      return {
        productId: product._id,
        productName: product.name,
        sku: product.sku || '',
        category: product.category,
        growMethod: growMethod,
        productType: productType,
        tags: tags,
        expectedQty: inventory?.quantity || 0,
        unit: isCountable ? 'units' : 'g',
        isCountable,
        validationStatus: 'pending'
      };
    });

    // Create stock take session
    const stockTake = new StockTake({
      branchId,
      stockTakeType,
      categories: categories || [],
      scheduledDate: scheduledDate || new Date(),
      lineItems,
      createdBy: req.user.id,
      assignedTo: assignedTo || [req.user.id],
      notes,
      status: 'scheduled'
    });

    stockTake.calculateSummary();
    await stockTake.save();

    res.status(201).json({
      success: true,
      message: 'Stock take session created',
      session: {
        sessionNumber: stockTake.sessionNumber,
        _id: stockTake._id,
        totalItems: stockTake.totalItems,
        status: stockTake.status
      }
    });
  } catch (error) {
    logger.error('Create stock take session error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error creating stock take session',
      error: error.message
    });
  }
};

// Get stock take session by ID
exports.getSession = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await StockTake.findById(sessionId)
      .populate('branchId', 'name branchCode')
      .populate('createdBy assignedTo submittedBy approvedBy', 'firstName lastName email')
      .populate('lineItems.countedBy lineItems.reviewedBy', 'firstName lastName');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    // Fix isCountable for old sessions that don't have it set correctly
    let needsSave = false;
    for (const item of session.lineItems) {
      const cat = (item.category || '').toLowerCase();
      const tags = item.tags || [];
      const isFlower = cat === 'flower';
      const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack');
      const shouldBeCountable = !isFlower || isPreRollOrPack;

      if (item.isCountable !== shouldBeCountable) {
        item.isCountable = shouldBeCountable;
        if (shouldBeCountable && item.unit === 'g') {
          item.unit = 'units';
        }
        needsSave = true;
      }
    }
    if (needsSave) {
      await session.save();
    }

    res.json({
      success: true,
      session
    });
  } catch (error) {
    logger.error('Get stock take session error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching stock take session',
      error: error.message
    });
  }
};

// Start stock take session
exports.startSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { location } = req.body;

    const session = await StockTake.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: `Cannot start session with status: ${session.status}`
      });
    }

    session.status = 'in_progress';
    session.startedAt = new Date();

    if (location) {
      session.location = {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        capturedAt: new Date()
      };
    }

    await session.save();

    res.json({
      success: true,
      message: 'Stock take session started',
      session: {
        sessionNumber: session.sessionNumber,
        status: session.status,
        startedAt: session.startedAt
      }
    });
  } catch (error) {
    logger.error('Start stock take session error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error starting stock take session',
      error: error.message
    });
  }
};

// Get active session for branch
exports.getActiveSession = async (req, res) => {
  try {
    const { branchId } = req.params;

    const session = await StockTake.getActiveSession(branchId);

    res.json({
      success: true,
      session: session || null,
      hasActiveSession: !!session
    });
  } catch (error) {
    logger.error('Get active stock take error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching active session',
      error: error.message
    });
  }
};

// Update line item (enter count)
exports.updateLineItem = async (req, res) => {
  try {
    const { sessionId, itemIndex } = req.params;
    const { actualQty, notes, ocrDetectedWeight } = req.body;

    const session = await StockTake.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Session is not in progress'
      });
    }

    const idx = parseInt(itemIndex);
    if (idx < 0 || idx >= session.lineItems.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid item index'
      });
    }

    const item = session.lineItems[idx];

    // Update fields
    if (actualQty !== undefined) {
      item.actualQty = parseFloat(actualQty);
    }
    if (notes) {
      item.notes = notes;
    }
    if (ocrDetectedWeight !== undefined) {
      item.ocrDetectedWeight = parseFloat(ocrDetectedWeight);
    }

    item.countedBy = req.user.id;
    item.countedAt = new Date();

    // Validate the line item
    session.validateLineItem(idx);

    // Recalculate summary
    session.calculateSummary();

    await session.save();

    res.json({
      success: true,
      message: 'Item updated',
      item: session.lineItems[idx],
      summary: {
        completedItems: session.completedItems,
        totalItems: session.totalItems,
        allPhotosUploaded: session.allPhotosUploaded,
        allWeightsEntered: session.allWeightsEntered
      }
    });
  } catch (error) {
    logger.error('Update line item error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error updating line item',
      error: error.message
    });
  }
};

// Upload scale photo for line item
exports.uploadScalePhoto = async (req, res) => {
  try {
    const { sessionId, itemIndex } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo uploaded'
      });
    }

    const session = await StockTake.findById(sessionId);

    if (!session) {
      // Delete uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    if (session.status !== 'in_progress') {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Session is not in progress'
      });
    }

    const idx = parseInt(itemIndex);
    if (idx < 0 || idx >= session.lineItems.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Invalid item index'
      });
    }

    const item = session.lineItems[idx];

    // Delete old photo if exists
    if (item.scalePhoto?.filename) {
      const oldPath = path.join(__dirname, '../../uploads/stocktake', item.scalePhoto.filename);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Update with new photo
    item.scalePhoto = {
      url: `/uploads/stocktake/${req.file.filename}`,
      filename: req.file.filename,
      uploadedAt: new Date(),
      fileSize: req.file.size
    };

    // Process OCR to read scale weight
    let ocrResult = null;
    try {
      const imagePath = req.file.path;
      ocrResult = await visionService.readScaleWeight(imagePath);

      if (ocrResult.success && ocrResult.weight !== null) {
        item.ocrDetectedWeight = ocrResult.weight;
        item.ocrConfidence = ocrResult.confidence;
        item.ocrRawText = ocrResult.rawText;

        // Compare with manual entry if already entered
        if (item.actualQty !== undefined && item.actualQty !== null) {
          const comparison = visionService.compareWeights(ocrResult.weight, item.actualQty);
          item.ocrMatchesManual = comparison.matches;
        }

        logger.info('OCR detected weight', {
          productName: item.productName,
          ocrWeight: ocrResult.weight,
          confidence: ocrResult.confidence
        });
      }
    } catch (ocrError) {
      logger.warn('OCR processing failed, continuing without', { error: ocrError.message });
    }

    // Validate and recalculate
    session.validateLineItem(idx);
    session.calculateSummary();

    await session.save();

    res.json({
      success: true,
      message: 'Photo uploaded' + (ocrResult?.success ? ' - OCR processed' : ''),
      photo: item.scalePhoto,
      validationStatus: item.validationStatus,
      ocr: ocrResult ? {
        detected: ocrResult.success,
        weight: ocrResult.weight,
        unit: ocrResult.unit,
        confidence: ocrResult.confidence,
        matchesManual: item.ocrMatchesManual
      } : null
    });
  } catch (error) {
    logger.error('Upload scale photo error', { error: error.message, stack: error.stack });
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading photo',
      error: error.message
    });
  }
};

// Upload unit photos (for countable items)
exports.uploadUnitPhoto = async (req, res) => {
  try {
    const { sessionId, itemIndex } = req.params;
    const { count } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No photo uploaded'
      });
    }

    const session = await StockTake.findById(sessionId);

    if (!session) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    const idx = parseInt(itemIndex);
    const item = session.lineItems[idx];

    // Derive isCountable if not set (old sessions created before this feature)
    if (item.isCountable === undefined || item.isCountable === null) {
      const cat = (item.category || '').toLowerCase();
      const tags = item.tags || [];
      const isFlower = cat === 'flower';
      const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack');
      item.isCountable = !isFlower || isPreRollOrPack;
      // Also fix unit if it was wrong
      if (item.isCountable && item.unit === 'g') {
        item.unit = 'units';
      }
    }

    if (!item.isCountable) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'This item is not countable - use scale photo instead'
      });
    }

    // Add to unit photos array
    if (!item.unitPhotos) {
      item.unitPhotos = [];
    }

    // Use Claude Vision to count items if no manual count provided
    let detectedCount = parseInt(count) || 0;
    let visionResult = null;

    if (!count || parseInt(count) === 0) {
      try {
        visionResult = await visionService.countItemsFromPhoto(req.file.path, item.productName);
        if (visionResult.success && visionResult.count !== null) {
          detectedCount = visionResult.count;
          logger.info('Claude Vision counted items', {
            productName: item.productName,
            count: visionResult.count,
            confidence: visionResult.confidence
          });
        }
      } catch (countError) {
        logger.warn('Vision count failed, using manual count', { error: countError.message });
      }
    }

    item.unitPhotos.push({
      url: `/uploads/stocktake/${req.file.filename}`,
      filename: req.file.filename,
      uploadedAt: new Date(),
      count: detectedCount
    });

    // Update total unit count
    item.unitCount = item.unitPhotos.reduce((sum, p) => sum + (p.count || 0), 0);

    session.validateLineItem(idx);
    session.calculateSummary();

    await session.save();

    res.json({
      success: true,
      message: 'Unit photo uploaded' + (visionResult?.success ? ` - ${detectedCount} items detected` : ''),
      unitPhotos: item.unitPhotos,
      totalCount: item.unitCount,
      vision: visionResult ? {
        detected: visionResult.success,
        count: visionResult.count,
        confidence: visionResult.confidence,
        provider: visionResult.provider
      } : null
    });
  } catch (error) {
    logger.error('Upload unit photo error', { error: error.message, stack: error.stack });
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({
      success: false,
      message: 'Error uploading unit photo',
      error: error.message
    });
  }
};

// Submit stock take for approval
exports.submitSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { notes } = req.body;

    const session = await StockTake.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    if (session.status !== 'in_progress') {
      return res.status(400).json({
        success: false,
        message: 'Session is not in progress'
      });
    }

    // Recalculate and validate
    session.calculateSummary();

    // Check validation requirements
    const invalidItems = session.lineItems.filter(item =>
      item.validationStatus === 'invalid'
    );

    if (invalidItems.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${invalidItems.length} item(s) have validation errors`,
        invalidItems: invalidItems.map((item, idx) => ({
          index: session.lineItems.indexOf(item),
          productName: item.productName,
          errors: item.validationErrors
        }))
      });
    }

    // Check all photos uploaded
    if (!session.allPhotosUploaded) {
      const missingPhotos = session.lineItems.filter(item =>
        !item.scalePhoto?.url && !item.isCountable ||
        item.isCountable && (!item.unitPhotos || item.unitPhotos.length === 0)
      );

      return res.status(400).json({
        success: false,
        message: 'All items must have photos before submission',
        missingPhotos: missingPhotos.map(item => ({
          productName: item.productName,
          isCountable: item.isCountable
        }))
      });
    }

    // Check all weights entered
    if (!session.allWeightsEntered) {
      const missingWeights = session.lineItems.filter(item =>
        item.actualQty === undefined || item.actualQty === null
      );

      return res.status(400).json({
        success: false,
        message: 'All items must have quantities entered before submission',
        missingWeights: missingWeights.map(item => item.productName)
      });
    }

    // Update status
    session.status = 'pending_review';
    session.submittedAt = new Date();
    session.submittedBy = req.user.id;
    session.completedAt = new Date();

    if (notes) {
      session.notes = notes;
    }

    await session.save();

    logger.info(`Stock take ${session.sessionNumber} submitted by ${req.user.email}`);

    res.json({
      success: true,
      message: 'Stock take submitted for approval',
      session: {
        sessionNumber: session.sessionNumber,
        status: session.status,
        submittedAt: session.submittedAt,
        itemsRequiringReview: session.itemsRequiringReview
      }
    });
  } catch (error) {
    logger.error('Submit stock take error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error submitting stock take',
      error: error.message
    });
  }
};

// Approve/Reject stock take (Manager only)
exports.approveSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { action, notes, adjustInventory = true } = req.body;

    const session = await StockTake.findById(sessionId);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    if (session.status !== 'pending_review') {
      return res.status(400).json({
        success: false,
        message: 'Session is not pending review'
      });
    }

    if (action === 'approve') {
      session.status = 'approved';
      session.approvedBy = req.user.id;
      session.approvedAt = new Date();
      session.approvalNotes = notes;

      // Optionally adjust inventory to match stock take
      if (adjustInventory) {
        for (const item of session.lineItems) {
          if (item.actualQty !== undefined && item.actualQty !== null) {
            await BranchInventory.findOneAndUpdate(
              {
                branchId: session.branchId,
                productId: item.productId
              },
              {
                $set: {
                  quantity: item.actualQty,
                  lastStockTakeAt: new Date(),
                  lastStockTakeBy: req.user.id
                }
              },
              { upsert: true }
            );
          }
        }
      }

      logger.info(`Stock take ${session.sessionNumber} approved by ${req.user.email}`);

    } else if (action === 'reject') {
      session.status = 'rejected';
      session.approvedBy = req.user.id;
      session.approvedAt = new Date();
      session.rejectionReason = notes;

      logger.info(`Stock take ${session.sessionNumber} rejected by ${req.user.email}: ${notes}`);
    }

    await session.save();

    res.json({
      success: true,
      message: `Stock take ${action}d successfully`,
      session: {
        sessionNumber: session.sessionNumber,
        status: session.status,
        approvedAt: session.approvedAt
      }
    });
  } catch (error) {
    logger.error('Approve stock take error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error processing approval',
      error: error.message
    });
  }
};

// Get pending approvals
exports.getPendingApprovals = async (req, res) => {
  try {
    const { branchId } = req.query;

    const pendingSessions = await StockTake.getPendingApprovals(branchId);

    res.json({
      success: true,
      sessions: pendingSessions,
      count: pendingSessions.length
    });
  } catch (error) {
    logger.error('Get pending stock takes error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching pending approvals',
      error: error.message
    });
  }
};

// Get stock take history
exports.getHistory = async (req, res) => {
  try {
    const { branchId, startDate, endDate, status, limit = 20 } = req.query;

    const query = {};

    if (branchId) query.branchId = branchId;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const sessions = await StockTake.find(query)
      .populate('branchId', 'name branchCode')
      .populate('createdBy submittedBy approvedBy', 'firstName lastName')
      .select('-lineItems') // Exclude line items for list view
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      sessions,
      count: sessions.length
    });
  } catch (error) {
    logger.error('Get stock take history error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching history',
      error: error.message
    });
  }
};

// Generate variance report
exports.getVarianceReport = async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await StockTake.findById(sessionId)
      .populate('branchId', 'name branchCode address')
      .populate('createdBy submittedBy approvedBy', 'firstName lastName email');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    // Build variance report
    const variances = session.lineItems
      .filter(item => item.variance !== 0)
      .map(item => ({
        productName: item.productName,
        sku: item.sku,
        category: item.category,
        expected: item.expectedQty,
        actual: item.actualQty,
        variance: item.variance,
        variancePercent: item.variancePercent,
        unit: item.unit,
        acceptable: item.varianceAcceptable,
        notes: item.notes,
        hasPhoto: !!item.scalePhoto?.url
      }))
      .sort((a, b) => Math.abs(b.variancePercent) - Math.abs(a.variancePercent));

    const report = {
      sessionNumber: session.sessionNumber,
      branch: session.branchId?.name || 'Unknown',
      date: session.completedAt || session.createdAt,
      status: session.status,
      preparedBy: session.submittedBy
        ? `${session.submittedBy.firstName} ${session.submittedBy.lastName}`
        : 'Unknown',
      approvedBy: session.approvedBy
        ? `${session.approvedBy.firstName} ${session.approvedBy.lastName}`
        : 'Pending',
      summary: {
        totalItems: session.totalItems,
        itemsWithVariance: variances.length,
        itemsAcceptable: variances.filter(v => v.acceptable).length,
        itemsRequiringReview: variances.filter(v => !v.acceptable).length
      },
      variances
    };

    res.json({
      success: true,
      report
    });
  } catch (error) {
    logger.error('Generate variance report error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error generating variance report',
      error: error.message
    });
  }
};
