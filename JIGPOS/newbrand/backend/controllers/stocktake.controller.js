// Stock Take Controller — Business logic extracted from routes/stocktake.js
const fs = require('fs');
const path = require('path');
const logger = require('../modules/logger');
const StockTake = require('../modules/database/models/StockTake');
const Product = require('../modules/database/models/Product');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Branch = require('../modules/database/models/Branch');
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

    // Fix isCountable for all items using enhanced detection
    let needsSave = false;
    for (const item of session.lineItems) {
      const cat = (item.category || '').toLowerCase();
      const tags = item.tags || [];
      const nameLower = (item.productName || '').toLowerCase();
      const pType = (item.productType || '').toLowerCase();
      const isFlower = cat === 'flower';
      const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack')
        || tags.includes('just-blaze')
        || pType === 'pre-roll' || pType === 'pre-pack'
        || nameLower.includes('pre-roll') || nameLower.includes('pre roll') || nameLower.includes('preroll')
        || nameLower.includes('pre-pack') || nameLower.includes('pre pack')
        || nameLower.includes('just blaze') || nameLower.includes('jb ')
        || nameLower.includes('joint') || nameLower.includes('moon stick')
        || nameLower.includes('gold roll') || nameLower.includes('singles')
        || nameLower.includes('perfect joint') || nameLower.includes('mj roll');
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

    // Always re-derive isCountable (session may have been created with wrong value)
    const cat = (item.category || '').toLowerCase();
    const tags = item.tags || [];
    const nameLower = (item.productName || '').toLowerCase();
    const isFlower = cat === 'flower';
    const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack')
      || tags.includes('just-blaze')
      || (item.productType || '').toLowerCase() === 'pre-roll'
      || (item.productType || '').toLowerCase() === 'pre-pack'
      || nameLower.includes('pre-roll') || nameLower.includes('pre roll') || nameLower.includes('preroll')
      || nameLower.includes('pre-pack') || nameLower.includes('pre pack')
      || nameLower.includes('just blaze') || nameLower.includes('jb ')
      || nameLower.includes('joint') || nameLower.includes('moon stick')
      || nameLower.includes('gold roll') || nameLower.includes('singles')
      || nameLower.includes('perfect joint') || nameLower.includes('mj roll');
    item.isCountable = !isFlower || isPreRollOrPack;
    if (item.isCountable && item.unit === 'g') {
      item.unit = 'units';
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

    // Quick Count Mode: photos required for weighable items (scale photo for OCR)
    // For countable items, photos only required if variance > 20%
    const missingRequiredPhotos = session.lineItems.filter(item => {
      // Weighable items always need scale photo
      if (!item.isCountable && !item.scalePhoto?.url) return true;
      // Countable items only need photo if variance > 20%
      if (item.isCountable) {
        const variancePct = item.expectedQty > 0
          ? Math.abs(((item.actualQty - item.expectedQty) / item.expectedQty) * 100)
          : 0;
        if (variancePct > 20 && (!item.unitPhotos || item.unitPhotos.length === 0)) return true;
      }
      return false;
    });

    if (missingRequiredPhotos.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${missingRequiredPhotos.length} item(s) require photos (weighable items or high variance >20%)`,
        missingPhotos: missingRequiredPhotos.map(item => ({
          productName: item.productName,
          isCountable: item.isCountable,
          variancePercent: item.variancePercent
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

// Add product to existing session
exports.addItemToSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'productId is required' });
    }

    const session = await StockTake.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.status !== 'in_progress' && session.status !== 'scheduled') {
      return res.status(400).json({ success: false, message: 'Session is not active' });
    }

    // Check if product already in session
    const exists = session.lineItems.find(li => li.productId?.toString() === productId);
    if (exists) {
      return res.status(400).json({ success: false, message: 'Product already in this session' });
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Get branch inventory quantity
    const inventory = await BranchInventory.findOne({
      branchId: session.branchId,
      productId: product._id
    });

    // Build lineItem (same logic as createSession)
    const tags = product.tags || [];
    const isFlower = product.category?.toLowerCase() === 'flower';
    const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack');
    const isCountable = !isFlower || isPreRollOrPack;

    const growMethod = tags.find(t => ['indoor', 'greendoor'].includes((t || '').toLowerCase())) || '';
    const nameLower = (product.name || '').toLowerCase();
    let productType = 'loose';
    if (tags.includes('pre-roll') || nameLower.includes('pre roll') || nameLower.includes('preroll') || nameLower.includes('joint')) {
      productType = 'pre-roll';
    } else if (tags.includes('pre-pack') || nameLower.includes('5g') || nameLower.includes('3g') || nameLower.includes('pre pack')) {
      productType = 'pre-pack';
    }

    const newItem = {
      productId: product._id,
      productName: product.name,
      sku: product.sku || '',
      category: product.category,
      growMethod,
      productType,
      tags,
      expectedQty: inventory?.quantity || 0,
      unit: isCountable ? 'units' : 'g',
      isCountable,
      validationStatus: 'pending'
    };

    session.lineItems.push(newItem);
    session.calculateSummary();
    await session.save();

    const addedItem = session.lineItems[session.lineItems.length - 1];

    logger.info(`Product ${product.name} added to session ${session.sessionNumber} by ${req.user.email}`);

    res.json({
      success: true,
      message: `${product.name} added to stock take`,
      item: addedItem,
      itemIndex: session.lineItems.length - 1,
      totalItems: session.lineItems.length
    });
  } catch (error) {
    logger.error('Add item to session error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, message: 'Error adding product', error: error.message });
  }
};

// Search products (for add-to-session feature)
exports.searchProducts = async (req, res) => {
  try {
    const { q, sessionId } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, products: [] });
    }

    const searchRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    const products = await Product.find({
      status: 'active',
      $or: [
        { name: searchRegex },
        { sku: searchRegex },
        { tags: searchRegex }
      ]
    }).select('_id name sku category price tags productType').limit(20);

    // If sessionId provided, mark which are already in the session
    let existingIds = new Set();
    if (sessionId) {
      const session = await StockTake.findById(sessionId).select('lineItems.productId');
      if (session) {
        existingIds = new Set(session.lineItems.map(li => li.productId?.toString()));
      }
    }

    const results = products.map(p => ({
      _id: p._id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      tags: p.tags,
      alreadyInSession: existingIds.has(p._id.toString())
    }));

    res.json({ success: true, products: results });
  } catch (error) {
    logger.error('Search products error', { error: error.message });
    res.status(500).json({ success: false, message: 'Error searching products' });
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

// ─── Cycle Count Compliance & Shrinkage Endpoints ───────────────────────────

const HIGH_VALUE_CATEGORIES = ['flower', 'pre-rolls', 'concentrates'];
const MEDIUM_VALUE_CATEGORIES = ['edibles', 'oils', 'vapes'];

// Helper: get start/end of today (UTC)
function todayRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  return { start, end };
}

// Helper: get start of current calendar week (Monday) and end (Sunday)
function thisWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday, 0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

// Helper: get start/end of current calendar month
function thisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// GET /stocktake/compliance/:branchId
// Returns compliance status for a branch — when was each tier last counted, is today's daily count done?
exports.getComplianceStatus = async (req, res) => {
  try {
    const { branchId } = req.params;

    const today = todayRange();
    const week = thisWeekRange();
    const month = thisMonthRange();
    const now = new Date();
    const isMonday = now.getDay() === 1;
    const isFirstOfMonth = now.getDate() === 1;

    // --- Daily high-value cycle count ---
    const dailySession = await StockTake.findOne({
      branchId,
      stockTakeType: 'cycle',
      categories: { $in: HIGH_VALUE_CATEGORIES },
      status: { $in: ['approved', 'pending_review', 'in_progress'] },
      createdAt: { $gte: today.start, $lte: today.end }
    }).sort({ createdAt: -1 });

    const lastDailyHighValue = await StockTake.findOne({
      branchId,
      stockTakeType: 'cycle',
      categories: { $in: HIGH_VALUE_CATEGORIES },
      status: { $in: ['approved', 'pending_review', 'in_progress'] }
    }).sort({ createdAt: -1 }).select('createdAt _id');

    // --- Weekly medium-value cycle count ---
    const weeklySession = await StockTake.findOne({
      branchId,
      stockTakeType: 'cycle',
      categories: { $in: MEDIUM_VALUE_CATEGORIES },
      status: { $in: ['approved', 'pending_review', 'in_progress'] },
      createdAt: { $gte: week.start, $lte: week.end }
    }).sort({ createdAt: -1 });

    const lastWeeklyMedium = await StockTake.findOne({
      branchId,
      stockTakeType: 'cycle',
      categories: { $in: MEDIUM_VALUE_CATEGORIES },
      status: { $in: ['approved', 'pending_review', 'in_progress'] }
    }).sort({ createdAt: -1 }).select('createdAt');

    // --- Monthly full stock take ---
    const monthlySession = await StockTake.findOne({
      branchId,
      stockTakeType: 'full',
      status: { $in: ['approved', 'pending_review', 'in_progress'] },
      createdAt: { $gte: month.start, $lte: month.end }
    }).sort({ createdAt: -1 });

    const lastMonthlyFull = await StockTake.findOne({
      branchId,
      stockTakeType: 'full',
      status: { $in: ['approved', 'pending_review', 'in_progress'] }
    }).sort({ createdAt: -1 }).select('createdAt');

    res.json({
      success: true,
      compliance: {
        dailyHighValue: {
          required: true,
          lastCompleted: lastDailyHighValue?.createdAt || null,
          completedToday: !!dailySession,
          categories: HIGH_VALUE_CATEGORIES,
          sessionId: dailySession?._id || null
        },
        weeklyMedium: {
          required: isMonday,
          lastCompleted: lastWeeklyMedium?.createdAt || null,
          completedThisWeek: !!weeklySession,
          categories: MEDIUM_VALUE_CATEGORIES
        },
        monthlyFull: {
          required: isFirstOfMonth,
          lastCompleted: lastMonthlyFull?.createdAt || null,
          completedThisMonth: !!monthlySession
        }
      }
    });
  } catch (error) {
    logger.error('Get compliance status error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching compliance status',
      error: error.message
    });
  }
};

// POST /stocktake/schedule/daily-high-value
// Auto-creates a daily cycle count session pre-loaded with high-value categories
exports.scheduleDailyHighValue = async (req, res) => {
  try {
    const { branchId } = req.body;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: 'branchId is required'
      });
    }

    const today = todayRange();

    // Check if a high-value cycle session already exists today for this branch
    const existingToday = await StockTake.findOne({
      branchId,
      stockTakeType: 'cycle',
      categories: { $in: HIGH_VALUE_CATEGORIES },
      createdAt: { $gte: today.start, $lte: today.end }
    });

    if (existingToday) {
      return res.status(400).json({
        success: false,
        message: 'A daily high-value cycle count session already exists for today',
        session: {
          _id: existingToday._id,
          sessionNumber: existingToday.sessionNumber,
          status: existingToday.status
        }
      });
    }

    // Get products in high-value categories
    const products = await Product.find({
      status: 'active',
      category: { $in: HIGH_VALUE_CATEGORIES }
    }).select('_id name sku category price tags subcategory supplier');

    // Get current inventory for each product at this branch
    const inventories = await BranchInventory.find({
      branchId,
      productId: { $in: products.map(p => p._id) }
    });

    const inventoryMap = new Map(inventories.map(inv => [inv.productId.toString(), inv]));

    // Build line items (same logic as createSession)
    const lineItems = products.map(product => {
      const inventory = inventoryMap.get(product._id.toString());
      const tags = product.tags || [];
      const isFlower = product.category?.toLowerCase() === 'flower';
      const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack');
      const isCountable = !isFlower || isPreRollOrPack;

      const growMethod = tags.find(t => ['indoor', 'greendoor'].includes((t || '').toLowerCase())) || '';

      const nameLower = (product.name || '').toLowerCase();
      let productType = 'loose';
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
        growMethod,
        productType,
        tags,
        expectedQty: inventory?.quantity || 0,
        unit: isCountable ? 'units' : 'g',
        isCountable,
        validationStatus: 'pending'
      };
    });

    // Create the cycle count session
    const stockTake = new StockTake({
      branchId,
      stockTakeType: 'cycle',
      categories: HIGH_VALUE_CATEGORIES,
      scheduledDate: new Date(),
      lineItems,
      createdBy: req.user.id,
      assignedTo: [req.user.id],
      notes: 'Auto-scheduled daily high-value cycle count',
      status: 'scheduled'
    });

    stockTake.calculateSummary();
    await stockTake.save();

    logger.info(`Daily high-value cycle count created for branch ${branchId} — session ${stockTake.sessionNumber}`);

    res.status(201).json({
      success: true,
      message: 'Daily high-value cycle count session created',
      session: {
        _id: stockTake._id,
        sessionNumber: stockTake.sessionNumber,
        totalItems: stockTake.totalItems,
        categories: HIGH_VALUE_CATEGORIES,
        status: stockTake.status
      }
    });
  } catch (error) {
    logger.error('Schedule daily high-value error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error creating daily high-value cycle count',
      error: error.message
    });
  }
};

// GET /stocktake/compliance/all-branches
// Returns compliance status across ALL branches (for owner dashboard)
exports.getAllBranchesCompliance = async (req, res) => {
  try {
    const branches = await Branch.find({ status: 'active' }).select('_id name branchCode');

    const today = todayRange();
    const week = thisWeekRange();
    const month = thisMonthRange();

    const results = await Promise.all(branches.map(async (branch) => {
      // Daily high-value check
      const dailySession = await StockTake.findOne({
        branchId: branch._id,
        stockTakeType: 'cycle',
        categories: { $in: HIGH_VALUE_CATEGORIES },
        status: { $in: ['approved', 'pending_review', 'in_progress'] },
        createdAt: { $gte: today.start, $lte: today.end }
      });

      // Weekly medium-value check
      const weeklySession = await StockTake.findOne({
        branchId: branch._id,
        stockTakeType: 'cycle',
        categories: { $in: MEDIUM_VALUE_CATEGORIES },
        status: { $in: ['approved', 'pending_review', 'in_progress'] },
        createdAt: { $gte: week.start, $lte: week.end }
      });

      // Monthly full check
      const monthlySession = await StockTake.findOne({
        branchId: branch._id,
        stockTakeType: 'full',
        status: { $in: ['approved', 'pending_review', 'in_progress'] },
        createdAt: { $gte: month.start, $lte: month.end }
      });

      // Days since last high-value count
      const lastHighValue = await StockTake.findOne({
        branchId: branch._id,
        stockTakeType: 'cycle',
        categories: { $in: HIGH_VALUE_CATEGORIES },
        status: { $in: ['approved', 'pending_review'] }
      }).sort({ createdAt: -1 }).select('createdAt');

      let daysSinceLastHighValueCount = null;
      if (lastHighValue) {
        const diffMs = Date.now() - new Date(lastHighValue.createdAt).getTime();
        daysSinceLastHighValueCount = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      }

      return {
        branchId: branch._id,
        branchName: branch.name,
        branchCode: branch.branchCode,
        dailyCompleted: !!dailySession,
        weeklyCompleted: !!weeklySession,
        monthlyCompleted: !!monthlySession,
        daysSinceLastHighValueCount
      };
    }));

    res.json({
      success: true,
      branches: results,
      count: results.length
    });
  } catch (error) {
    logger.error('Get all branches compliance error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching all-branches compliance',
      error: error.message
    });
  }
};

// GET /stocktake/shrinkage-trends/:branchId
// Returns variance trends over time for high-value categories
exports.getShrinkageTrends = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { days = 30 } = req.query;

    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - parseInt(days));
    sinceDate.setHours(0, 0, 0, 0);

    // Get approved stocktakes for this branch in the time window
    const sessions = await StockTake.find({
      branchId,
      status: 'approved',
      createdAt: { $gte: sinceDate },
      // Include both cycle counts for high-value and full counts
      $or: [
        { stockTakeType: 'cycle', categories: { $in: HIGH_VALUE_CATEGORIES } },
        { stockTakeType: 'full' }
      ]
    }).sort({ createdAt: 1 }).select('lineItems createdAt sessionNumber');

    // Aggregate variance data per product
    const productMap = new Map();

    for (const session of sessions) {
      for (const item of session.lineItems) {
        // Only include high-value category items
        const cat = (item.category || '').toLowerCase();
        if (!HIGH_VALUE_CATEGORIES.includes(cat)) continue;
        if (item.actualQty === undefined || item.actualQty === null) continue;

        const key = item.productId?.toString() || item.productName;
        if (!productMap.has(key)) {
          productMap.set(key, {
            name: item.productName,
            sku: item.sku || '',
            category: item.category,
            variances: [],
            variancePercents: []
          });
        }

        const entry = productMap.get(key);
        entry.variances.push(item.variance || 0);
        entry.variancePercents.push(item.variancePercent || 0);
      }
    }

    // Calculate trends
    const products = Array.from(productMap.values()).map(p => {
      const count = p.variances.length;
      const avgVariance = count > 0
        ? parseFloat((p.variances.reduce((a, b) => a + b, 0) / count).toFixed(2))
        : 0;
      const avgVariancePercent = count > 0
        ? parseFloat((p.variancePercents.reduce((a, b) => a + b, 0) / count).toFixed(2))
        : 0;

      // Determine trend: compare first half vs second half of observations
      let trend = 'stable';
      if (count >= 4) {
        const mid = Math.floor(count / 2);
        const firstHalfAvg = p.variances.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
        const secondHalfAvg = p.variances.slice(mid).reduce((a, b) => a + b, 0) / (count - mid);

        // Negative variance = shrinking (less stock than expected)
        // If second half is more negative, trend is shrinking
        if (secondHalfAvg < firstHalfAvg - 1) {
          trend = 'shrinking';
        } else if (secondHalfAvg > firstHalfAvg + 1) {
          trend = 'growing';
        }
      }

      return {
        name: p.name,
        sku: p.sku,
        category: p.category,
        avgVariance,
        avgVariancePercent,
        countSessions: count,
        trend
      };
    });

    // Sort by severity: most shrinking first
    products.sort((a, b) => a.avgVariance - b.avgVariance);

    res.json({
      success: true,
      branchId,
      periodDays: parseInt(days),
      sessionsAnalyzed: sessions.length,
      products
    });
  } catch (error) {
    logger.error('Get shrinkage trends error', { error: error.message, stack: error.stack });
    res.status(500).json({
      success: false,
      message: 'Error fetching shrinkage trends',
      error: error.message
    });
  }
};
