/**
 * Seed All DBC Branches
 * Run: node scripts/seed-branches.js
 *
 * Creates all 8 branch locations with Ormonde as the only active one
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Branch = require('../backend/modules/database/models/Branch');

const branches = [
  {
    branchCode: 'ORM-001',
    name: 'Ormonde',
    type: 'retail',
    isActive: true, // ONLY ACTIVE BRANCH
    hasLifestyleTrack: true,
    hasMedicalTrack: true,
    address: {
      street: '123 Main Road',
      suburb: 'Ormonde',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2091',
      country: 'South Africa',
      coordinates: { lat: -26.2419, lng: 27.9483 }
    },
    phone: '+27 11 000 0001',
    email: 'ormonde@jig.cleva-ai.co.za',
    operatingHours: [
      { day: 'Monday', open: '09:00', close: '18:00' },
      { day: 'Tuesday', open: '09:00', close: '18:00' },
      { day: 'Wednesday', open: '09:00', close: '18:00' },
      { day: 'Thursday', open: '09:00', close: '18:00' },
      { day: 'Friday', open: '09:00', close: '18:00' },
      { day: 'Saturday', open: '09:00', close: '14:00' },
      { day: 'Sunday', closed: true }
    ],
    tills: [
      { tillNumber: '1', name: 'Main Till', isActive: true, speedPointProvider: 'manual' }
    ]
  },
  {
    branchCode: 'SPR-001',
    name: 'Spruitview',
    type: 'retail',
    isActive: false,
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    address: {
      suburb: 'Spruitview',
      city: 'Ekurhuleni',
      province: 'Gauteng',
      country: 'South Africa'
    },
    phone: '+27 11 000 0002',
    email: 'spruitview@jig.cleva-ai.co.za'
  },
  {
    branchCode: 'RUS-001',
    name: 'Rustenburg',
    type: 'retail',
    isActive: false,
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    address: {
      city: 'Rustenburg',
      province: 'North West',
      country: 'South Africa'
    },
    phone: '+27 14 000 0001',
    email: 'rustenburg@jig.cleva-ai.co.za'
  },
  {
    branchCode: 'KLK-001',
    name: 'Klerksdorp',
    type: 'retail',
    isActive: false,
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    address: {
      city: 'Klerksdorp',
      province: 'North West',
      country: 'South Africa'
    },
    phone: '+27 18 000 0001',
    email: 'klerksdorp@jig.cleva-ai.co.za'
  },
  {
    branchCode: 'MAY-001',
    name: 'Mayfair',
    type: 'retail',
    isActive: false,
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    address: {
      suburb: 'Mayfair',
      city: 'Johannesburg',
      province: 'Gauteng',
      country: 'South Africa'
    },
    phone: '+27 11 000 0003',
    email: 'mayfair@jig.cleva-ai.co.za'
  },
  {
    branchCode: 'LDY-001',
    name: 'Ladybrand',
    type: 'retail',
    isActive: false,
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    address: {
      city: 'Ladybrand',
      province: 'Free State',
      country: 'South Africa'
    },
    phone: '+27 51 000 0001',
    email: 'ladybrand@jig.cleva-ai.co.za'
  },
  {
    branchCode: 'FIC-001',
    name: 'Ficksburg',
    type: 'retail',
    isActive: false,
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    address: {
      city: 'Ficksburg',
      province: 'Free State',
      country: 'South Africa'
    },
    phone: '+27 51 000 0002',
    email: 'ficksburg@jig.cleva-ai.co.za'
  },
  {
    branchCode: 'WBM-001',
    name: 'Wonderboom',
    type: 'retail',
    isActive: false,
    hasLifestyleTrack: true,
    hasMedicalTrack: false,
    address: {
      suburb: 'Wonderboom',
      city: 'Pretoria',
      province: 'Gauteng',
      country: 'South Africa'
    },
    phone: '+27 12 000 0001',
    email: 'wonderboom@jig.cleva-ai.co.za'
  }
];

async function seedBranches() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
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
