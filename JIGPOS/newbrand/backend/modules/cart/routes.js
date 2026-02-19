// Shopping Cart Routes
const express = require('express');
const router = express.Router();
const Cart = require('../database/models/Cart');
const Product = require('../database/models/Product');
const auth = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get cart (authenticated or session-based)
router.get('/', async (req, res) => {
  try {
    let cart;
    
    if (req.user) {
      // Authenticated user cart
      cart = await Cart.findOne({ user: req.user._id })
        .populate('items.product', 'name price images stock');
    } else {
      // Session-based cart for guests
      const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;
      if (!sessionId) {
        return res.json({ items: [], total: 0, itemCount: 0 });
      }
      cart = await Cart.findOne({ sessionId })
        .populate('items.product', 'name price images stock');
    }

    if (!cart) {
      return res.json({ items: [], total: 0, itemCount: 0 });
    }

    // Calculate totals
    await cart.calculateTotals();

    res.json({
      items: cart.items,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      itemCount: cart.itemCount,
      couponCode: cart.couponCode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add item to cart
router.post('/add', async (req, res) => {
  try {
    const { productId, quantity = 1, size, color } = req.body;

    // Validate product exists and has stock
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    let cart;
    const cartQuery = req.user 
      ? { user: req.user._id }
      : { sessionId: req.headers['x-session-id'] || req.cookies?.sessionId || uuidv4() };

    // Find or create cart
    cart = await Cart.findOne(cartQuery);
    
    if (!cart) {
      cart = new Cart({
        ...cartQuery,
        items: []
      });
    }

    // Check if item already in cart
    const existingItemIndex = cart.items.findIndex(item => 
      item.product.toString() === productId &&
      item.size === size &&
      item.color === color
    );

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity += quantity;
      cart.items[existingItemIndex].subtotal = 
        cart.items[existingItemIndex].quantity * product.price;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity,
        price: product.price,
        subtotal: quantity * product.price,
        size,
        color
      });
    }

    await cart.calculateTotals();
    await cart.save();

    // Populate product details for response
    await cart.populate('items.product', 'name price images stock');

    // Set session cookie for guests
    if (!req.user && !req.cookies?.sessionId) {
      res.cookie('sessionId', cartQuery.sessionId, {
        httpOnly: true,
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });
    }

    res.json({
      message: 'Item added to cart',
      cart: {
        items: cart.items,
        subtotal: cart.subtotal,
        total: cart.total,
        itemCount: cart.itemCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update cart item quantity
router.put('/update/:itemId', async (req, res) => {
  try {
    const { quantity } = req.body;
    const { itemId } = req.params;

    if (quantity < 0) {
      return res.status(400).json({ error: 'Invalid quantity' });
    }

    const cartQuery = req.user 
      ? { user: req.user._id }
      : { sessionId: req.headers['x-session-id'] || req.cookies?.sessionId };

    const cart = await Cart.findOne(cartQuery);
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    if (quantity === 0) {
      // Remove item if quantity is 0
      cart.items.splice(itemIndex, 1);
    } else {
      // Check stock
      const product = await Product.findById(cart.items[itemIndex].product);
      if (product.stock < quantity) {
        return res.status(400).json({ error: 'Insufficient stock' });
      }

      // Update quantity
      cart.items[itemIndex].quantity = quantity;
      cart.items[itemIndex].subtotal = quantity * cart.items[itemIndex].price;
    }

    await cart.calculateTotals();
    await cart.save();
    await cart.populate('items.product', 'name price images stock');

    res.json({
      message: 'Cart updated',
      cart: {
        items: cart.items,
        subtotal: cart.subtotal,
        total: cart.total,
        itemCount: cart.itemCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;

    const cartQuery = req.user 
      ? { user: req.user._id }
      : { sessionId: req.headers['x-session-id'] || req.cookies?.sessionId };

    const cart = await Cart.findOne(cartQuery);
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(item => item._id.toString() === itemId);
    if (itemIndex === -1) {
      return res.status(404).json({ error: 'Item not found in cart' });
    }

    cart.items.splice(itemIndex, 1);
    await cart.calculateTotals();
    await cart.save();
    await cart.populate('items.product', 'name price images stock');

    res.json({
      message: 'Item removed from cart',
      cart: {
        items: cart.items,
        subtotal: cart.subtotal,
        total: cart.total,
        itemCount: cart.itemCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear entire cart
router.delete('/clear', async (req, res) => {
  try {
    const cartQuery = req.user 
      ? { user: req.user._id }
      : { sessionId: req.headers['x-session-id'] || req.cookies?.sessionId };

    const cart = await Cart.findOne(cartQuery);
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.items = [];
    cart.subtotal = 0;
    cart.discount = 0;
    cart.total = 0;
    cart.itemCount = 0;
    cart.couponCode = null;
    
    await cart.save();

    res.json({
      message: 'Cart cleared',
      cart: {
        items: [],
        subtotal: 0,
        total: 0,
        itemCount: 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Apply coupon
router.post('/coupon', async (req, res) => {
  try {
    const { couponCode } = req.body;

    const cartQuery = req.user 
      ? { user: req.user._id }
      : { sessionId: req.headers['x-session-id'] || req.cookies?.sessionId };

    const cart = await Cart.findOne(cartQuery);
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Validate coupon (simplified - should check voucher collection)
    const validCoupons = {
      'WELCOME10': { type: 'percentage', value: 10 },
      'SAVE20': { type: 'percentage', value: 20 },
      'FLAT50': { type: 'fixed', value: 50 },
      'FREESHIP': { type: 'shipping', value: 100 }
    };

    const coupon = validCoupons[couponCode.toUpperCase()];
    if (!coupon) {
      return res.status(400).json({ error: 'Invalid coupon code' });
    }

    // Apply discount
    if (coupon.type === 'percentage') {
      cart.discount = (cart.subtotal * coupon.value) / 100;
    } else if (coupon.type === 'fixed') {
      cart.discount = Math.min(coupon.value, cart.subtotal);
    }

    cart.couponCode = couponCode.toUpperCase();
    await cart.calculateTotals();
    await cart.save();

    res.json({
      message: `Coupon ${couponCode} applied successfully`,
      discount: cart.discount,
      cart: {
        items: cart.items,
        subtotal: cart.subtotal,
        discount: cart.discount,
        total: cart.total,
        itemCount: cart.itemCount,
        couponCode: cart.couponCode
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Remove coupon
router.delete('/coupon', async (req, res) => {
  try {
    const cartQuery = req.user 
      ? { user: req.user._id }
      : { sessionId: req.headers['x-session-id'] || req.cookies?.sessionId };

    const cart = await Cart.findOne(cartQuery);
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    cart.couponCode = null;
    cart.discount = 0;
    await cart.calculateTotals();
    await cart.save();

    res.json({
      message: 'Coupon removed',
      cart: {
        items: cart.items,
        subtotal: cart.subtotal,
        discount: cart.discount,
        total: cart.total,
        itemCount: cart.itemCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Merge guest cart with user cart after login
router.post('/merge', auth, async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    // Find guest cart
    const guestCart = await Cart.findOne({ sessionId });
    if (!guestCart || guestCart.items.length === 0) {
      return res.json({ message: 'No guest cart to merge' });
    }

    // Find or create user cart
    let userCart = await Cart.findOne({ user: req.user._id });
    if (!userCart) {
      userCart = new Cart({ user: req.user._id, items: [] });
    }

    // Merge items
    for (const guestItem of guestCart.items) {
      const existingIndex = userCart.items.findIndex(item =>
        item.product.toString() === guestItem.product.toString() &&
        item.size === guestItem.size &&
        item.color === guestItem.color
      );

      if (existingIndex > -1) {
        userCart.items[existingIndex].quantity += guestItem.quantity;
        userCart.items[existingIndex].subtotal = 
          userCart.items[existingIndex].quantity * userCart.items[existingIndex].price;
      } else {
        userCart.items.push(guestItem);
      }
    }

    // Save user cart and delete guest cart
    await userCart.calculateTotals();
    await userCart.save();
    await Cart.deleteOne({ sessionId });

    res.json({
      message: 'Carts merged successfully',
      cart: {
        items: userCart.items,
        subtotal: userCart.subtotal,
        total: userCart.total,
        itemCount: userCart.itemCount
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Validate cart items (check stock before checkout)
router.get('/validate', async (req, res) => {
  try {
    const cartQuery = req.user 
      ? { user: req.user._id }
      : { sessionId: req.headers['x-session-id'] || req.cookies?.sessionId };

    const cart = await Cart.findOne(cartQuery)
      .populate('items.product', 'name price stock');
    
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    const issues = [];
    const validItems = [];

    for (const item of cart.items) {
      if (!item.product) {
        issues.push({
          itemId: item._id,
          issue: 'Product no longer exists'
        });
      } else if (item.product.stock < item.quantity) {
        issues.push({
          itemId: item._id,
          product: item.product.name,
          issue: 'Insufficient stock',
          available: item.product.stock,
          requested: item.quantity
        });
        
        // Adjust quantity to available stock
        if (item.product.stock > 0) {
          item.quantity = item.product.stock;
          item.subtotal = item.quantity * item.price;
          validItems.push(item);
        }
      } else {
        validItems.push(item);
      }
    }

    if (issues.length > 0) {
      cart.items = validItems;
      await cart.calculateTotals();
      await cart.save();

      return res.status(400).json({
        valid: false,
        issues,
        cart: {
          items: cart.items,
          subtotal: cart.subtotal,
          total: cart.total,
          itemCount: cart.itemCount
        }
      });
    }

    res.json({
      valid: true,
      message: 'Cart is valid for checkout'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;