/**
 * Ensure Demo Users Exist in POS MongoDB
 *
 * Upserts 4 demo accounts with correct emails and PINs.
 * Safe to run multiple times — updates existing, creates missing.
 *
 * Run: node backend/scripts/ensure-demo-users.js
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';
const PIN = '123456';
const PASSWORD = 'DevMode123!';

const demoUsers = [
  {
    email: 'florisolivier7@gmail.com',
    username: 'owner_floris',
    firstName: 'Floris',
    lastName: 'Olivier',
    role: 'owner',
    phone: '+27847968457',
    permanentPin: PIN,
    isActive: true,
    isEmailVerified: true,
    isDeveloper: true,
    branches: ['all']
  },
  {
    email: 'admin@cleva-ai.co.za',
    username: 'hq_admin',
    firstName: 'Origin',
    lastName: 'Admin',
    role: 'admin',
    phone: '+27847968458',
    permanentPin: PIN,
    isActive: true,
    isEmailVerified: true,
    branches: ['all']
  },
  {
    email: 'potchefstroom.manager@cleva-ai.co.za',
    username: 'potchefstroom_manager',
    firstName: 'Potchefstroom',
    lastName: 'Manager',
    role: 'branch_manager',
    phone: '+27847968461',
    permanentPin: PIN,
    isActive: true,
    isEmailVerified: true,
    branches: ['OR-POT']
  },
  {
    email: 'inventory@cleva-ai.co.za',
    username: 'inventory_manager',
    firstName: 'Origin',
    lastName: 'Inventory',
    role: 'inventory_manager',
    phone: '+27847968459',
    permanentPin: PIN,
    isActive: true,
    isEmailVerified: true,
    branches: ['all']
  }
];

async function ensureDemoUsers() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', MONGODB_URI);

    const User = require('../modules/database/models/User');
    const Branch = require('../modules/database/models/Branch');
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);

    // Build branch code -> ObjectId lookup
    const branchDocs = await Branch.find({}, { _id: 1, branchCode: 1 });
    const branchMap = {};
    for (const b of branchDocs) branchMap[b.branchCode] = b._id;
    console.log(`Found ${branchDocs.length} branches in DB\n`);

    let created = 0, updated = 0;

    for (const userData of demoUsers) {
      // Resolve primaryBranch
      let primaryBranchId = null;
      if (userData.branches && userData.branches[0] && userData.branches[0] !== 'all') {
        primaryBranchId = branchMap[userData.branches[0]] || null;
      }

      const existing = await User.findOne({ email: userData.email });

      if (existing) {
        // Update to ensure correct role, PIN, active status
        existing.username = userData.username;
        existing.firstName = userData.firstName;
        existing.lastName = userData.lastName;
        existing.password = hashedPassword;
        existing.role = userData.role;
        existing.permanentPin = userData.permanentPin;
        existing.isActive = true;
        existing.isEmailVerified = true;
        if (primaryBranchId) existing.primaryBranch = primaryBranchId;
        if (userData.branches) existing.branches = userData.branches;
        if (userData.isDeveloper) existing.isDeveloper = true;
        await existing.save();
        console.log(`Updated: ${userData.email} (${userData.role})`);
        updated++;
      } else {
        const newUser = new User({
          ...userData,
          password: hashedPassword,
          primaryBranch: primaryBranchId
        });
        await newUser.save();
        console.log(`Created: ${userData.email} (${userData.role})`);
        created++;
      }
    }

    console.log(`\nDone: ${created} created, ${updated} updated`);
    console.log('\nDemo accounts ready:');
    console.log('  florisolivier7@gmail.com              (Owner)     PIN: 123456');
    console.log('  admin@cleva-ai.co.za                  (Admin)     PIN: 123456');
    console.log('  potchefstroom.manager@cleva-ai.co.za  (Manager)   PIN: 123456');
    console.log('  inventory@cleva-ai.co.za              (Inventory) PIN: 123456');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

ensureDemoUsers();
