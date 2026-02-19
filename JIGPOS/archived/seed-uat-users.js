/**
 * UAT Test Users Seed Script
 * Run on production: node seed-uat-users.js
 */

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const UAT_USERS = [
    {
        email: 'admin@basothomedicalherbs.ls',
        password: 'Admin123!',
        username: 'admin',
        firstName: 'System',
        lastName: 'Administrator',
        role: 'admin',
        loyalty: { tier: 'wellness_elite', points: 0, totalSpent: 0 }
    },
    {
        email: 'user@basothomedicalherbs.ls',
        password: 'User123!',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        role: 'user',
        loyalty: { tier: 'wellness_seeker', points: 150, totalSpent: 450 }
    },
    {
        email: 'pending@basothomedicalherbs.ls',
        password: 'Pending123!',
        username: 'pendinguser',
        firstName: 'Pending',
        lastName: 'Patient',
        role: 'user',
        loyalty: { tier: 'wellness_advocate', points: 0, totalSpent: 0 }
    }
];

async function seedUATUsers() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/bmh';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db('bmh');
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
                    membership: { status: 'active' },
                    createdAt: new Date(),
                    updatedAt: new Date()
                });
                console.log('Created: ' + user.email + ' (' + user.role + ')');
            }
        }

        console.log('\nUAT Credentials:');
        console.log('admin@basothomedicalherbs.ls / Admin123!');
        console.log('user@basothomedicalherbs.ls / User123!');
        console.log('pending@basothomedicalherbs.ls / Pending123!');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
    }
}

seedUATUsers();
