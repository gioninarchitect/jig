// Loyalty Rewards & Tokenomics System for Loose Draw
const mongoose = require('mongoose');

// Loyalty Token Schema
const loyaltyTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    balance: { type: Number, default: 0 },
    totalEarned: { type: Number, default: 0 },
    totalRedeemed: { type: Number, default: 0 },
    tier: {
        type: String,
        enum: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'],
        default: 'Bronze'
    },
    multiplier: { type: Number, default: 1.0 }, // Points multiplier based on tier
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Transaction History Schema
const tokenTransactionSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['earned', 'redeemed', 'bonus', 'expired', 'transferred'],
        required: true
    },
    amount: { type: Number, required: true },
    description: String,
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    balance: Number, // Balance after transaction
    createdAt: { type: Date, default: Date.now }
});

// Rewards Catalog Schema
const rewardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    pointsCost: { type: Number, required: true },
    category: {
        type: String,
        enum: ['discount', 'product', 'exclusive', 'experience'],
        required: true
    },
    value: Number, // Rand value or percentage
    stock: { type: Number, default: -1 }, // -1 for unlimited
    imageUrl: String,
    isActive: { type: Boolean, default: true },
    minimumTier: String, // Minimum tier required
    expiresAt: Date
});

// Referral System Schema
const referralSchema = new mongoose.Schema({
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    referredEmail: { type: String, required: true },
    referredId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
        type: String,
        enum: ['pending', 'registered', 'qualified', 'rewarded'],
        default: 'pending'
    },
    referrerReward: { type: Number, default: 500 }, // Points for referrer
    referredReward: { type: Number, default: 250 }, // Points for new member
    createdAt: { type: Date, default: Date.now }
});

// Document Upload Schema for KYC
const documentSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    documentType: {
        type: String,
        enum: ['id', 'passport', 'section21', 'proof_of_address'],
        required: true
    },
    fileName: String,
    fileUrl: String,
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending'
    },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    notes: String,
    uploadedAt: { type: Date, default: Date.now }
});

// Models
const LoyaltyToken = mongoose.model('LoyaltyToken', loyaltyTokenSchema);
const TokenTransaction = mongoose.model('TokenTransaction', tokenTransactionSchema);
const Reward = mongoose.model('Reward', rewardSchema);
const Referral = mongoose.model('Referral', referralSchema);
const Document = mongoose.model('Document', documentSchema);

// === TOKENOMICS FUNCTIONS ===

// Points earning rates
const EARNING_RATES = {
    purchase: 0.1, // 10% of purchase amount as points
    review: 50,
    social_share: 25,
    birthday: 100,
    referral: 500,
    first_purchase: 200,
    lifestyle_upgrade: 1000,
    document_verified: 250
};

// Tier thresholds and benefits
const TIERS = {
    Bronze: { threshold: 0, multiplier: 1.0, benefits: [] },
    Silver: { threshold: 1000, multiplier: 1.25, benefits: ['5% extra points', 'Early access'] },
    Gold: { threshold: 5000, multiplier: 1.5, benefits: ['10% extra points', 'Free shipping', 'VIP sales'] },
    Platinum: { threshold: 10000, multiplier: 2.0, benefits: ['Double points', 'Exclusive products', 'Priority support'] },
    Diamond: { threshold: 25000, multiplier: 3.0, benefits: ['Triple points', 'Personal shopper', 'Private events'] }
};

// Calculate points for purchase
async function calculatePurchasePoints(amount, userId) {
    const wallet = await LoyaltyToken.findOne({ userId });
    const tier = wallet ? wallet.tier : 'Bronze';
    const multiplier = TIERS[tier].multiplier;
    
    return Math.floor(amount * EARNING_RATES.purchase * multiplier);
}

// Award points
async function awardPoints(userId, amount, type, description, orderId = null) {
    try {
        // Get or create wallet
        let wallet = await LoyaltyToken.findOne({ userId });
        if (!wallet) {
            wallet = new LoyaltyToken({ userId });
        }
        
        // Update balance
        wallet.balance += amount;
        wallet.totalEarned += amount;
        
        // Check tier upgrade
        const newTier = calculateTier(wallet.totalEarned);
        if (newTier !== wallet.tier) {
            wallet.tier = newTier;
            wallet.multiplier = TIERS[newTier].multiplier;
            
            // Bonus points for tier upgrade
            const tierBonus = newTier === 'Silver' ? 100 : 
                            newTier === 'Gold' ? 250 :
                            newTier === 'Platinum' ? 500 :
                            newTier === 'Diamond' ? 1000 : 0;
            
            if (tierBonus > 0) {
                wallet.balance += tierBonus;
                wallet.totalEarned += tierBonus;
                
                // Record tier bonus transaction
                await TokenTransaction.create({
                    userId,
                    type: 'bonus',
                    amount: tierBonus,
                    description: `Tier upgrade to ${newTier}`,
                    balance: wallet.balance
                });
            }
        }
        
        wallet.updatedAt = new Date();
        await wallet.save();
        
        // Record transaction
        await TokenTransaction.create({
            userId,
            type: 'earned',
            amount,
            description,
            orderId,
            balance: wallet.balance
        });
        
        return wallet;
    } catch (error) {
        console.error('Error awarding points:', error);
        throw error;
    }
}

// Redeem points
async function redeemPoints(userId, amount, rewardId, description) {
    try {
        const wallet = await LoyaltyToken.findOne({ userId });
        if (!wallet || wallet.balance < amount) {
            throw new Error('Insufficient points');
        }
        
        // Check reward availability
        const reward = await Reward.findById(rewardId);
        if (!reward || !reward.isActive) {
            throw new Error('Reward not available');
        }
        
        if (reward.stock !== -1 && reward.stock <= 0) {
            throw new Error('Reward out of stock');
        }
        
        // Check tier requirement
        if (reward.minimumTier) {
            const tierOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
            const userTierIndex = tierOrder.indexOf(wallet.tier);
            const requiredTierIndex = tierOrder.indexOf(reward.minimumTier);
            
            if (userTierIndex < requiredTierIndex) {
                throw new Error(`Minimum ${reward.minimumTier} tier required`);
            }
        }
        
        // Deduct points
        wallet.balance -= amount;
        wallet.totalRedeemed += amount;
        wallet.updatedAt = new Date();
        await wallet.save();
        
        // Update reward stock
        if (reward.stock !== -1) {
            reward.stock -= 1;
            await reward.save();
        }
        
        // Record transaction
        await TokenTransaction.create({
            userId,
            type: 'redeemed',
            amount: -amount,
            description: description || `Redeemed: ${reward.name}`,
            balance: wallet.balance
        });
        
        return { wallet, reward };
    } catch (error) {
        console.error('Error redeeming points:', error);
        throw error;
    }
}

// Calculate tier based on total earned
function calculateTier(totalEarned) {
    if (totalEarned >= TIERS.Diamond.threshold) return 'Diamond';
    if (totalEarned >= TIERS.Platinum.threshold) return 'Platinum';
    if (totalEarned >= TIERS.Gold.threshold) return 'Gold';
    if (totalEarned >= TIERS.Silver.threshold) return 'Silver';
    return 'Bronze';
}

// Initialize default rewards catalog
async function initializeRewards() {
    const rewards = [
        {
            name: 'R50 Off Next Purchase',
            description: 'Get R50 off your next order',
            pointsCost: 500,
            category: 'discount',
            value: 50,
            stock: -1
        },
        {
            name: 'R100 Off Next Purchase',
            description: 'Get R100 off your next order',
            pointsCost: 900,
            category: 'discount',
            value: 100,
            stock: -1
        },
        {
            name: 'Free Shipping',
            description: 'Free shipping on your next order',
            pointsCost: 250,
            category: 'discount',
            value: 50,
            stock: -1
        },
        {
            name: 'Exclusive LD Pin',
            description: 'Limited edition Loose Draw collector pin',
            pointsCost: 1500,
            category: 'product',
            value: 199,
            stock: 100,
            minimumTier: 'Silver'
        },
        {
            name: 'VIP Event Access',
            description: 'Access to exclusive Loose Draw events',
            pointsCost: 5000,
            category: 'experience',
            value: 999,
            stock: 20,
            minimumTier: 'Gold'
        },
        {
            name: 'Limited Edition Hoodie',
            description: 'Members-only limited edition hoodie',
            pointsCost: 3500,
            category: 'product',
            value: 799,
            stock: 50,
            minimumTier: 'Gold'
        },
        {
            name: 'Private Shopping Session',
            description: 'One-on-one shopping consultation',
            pointsCost: 10000,
            category: 'experience',
            value: 2999,
            stock: 5,
            minimumTier: 'Platinum'
        }
    ];
    
    for (const reward of rewards) {
        await Reward.findOneAndUpdate(
            { name: reward.name },
            reward,
            { upsert: true, new: true }
        );
    }
    
    console.log('Rewards catalog initialized');
}

// Process referral
async function processReferral(referrerId, referredEmail) {
    try {
        // Check if referral exists
        const existing = await Referral.findOne({ referrerId, referredEmail });
        if (existing) {
            throw new Error('Referral already exists');
        }
        
        // Create referral
        const referral = new Referral({
            referrerId,
            referredEmail,
            status: 'pending'
        });
        
        await referral.save();
        return referral;
    } catch (error) {
        console.error('Error processing referral:', error);
        throw error;
    }
}

// Complete referral when referred user makes qualifying purchase
async function completeReferral(referredEmail, referredId) {
    try {
        const referral = await Referral.findOne({ 
            referredEmail, 
            status: { $ne: 'rewarded' } 
        });
        
        if (!referral) return null;
        
        // Update referral status
        referral.referredId = referredId;
        referral.status = 'qualified';
        await referral.save();
        
        // Award points to both users
        await awardPoints(
            referral.referrerId, 
            referral.referrerReward, 
            'referral',
            `Referral bonus for ${referredEmail}`
        );
        
        await awardPoints(
            referredId,
            referral.referredReward,
            'referral',
            'Welcome bonus from referral'
        );
        
        referral.status = 'rewarded';
        await referral.save();
        
        return referral;
    } catch (error) {
        console.error('Error completing referral:', error);
        throw error;
    }
}

module.exports = {
    LoyaltyToken,
    TokenTransaction,
    Reward,
    Referral,
    Document,
    EARNING_RATES,
    TIERS,
    calculatePurchasePoints,
    awardPoints,
    redeemPoints,
    calculateTier,
    initializeRewards,
    processReferral,
    completeReferral
};