/**
 * Add Potchefstroom cashier account
 * Run on live server: node backend/scripts/add-potch-cashier.js
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';
const EMAIL = 'originbyilcofarming@gmail.com';
const PIN = '480627';
const BRANCH_CODE = 'OR-POT';

(async () => {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;

  // Find Potchefstroom branch
  const branch = await db.collection('branches').findOne({ branchCode: BRANCH_CODE });
  if (!branch) {
    console.error(`!! Branch ${BRANCH_CODE} not found`);
    process.exit(1);
  }
  console.log(`Branch: ${branch.name} (${branch._id})`);

  const now = new Date();
  const assignedBranch = { branch: branch._id, isPrimary: true, assignedAt: now };

  const set = {
    email: EMAIL,
    firstName: 'Potchefstroom',
    lastName: 'Cashier',
    role: 'branch_assistant',
    permanentPin: PIN,
    primaryBranch: branch._id,
    assignedBranches: [assignedBranch],
    'staffInfo.department': 'sales',
    'staffInfo.canAccessAllBranches': false,
    isActive: true,
    isEmailVerified: true,
    updatedAt: now,
  };

  const res = await db.collection('users').updateOne(
    { email: EMAIL },
    { $set: set, $setOnInsert: { createdAt: now } },
    { upsert: true }
  );

  const action = res.upsertedCount ? 'CREATED' : 'UPDATED';
  console.log(`\n${action} cashier:`);
  console.log(`  email: ${EMAIL}`);
  console.log(`  role:  branch_assistant (POS/till)`);
  console.log(`  PIN:   ${PIN}`);
  console.log(`  branch: ${branch.name}`);

  await mongoose.disconnect();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
