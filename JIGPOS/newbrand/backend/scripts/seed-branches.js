/**
 * Seed JIG Craft Cannabis Branches
 * Run: node backend/scripts/seed-branches.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../modules/database/models/Branch');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

// JIG Craft Cannabis Collection Points
const branches = [
  {
    branchCode: 'ORM',
    name: 'Ormonde HQ',
    type: 'warehouse',
    address: {
      street: '123 Main Road',
      suburb: 'Ormonde',
      city: 'Johannesburg South',
      province: 'Gauteng',
      postalCode: '2091',
      country: 'South Africa'
    },
    phone: '+27 11 123 4567',
    email: 'ormonde@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '17:00' },
      { day: 'Tuesday', open: '09:00', close: '17:00' },
      { day: 'Wednesday', open: '09:00', close: '17:00' },
      { day: 'Thursday', open: '09:00', close: '17:00' },
      { day: 'Friday', open: '09:00', close: '17:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' },
      { tillNumber: '2', name: 'Till 2', isActive: true, speedPointProvider: 'manual' }
    ],
    hasLifestyleTrack: true,
    hasMedicalTrack: true,
    isActive: true,
    isFranchise: false
  },
  {
    branchCode: 'SPV',
    name: 'Spruitview',
    type: 'retail',
    address: {
      street: '45 Spruitview Avenue',
      suburb: 'Spruitview',
      city: 'Ekurhuleni',
      province: 'Gauteng',
      postalCode: '1570',
      country: 'South Africa'
    },
    phone: '+27 11 234 5678',
    email: 'spruitview@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '17:00' },
      { day: 'Tuesday', open: '09:00', close: '17:00' },
      { day: 'Wednesday', open: '09:00', close: '17:00' },
      { day: 'Thursday', open: '09:00', close: '17:00' },
      { day: 'Friday', open: '09:00', close: '17:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
    ],
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    isActive: true,
    isFranchise: false
  },
  {
    branchCode: 'RST',
    name: 'Rustenburg',
    type: 'retail',
    address: {
      street: '78 Heystek Street',
      suburb: 'Rustenburg Central',
      city: 'Rustenburg',
      province: 'North West',
      postalCode: '0299',
      country: 'South Africa'
    },
    phone: '+27 14 345 6789',
    email: 'rustenburg@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '17:00' },
      { day: 'Tuesday', open: '09:00', close: '17:00' },
      { day: 'Wednesday', open: '09:00', close: '17:00' },
      { day: 'Thursday', open: '09:00', close: '17:00' },
      { day: 'Friday', open: '09:00', close: '17:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
    ],
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    isActive: true,
    isFranchise: false
  },
  {
    branchCode: 'KLD',
    name: 'Klerksdorp',
    type: 'retail',
    address: {
      street: '23 Central Avenue',
      suburb: 'Klerksdorp Central',
      city: 'Klerksdorp',
      province: 'North West',
      postalCode: '2570',
      country: 'South Africa'
    },
    phone: '+27 18 456 7890',
    email: 'klerksdorp@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '17:00' },
      { day: 'Tuesday', open: '09:00', close: '17:00' },
      { day: 'Wednesday', open: '09:00', close: '17:00' },
      { day: 'Thursday', open: '09:00', close: '17:00' },
      { day: 'Friday', open: '09:00', close: '17:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
    ],
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    isActive: true,
    isFranchise: false
  },
  {
    branchCode: 'MYF',
    name: 'Mayfair',
    type: 'retail',
    address: {
      street: '156 Central Road',
      suburb: 'Mayfair',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2092',
      country: 'South Africa'
    },
    phone: '+27 11 567 8901',
    email: 'mayfair@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '17:00' },
      { day: 'Tuesday', open: '09:00', close: '17:00' },
      { day: 'Wednesday', open: '09:00', close: '17:00' },
      { day: 'Thursday', open: '09:00', close: '17:00' },
      { day: 'Friday', open: '09:00', close: '17:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
    ],
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    isActive: true,
    isFranchise: false
  },
  {
    branchCode: 'LDB',
    name: 'Ladybrand',
    type: 'retail',
    address: {
      street: '34 Church Street',
      suburb: 'Ladybrand Central',
      city: 'Ladybrand',
      province: 'Free State',
      postalCode: '9745',
      country: 'South Africa'
    },
    phone: '+27 51 678 9012',
    email: 'ladybrand@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '17:00' },
      { day: 'Tuesday', open: '09:00', close: '17:00' },
      { day: 'Wednesday', open: '09:00', close: '17:00' },
      { day: 'Thursday', open: '09:00', close: '17:00' },
      { day: 'Friday', open: '09:00', close: '17:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
    ],
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    isActive: true,
    isFranchise: false
  },
  {
    branchCode: 'FKS',
    name: 'Ficksburg',
    type: 'retail',
    address: {
      street: '12 Voortrekker Street',
      suburb: 'Ficksburg Central',
      city: 'Ficksburg',
      province: 'Free State',
      postalCode: '9730',
      country: 'South Africa'
    },
    phone: '+27 51 789 0123',
    email: 'ficksburg@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '17:00' },
      { day: 'Tuesday', open: '09:00', close: '17:00' },
      { day: 'Wednesday', open: '09:00', close: '17:00' },
      { day: 'Thursday', open: '09:00', close: '17:00' },
      { day: 'Friday', open: '09:00', close: '17:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
    ],
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    isActive: true,
    isFranchise: false
  },
  {
    branchCode: 'WDB',
    name: 'Wonderboom',
    type: 'retail',
    address: {
      street: '89 Lavender Road',
      suburb: 'Wonderboom',
      city: 'Pretoria',
      province: 'Gauteng',
      postalCode: '0182',
      country: 'South Africa'
    },
    phone: '+27 12 890 1234',
    email: 'wonderboom@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '17:00' },
      { day: 'Tuesday', open: '09:00', close: '17:00' },
      { day: 'Wednesday', open: '09:00', close: '17:00' },
      { day: 'Thursday', open: '09:00', close: '17:00' },
      { day: 'Friday', open: '09:00', close: '17:00' },
      { day: 'Saturday', open: '09:00', close: '17:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
    ],
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    isActive: true,
    isFranchise: false
  }
];

async function seedBranches() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\nSeeding JIG Craft Cannabis branches...\n');

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const branchData of branches) {
      const existing = await Branch.findOne({ branchCode: branchData.branchCode });

      if (existing) {
        // Update existing branch
        await Branch.updateOne(
          { branchCode: branchData.branchCode },
          { $set: branchData }
        );
        console.log(`  Updated: ${branchData.name} (${branchData.branchCode})`);
        updated++;
      } else {
        // Create new branch
        await Branch.create(branchData);
        console.log(`  Created: ${branchData.name} (${branchData.branchCode})`);
        created++;
      }
    }

    console.log('\n========================================');
    console.log('JIG Craft Cannabis Branch Seeding Complete!');
    console.log('========================================');
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total:   ${branches.length}`);
    console.log('========================================\n');

    // List all branches
    const allBranches = await Branch.find({}).sort({ branchCode: 1 });
    console.log('All Branches in Database:');
    console.log('-------------------------');
    allBranches.forEach(b => {
      const status = b.isActive ? 'Active' : 'Inactive';
      console.log(`  [${b.branchCode}] ${b.name} - ${b.address.city}, ${b.address.province} (${status})`);
    });

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding branches:', error);
    process.exit(1);
  }
}

seedBranches();
