#!/usr/bin/env node
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./backend/modules/database/models/User');

async function resetPassword() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jig');
        console.log('Connected to MongoDB');

        const hashedPassword = await bcrypt.hash('Admin123!', 10);

        const result = await User.updateOne(
            { email: 'admin@jig.cleva-ai.co.za' },
            { $set: { password: hashedPassword } }
        );

        console.log('✅ Admin password reset to: Admin123!');
        console.log(`Updated ${result.modifiedCount} user(s)`);

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

resetPassword();
