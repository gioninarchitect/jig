const mysql = require('mysql2');
const util = require('util');

// Database connection
const connection = mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'loose_draw'
});

// Promisify for async/await support
const query = util.promisify(connection.query).bind(connection);

// User operations
async function createUser(userData) {
    const result = await query('INSERT INTO users SET ?', userData);
    return result.insertId;
}

function getUserById(id, callback) {
    connection.query('SELECT * FROM users WHERE id = ?', [id], (err, results) => {
        callback(err, results[0]);
    });
}

function getUserByEmail(email, callback) {
    connection.query('SELECT * FROM users WHERE email = ?', [email], (err, results) => {
        callback(err, results[0]);
    });
}

function updateUser(id, updates, callback) {
    connection.query('UPDATE users SET ? WHERE id = ?', [updates, id], (err) => {
        callback(err, { id, ...updates });
    });
}

// Session operations
function createSession(sessionData, callback) {
    connection.query('INSERT INTO sessions SET ?', sessionData, callback);
}

function deleteSession(tokenHash, callback) {
    connection.query('DELETE FROM sessions WHERE token_hash = ?', [tokenHash], callback);
}

// Product operations
async function getPublicProducts() {
    return await query(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        WHERE p.is_lifestyle = FALSE AND p.is_active = TRUE
        ORDER BY p.created_at DESC
    `);
}

async function getLifestyleProducts() {
    return await query(`
        SELECT p.*, c.name as category_name 
        FROM products p 
        JOIN categories c ON p.category_id = c.id 
        WHERE p.is_lifestyle = TRUE AND p.is_active = TRUE
        ORDER BY p.created_at DESC
    `);
}

async function getProductById(id) {
    const results = await query('SELECT * FROM products WHERE id = ?', [id]);
    return results[0];
}

async function searchProducts(searchQuery, category, minPrice, maxPrice) {
    let sql = 'SELECT * FROM products WHERE is_active = TRUE';
    const params = [];
    
    if (searchQuery) {
        sql += ' AND (name LIKE ? OR description LIKE ?)';
        params.push(`%${searchQuery}%`, `%${searchQuery}%`);
    }
    
    if (category) {
        sql += ' AND category_id = ?';
        params.push(category);
    }
    
    if (minPrice) {
        sql += ' AND price >= ?';
        params.push(minPrice);
    }
    
    if (maxPrice) {
        sql += ' AND price <= ?';
        params.push(maxPrice);
    }
    
    return await query(sql, params);
}

// Cart operations
async function getCart(userId) {
    return await query(`
        SELECT ci.*, p.name, p.price, p.image_url 
        FROM cart_items ci 
        JOIN products p ON ci.product_id = p.id 
        WHERE ci.user_id = ?
    `, [userId]);
}

async function addToCart(userId, productId, quantity = 1, size = null, color = null) {
    // Check if item exists
    const existing = await query(
        'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND size = ? AND color = ?',
        [userId, productId, size, color]
    );
    
    if (existing.length > 0) {
        // Update quantity
        await query(
            'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?',
            [quantity, existing[0].id]
        );
        return existing[0];
    } else {
        // Add new item
        const result = await query(
            'INSERT INTO cart_items (user_id, product_id, quantity, size, color) VALUES (?, ?, ?, ?, ?)',
            [userId, productId, quantity, size, color]
        );
        return { id: result.insertId, userId, productId, quantity, size, color };
    }
}

async function updateCartItem(userId, itemId, quantity) {
    await query(
        'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
        [quantity, itemId, userId]
    );
}

async function removeFromCart(userId, itemId) {
    await query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [itemId, userId]);
}

// Order operations
async function createOrder(orderData) {
    const orderNumber = 'LD' + Date.now();
    const { userId, items, shippingAddress, billingAddress, paymentMethod } = orderData;
    
    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
        const product = await getProductById(item.productId);
        subtotal += product.price * item.quantity;
    }
    
    const shippingCost = subtotal > 500 ? 0 : 50;
    const totalAmount = subtotal + shippingCost;
    
    // Create order
    const orderResult = await query(`
        INSERT INTO orders 
        (order_number, user_id, subtotal, shipping_cost, total_amount, payment_method, shipping_address, billing_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [orderNumber, userId, subtotal, shippingCost, totalAmount, paymentMethod, 
        JSON.stringify(shippingAddress), JSON.stringify(billingAddress)]);
    
    // Add order items
    for (const item of items) {
        const product = await getProductById(item.productId);
        await query(`
            INSERT INTO order_items (order_id, product_id, quantity, price, size, color)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [orderResult.insertId, item.productId, item.quantity, product.price, item.size, item.color]);
    }
    
    // Clear cart
    await query('DELETE FROM cart_items WHERE user_id = ?', [userId]);
    
    return { id: orderResult.insertId, orderNumber, totalAmount };
}

async function getUserOrders(userId) {
    return await query(`
        SELECT o.*, COUNT(oi.id) as item_count 
        FROM orders o 
        LEFT JOIN order_items oi ON o.id = oi.order_id 
        WHERE o.user_id = ? 
        GROUP BY o.id 
        ORDER BY o.created_at DESC
    `, [userId]);
}

async function getOrderById(orderId, userId) {
    const order = await query('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId]);
    if (order.length === 0) return null;
    
    const items = await query(`
        SELECT oi.*, p.name, p.image_url 
        FROM order_items oi 
        JOIN products p ON oi.product_id = p.id 
        WHERE oi.order_id = ?
    `, [orderId]);
    
    return { ...order[0], items };
}

// Payment operations
async function processPayment(orderId, method, amount) {
    const transactionId = 'TXN' + Date.now();
    
    const result = await query(`
        INSERT INTO payments (order_id, transaction_id, amount, method, status)
        VALUES (?, ?, ?, ?, 'pending')
    `, [orderId, transactionId, amount, method]);
    
    // Update order payment status
    await query('UPDATE orders SET payment_status = "pending" WHERE id = ?', [orderId]);
    
    return { id: result.insertId, transactionId, status: 'pending' };
}

// Categories
async function getCategories() {
    return await query('SELECT * FROM categories ORDER BY name');
}

module.exports = {
    connection,
    createUser,
    getUserById,
    getUserByEmail,
    updateUser,
    createSession,
    deleteSession,
    getPublicProducts,
    getLifestyleProducts,
    getProductById,
    searchProducts,
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    createOrder,
    getUserOrders,
    getOrderById,
    processPayment,
    getCategories
};