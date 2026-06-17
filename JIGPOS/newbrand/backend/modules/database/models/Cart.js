// Cart Model - Shopping cart persistence
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    image: {
        type: String
    },
    size: String,
    color: String,
    sku: String,
    track: {
        type: String,
        enum: ['lifestyle', 'medical'],
        default: 'lifestyle'
    }
}, { _id: false });

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true // One cart per user
    },
    items: [cartItemSchema],
    subtotal: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 30*24*60*60*1000) // 30 days
    }
}, {
    timestamps: true
});

// Index for automatic expiration
cartSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Calculate subtotal before saving
cartSchema.pre('save', function(next) {
    this.subtotal = this.items.reduce((total, item) => {
        return total + (item.price * item.quantity);
    }, 0);
    this.lastUpdated = new Date();
    next();
});

// Instance methods
cartSchema.methods.addItem = function(itemData) {
    // Check if item already exists (by product ID or SKU)
    const existingItemIndex = this.items.findIndex(item =>
        item.product.toString() === itemData.product.toString() ||
        (item.sku && item.sku === itemData.sku)
    );

    if (existingItemIndex > -1) {
        // Item exists, update quantity
        this.items[existingItemIndex].quantity += itemData.quantity || 1;
    } else {
        // New item, add to cart
        this.items.push(itemData);
    }

    return this.save();
};

cartSchema.methods.updateItem = function(itemId, quantity) {
    const item = this.items.id(itemId);
    if (item) {
        if (quantity <= 0) {
            // Remove item if quantity is 0 or negative
            this.items.pull(itemId);
        } else {
            item.quantity = quantity;
        }
        return this.save();
    }
    throw new Error('Item not found in cart');
};

cartSchema.methods.removeItem = function(itemId) {
    this.items.pull(itemId);
    return this.save();
};

cartSchema.methods.clear = function() {
    this.items = [];
    return this.save();
};

// Static methods
cartSchema.statics.findOrCreateCart = async function(userId) {
    let cart = await this.findOne({ user: userId });
    if (!cart) {
        cart = await this.create({ user: userId, items: [] });
    }
    return cart;
};

module.exports = mongoose.model('Cart', cartSchema);
