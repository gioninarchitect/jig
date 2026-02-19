// Enhanced API with Gamification & Loyalty for Loose Draw
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

// Import models
const { User, Product, Order, Cart, checkMembershipUpgrade } = require('./mongodb-setup');
const { 
    LoyaltyToken, 
    Document,
    awardPoints,
    calculatePurchasePoints,
    redeemPoints,
    processReferral,
    completeReferral,
    Reward
} = require('./loyalty-system');
const {
    UserProgress,
    Notification,
    trackLogin,
    awardXP,
    triggerSurpriseReward,
    getDailyChallenge,
    spinWheel
} = require('./gamification-system');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../'));

const JWT_SECRET = process.env.JWT_SECRET || 'loosedraw_secret_2024';

// File upload configuration for documents
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, '../uploads/documents/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${req.userId}_${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        if (extname) {
            return cb(null, true);
        }
        cb(new Error('Only images and PDFs are allowed'));
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

// === GAMIFIED AUTH ENDPOINTS ===

// Register with gamification initialization
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, username, password, firstName, lastName, phone, address, referralCode } = req.body;
        
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
        
        // Initialize loyalty wallet
        const wallet = new LoyaltyToken({ userId: user._id });
        await wallet.save();
        
        // Initialize game progress
        const progress = new UserProgress({ userId: user._id });
        await progress.save();
        
        // Process referral if code provided
        if (referralCode) {
            await processReferral(referralCode, email);
        }
        
        // Welcome bonus
        await awardPoints(user._id, 100, 'bonus', 'Welcome to Loose Draw!');
        await awardXP(user._id, 50, 'Account created');
        
        // Generate token
        const token = jwt.sign({ userId: user._id, email }, JWT_SECRET);
        
        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                isLifestyleMember: false,
                ldCoins: 100
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login with streak tracking
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
        
        // Track login streak
        const streak = await trackLogin(user._id);
        
        // Trigger possible surprise reward
        await triggerSurpriseReward(user._id, 'login');
        
        // Get wallet balance
        const wallet = await LoyaltyToken.findOne({ userId: user._id });
        
        // Get notifications
        const notifications = await Notification.find({ 
            userId: user._id, 
            read: false 
        }).sort('-createdAt').limit(5);
        
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
                lastName: user.lastName,
                ldCoins: wallet?.balance || 0,
                tier: wallet?.tier || 'Bronze',
                streak
            },
            notifications
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === DOCUMENT UPLOAD ===

// Upload document for verification
app.post('/api/documents/upload', authenticateToken, upload.single('document'), async (req, res) => {
    try {
        const { documentType } = req.body;
        
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const document = new Document({
            userId: req.userId,
            documentType,
            fileName: req.file.filename,
            fileUrl: `/uploads/documents/${req.file.filename}`,
            status: 'pending'
        });
        
        await document.save();
        
        // Award points for document upload
        await awardPoints(req.userId, 250, 'earned', 'Document uploaded for verification');
        await awardXP(req.userId, 100, 'Document uploaded');
        
        res.json({
            message: 'Document uploaded successfully',
            document
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get user documents
app.get('/api/documents', authenticateToken, async (req, res) => {
    try {
        const documents = await Document.find({ userId: req.userId });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === GAMIFICATION ENDPOINTS ===

// Get user dashboard data
app.get('/api/dashboard', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const wallet = await LoyaltyToken.findOne({ userId: req.userId });
        const progress = await UserProgress.findOne({ userId: req.userId });
        const dailyChallenge = await getDailyChallenge(req.userId);
        const notifications = await Notification.find({ 
            userId: req.userId, 
            read: false 
        }).sort('-createdAt').limit(10);
        
        res.json({
            user: {
                email: user.email,
                username: user.username,
                isLifestyleMember: user.isLifestyleMember,
                memberSince: user.memberSince
            },
            loyalty: {
                balance: wallet?.balance || 0,
                tier: wallet?.tier || 'Bronze',
                totalEarned: wallet?.totalEarned || 0,
                multiplier: wallet?.multiplier || 1.0
            },
            progress: {
                level: progress?.level || 1,
                currentXP: progress?.currentXP || 0,
                nextLevelXP: progress?.nextLevelXP || 100,
                loginStreak: progress?.loginStreak || 0,
                purchaseStreak: progress?.purchaseStreak || 0,
                spinTokens: progress?.spinTokens || 1,
                mysteryBoxes: progress?.mysteryBoxes || 0
            },
            dailyChallenge,
            notifications
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Spin the wheel
app.post('/api/gamification/spin', authenticateToken, async (req, res) => {
    try {
        const progress = await UserProgress.findOne({ userId: req.userId });
        
        if (!progress || progress.spinTokens < 1) {
            return res.status(400).json({ error: 'No spin tokens available' });
        }
        
        // Use spin token
        progress.spinTokens -= 1;
        progress.lastSpinDate = new Date();
        
        // Spin the wheel
        const result = spinWheel(req.userId);
        
        // Award prize
        if (result.type === 'points') {
            await awardPoints(req.userId, result.value, 'bonus', `Wheel spin: ${result.prize}`);
        } else if (result.type === 'box') {
            progress.mysteryBoxes += 1;
        }
        
        await progress.save();
        
        res.json({
            result,
            spinTokensLeft: progress.spinTokens
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get available rewards
app.get('/api/rewards/catalog', authenticateToken, async (req, res) => {
    try {
        const wallet = await LoyaltyToken.findOne({ userId: req.userId });
        const rewards = await Reward.find({ isActive: true });
        
        // Filter by tier if applicable
        const tierOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
        const userTierIndex = tierOrder.indexOf(wallet?.tier || 'Bronze');
        
        const availableRewards = rewards.filter(reward => {
            if (!reward.minimumTier) return true;
            const requiredTierIndex = tierOrder.indexOf(reward.minimumTier);
            return userTierIndex >= requiredTierIndex;
        });
        
        res.json({
            balance: wallet?.balance || 0,
            tier: wallet?.tier || 'Bronze',
            rewards: availableRewards
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Redeem reward
app.post('/api/rewards/redeem/:rewardId', authenticateToken, async (req, res) => {
    try {
        const { rewardId } = req.params;
        const reward = await Reward.findById(rewardId);
        
        if (!reward || !reward.isActive) {
            return res.status(404).json({ error: 'Reward not found' });
        }
        
        const result = await redeemPoints(
            req.userId,
            reward.pointsCost,
            rewardId,
            `Redeemed: ${reward.name}`
        );
        
        res.json({
            message: 'Reward redeemed successfully',
            reward: result.reward,
            newBalance: result.wallet.balance
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// === ENHANCED ORDER WITH GAMIFICATION ===

// Create order with loyalty and gamification
app.post('/api/orders/create', authenticateToken, async (req, res) => {
    try {
        const { items, customerInfo, paymentMethod } = req.body;
        
        // Calculate totals
        let subtotal = 0;
        let qualifiesForMembership = false;
        let includesFriendMembership = false;
        
        items.forEach(item => {
            subtotal += (item.price * item.quantity);
            
            // Check membership qualification (R300+ single item)
            if (!item.isLifestyle && item.price >= 300) {
                qualifiesForMembership = true;
            }
            
            // Check for combo deal friend membership
            if (item.friendMembership) {
                includesFriendMembership = true;
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
            qualifiesForMembership,
            includesFriendMembership
        });
        
        await order.save();
        
        // Calculate and award points
        const points = await calculatePurchasePoints(total, req.userId);
        await awardPoints(req.userId, points, 'earned', `Purchase: Order ${order.orderNumber}`, order._id);
        
        // Award XP
        await awardXP(req.userId, Math.floor(total / 10), 'Purchase completed');
        
        // Update purchase streak
        const progress = await UserProgress.findOne({ userId: req.userId });
        if (progress) {
            const today = new Date().setHours(0, 0, 0, 0);
            const lastPurchase = progress.lastPurchaseDate ? new Date(progress.lastPurchaseDate).setHours(0, 0, 0, 0) : null;
            
            if (!lastPurchase || (today - lastPurchase) / (1000 * 60 * 60 * 24) === 1) {
                progress.purchaseStreak += 1;
            } else {
                progress.purchaseStreak = 1;
            }
            
            progress.lastPurchaseDate = new Date();
            progress.totalPurchases += 1;
            progress.totalSpent += total;
            await progress.save();
        }
        
        // Check for membership upgrade
        if (qualifiesForMembership) {
            await checkMembershipUpgrade(req.userId);
            await awardPoints(req.userId, 1000, 'bonus', 'Lifestyle membership achieved!');
        }
        
        // Generate friend membership code if applicable
        let friendMembershipCode = null;
        if (includesFriendMembership) {
            friendMembershipCode = 'FRIEND_' + Date.now();
            // Store this code for redemption
        }
        
        // Trigger surprise reward chance
        await triggerSurpriseReward(req.userId, 'purchase');
        
        // Clear cart
        await Cart.deleteOne({ userId: req.userId });
        
        res.json({
            order,
            rewards: {
                pointsEarned: points,
                newTier: qualifiesForMembership ? 'Lifestyle Member' : null,
                friendMembershipCode
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { read: true });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`Gamified API server running on port ${PORT}`);
});

module.exports = app;