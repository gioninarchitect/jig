// MDC Controller — Master Digital Catalogue 4-stage pipeline
// Stages: pending > qa > approved > live
const logger = require('../modules/logger');
const Product = require('../modules/database/models/Product');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Branch = require('../modules/database/models/Branch');

const STAGE_ORDER = ['pending', 'qa', 'approved', 'live'];

// GET /mdc/pipeline — Products grouped by stage with counts
exports.getPipeline = async (req, res) => {
    try {
        const { track } = req.query;
        const matchFilter = {};
        if (track) matchFilter.track = track;

        const [counts, pending, qa, approved, live] = await Promise.all([
            Product.aggregate([
                { $match: matchFilter },
                { $group: { _id: '$mdcStage', count: { $sum: 1 } } }
            ]),
            Product.find({ ...matchFilter, mdcStage: 'pending' })
                .select('name sku category track price images status inventory createdAt mdcNotes')
                .sort('-createdAt').limit(50),
            Product.find({ ...matchFilter, mdcStage: 'qa' })
                .select('name sku category track price images status inventory createdAt mdcNotes')
                .sort('-createdAt').limit(50),
            Product.find({ ...matchFilter, mdcStage: 'approved' })
                .select('name sku category track price images status inventory createdAt mdcNotes mdcApprovedAt')
                .sort('-mdcApprovedAt').limit(50),
            Product.find({ ...matchFilter, mdcStage: 'live' })
                .select('name sku category track price images status inventory createdAt mdcApprovedAt')
                .sort('-mdcApprovedAt').limit(50)
        ]);

        const countMap = { pending: 0, qa: 0, approved: 0, live: 0 };
        counts.forEach(c => { if (c._id) countMap[c._id] = c.count; });

        // Count products with no track set
        const untagged = await Product.countDocuments({ ...matchFilter, track: { $exists: false } });

        res.json({
            success: true,
            counts: countMap,
            untaggedCount: untagged,
            stages: { pending, qa, approved, live }
        });
    } catch (err) {
        logger.error('MDC getPipeline error:', err);
        res.status(500).json({ success: false, message: 'Failed to load MDC pipeline' });
    }
};

// GET /mdc/products — Filtered product list by stage
exports.getProducts = async (req, res) => {
    try {
        const { stage, track, search, page = 1, limit = 50 } = req.query;
        const query = {};
        if (stage) query.mdcStage = stage;
        if (track) query.track = track;
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { sku: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [products, total] = await Promise.all([
            Product.find(query)
                .select('name sku category track price compareAtPrice costPrice images status inventory mdcStage mdcNotes mdcApprovedAt createdAt')
                .sort('-createdAt')
                .skip(skip)
                .limit(parseInt(limit)),
            Product.countDocuments(query)
        ]);

        res.json({ success: true, products, total, page: parseInt(page), limit: parseInt(limit) });
    } catch (err) {
        logger.error('MDC getProducts error:', err);
        res.status(500).json({ success: false, message: 'Failed to load products' });
    }
};

// PATCH /mdc/products/:id/advance — Move product to next stage
exports.advance = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        const currentIndex = STAGE_ORDER.indexOf(product.mdcStage || 'pending');
        if (currentIndex >= STAGE_ORDER.length - 1) {
            return res.status(400).json({ success: false, message: 'Product is already at final stage (live). Use go-live endpoint.' });
        }

        // Validation for pending -> qa: must have required fields
        if (product.mdcStage === 'pending') {
            const missing = [];
            if (!product.name) missing.push('name');
            if (!product.price || product.price <= 0) missing.push('price (must be > R0)');
            if (!product.category) missing.push('category');
            if (!product.track) missing.push('track');
            if (missing.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot advance to QA. Missing fields: ${missing.join(', ')}`
                });
            }
        }

        const nextStage = STAGE_ORDER[currentIndex + 1];
        const update = { mdcStage: nextStage };

        if (nextStage === 'approved') {
            update.mdcApprovedAt = new Date();
            update.mdcApprovedBy = req.user.id;
        }

        if (req.body.notes) update.mdcNotes = req.body.notes;

        await Product.findByIdAndUpdate(req.params.id, update);

        logger.info(`MDC: Product ${product.sku} advanced from ${product.mdcStage} to ${nextStage} by ${req.user.id}`);
        res.json({ success: true, message: `Product moved to ${nextStage}`, previousStage: product.mdcStage, newStage: nextStage });
    } catch (err) {
        logger.error('MDC advance error:', err);
        res.status(500).json({ success: false, message: 'Failed to advance product' });
    }
};

// PATCH /mdc/products/:id/reject — Send product back with notes
exports.reject = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        if (product.mdcStage === 'pending') {
            return res.status(400).json({ success: false, message: 'Product is already at pending stage' });
        }

        const previousStage = product.mdcStage;
        const update = {
            mdcStage: 'pending',
            mdcNotes: req.body.notes || 'Rejected - needs review'
        };

        // If rejecting from live, also unpublish
        if (previousStage === 'live') {
            update.isPublished = false;
            update.status = 'draft';
        }

        await Product.findByIdAndUpdate(req.params.id, update);

        logger.info(`MDC: Product ${product.sku} rejected from ${previousStage} to pending by ${req.user.id}`);
        res.json({ success: true, message: 'Product sent back to pending', previousStage, newStage: 'pending' });
    } catch (err) {
        logger.error('MDC reject error:', err);
        res.status(500).json({ success: false, message: 'Failed to reject product' });
    }
};

// POST /mdc/products/:id/allocate — Allocate product to branches
exports.allocate = async (req, res) => {
    try {
        const { branches } = req.body;
        if (!branches || !Array.isArray(branches) || branches.length === 0) {
            return res.status(400).json({ success: false, message: 'branches array is required' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        if (product.mdcStage !== 'approved' && product.mdcStage !== 'live') {
            return res.status(400).json({ success: false, message: 'Product must be approved or live before allocation' });
        }

        const results = [];
        let totalAllocated = 0;

        for (const alloc of branches) {
            const { branchId, quantity, overridePrice } = alloc;
            if (!branchId || quantity === undefined) continue;

            // Verify branch exists
            const branch = await Branch.findById(branchId);
            if (!branch) {
                results.push({ branchId, error: 'Branch not found' });
                continue;
            }

            // Upsert BranchInventory record
            let branchInv = await BranchInventory.findOne({ branchId, productId: product._id });

            if (branchInv) {
                // Record the movement (difference)
                const diff = quantity - branchInv.quantity;
                if (diff !== 0) {
                    await branchInv.recordMovement(
                        diff > 0 ? 'restock' : 'adjustment',
                        diff,
                        'MDC-ALLOC',
                        `MDC allocation by inventory manager`,
                        req.user.id
                    );
                }
                if (overridePrice !== undefined) {
                    branchInv.overridePrice = overridePrice;
                    await branchInv.save();
                }
            } else {
                branchInv = await BranchInventory.create({
                    branchId,
                    productId: product._id,
                    quantity: quantity,
                    overridePrice: overridePrice || undefined,
                    isActive: true,
                    isAvailableForSale: true,
                    recentMovements: [{
                        type: 'restock',
                        quantity: quantity,
                        balanceBefore: 0,
                        balanceAfter: quantity,
                        reference: 'MDC-ALLOC',
                        notes: 'Initial MDC allocation',
                        performedBy: req.user.id
                    }]
                });
            }

            totalAllocated += branchInv.quantity;
            results.push({ branchId, branchName: branch.name, quantity: branchInv.quantity, overridePrice: branchInv.overridePrice });
        }

        // Update product total inventory as sum of all branch allocations
        const allBranchInv = await BranchInventory.find({ productId: product._id, isActive: true });
        const totalQty = allBranchInv.reduce((sum, bi) => sum + bi.quantity, 0);
        await Product.findByIdAndUpdate(product._id, { 'inventory.quantity': totalQty });

        logger.info(`MDC: Product ${product.sku} allocated to ${results.length} branches, total: ${totalQty}`);
        res.json({ success: true, message: `Allocated to ${results.length} branches`, totalQuantity: totalQty, allocations: results });
    } catch (err) {
        logger.error('MDC allocate error:', err);
        res.status(500).json({ success: false, message: 'Failed to allocate product' });
    }
};

// GET /mdc/products/:id/allocation — Get branch allocation for a product
exports.getAllocation = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).select('name sku price');
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        const allocations = await BranchInventory.find({ productId: req.params.id, isActive: true })
            .populate('branchId', 'name branchCode type')
            .sort('branchId');

        // Also get all branches so frontend can show unallocated ones
        const allBranches = await Branch.find({ isActive: true }).select('name branchCode type').sort('name');

        res.json({ success: true, product, allocations, branches: allBranches });
    } catch (err) {
        logger.error('MDC getAllocation error:', err);
        res.status(500).json({ success: false, message: 'Failed to load allocation' });
    }
};

// POST /mdc/products/:id/go-live — Final stage: set live, active, published
exports.goLive = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        if (product.mdcStage !== 'approved') {
            return res.status(400).json({ success: false, message: 'Product must be in approved stage to go live' });
        }

        // Check at least 1 branch allocation exists
        const allocCount = await BranchInventory.countDocuments({ productId: product._id, isActive: true, quantity: { $gt: 0 } });
        if (allocCount === 0) {
            return res.status(400).json({ success: false, message: 'Product must be allocated to at least 1 branch before going live' });
        }

        await Product.findByIdAndUpdate(product._id, {
            mdcStage: 'live',
            status: 'active',
            isPublished: true,
            publishedAt: new Date()
        });

        logger.info(`MDC: Product ${product.sku} went LIVE by ${req.user.id}, allocated to ${allocCount} branches`);
        res.json({ success: true, message: 'Product is now LIVE on the network', branchCount: allocCount });
    } catch (err) {
        logger.error('MDC goLive error:', err);
        res.status(500).json({ success: false, message: 'Failed to set product live' });
    }
};

// PATCH /mdc/products/bulk-tag — Bulk assign track to multiple products
exports.bulkTag = async (req, res) => {
    try {
        const { productIds, track } = req.body;
        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ success: false, message: 'productIds array is required' });
        }
        if (!['lifestyle', 'medical'].includes(track)) {
            return res.status(400).json({ success: false, message: 'track must be lifestyle or medical' });
        }

        const result = await Product.updateMany(
            { _id: { $in: productIds } },
            { $set: { track } }
        );

        logger.info(`MDC: Bulk tagged ${result.modifiedCount} products as ${track} by ${req.user.id}`);
        res.json({ success: true, message: `${result.modifiedCount} products tagged as ${track}`, modifiedCount: result.modifiedCount });
    } catch (err) {
        logger.error('MDC bulkTag error:', err);
        res.status(500).json({ success: false, message: 'Failed to bulk tag products' });
    }
};
