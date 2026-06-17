const express = require('express');
const cors = require('cors');
const auth = require('./auth');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

// Public endpoints
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const userData = await auth.register(req.body);
        const userId = await db.createUser(userData);
        const token = auth.generateToken(userId, userData.email);
        
        res.status(201).json({
            user: { id: userId, email: userData.email, username: userData.username },
            token
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await auth.login(email, password, db);
        res.json(result);
    } catch (error) {
        res.status(401).json({ error: error.message });
    }
});

app.post('/api/auth/logout', auth.authenticateToken, async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        await auth.logout(token, db);
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/auth/profile', auth.authenticateToken, async (req, res) => {
    try {
        const profile = await auth.getProfile(req.user.userId, db);
        res.json(profile);
    } catch (error) {
        res.status(404).json({ error: error.message });
    }
});

app.put('/api/auth/profile', auth.authenticateToken, async (req, res) => {
    try {
        const updated = await auth.updateProfile(req.user.userId, req.body, db);
        res.json(updated);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Products endpoints
app.get('/api/products/merchandise', async (req, res) => {
    try {
        const products = await db.getPublicProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

app.get('/api/products/lifestyle', auth.authenticateToken, auth.requireLifestyleMember, async (req, res) => {
    try {
        const products = await db.getLifestyleProducts();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch lifestyle products' });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await db.getProductById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        // Check if lifestyle product requires auth
        if (product.is_lifestyle && !req.user?.isLifestyleMember) {
            return res.status(403).json({ error: 'Lifestyle membership required' });
        }
        
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Cart endpoints
app.get('/api/cart', auth.authenticateToken, async (req, res) => {
    try {
        const cart = await db.getCart(req.user.userId);
        res.json(cart);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch cart' });
    }
});

app.post('/api/cart/add', auth.authenticateToken, async (req, res) => {
    try {
        const { productId, quantity, size, color } = req.body;
        const item = await db.addToCart(req.user.userId, productId, quantity, size, color);
        res.json(item);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.put('/api/cart/update/:itemId', auth.authenticateToken, async (req, res) => {
    try {
        const { quantity } = req.body;
        await db.updateCartItem(req.user.userId, req.params.itemId, quantity);
        res.json({ message: 'Cart updated' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/cart/remove/:itemId', auth.authenticateToken, async (req, res) => {
    try {
        await db.removeFromCart(req.user.userId, req.params.itemId);
        res.json({ message: 'Item removed from cart' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Orders endpoints
app.get('/api/orders', auth.authenticateToken, async (req, res) => {
    try {
        const orders = await db.getUserOrders(req.user.userId);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
});

app.post('/api/orders/create', auth.authenticateToken, async (req, res) => {
    try {
        const orderData = {
            userId: req.user.userId,
            ...req.body
        };
        const order = await db.createOrder(orderData);
        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/orders/:id', auth.authenticateToken, async (req, res) => {
    try {
        const order = await db.getOrderById(req.params.id, req.user.userId);
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch order' });
    }
});

// Payment endpoints
app.post('/api/payments/process', auth.authenticateToken, async (req, res) => {
    try {
        const { orderId, method, amount } = req.body;
        const payment = await db.processPayment(orderId, method, amount);
        res.json(payment);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await db.getCategories();
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Search
app.get('/api/search', async (req, res) => {
    try {
        const { q, category, minPrice, maxPrice } = req.query;
        const results = await db.searchProducts(q, category, minPrice, maxPrice);
        res.json(results);
    } catch (error) {
        res.status(500).json({ error: 'Search failed' });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`API server running on port ${PORT}`);
});

module.exports = app;