/**
 * Seed Origin branches — Ormonde + Potchefstroom + Online
 * Run: node backend/scripts/seed-branches.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

const Branch = require('../modules/database/models/Branch');

function makeHours(mon, tue, wed, thu, fri, sat, sun) {
  const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const times = [mon, tue, wed, thu, fri, sat, sun];
  return days.map((day, i) => {
    if (!times[i] || times[i] === 'Closed') return { day, open: '', close: '', closed: true };
    const [open, close] = times[i].split('-');
    return { day, open, close, closed: false };
  });
}

const branches = [
  {
    name: 'Origin Online',
    branchCode: 'OR-ONL',
    type: 'retail',
    address: { street: 'Online Store', suburb: 'Online', city: 'Johannesburg', province: 'Gauteng', postalCode: '2001' },
    phone: '+27 84 796 8457',
    email: 'origin@cleva-ai.co.za',
    operatingHours: makeHours('00:00-23:59','00:00-23:59','00:00-23:59','00:00-23:59','00:00-23:59','00:00-23:59','00:00-23:59'),
    isActive: true
  },
  {
    name: 'Potchefstroom',
    branchCode: 'OR-POT',
    type: 'retail',
    address: { street: 'Potchefstroom', suburb: 'Potchefstroom', city: 'Potchefstroom', province: 'North West', postalCode: '2531' },
    phone: '+27 84 796 8457',
    email: 'potchefstroom@cleva-ai.co.za',
    operatingHours: makeHours('09:00-19:00','09:00-19:00','09:00-19:00','09:00-19:00','09:00-19:00','09:00-17:00','Closed'),
    isActive: true
  }
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected to MongoDB\n`);

  // Clear all old branches
  const deleted = await Branch.deleteMany({});
  if (deleted.deletedCount > 0) {
    console.log(`Removed ${deleted.deletedCount} old branches\n`);
  }

  console.log('Seeding Origin branches...\n');

  let created = 0;

  for (const b of branches) {
    await Branch.create(b);
    console.log(`  Created: ${b.name} (${b.branchCode})`);
    created++;
  }

  console.log(`\n========================================`);
  console.log(`Origin Branch Seeding Complete!`);
  console.log(`========================================`);
  console.log(`  Created: ${created}`);
  console.log(`  Total:   ${branches.length}`);
  console.log(`========================================\n`);

  const all = await Branch.find({}).sort({ name: 1 });
  console.log('All Branches in Database:');
  console.log('-------------------------');
  all.forEach(b => {
    console.log(`  [${b.branchCode}] ${b.name} - ${b.address?.city || ''}, ${b.address?.province || ''} (${b.isActive ? 'Active' : 'Inactive'})`);
  });

  await mongoose.disconnect();
  console.log('\nDisconnected from MongoDB');
}

seed().catch(err => { console.error('Seed error:', err); process.exit(1); });
