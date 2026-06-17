/**
 * Voucher Model - LIFESTYLE/RETAIL PRODUCTS ONLY
 *
 * CRITICAL: This voucher system is ONLY for lifestyle/retail products.
 * Section 21 medical cannabis products CANNOT receive discounts (illegal in South Africa).
 *
 * The R700 Section 21 voucher is handled by an EXTERNAL third-party medical service provider.
 * We do NOT build anything related to that - our only job is to BLOCK discounts on medical products.
 */

const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema({
    // Core voucher details
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true,
        maxlength: 20,
        index: true
    },

    name: {
        type: String,
        required: true,
        maxlength: 100
    },

    description: {
        type: String,
        maxlength: 500
    },

    // Voucher type
    type: {
        type: String,
        required: true,
        enum: ['percentage', 'fixed', 'bogo', 'free_shipping'],
        default: 'percentage'
    },

    // Discount value
    value: {
        type: Number,
        required: true,
        min: 0
    },

    // Minimum purchase requirement
    minPurchase: {
        type: Number,
        default: 0,
        min: 0
    },

    // Maximum discount cap (for percentage types)
    maxDiscount: {
        type: Number,
        default: null
    },

    // Validity period
    startDate: {
        type: Date,
        default: Date.now
    },

    expiryDate: {
        type: Date,
        required: true
    },

    // Redemption limits
    redemptionLimit: {
        type: String,
        enum: ['unlimited', 'once_per_customer', 'single_use'],
        default: 'unlimited'
    },

    maxRedemptions: {
        type: Number,
        default: null // null = unlimited
    },

    redeemCount: {
        type: Number,
        default: 0
    },

    // Redemption history
    redemptionHistory: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        orderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order'
        },
        redeemedAt: {
            type: Date,
            default: Date.now
        },
        discountApplied: {
            type: Number,
            required: true
        },
        orderTotal: {
            type: Number,
            required: true
        }
    }],

    // Status
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active',
        index: true
    },

    // Auto-apply for loyalty tiers
    autoApplyTiers: [{
        type: String,
        enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond']
    }],

    // Product/category restrictions
    applicableCategories: [{
        type: String
    }],

    excludedCategories: [{
        type: String
    }],

    // Metadata
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    internalNotes: {
        type: String,
        maxlength: 1000
    }
}, {
    timestamps: true
});

// Indexes for performance
voucherSchema.index({ code: 1 });
voucherSchema.index({ status: 1 });
voucherSchema.index({ expiryDate: 1 });
voucherSchema.index({ 'redemptionHistory.userId': 1 });

// Pre-save middleware - convert code to uppercase
voucherSchema.pre('save', function(next) {
    if (this.code) {
        this.code = this.code.toUpperCase();
    }
    next();
});

// Method to check if voucher is valid
voucherSchema.methods.isValid = function() {
    const now = new Date();

    // Check status
    if (this.status !== 'active') {
        return { valid: false, reason: 'Voucher is not active' };
    }

    // Check dates
    if (now < this.startDate) {
        return { valid: false, reason: 'Voucher has not started yet' };
    }

    if (now > this.expiryDate) {
        // Auto-expire
        this.status = 'expired';
        this.save();
        return { valid: false, reason: 'Voucher has expired' };
    }

    // Check redemption limit
    if (this.maxRedemptions && this.redeemCount >= this.maxRedemptions) {
        return { valid: false, reason: 'Voucher redemption limit reached' };
    }

    return { valid: true };
};

// Method to check if user can redeem
voucherSchema.methods.canUserRedeem = function(userId) {
    // Check if once_per_customer
    if (this.redemptionLimit === 'once_per_customer') {
        const hasRedeemed = this.redemptionHistory.some(
            redemption => redemption.userId.toString() === userId.toString()
        );

        if (hasRedeemed) {
            return { canRedeem: false, reason: 'You have already used this voucher' };
        }
    }

    // Check if single_use
    if (this.redemptionLimit === 'single_use' && this.redeemCount > 0) {
        return { canRedeem: false, reason: 'This voucher has already been used' };
    }

    return { canRedeem: true };
};

// Method to calculate discount
voucherSchema.methods.calculateDiscount = function(cartTotal) {
    // Check minimum purchase
    if (cartTotal < this.minPurchase) {
        return {
            discount: 0,
            error: `Minimum purchase of R${this.minPurchase.toFixed(2)} required`
        };
    }

    let discount = 0;

    switch (this.type) {
        case 'percentage':
            discount = (cartTotal * this.value) / 100;

            // Apply max discount cap if set
            if (this.maxDiscount) {
                discount = Math.min(discount, this.maxDiscount);
            }

            // Cap at cart total (can't discount more than 100%)
            discount = Math.min(discount, cartTotal);
            break;

        case 'fixed':
            discount = this.value;
            // Cap at cart total
            discount = Math.min(discount, cartTotal);
            break;

        case 'free_shipping':
            // Handled separately in order processing
            discount = 0;
            break;

        case 'bogo':
            // BOGO logic would need product-level implementation
            // For now, this is a placeholder
            discount = 0;
            break;
    }

    return { discount: Math.round(discount * 100) / 100 };
};

// Method to redeem voucher
voucherSchema.methods.redeem = function(userId, orderId, discountApplied, orderTotal) {
    this.redeemCount += 1;

    this.redemptionHistory.push({
        userId,
        orderId,
        redeemedAt: new Date(),
        discountApplied,
        orderTotal
    });

    // Auto-expire if max redemptions reached
    if (this.maxRedemptions && this.redeemCount >= this.maxRedemptions) {
        this.status = 'expired';
    }

    return this.save();
};

// Static method to validate voucher code
voucherSchema.statics.validateCode = async function(code, userId, cartTotal, cartItems) {
    const voucher = await this.findOne({ code: code.toUpperCase() });

    if (!voucher) {
        return { success: false, error: 'Invalid voucher code' };
    }

    // Check if voucher is valid
    const validCheck = voucher.isValid();
    if (!validCheck.valid) {
        return { success: false, error: validCheck.reason };
    }

    // Check if user can redeem
    const userCheck = voucher.canUserRedeem(userId);
    if (!userCheck.canRedeem) {
        return { success: false, error: userCheck.reason };
    }

    // CRITICAL: Section 21 compliance check
    // Check if cart contains any Section 21 medical products
    const hasSection21Products = cartItems.some(item => item.requiresSection21 === true);

    if (hasSection21Products) {
        return {
            success: false,
            error: 'Vouchers cannot be applied to medical cannabis products (Section 21 compliance). Discounting medicine is illegal in South Africa.'
        };
    }

    // Calculate discount
    const discountCalc = voucher.calculateDiscount(cartTotal);

    if (discountCalc.error) {
        return { success: false, error: discountCalc.error };
    }

    return {
        success: true,
        voucher: {
            id: voucher._id,
            code: voucher.code,
            name: voucher.name,
            type: voucher.type,
            value: voucher.value,
            discountAmount: discountCalc.discount,
            description: voucher.description
        }
    };
};

// Static method to generate random voucher code
voucherSchema.statics.generateCode = function(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

module.exports = mongoose.model('Voucher', voucherSchema);
