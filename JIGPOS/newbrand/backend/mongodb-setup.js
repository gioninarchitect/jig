// MongoDB Setup for Origin
const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    firstName: String,
    lastName: String,
    phone: String,
    address: String,
    city: String,
    postalCode: String,
    country: { type: String, default: 'South Africa' },
    isLifestyleMember: { type: Boolean, default: false },
    memberSince: Date,
    totalSpent: { type: Number, default: 0 },
    joinedDate: { type: Date, default: Date.now },
    lastLogin: Date
});

// Product Schema
const productSchema = new mongoose.Schema({
    sku: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: String,
    stock: { type: Number, default: 0 },
    imageUrl: String,
    isLifestyle: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerInfo: {
        name: String,
        email: String,
        phone: String,
        address: String
    },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number,
        isLifestyle: Boolean
    }],
    subtotal: Number,
    shipping: { type: Number, default: 0 },
    total: { type: Number, required: true },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        default: 'pending'
    },
    paymentMethod: String,
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending'
    },
    qualifiesForMembership: Boolean,
    notes: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Cart Schema
const cartSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    sessionId: String,
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number,
        isLifestyle: Boolean
    }],
    updatedAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Cart = mongoose.model('Cart', cartSchema);

// Initialize default products
async function initializeProducts() {
    const products = [
        {
            sku: 'LD-TSH-001',
            name: 'Gas Station T-Shirt',
            description: 'Premium cotton blend with signature Loose Draw branding',
            price: 300,
            category: 'Merchandise',
            stock: 50,
            imageUrl: '/images/tshirts/t-shirts.jpeg',
            isLifestyle: false
        },
        {
            sku: 'LD-HOD-001',
            name: 'Gas Station Hoodie',
            description: 'Heavyweight hoodie with embroidered logo',
            price: 699,
            category: 'Merchandise',
            stock: 30,
            imageUrl: '/images/hoodies/hoodies.jpeg',
            isLifestyle: false
        },
        {
            sku: 'LD-HMP-001',
            name: 'LD Hamper Pack',
            description: 'Complete lifestyle bundle + 1 Free Friend Membership',
            price: 1199,
            category: 'Bundles',
            stock: 20,
            imageUrl: '/images/combo.jpeg',
            isLifestyle: false
        },
        {
            sku: 'LD-LTD-001',
            name: 'Limited Edition Lifestyle Tee',
            description: 'Members-only premium cotton blend',
            price: 599,
            category: 'Lifestyle',
            stock: 15,
            isLifestyle: true
        },
        {
            sku: 'LD-VIP-001',
            name: 'VIP Bomber Jacket',
            description: 'Exclusive lifestyle member design',
            price: 1499,
            category: 'Lifestyle',
            stock: 10,
            isLifestyle: true
        },
        {
            sku: 'LD-BAG-001',
            name: 'Lifestyle Backpack',
            description: 'Premium member-exclusive gear',
            price: 899,
            category: 'Lifestyle',
            stock: 25,
            isLifestyle: true
        }
    ];

    for (const product of products) {
        await Product.findOneAndUpdate(
            { sku: product.sku },
            product,
            { upsert: true, new: true }
        );
    }
    console.log('Products initialized');
}

// Check and upgrade membership
async function checkMembershipUpgrade(userId) {
    const orders = await Order.find({ userId, paymentStatus: 'paid' });
    let totalMerchandiseSpent = 0;
    
    orders.forEach(order => {
        order.items.forEach(item => {
            if (!item.isLifestyle) {
                totalMerchandiseSpent += (item.price * item.quantity);
            }
        });
    });
    
    // If spent R300+ on merchandise, upgrade to lifestyle member
    if (totalMerchandiseSpent >= 300) {
        await User.findByIdAndUpdate(userId, {
            isLifestyleMember: true,
            memberSince: new Date()
        });
        return true;
    }
    return false;
}

module.exports = {
    mongoose,
    User,
    Product,
    Order,
    Cart,
    initializeProducts,
    checkMembershipUpgrade
};