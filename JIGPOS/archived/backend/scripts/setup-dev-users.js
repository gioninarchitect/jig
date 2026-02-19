/**
 * DEV MODE: Setup Developer Account + Branch Staff
 *
 * - ONE developer account (florisolivier7@gmail.com) with OWNER access to test everything
 * - Each branch has its own staff emails
 *
 * Run: node backend/scripts/setup-dev-users.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bmh';
const DEV_EMAIL = 'florisolivier7@gmail.com';
const DEV_PASSWORD = 'DevMode123!';

// Users to create
const users = [
  // ========================================
  // THE DEVELOPER - Full system access
  // ========================================
  {
    email: DEV_EMAIL,
    username: 'developer',
    firstName: 'Floris',
    lastName: 'Olivier',
    role: 'owner',  // Owner = highest level, sees everything
    phone: '+27000000000',
    isActive: true,
    isEmailVerified: true,
    isDeveloper: true,
    branches: ['all']  // Access to all branches
  },

  // ========================================
  // HEAD OFFICE STAFF
  // ========================================
  {
    email: 'admin@basothomedicalherbs.ls',
    username: 'hq_admin',
    firstName: 'HQ',
    lastName: 'Admin',
    role: 'admin',
    phone: '+27110000001',
    isActive: true,
    isEmailVerified: true,
    branches: ['headquarters']
  },

  // ========================================
  // ORMONDE DISPENSARY STAFF
  // ========================================
  {
    email: 'ormonde.manager@basothomedicalherbs.ls',
    username: 'ormonde_manager',
    firstName: 'Ormonde',
    lastName: 'Manager',
    role: 'staff_manager',
    phone: '+27110000010',
    isActive: true,
    isEmailVerified: true,
    branches: ['ormonde']
  },
  {
    email: 'ormonde.assistant1@basothomedicalherbs.ls',
    username: 'ormonde_assistant1',
    firstName: 'Ormonde',
    lastName: 'Assistant 1',
    role: 'staff_assistant',
    phone: '+27110000011',
    isActive: true,
    isEmailVerified: true,
    branches: ['ormonde']
  },
  {
    email: 'ormonde.assistant2@basothomedicalherbs.ls',
    username: 'ormonde_assistant2',
    firstName: 'Ormonde',
    lastName: 'Assistant 2',
    role: 'staff_assistant',
    phone: '+27110000012',
    isActive: true,
    isEmailVerified: true,
    branches: ['ormonde']
  }
];

async function setupDevUsers() {
  try {
    console.log('\n========================================');
    console.log('  DBC Developer Setup');
    console.log('========================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', MONGODB_URI);

    const User = require('../modules/database/models/User');
    const hashedPassword = await bcrypt.hash(DEV_PASSWORD, 10);

    console.log('\nSetting up users...\n');

    for (const userData of users) {
      const existingUser = await User.findOne({ email: userData.email });

      if (existingUser) {
        // Update existing user
        existingUser.password = hashedPassword;
        existingUser.role = userData.role;
        existingUser.isActive = true;
        existingUser.isEmailVerified = true;
        if (userData.branches) existingUser.branches = userData.branches;
        if (userData.isDeveloper) existingUser.isDeveloper = true;
        await existingUser.save();
        console.log(`  Updated: ${userData.email} (${userData.role})`);
      } else {
        // Create new user
        const newUser = new User({
          ...userData,
          password: hashedPassword
        });
        await newUser.save();
        console.log(`  Created: ${userData.email} (${userData.role})`);
      }
    }

    console.log('\n========================================');
    console.log('  DEVELOPER CREDENTIALS');
    console.log('========================================');
    console.log(`  Email:    ${DEV_EMAIL}`);
    console.log(`  Password: ${DEV_PASSWORD}`);
    console.log(`  Role:     OWNER (full access)`);
    console.log('----------------------------------------');
    console.log('  This account can:');
    console.log('    - Access ALL dashboards');
    console.log('    - Test ALL roles');
    console.log('    - Access ALL branches');
    console.log('    - Receive ALL OTP codes');
    console.log('========================================\n');

    console.log('Branch Staff Created:');
    console.log('  ORMONDE:');
    console.log('    - ormonde.manager@basothomedicalherbs.ls (Manager)');
    console.log('    - ormonde.assistant1@basothomedicalherbs.ls (Assistant)');
    console.log('    - ormonde.assistant2@basothomedicalherbs.ls (Assistant)');
    console.log('\n  HQ:');
    console.log('    - admin@basothomedicalherbs.ls (Admin)');

    console.log('\n========================================');
    console.log('  Setup complete!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Setup error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

setupDevUsers();
