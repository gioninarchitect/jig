// Cart Controller — Business logic for shopping cart management
const Cart = require('../modules/database/models/Cart');
const Product = require('../modules/database/models/Product');
const logger = require('../modules/logger');

// GET / — Get user's cart
const getCart = async (req, res) => {
    try {
        // JWT stores user id as 'id', not '_id'
        const cart = await Cart.findOrCreateCart(req.user.id);
        await cart.populate('items.product', 'name price stock images');

        res.json({
            success: true,
            cart: {
                items: cart.items,
                subtotal: cart.subtotal,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
                lastUpdated: cart.lastUpdated
            }
        });
    } catch (error) {
        logger.error('Get cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching cart'
        });
    }
};

// POST /add — Add item to cart with stock check
const addItem = async (req, res) => {
    try {
        const { productId, quantity = 1, size, color } = req.body;

        if (!productId) {
            return res.status(400).json({
                success: false,
                message: 'Product ID is required'
            });
        }

        // Fetch product details
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: 'Product not found'
            });
        }

        // Check stock (Product uses inventory.quantity, not stock)
        const availableStock = product.inventory?.quantity || 0;
        if (availableStock < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock',
                availableStock: availableStock
            });
        }

        // Get or create cart (JWT stores 'id', not '_id')
        const cart = await Cart.findOrCreateCart(req.user.id);

        // Add item to cart
        await cart.addItem({
            product: product._id,
            name: product.name,
            price: product.price,
            quantity: quantity,
            image: product.images && product.images.length > 0 ? product.images[0].url : null,
            size: size,
            color: color,
            sku: product.sku,
            track: product.track
        });

        await cart.populate('items.product', 'name price stock images');

        res.json({
            success: true,
            message: 'Item added to cart',
            cart: {
                items: cart.items,
                subtotal: cart.subtotal,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        logger.error('Add to cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding item to cart'
        });
    }
};

// PUT /item/:itemIndex — Update cart item quantity with stock check
const updateItem = async (req, res) => {
    try {
        const { itemIndex } = req.params;
        const { quantity } = req.body;

        if (quantity === undefined || quantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid quantity is required'
            });
        }

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const index = parseInt(itemIndex);
        if (index < 0 || index >= cart.items.length) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        // Get the item
        const item = cart.items[index];

        // Check stock if increasing quantity
        if (quantity > item.quantity) {
            const product = await Product.findById(item.product);
            const stockAvailable = product?.inventory?.quantity || 0;
            if (product && stockAvailable < quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'Insufficient stock',
                    availableStock: stockAvailable
                });
            }
        }

        // Update quantity or remove if 0
        if (quantity === 0) {
            cart.items.splice(index, 1);
        } else {
            cart.items[index].quantity = quantity;
        }

        await cart.save();
        await cart.populate('items.product', 'name price stock images');

        res.json({
            success: true,
            message: quantity === 0 ? 'Item removed from cart' : 'Cart updated',
            cart: {
                items: cart.items,
                subtotal: cart.subtotal,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        logger.error('Update cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating cart'
        });
    }
};

// DELETE /item/:itemIndex — Remove item from cart by index
const removeItem = async (req, res) => {
    try {
        const { itemIndex } = req.params;

        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        const index = parseInt(itemIndex);
        if (index < 0 || index >= cart.items.length) {
            return res.status(404).json({
                success: false,
                message: 'Item not found in cart'
            });
        }

        cart.items.splice(index, 1);
        await cart.save();
        await cart.populate('items.product', 'name price stock images');

        res.json({
            success: true,
            message: 'Item removed from cart',
            cart: {
                items: cart.items,
                subtotal: cart.subtotal,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        logger.error('Remove from cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error removing item from cart'
        });
    }
};

// DELETE /clear — Clear entire cart
const clearCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) {
            return res.status(404).json({
                success: false,
                message: 'Cart not found'
            });
        }

        await cart.clear();

        res.json({
            success: true,
            message: 'Cart cleared',
            cart: {
                items: [],
                subtotal: 0,
                itemCount: 0
            }
        });
    } catch (error) {
        logger.error('Clear cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing cart'
        });
    }
};

// POST /sync — Sync localStorage cart to MongoDB (migration endpoint)
const syncCart = async (req, res) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid items array'
            });
        }

        const cart = await Cart.findOrCreateCart(req.user.id);

        // Clear existing cart
        cart.items = [];

        // Add all items from localStorage
        for (const item of items) {
            // Verify product exists
            let product;
            if (item.productId) {
                product = await Product.findById(item.productId);
            } else if (item.sku) {
                product = await Product.findOne({ sku: item.sku });
            }

            if (product) {
                cart.items.push({
                    product: product._id,
                    name: item.name || product.name,
                    price: item.price || product.price,
                    quantity: item.quantity || 1,
                    image: item.image || (product.images && product.images.length > 0 ? product.images[0].url : null),
                    size: item.size,
                    color: item.color,
                    sku: product.sku,
                    track: product.track
                });
            }
        }

        await cart.save();
        await cart.populate('items.product', 'name price stock images');

        res.json({
            success: true,
            message: 'Cart synced successfully',
            cart: {
                items: cart.items,
                subtotal: cart.subtotal,
                itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0)
            }
        });
    } catch (error) {
        logger.error('Sync cart error:', error);
        res.status(500).json({
            success: false,
            message: 'Error syncing cart'
        });
    }
};

module.exports = {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    syncCart
};
