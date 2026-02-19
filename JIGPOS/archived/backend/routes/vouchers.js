/**
 * Voucher Routes - LIFESTYLE/RETAIL PRODUCTS ONLY
 *
 * CRITICAL: This voucher system is ONLY for lifestyle/retail products.
 * Section 21 medical cannabis products CANNOT receive discounts (illegal in South Africa).
 *
 * The R700 Section 21 voucher is handled by an EXTERNAL third-party medical service provider.
 * We do NOT build anything related to that.
 */

const express = require('express');
const router = express.Router();
const Voucher = require('../modules/database/models/Voucher');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../modules/logger');

// ============================================================================
// PUBLIC ROUTES - Voucher Validation
// ============================================================================

// POST /api/v1/vouchers/validate - Validate voucher code before applying to cart
router.post('/validate', async (req, res) => {
    try {
        const { code, cartTotal, cartItems, userId } = req.body;

        if (!code) {
            return res.status(400).json({
                success: false,
                error: 'Voucher code is required'
            });
        }

        if (!cartTotal || !cartItems || !Array.isArray(cartItems)) {
            return res.status(400).json({
                success: false,
                error: 'Cart total and items are required'
            });
        }

        // Use the static validation method from the model
        const result = await Voucher.validateCode(code, userId, cartTotal, cartItems);

        res.json(result);
    } catch (error) {
        logger.error('Validate voucher error:', error);
        res.status(500).json({
            success: false,
            error: 'Error validating voucher'
        });
    }
});

// ============================================================================
// REDEMPTION ROUTES
// ============================================================================

// POST /api/v1/vouchers/redeem/:code - Redeem voucher after order completion
router.post('/redeem/:code', authenticateToken, async (req, res) => {
    try {
        const { code } = req.params;
        const { orderId, discountApplied, orderTotal } = req.body;

        if (!orderId || discountApplied === undefined || !orderTotal) {
            return res.status(400).json({
                success: false,
                error: 'Order ID, discount amount, and order total are required'
            });
        }

        const voucher = await Voucher.findOne({ code: code.toUpperCase() });

        if (!voucher) {
            return res.status(404).json({
                success: false,
                error: 'Voucher not found'
            });
        }

        // Redeem the voucher
        await voucher.redeem(req.user.id, orderId, discountApplied, orderTotal);

        res.json({
            success: true,
            message: 'Voucher redeemed successfully',
            redeemCount: voucher.redeemCount
        });
    } catch (error) {
        logger.error('Redeem voucher error:', error);
        res.status(500).json({
            success: false,
            error: 'Error redeeming voucher'
        });
    }
});

// ============================================================================
// ADMIN ROUTES - Voucher Management
// ============================================================================

// GET /api/v1/vouchers - List all vouchers (admin only)
router.get('/', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const { status, page = 1, limit = 50, sort = '-createdAt' } = req.query;

        const query = {};
        if (status) {
            query.status = status;
        }

        const vouchers = await Voucher.find(query)
            .sort(sort)
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit))
            .populate('createdBy', 'email firstName lastName');

        const total = await Voucher.countDocuments(query);

        res.json({
            success: true,
            vouchers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('List vouchers error:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching vouchers'
        });
    }
});

// POST /api/v1/vouchers - Create new voucher (admin only)
router.post('/', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const {
            code,
            name,
            description,
            type,
            value,
            minPurchase,
            maxDiscount,
            startDate,
            expiryDate,
            redemptionLimit,
            maxRedemptions,
            autoApplyTiers,
            applicableCategories,
            excludedCategories,
            internalNotes
        } = req.body;

        // Validation
        if (!name || !type || value === undefined || !expiryDate) {
            return res.status(400).json({
                success: false,
                error: 'Name, type, value, and expiry date are required'
            });
        }

        // Create voucher
        const voucher = new Voucher({
            code: code || Voucher.generateCode(),
            name,
            description,
            type,
            value,
            minPurchase,
            maxDiscount,
            startDate,
            expiryDate: new Date(expiryDate),
            redemptionLimit,
            maxRedemptions,
            autoApplyTiers,
            applicableCategories,
            excludedCategories,
            internalNotes,
            createdBy: req.user.id
        });

        await voucher.save();

        res.json({
            success: true,
            message: 'Voucher created successfully',
            voucher: {
                id: voucher._id,
                code: voucher.code,
                name: voucher.name,
                type: voucher.type,
                value: voucher.value,
                expiryDate: voucher.expiryDate
            }
        });
    } catch (error) {
        logger.error('Create voucher error:', error);

        // Handle duplicate code error
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                error: 'Voucher code already exists'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Error creating voucher',
            details: error.message
        });
    }
});

// PUT /api/v1/vouchers/:id - Update voucher (admin only)
router.put('/:id', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const { id } = req.params;
        const updates = req.body;

        const voucher = await Voucher.findById(id);

        if (!voucher) {
            return res.status(404).json({
                success: false,
                error: 'Voucher not found'
            });
        }

        // Don't allow code changes if already redeemed
        if (voucher.redeemCount > 0 && updates.code) {
            return res.status(400).json({
                success: false,
                error: 'Cannot change code of redeemed voucher'
            });
        }

        // Update allowed fields
        const allowedUpdates = [
            'name', 'description', 'value', 'minPurchase', 'maxDiscount',
            'expiryDate', 'maxRedemptions', 'status', 'autoApplyTiers',
            'applicableCategories', 'excludedCategories', 'internalNotes'
        ];

        allowedUpdates.forEach(field => {
            if (updates[field] !== undefined) {
                voucher[field] = updates[field];
            }
        });

        await voucher.save();

        res.json({
            success: true,
            message: 'Voucher updated successfully',
            voucher
        });
    } catch (error) {
        logger.error('Update voucher error:', error);
        res.status(500).json({
            success: false,
            error: 'Error updating voucher'
        });
    }
});

// DELETE /api/v1/vouchers/:id - Deactivate voucher (admin only)
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const { id } = req.params;

        const voucher = await Voucher.findById(id);

        if (!voucher) {
            return res.status(404).json({
                success: false,
                error: 'Voucher not found'
            });
        }

        // Don't allow deletion if already redeemed
        if (voucher.redeemCount > 0) {
            return res.status(400).json({
                success: false,
                error: 'Cannot delete voucher that has been redeemed. Use deactivate instead.'
            });
        }

        // Soft delete - set status to inactive
        voucher.status = 'inactive';
        await voucher.save();

        res.json({
            success: true,
            message: 'Voucher deactivated successfully'
        });
    } catch (error) {
        logger.error('Delete voucher error:', error);
        res.status(500).json({
            success: false,
            error: 'Error deactivating voucher'
        });
    }
});

// GET /api/v1/vouchers/:id/analytics - Get voucher analytics (admin only)
router.get('/:id/analytics', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required'
            });
        }

        const { id } = req.params;

        const voucher = await Voucher.findById(id)
            .populate('redemptionHistory.userId', 'email firstName lastName')
            .populate('redemptionHistory.orderId');

        if (!voucher) {
            return res.status(404).json({
                success: false,
                error: 'Voucher not found'
            });
        }

        // Calculate analytics
        const totalDiscount = voucher.redemptionHistory.reduce(
            (sum, redemption) => sum + redemption.discountApplied, 0
        );

        const totalRevenue = voucher.redemptionHistory.reduce(
            (sum, redemption) => sum + redemption.orderTotal, 0
        );

        const uniqueCustomers = new Set(
            voucher.redemptionHistory.map(r => r.userId.toString())
        ).size;

        res.json({
            success: true,
            analytics: {
                code: voucher.code,
                name: voucher.name,
                status: voucher.status,
                totalRedemptions: voucher.redeemCount,
                uniqueCustomers,
                totalDiscountGiven: totalDiscount,
                totalRevenue,
                averageOrderValue: voucher.redeemCount > 0 ? totalRevenue / voucher.redeemCount : 0,
                averageDiscount: voucher.redeemCount > 0 ? totalDiscount / voucher.redeemCount : 0,
                redemptionHistory: voucher.redemptionHistory
            }
        });
    } catch (error) {
        logger.error('Get voucher analytics error:', error);
        res.status(500).json({
            success: false,
            error: 'Error fetching analytics'
        });
    }
});

module.exports = router;
