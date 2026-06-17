/**
 * Origin Staff Setup
 *
 * Creates:
 * - 1 Owner (developer)
 * - 1 HQ Admin
 * - 1 Inventory Manager
 * - 10 Branch Managers (branchname.manager@cleva-ai.co.za)
 * - 10 Branch Assistants (branchname.assistant@cleva-ai.co.za)
 *
 * Run: node backend/scripts/setup-dev-users.js
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';
const DEV_EMAIL = 'owner@cleva-ai.co.za';
const DEV_PASSWORD = 'DevMode123!';
const DEV_PIN = '123456';

// Branch definitions
const branches = [
  { code: 'PG-CLR', name: 'Claremont', slug: 'claremont' },
  { code: 'PG-MWB', name: 'Mowbray', slug: 'mowbray' },
  { code: 'PG-PEI', name: 'Paarden Eiland', slug: 'paardeneiland' },
  { code: 'PG-PKL', name: 'Parklands', slug: 'parklands' },
  { code: 'PG-SND', name: 'Sunningdale', slug: 'sunningdale' },
  { code: 'PG-GDB', name: 'Gordons Bay', slug: 'gordonsbay' },
  { code: 'PG-GNS', name: 'Gansbaai', slug: 'gansbaai' },
  { code: 'PG-GRG', name: 'George', slug: 'george' },
  { code: 'PG-STF', name: 'Stanford', slug: 'stanford' },
  { code: 'PG-ONL', name: 'Origin Online', slug: 'online' },
];

// HQ + system users
const systemUsers = [
  {
    email: DEV_EMAIL,
    username: 'developer',
    firstName: 'Floris',
    lastName: 'Olivier',
    role: 'owner',
    phone: '+27000000000',
    permanentPin: DEV_PIN,
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
    phone: '+27847968457',
    permanentPin: DEV_PIN,
    isActive: true,
    isEmailVerified: true,
    branches: ['all']
  },
  {
    email: 'inventory@cleva-ai.co.za',
    username: 'inventory_manager',
    firstName: 'Origin',
    lastName: 'Inventory',
    role: 'inventory_manager',
    phone: '+27847968459',
    permanentPin: DEV_PIN,
    isActive: true,
    isEmailVerified: true,
    branches: ['all']
  }
];

// Generate branch staff (manager + assistant per branch)
const branchUsers = [];
for (const b of branches) {
  branchUsers.push({
    email: `${b.slug}.manager@cleva-ai.co.za`,
    username: `${b.slug}_manager`,
    firstName: b.name,
    lastName: 'Manager',
    role: 'branch_manager',
    phone: '+27000000000',
    permanentPin: DEV_PIN,
    isActive: true,
    isEmailVerified: true,
    branches: [b.code]
  });
  branchUsers.push({
    email: `${b.slug}.assistant@cleva-ai.co.za`,
    username: `${b.slug}_assistant`,
    firstName: b.name,
    lastName: 'Assistant',
    role: 'branch_assistant',
    phone: '+27000000000',
    permanentPin: DEV_PIN,
    isActive: true,
    isEmailVerified: true,
    branches: [b.code]
  });
}

const allUsers = [...systemUsers, ...branchUsers];

async function setupDevUsers() {
  try {
    console.log('\n========================================');
    console.log('  Origin Staff Setup');
    console.log(`  ${allUsers.length} users (${systemUsers.length} system + ${branchUsers.length} branch staff)`);
    console.log('========================================\n');

    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB:', MONGODB_URI);

    const User = require('../modules/database/models/User');
    const Branch = require('../modules/database/models/Branch');
    const hashedPassword = await bcrypt.hash(DEV_PASSWORD, 10);

    // Build branch code -> ObjectId lookup
    const branchDocs = await Branch.find({}, { _id: 1, branchCode: 1 });
    const branchMap = {};
    for (const b of branchDocs) {
      branchMap[b.branchCode] = b._id;
    }
    console.log(`Found ${branchDocs.length} branches in DB`);

    let created = 0, updated = 0;

    for (const userData of allUsers) {
      // Resolve primaryBranch from branch code
      let primaryBranchId = null;
      if (userData.branches && userData.branches[0] && userData.branches[0] !== 'all') {
        primaryBranchId = branchMap[userData.branches[0]] || null;
      }

      const existingUser = await User.findOne({ $or: [{ email: userData.email }, { username: userData.username }] });

      if (existingUser) {
        existingUser.email = userData.email;
        existingUser.username = userData.username;
        existingUser.firstName = userData.firstName;
        existingUser.lastName = userData.lastName;
        existingUser.password = hashedPassword;
        existingUser.role = userData.role;
        existingUser.isActive = true;
        existingUser.isEmailVerified = true;
        if (primaryBranchId) existingUser.primaryBranch = primaryBranchId;
        if (userData.branches) existingUser.branches = userData.branches;
        if (userData.isDeveloper) existingUser.isDeveloper = true;
        if (userData.permanentPin) existingUser.permanentPin = userData.permanentPin;
        await existingUser.save();
        updated++;
      } else {
        const newUser = new User({
          ...userData,
          password: hashedPassword,
          primaryBranch: primaryBranchId
        });
        await newUser.save();
        created++;
      }
    }

    console.log(`\nCreated: ${created} | Updated: ${updated} | Total: ${allUsers.length}\n`);

    console.log('========================================');
    console.log('  SYSTEM ACCOUNTS');
    console.log('========================================');
    console.log(`  ${DEV_EMAIL} (Owner) PIN: ${DEV_PIN}`);
    console.log(`  admin@cleva-ai.co.za (Admin) PIN: ${DEV_PIN}`);
    console.log(`  inventory@cleva-ai.co.za (Inventory) PIN: ${DEV_PIN}`);

    console.log('\n========================================');
    console.log('  BRANCH STAFF');
    console.log('========================================');
    for (const b of branches) {
      console.log(`  ${b.name} (${b.code}):`);
      console.log(`    ${b.slug}.manager@cleva-ai.co.za`);
      console.log(`    ${b.slug}.assistant@cleva-ai.co.za`);
    }
    console.log(`\n  All PINs: ${DEV_PIN}`);

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
