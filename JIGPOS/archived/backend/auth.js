const config = require("./config");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Configuration
const JWT_SECRET = config.auth.jwtSecret;
const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 10;

// Hash password
async function hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password
async function verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
}

// Generate JWT token
function generateToken(userId, email) {
    return jwt.sign(
        { 
            userId, 
            email,
            timestamp: Date.now()
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

// Verify JWT token
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Middleware to authenticate requests
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
}

// Middleware for lifestyle member access
function requireLifestyleMember(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user is lifestyle member (would query DB in real app)
    const db = require('./db');
    db.getUserById(req.user.userId, (err, user) => {
        if (err || !user) {
            return res.status(403).json({ error: 'User not found' });
        }
        if (!user.is_lifestyle_member) {
            return res.status(403).json({ error: 'Lifestyle membership required' });
        }
        req.user.isLifestyleMember = true;
        next();
    });
}

// Register new user
async function register(userData) {
    const { email, username, password, firstName, lastName, phone, address } = userData;
    
    // Validate input
    if (!email || !username || !password) {
        throw new Error('Email, username and password are required');
    }
    
    if (password.length < 8) {
        throw new Error('Password must be at least 8 characters');
    }
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create user object
    const user = {
        email,
        username,
        password_hash: passwordHash,
        first_name: firstName || null,
        last_name: lastName || null,
        phone: phone || null,
        address: address || null
    };
    
    return user;
}

// Login user
async function login(email, password, db) {
    // Get user from database
    return new Promise((resolve, reject) => {
        db.getUserByEmail(email, async (err, user) => {
            if (err) {
                return reject(new Error('Database error'));
            }
            
            if (!user) {
                return reject(new Error('Invalid credentials'));
            }
            
            // Verify password
            const isValid = await verifyPassword(password, user.password_hash);
            if (!isValid) {
                return reject(new Error('Invalid credentials'));
            }
            
            // Generate token
            const token = generateToken(user.id, user.email);
            
            // Create session
            const sessionData = {
                user_id: user.id,
                token_hash: crypto.createHash('sha256').update(token).digest('hex'),
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };
            
            db.createSession(sessionData, (sessionErr) => {
                if (sessionErr) {
                    return reject(new Error('Session creation failed'));
                }
                
                // Return user data and token
                resolve({
                    user: {
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        firstName: user.first_name,
                        lastName: user.last_name,
                        isLifestyleMember: user.is_lifestyle_member
                    },
                    token
                });
            });
        });
    });
}

// Logout user
async function logout(token, db) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    return new Promise((resolve, reject) => {
        db.deleteSession(tokenHash, (err) => {
            if (err) {
                return reject(new Error('Logout failed'));
            }
            resolve({ message: 'Logged out successfully' });
        });
    });
}

// Get user profile
async function getProfile(userId, db) {
    return new Promise((resolve, reject) => {
        db.getUserById(userId, (err, user) => {
            if (err || !user) {
                return reject(new Error('User not found'));
            }
            
            // Remove sensitive data
            delete user.password_hash;
            
            resolve(user);
        });
    });
}

// Update user profile
async function updateProfile(userId, updates, db) {
    // Filter allowed fields
    const allowedFields = ['first_name', 'last_name', 'phone', 'address', 'city', 'postal_code'];
    const filteredUpdates = {};
    
    for (const field of allowedFields) {
        if (updates[field] !== undefined) {
            filteredUpdates[field] = updates[field];
        }
    }
    
    return new Promise((resolve, reject) => {
        db.updateUser(userId, filteredUpdates, (err, updated) => {
            if (err) {
                return reject(new Error('Update failed'));
            }
            resolve(updated);
        });
    });
}

module.exports = {
    hashPassword,
    verifyPassword,
    generateToken,
    verifyToken,
    authenticateToken,
    requireLifestyleMember,
    register,
    login,
    logout,
    getProfile,
    updateProfile,
    JWT_SECRET
};