/**
 * Create UAT Test Users for Basotho Medical Herbs
 *
 * This script creates all UAT test users with the credentials from uat-testing.html
 * Run this script on BOTH local and production databases to ensure UAT team can login
 *
 * Usage: node create-uat-users.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

// User Schema (same as backend/modules/database/models/User.js)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false },
    role: {
        type: String,
        enum: ['admin', 'branch_manager', 'branch_assistant', 'user'],
        default: 'user'
    },
    emailVerified: { type: Boolean, default: false },
    status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
    lastLogin: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// UAT Test Users from uat-testing.html
const UAT_USERS = [
    {
        name: 'Admin User',
        email: 'admin@basothomedicalherbs.ls',
        password: 'Admin123!',
        role: 'admin',
        emailVerified: true
    },
    {
        name: 'Store Manager',
        email: 'manager@basothomedicalherbs.ls',
        password: 'Manager123!',
        role: 'branch_manager',
        emailVerified: true
    },
    {
        name: 'Shop Assistant',
        email: 'assistant@basothomedicalherbs.ls',
        password: 'Assistant123!',
        role: 'branch_assistant',
        emailVerified: true
    },
    {
        name: 'Lifestyle Member',
        email: 'user@basothomedicalherbs.ls',
        password: 'User123!',
        role: 'user',
        emailVerified: true
    },
    {
        name: 'Section 21 Patient',
        email: 'patient@basothomedicalherbs.ls',
        password: 'Patient123!',
        role: 'user',
        emailVerified: true
    }
];

async function createUATUsers() {
    try {
        console.log('Connecting to MongoDB...');
        console.log('URI:', MONGODB_URI);

        await mongoose.connect(MONGODB_URI);
        console.log('✓ Connected to MongoDB\n');

        for (const userData of UAT_USERS) {
            try {
                // Check if user exists
                const existingUser = await User.findOne({ email: userData.email });

                if (existingUser) {
                    console.log(`Updating existing user: ${userData.email}`);

                    // Hash new password
                    const hashedPassword = await bcrypt.hash(userData.password, 10);

                    // Update user with new password and ensure correct role
                    existingUser.password = hashedPassword;
                    existingUser.name = userData.name;
                    existingUser.role = userData.role;
                    existingUser.emailVerified = userData.emailVerified;
                    existingUser.status = 'active';
                    existingUser.updatedAt = new Date();

                    await existingUser.save();

                    console.log(`  ✓ Updated ${userData.email}`);
                    console.log(`    Role: ${userData.role}`);
                    console.log(`    Password: ${userData.password}`);
                    console.log(`    Status: active\n`);
                } else {
                    console.log(`Creating new user: ${userData.email}`);

                    // Hash password
                    const hashedPassword = await bcrypt.hash(userData.password, 10);

                    // Create new user
                    const newUser = new User({
                        name: userData.name,
                        email: userData.email,
                        password: hashedPassword,
                        role: userData.role,
                        emailVerified: userData.emailVerified,
                        status: 'active'
                    });

                    await newUser.save();

                    console.log(`  ✓ Created ${userData.email}`);
                    console.log(`    Role: ${userData.role}`);
                    console.log(`    Password: ${userData.password}`);
                    console.log(`    Status: active\n`);
                }
            } catch (error) {
                console.error(`✗ Error processing ${userData.email}:`, error.message);
            }
        }

        console.log('\n========================================');
        console.log('UAT User Creation Complete');
        console.log('========================================\n');

        // Display all users for verification
        const allUsers = await User.find({}, { password: 0 });
        console.log('All users in database:');
        allUsers.forEach(user => {
            console.log(`  - ${user.email} (${user.role}) - Status: ${user.status}`);
        });

        await mongoose.disconnect();
        console.log('\n✓ Disconnected from MongoDB');

    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

// Run the script
createUATUsers();
