// Gamification & Dopamine Reward System for Loose Draw
// Strategic retention through psychological reward mechanics

const mongoose = require('mongoose');

// Achievement Schema
const achievementSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    icon: String,
    pointsReward: Number,
    category: {
        type: String,
        enum: ['purchase', 'social', 'loyalty', 'milestone', 'special'],
        required: true
    },
    condition: {
        type: { type: String },
        value: Number,
        comparison: String
    },
    isSecret: { type: Boolean, default: false },
    unlockedCount: { type: Number, default: 0 }
});

// User Progress Schema
const userProgressSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Streak tracking
    loginStreak: { type: Number, default: 0 },
    purchaseStreak: { type: Number, default: 0 },
    lastLoginDate: Date,
    lastPurchaseDate: Date,
    
    // Milestones
    totalPurchases: { type: Number, default: 0 },
    totalSpent: { type: Number, default: 0 },
    itemsReviewed: { type: Number, default: 0 },
    friendsReferred: { type: Number, default: 0 },
    
    // Achievements
    unlockedAchievements: [{
        achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement' },
        unlockedAt: { type: Date, default: Date.now },
        claimed: { type: Boolean, default: false }
    }],
    
    // Daily/Weekly challenges
    dailyChallengeProgress: {
        challenge: String,
        progress: Number,
        target: Number,
        completed: Boolean,
        expiresAt: Date
    },
    
    weeklyMissionProgress: [{
        mission: String,
        progress: Number,
        target: Number,
        completed: Boolean,
        reward: Number
    }],
    
    // Surprise mechanics
    lastSpinDate: Date,
    spinTokens: { type: Number, default: 1 },
    mysteryBoxes: { type: Number, default: 0 },
    
    // Level & XP
    level: { type: Number, default: 1 },
    currentXP: { type: Number, default: 0 },
    nextLevelXP: { type: Number, default: 100 }
});

// Notification Schema
const notificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
        type: String,
        enum: ['achievement', 'reward', 'streak', 'level_up', 'challenge', 'social'],
        required: true
    },
    title: String,
    message: String,
    icon: String,
    pointsEarned: Number,
    read: { type: Boolean, default: false },
    actionUrl: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: Date
});

// Models
const Achievement = mongoose.model('Achievement', achievementSchema);
const UserProgress = mongoose.model('UserProgress', userProgressSchema);
const Notification = mongoose.model('Notification', notificationSchema);

// === DOPAMINE MECHANICS ===

// 1. VARIABLE REWARD SCHEDULE (Most addictive pattern)
const SURPRISE_REWARDS = {
    common: [
        { type: 'points', value: 50, weight: 40 },
        { type: 'points', value: 100, weight: 30 },
        { type: 'discount', value: 5, weight: 20 }
    ],
    rare: [
        { type: 'points', value: 500, weight: 5 },
        { type: 'discount', value: 15, weight: 3 },
        { type: 'free_shipping', value: 1, weight: 1 }
    ],
    epic: [
        { type: 'points', value: 1000, weight: 0.5 },
        { type: 'discount', value: 25, weight: 0.3 },
        { type: 'mystery_box', value: 1, weight: 0.1 }
    ],
    legendary: [
        { type: 'points', value: 5000, weight: 0.05 },
        { type: 'free_product', value: 1, weight: 0.01 },
        { type: 'vip_upgrade', value: 1, weight: 0.001 }
    ]
};

// 2. STREAK MECHANICS (Daily dopamine)
const STREAK_REWARDS = {
    3: { points: 100, message: "3 Day Streak!" },
    7: { points: 300, message: "Weekly Warrior!", badge: "week_warrior" },
    14: { points: 700, message: "Two Week Champion!" },
    30: { points: 2000, message: "Monthly Legend!", badge: "monthly_legend" },
    60: { points: 5000, message: "Loyalty Master!", badge: "loyalty_master" },
    100: { points: 10000, message: "Century Club!", badge: "century", mysteryBox: 1 }
};

// 3. PROGRESS BARS (Visual dopamine)
const LEVEL_THRESHOLDS = [
    100, 250, 500, 850, 1350, 2000, 2850, 3900, 5200, 6800,
    8700, 11000, 13700, 16900, 20600, 25000, 30000, 36000, 43000, 51000
];

// 4. DAILY CHALLENGES (Routine building)
const DAILY_CHALLENGES = [
    { challenge: "Visit the store", target: 1, reward: 50 },
    { challenge: "Add 3 items to wishlist", target: 3, reward: 75 },
    { challenge: "Share a product", target: 1, reward: 100 },
    { challenge: "Complete your profile", target: 1, reward: 150 },
    { challenge: "Write a review", target: 1, reward: 200 }
];

// 5. WEEKLY MISSIONS (Bigger dopamine hits)
const WEEKLY_MISSIONS = [
    { mission: "Spend R500+", target: 500, reward: 500 },
    { mission: "Purchase 3 items", target: 3, reward: 300 },
    { mission: "Refer a friend", target: 1, reward: 1000 },
    { mission: "Complete 5 daily challenges", target: 5, reward: 750 },
    { mission: "Maintain 7 day streak", target: 7, reward: 1500 }
];

// 6. SPIN THE WHEEL (Gambling mechanic)
function spinWheel(userId) {
    const segments = [
        { prize: '50 Points', probability: 0.3, value: 50, type: 'points' },
        { prize: '100 Points', probability: 0.25, value: 100, type: 'points' },
        { prize: '10% Off', probability: 0.2, value: 10, type: 'discount' },
        { prize: '250 Points', probability: 0.1, value: 250, type: 'points' },
        { prize: 'Free Shipping', probability: 0.08, value: 1, type: 'shipping' },
        { prize: '500 Points', probability: 0.04, value: 500, type: 'points' },
        { prize: 'Mystery Box', probability: 0.02, value: 1, type: 'box' },
        { prize: '1000 Points', probability: 0.01, value: 1000, type: 'points' }
    ];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (const segment of segments) {
        cumulative += segment.probability;
        if (random <= cumulative) {
            return segment;
        }
    }
    
    return segments[0];
}

// 7. ACHIEVEMENT SYSTEM (Completion dopamine)
const DEFAULT_ACHIEVEMENTS = [
    // Purchase Achievements
    { name: "First Purchase", description: "Make your first purchase", category: "purchase", pointsReward: 200 },
    { name: "Big Spender", description: "Spend R1000 in a single order", category: "purchase", pointsReward: 500 },
    { name: "Collector", description: "Purchase 10 different items", category: "purchase", pointsReward: 750 },
    { name: "VIP Shopper", description: "Spend R5000 total", category: "purchase", pointsReward: 2000 },
    
    // Social Achievements
    { name: "Influencer", description: "Refer 5 friends", category: "social", pointsReward: 1500 },
    { name: "Reviewer", description: "Write 5 product reviews", category: "social", pointsReward: 500 },
    { name: "Social Butterfly", description: "Share 10 products", category: "social", pointsReward: 300 },
    
    // Loyalty Achievements
    { name: "Regular", description: "Visit 10 days in a row", category: "loyalty", pointsReward: 400 },
    { name: "Devoted", description: "30 day login streak", category: "loyalty", pointsReward: 1500 },
    { name: "Lifestyle Member", description: "Become a lifestyle member", category: "loyalty", pointsReward: 3000 },
    
    // Secret Achievements (Discovery dopamine)
    { name: "Night Owl", description: "Shop between 2-4 AM", category: "special", pointsReward: 666, isSecret: true },
    { name: "Lucky 7", description: "Order total exactly R777", category: "special", pointsReward: 777, isSecret: true },
    { name: "Speed Demon", description: "Complete checkout in under 30 seconds", category: "special", pointsReward: 420, isSecret: true }
];

// === CORE FUNCTIONS ===

// Track login and update streak
async function trackLogin(userId) {
    const progress = await UserProgress.findOne({ userId });
    if (!progress) return;
    
    const today = new Date().setHours(0, 0, 0, 0);
    const lastLogin = progress.lastLoginDate ? new Date(progress.lastLoginDate).setHours(0, 0, 0, 0) : null;
    const daysSinceLastLogin = lastLogin ? (today - lastLogin) / (1000 * 60 * 60 * 24) : null;
    
    let streakUpdate = {};
    let notification = null;
    
    if (daysSinceLastLogin === 1) {
        // Continue streak
        streakUpdate.loginStreak = progress.loginStreak + 1;
        
        // Check streak rewards
        const streakReward = STREAK_REWARDS[streakUpdate.loginStreak];
        if (streakReward) {
            notification = {
                userId,
                type: 'streak',
                title: streakReward.message,
                message: `${streakReward.points} LD Coins earned!`,
                pointsEarned: streakReward.points,
                icon: '🔥'
            };
        }
    } else if (daysSinceLastLogin > 1) {
        // Streak broken
        streakUpdate.loginStreak = 1;
        if (progress.loginStreak >= 7) {
            notification = {
                userId,
                type: 'streak',
                title: 'Streak Lost!',
                message: `Your ${progress.loginStreak} day streak has ended. Start a new one!`,
                icon: '💔'
            };
        }
    } else if (!lastLogin) {
        // First login
        streakUpdate.loginStreak = 1;
    }
    
    streakUpdate.lastLoginDate = new Date();
    
    await UserProgress.findByIdAndUpdate(progress._id, streakUpdate);
    
    if (notification) {
        await Notification.create(notification);
    }
    
    return streakUpdate.loginStreak;
}

// Award XP and check level up
async function awardXP(userId, amount, reason) {
    const progress = await UserProgress.findOne({ userId });
    if (!progress) return;
    
    progress.currentXP += amount;
    
    // Check level up
    while (progress.level < LEVEL_THRESHOLDS.length && 
           progress.currentXP >= LEVEL_THRESHOLDS[progress.level - 1]) {
        progress.currentXP -= LEVEL_THRESHOLDS[progress.level - 1];
        progress.level++;
        
        // Level up rewards
        const levelReward = progress.level * 100;
        
        await Notification.create({
            userId,
            type: 'level_up',
            title: `Level ${progress.level} Reached!`,
            message: `You earned ${levelReward} LD Coins!`,
            pointsEarned: levelReward,
            icon: '⭐'
        });
    }
    
    progress.nextLevelXP = LEVEL_THRESHOLDS[progress.level - 1] || 99999;
    await progress.save();
    
    return progress;
}

// Random surprise reward (dopamine spike)
async function triggerSurpriseReward(userId, triggerType) {
    // 10% chance of surprise reward
    if (Math.random() > 0.1) return null;
    
    const roll = Math.random() * 100;
    let rewardPool;
    
    if (roll < 60) rewardPool = SURPRISE_REWARDS.common;
    else if (roll < 90) rewardPool = SURPRISE_REWARDS.rare;
    else if (roll < 99) rewardPool = SURPRISE_REWARDS.epic;
    else rewardPool = SURPRISE_REWARDS.legendary;
    
    const totalWeight = rewardPool.reduce((sum, r) => sum + r.weight, 0);
    const random = Math.random() * totalWeight;
    let cumulative = 0;
    
    for (const reward of rewardPool) {
        cumulative += reward.weight;
        if (random <= cumulative) {
            await Notification.create({
                userId,
                type: 'reward',
                title: '🎉 SURPRISE REWARD!',
                message: `You got ${reward.value} ${reward.type}!`,
                pointsEarned: reward.type === 'points' ? reward.value : 0,
                icon: '🎁'
            });
            
            return reward;
        }
    }
}

// Get daily challenge
async function getDailyChallenge(userId) {
    const progress = await UserProgress.findOne({ userId });
    if (!progress) return null;
    
    const today = new Date().setHours(0, 0, 0, 0);
    const challengeExpiry = progress.dailyChallengeProgress?.expiresAt?.setHours(0, 0, 0, 0);
    
    // Generate new challenge if expired or none exists
    if (!challengeExpiry || challengeExpiry < today) {
        const challenge = DAILY_CHALLENGES[Math.floor(Math.random() * DAILY_CHALLENGES.length)];
        
        progress.dailyChallengeProgress = {
            challenge: challenge.challenge,
            progress: 0,
            target: challenge.target,
            completed: false,
            expiresAt: new Date(today + 24 * 60 * 60 * 1000)
        };
        
        await progress.save();
    }
    
    return progress.dailyChallengeProgress;
}

// Initialize achievements
async function initializeAchievements() {
    for (const achievement of DEFAULT_ACHIEVEMENTS) {
        await Achievement.findOneAndUpdate(
            { name: achievement.name },
            achievement,
            { upsert: true, new: true }
        );
    }
    console.log('Achievements initialized');
}

module.exports = {
    Achievement,
    UserProgress,
    Notification,
    SURPRISE_REWARDS,
    STREAK_REWARDS,
    LEVEL_THRESHOLDS,
    DAILY_CHALLENGES,
    WEEKLY_MISSIONS,
    spinWheel,
    trackLogin,
    awardXP,
    triggerSurpriseReward,
    getDailyChallenge,
    initializeAchievements
};