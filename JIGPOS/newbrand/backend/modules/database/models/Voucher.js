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

    // Product-specific targeting (phase 1 promo vouchers): discount applies only to these products.
    applicableProducts: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
    }],

    // promo = retailer-issued discount (short expiry lawful). giftcard = paid stored value (CPA 3yr min, phase 2).
    voucherClass: {
        type: String,
        enum: ['promo', 'giftcard'],
        default: 'promo',
        index: true
    },

    // Shareable public link token (the promo link). sparse so vouchers without a link omit it cleanly.
    publicSlug: {
        type: String,
        unique: true,
        sparse: true,
        index: true,
        trim: true
    },

    channel: {
        type: String,
        enum: ['instore', 'link', 'both'],
        default: 'both'
    },

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
        // Walk-in sale with no customer account: per-customer cannot be tracked, so allow.
        if (!userId) {
            return { canRedeem: true };
        }
        const hasRedeemed = this.redemptionHistory.some(
            redemption => redemption.userId && redemption.userId.toString() === userId.toString()
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

// Compute the rand value of the cart the discount is allowed to apply to.
// Product-scoped -> only matching line items. Category-scoped -> only matching categories.
// Neither -> the whole cart. cartItems shape: {productId, category, unitPrice, quantity}.
voucherSchema.methods.eligibleBase = function(cartTotal, cartItems) {
    const items = Array.isArray(cartItems) ? cartItems : [];
    const lineTotal = (it) => (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0);

    if (this.applicableProducts && this.applicableProducts.length > 0) {
        const ids = this.applicableProducts.map(id => id.toString());
        return items
            .filter(it => it.productId && ids.includes(it.productId.toString()))
            .reduce((sum, it) => sum + lineTotal(it), 0);
    }

    if (this.applicableCategories && this.applicableCategories.length > 0) {
        const cats = this.applicableCategories.map(c => String(c).toLowerCase());
        return items
            .filter(it => it.category && cats.includes(String(it.category).toLowerCase()))
            .reduce((sum, it) => sum + lineTotal(it), 0);
    }

    // Whole-order: fall back to cartTotal, or the summed lines if cartTotal missing.
    if (cartTotal || cartTotal === 0) return cartTotal;
    return items.reduce((sum, it) => sum + lineTotal(it), 0);
};

// Method to calculate discount. cartItems is optional; when the voucher is product/category
// scoped the discount is computed against the eligible line items only, not the whole cart.
voucherSchema.methods.calculateDiscount = function(cartTotal, cartItems) {
    // Minimum purchase is checked against the WHOLE cart (a spend gate), per Old Khaki style.
    if (cartTotal < this.minPurchase) {
        return {
            discount: 0,
            error: `Minimum purchase of R${this.minPurchase.toFixed(2)} required`
        };
    }

    const base = this.eligibleBase(cartTotal, cartItems);

    // Product/category scoped but nothing in the cart matches -> no discount, clear reason.
    const isScoped = (this.applicableProducts && this.applicableProducts.length > 0) ||
                     (this.applicableCategories && this.applicableCategories.length > 0);
    if (isScoped && base <= 0) {
        return { discount: 0, error: 'No items in the cart qualify for this voucher' };
    }

    let discount = 0;

    switch (this.type) {
        case 'percentage':
            discount = (base * this.value) / 100;
            if (this.maxDiscount) {
                discount = Math.min(discount, this.maxDiscount);
            }
            discount = Math.min(discount, base);
            break;

        case 'fixed':
            discount = this.value;
            // A fixed discount can never exceed the eligible base (or the whole cart when unscoped).
            discount = Math.min(discount, base);
            break;

        case 'free_shipping':
            // Handled separately in order processing
            discount = 0;
            break;

        case 'bogo':
            // BOGO logic would need product-level implementation. Placeholder in phase 1.
            discount = 0;
            break;
    }

    return { discount: Math.round(discount * 100) / 100, eligibleBase: Math.round(base * 100) / 100 };
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

    // Calculate discount (product/category scoped against the eligible line items)
    const discountCalc = voucher.calculateDiscount(cartTotal, cartItems);

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
            eligibleBase: discountCalc.eligibleBase,
            applicableProducts: (voucher.applicableProducts || []).map(id => id.toString()),
            applicableCategories: voucher.applicableCategories || [],
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

// Static method to generate a non-guessable public link slug (larger space than the code).
voucherSchema.statics.generateSlug = function(length = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let slug = '';
    for (let i = 0; i < length; i++) {
        slug += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return slug;
};

module.exports = mongoose.model('Voucher', voucherSchema);
