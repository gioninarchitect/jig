// MongoDB API Endpoints for Loose Draw
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User, Product, Order, Cart, checkMembershipUpgrade, initializeProducts } = require('./mongodb-setup');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../'));

const JWT_SECRET = process.env.JWT_SECRET || 'loosedraw_secret_2024';

// Initialize products on startup
initializeProducts();

// === AUTH ENDPOINTS ===

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, username, password, firstName, lastName, phone, address } = req.body;
        
        // Check if user exists
        const existing = await User.findOne({ $or: [{ email }, { username }] });
        if (existing) {
            return res.status(400).json({ error: 'User already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const user = new User({
            email,
            username,
            password: hashedPassword,
            firstName,
            lastName,
            phone,
            address
        });
        
        await user.save();
        
        // Generate token
        const token = jwt.sign({ userId: user._id, email }, JWT_SECRET);
        
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                isLifestyleMember: false
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate token
        const token = jwt.sign({ userId: user._id, email }, JWT_SECRET);
        
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                isLifestyleMember: user.isLifestyleMember,
                firstName: user.firstName,
                lastName: user.lastName
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === PRODUCT ENDPOINTS ===

// Get all merchandise (public)
app.get('/api/products/merchandise', async (req, res) => {
    try {
        const products = await Product.find({ isLifestyle: false, isActive: true });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get lifestyle products (members only)
app.get('/api/products/lifestyle', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user.isLifestyleMember) {
            return res.status(403).json({ error: 'Lifestyle membership required' });
        }
        
        const products = await Product.find({ isLifestyle: true, isActive: true });
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === CART ENDPOINTS ===

// Get cart
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        let cart = await Cart.findOne({ userId: req.userId });
        if (!cart) {
            cart = { items: [] };
        }
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Add to cart
app.post('/api/cart/add', authenticateToken, async (req, res) => {
    try {
        const { productId, name, price, quantity, isLifestyle } = req.body;
        
        let cart = await Cart.findOne({ userId: req.userId });
        if (!cart) {
            cart = new Cart({ userId: req.userId, items: [] });
        }
        
        // Check if item exists
        const existingItem = cart.items.find(item => item.name === name);
        if (existingItem) {
            existingItem.quantity += quantity;
        } else {
            cart.items.push({ productId, name, price, quantity, isLifestyle });
        }
        
        cart.updatedAt = new Date();
        await cart.save();
        
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Clear cart
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
    try {
        await Cart.deleteOne({ userId: req.userId });
        res.json({ message: 'Cart cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === ORDER ENDPOINTS ===

// Create order
app.post('/api/orders/create', authenticateToken, async (req, res) => {
    try {
        const { items, customerInfo, paymentMethod } = req.body;
        
        // Calculate totals
        let subtotal = 0;
        let qualifiesForMembership = false;
        
        items.forEach(item => {
            subtotal += (item.price * item.quantity);
            if (!item.isLifestyle && item.price >= 300) {
                qualifiesForMembership = true;
            }
        });
        
        const shipping = subtotal >= 500 ? 0 : 50;
        const total = subtotal + shipping;
        
        // Create order
        const order = new Order({
            orderNumber: 'LD' + Date.now(),
            userId: req.userId,
            customerInfo,
            items,
            subtotal,
            shipping,
            total,
            paymentMethod,
            qualifiesForMembership
        });
        
        await order.save();
        
        // Check for membership upgrade
        if (qualifiesForMembership) {
            await checkMembershipUpgrade(req.userId);
        }
        
        // Clear cart
        await Cart.deleteOne({ userId: req.userId });
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.userId }).sort('-createdAt');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === ADMIN ENDPOINTS ===

// Get all orders (admin)
app.get('/api/admin/orders', authenticateToken, async (req, res) => {
    try {
        // Check admin (simple check - improve in production)
        const user = await User.findById(req.userId);
        if (user.email !== 'admin@loosedraw.co.za') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const orders = await Order.find().populate('userId').sort('-createdAt');
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all users (admin)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (user.email !== 'admin@loosedraw.co.za') {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order status (admin)
app.put('/api/admin/orders/:id/status', authenticateToken, async (req, res) => {
    try {
        const { status, paymentStatus } = req.body;
        
        const order = await Order.findByIdAndUpdate(
            req.params.id,
            { status, paymentStatus, updatedAt: new Date() },
            { new: true }
        );
        
        // Check for membership upgrade if payment confirmed
        if (paymentStatus === 'paid' && order.qualifiesForMembership) {
            await checkMembershipUpgrade(order.userId);
        }
        
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Middleware to verify JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.userId = decoded.userId;
        req.email = decoded.email;
        next();
    });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`MongoDB API server running on port ${PORT}`);
});

module.exports = app;