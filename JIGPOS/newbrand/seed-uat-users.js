/**
 * UAT Test Users Seed Script for JIG Craft Cannabis
 * Run on production: node seed-uat-users.js
 */

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const UAT_USERS = [
    {
        email: 'owner@jig.cleva-ai.co.za',
        password: 'Owner2025!',
        username: 'owner',
        firstName: 'Business',
        lastName: 'Owner',
        role: 'owner',
        loyalty: { tier: 'wellness_elite', points: 0, totalSpent: 0 }
    },
    {
        email: 'admin@jig.cleva-ai.co.za',
        password: 'Admin2025!',
        username: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        loyalty: { tier: 'wellness_elite', points: 0, totalSpent: 0 }
    },
    {
        email: 'inventory@jig.cleva-ai.co.za',
        password: 'Inventory2025!',
        username: 'inventory_manager',
        firstName: 'Inventory',
        lastName: 'Manager',
        role: 'inventory_manager',
        loyalty: { tier: 'wellness_elite', points: 0, totalSpent: 0 }
    },
    {
        email: 'ormonde.manager@jig.cleva-ai.co.za',
        password: 'Manager2025!',
        username: 'ormonde_manager',
        firstName: 'Ormonde',
        lastName: 'Manager',
        role: 'branch_manager',
        loyalty: { tier: 'wellness_elite', points: 0, totalSpent: 0 }
    },
    {
        email: 'ormonde.assistant@jig.cleva-ai.co.za',
        password: 'Staff2025!',
        username: 'ormonde_assistant',
        firstName: 'Ormonde',
        lastName: 'Assistant',
        role: 'branch_assistant',
        loyalty: { tier: 'wellness_seeker', points: 0, totalSpent: 0 }
    }
];

async function seedUATUsers() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB: dbc');

        const db = client.db('dbc');
        const usersCollection = db.collection('users');

        for (const user of UAT_USERS) {
            const hashedPassword = await bcrypt.hash(user.password, 10);

            const existingUser = await usersCollection.findOne({ email: user.email });

            if (existingUser) {
                await usersCollection.updateOne(
                    { email: user.email },
                    { $set: { password: hashedPassword, role: user.role, loyalty: user.loyalty } }
                );
                console.log('Updated: ' + user.email + ' (' + user.role + ')');
            } else {
                await usersCollection.insertOne({
                    email: user.email,
                    password: hashedPassword,
                    username: user.username,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    loyalty: user.loyalty,
                    isEmailVerified: true,
                    isActive: true,
                    membership: { status: 'active' },
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log('Created: ' + user.email + ' (' + user.role + ')');
            }
        }

        console.log('\n========================================');
        console.log('DBC LOGIN EMAILS (OTP):');
        console.log('========================================');
        console.log('owner@jig.cleva-ai.co.za');
        console.log('admin@jig.cleva-ai.co.za');
        console.log('inventory@jig.cleva-ai.co.za');
        console.log('ormonde.manager@jig.cleva-ai.co.za');
        console.log('ormonde.assistant@jig.cleva-ai.co.za');
        console.log('========================================');
        console.log('OTP sent via email or check server logs');
        console.log('========================================');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

seedUATUsers();
