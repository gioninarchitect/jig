/**
 * Seed Origin Branches — Online + Potchefstroom
 * Run: node scripts/seed-branches.js
 *
 * Creates Origin by ILCO Farming branches (North West)
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Branch = require('../backend/modules/database/models/Branch');

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
  // ── Online Store ──
  {
    branchCode: 'OR-ONL',
    name: 'Origin Online',
    type: 'retail',
    isActive: true,
    hasLifestyleTrack: true,
    hasMedicalTrack: true,
    address: {
      street: 'Online Store',
      suburb: 'Online',
      city: 'Potchefstroom',
      province: 'North West',
      postalCode: '2531',
      country: 'South Africa',
    },
    phone: '+27 84 796 8457',
    email: 'origin@cleva-ai.co.za',
    operatingHours: makeHours('00:00-23:59','00:00-23:59','00:00-23:59','00:00-23:59','00:00-23:59','00:00-23:59','00:00-23:59'),
  },

  // ── Potchefstroom ──
  {
    branchCode: 'OR-POT',
    name: 'Potchefstroom',
    type: 'retail',
    isActive: true,
    isHeadquarters: true,
    hasLifestyleTrack: true,
    hasMedicalTrack: true,
    address: {
      street: 'Potchefstroom',
      suburb: 'Potchefstroom',
      city: 'Potchefstroom',
      province: 'North West',
      postalCode: '2531',
      country: 'South Africa',
    },
    phone: '+27 84 796 8457',
    email: 'potchefstroom@cleva-ai.co.za',
    operatingHours: makeHours('09:00-19:00','09:00-19:00','09:00-19:00','09:00-19:00','09:00-19:00','09:00-17:00','Closed'),
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' },
      { tillNumber: '2', name: 'Till 2', isActive: true, speedPointProvider: 'manual' }
    ]
  },
];

async function seedBranches() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB:', mongoUri);

    // Seed each branch
    for (const branchData of branches) {
      const existing = await Branch.findOne({ branchCode: branchData.branchCode });

      if (existing) {
        // Update existing branch
        await Branch.findByIdAndUpdate(existing._id, branchData);
        console.log(`Updated: ${branchData.name} (${branchData.branchCode}) - Active: ${branchData.isActive}`);
      } else {
        // Create new branch
        const branch = new Branch({
          ...branchData,
          operatingHours: branchData.operatingHours || [
            { day: 'Monday', open: '09:00', close: '17:00' },
            { day: 'Tuesday', open: '09:00', close: '17:00' },
            { day: 'Wednesday', open: '09:00', close: '17:00' },
            { day: 'Thursday', open: '09:00', close: '17:00' },
            { day: 'Friday', open: '09:00', close: '17:00' },
            { day: 'Saturday', open: '09:00', close: '14:00' },
            { day: 'Sunday', closed: true }
          ],
          tills: branchData.tills || [
            { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
          ]
        });
        await branch.save();
        console.log(`Created: ${branchData.name} (${branchData.branchCode}) - Active: ${branchData.isActive}`);
      }
    }

    // Summary
    const allBranches = await Branch.find();
    const activeBranches = await Branch.find({ isActive: true });

    console.log('\n========================================');
    console.log('BRANCH SEEDING COMPLETE');
    console.log('========================================');
    console.log(`Total Branches: ${allBranches.length}`);
    console.log(`Active Branches: ${activeBranches.length}`);
    console.log(`Inactive (Coming Soon): ${allBranches.length - activeBranches.length}`);
    console.log('========================================');

    allBranches.forEach(b => {
      const status = b.isActive ? '[ACTIVE]' : '[COMING SOON]';
      console.log(`${status} ${b.name} - ${b.branchCode}`);
    });

    await mongoose.disconnect();
    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding branches:', error);
    process.exit(1);
  }
}

seedBranches();
