/**
 * Seed Inventory Management Roles
 * Creates users for each inventory role at JIG Craft Cannabis branches
 * Run: node backend/scripts/seed-inventory-roles.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/database/models/User');
const Branch = require('../modules/database/models/Branch');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

// Inventory role users to seed
const inventoryUsers = [
  {
    email: 'owner@jig.cleva-ai.co.za',
    username: 'jigowner',
    password: 'Owner123!',
    firstName: 'Business',
    lastName: 'Owner',
    role: 'owner',
    staffInfo: {
      department: 'management',
      workSchedule: 'full-time',
      canAccessAllBranches: true
    }
  },
  {
    email: 'inventory@jig.cleva-ai.co.za',
    username: 'invmanager',
    password: 'Inventory123!',
    firstName: 'Inventory',
    lastName: 'Manager',
    role: 'inventory_manager',
    staffInfo: {
      department: 'inventory',
      workSchedule: 'full-time',
      canAccessAllBranches: false
    },
    branchCode: 'ORM' // Assigned to Ormonde HQ
  },
  {
    email: 'packer@jig.cleva-ai.co.za',
    username: 'jigpacker',
    password: 'Packer123!',
    firstName: 'Pack',
    lastName: 'Worker',
    role: 'packer',
    staffInfo: {
      department: 'inventory',
      workSchedule: 'full-time',
      canAccessAllBranches: false
    },
    branchCode: 'ORM' // Assigned to Ormonde HQ
  },
  {
    email: 'dispatch@jig.cleva-ai.co.za',
    username: 'jigdispatch',
    password: 'Dispatch123!',
    firstName: 'Dispatch',
    lastName: 'Manager',
    role: 'dispatch_manager',
    staffInfo: {
      department: 'dispatch',
      workSchedule: 'full-time',
      canAccessAllBranches: false
    },
    branchCode: 'ORM' // Assigned to Ormonde HQ
  },
  {
    email: 'storemanager@jig.cleva-ai.co.za',
    username: 'storemanager',
    password: 'StoreManager123!',
    firstName: 'Store',
    lastName: 'Manager',
    role: 'branch_manager',
    staffInfo: {
      department: 'sales',
      workSchedule: 'full-time',
      canAccessAllBranches: false
    },
    branchCode: 'SPV' // Assigned to Spruitview
  },
  {
    email: 'assistant@jig.cleva-ai.co.za',
    username: 'storeassistant',
    password: 'Assistant123!',
    firstName: 'Store',
    lastName: 'Assistant',
    role: 'branch_assistant',
    staffInfo: {
      department: 'sales',
      workSchedule: 'full-time',
      canAccessAllBranches: false
    },
    branchCode: 'SPV' // Assigned to Spruitview
  }
];

async function seedInventoryRoles() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    console.log('\nSeeding inventory role users...\n');

    let created = 0;
    let updated = 0;

    for (const userData of inventoryUsers) {
      const { branchCode, ...userInfo } = userData;

      // Find branch if specified
      let branch = null;
      if (branchCode) {
        branch = await Branch.findOne({ branchCode });
        if (!branch) {
          console.log(`  Warning: Branch ${branchCode} not found for user ${userData.email}`);
        }
      }

      // Check if user exists
      const existing = await User.findOne({ email: userData.email });

      if (existing) {
        // Update existing user
        existing.role = userInfo.role;
        existing.staffInfo = userInfo.staffInfo;

        if (branch) {
          // Assign to branch if not already assigned
          const alreadyAssigned = existing.assignedBranches?.some(
            ab => ab.branch?.toString() === branch._id.toString()
          );
          if (!alreadyAssigned) {
            await existing.assignToBranch(branch._id, true);
          }
        }

        await existing.save();
        console.log(`  Updated: ${userData.email} (${userData.role})`);
        updated++;
      } else {
        // Create new user
        const newUser = new User({
          ...userInfo,
          isActive: true,
          isEmailVerified: true
        });

        if (branch) {
          newUser.assignedBranches = [{
            branch: branch._id,
            isPrimary: true,
            assignedAt: new Date()
          }];
          newUser.primaryBranch = branch._id;
        }

        await newUser.save();
        console.log(`  Created: ${userData.email} (${userData.role})`);
        created++;
      }
    }

    console.log('\n========================================');
    console.log('Inventory Roles Seeding Complete!');
    console.log('========================================');
    console.log(`  Created: ${created}`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Total:   ${inventoryUsers.length}`);
    console.log('========================================\n');

    // Display all staff users by role
    console.log('Staff Users by Role:');
    console.log('--------------------');

    const roles = ['owner', 'inventory_manager', 'packer', 'dispatch_manager', 'branch_manager', 'branch_assistant'];
    for (const role of roles) {
      const users = await User.find({ role }).populate('primaryBranch', 'name branchCode');
      console.log(`\n${role.toUpperCase()}:`);
      users.forEach(u => {
        const branch = u.primaryBranch ? `[${u.primaryBranch.branchCode}] ${u.primaryBranch.name}` : 'All Branches';
        console.log(`  - ${u.email} | ${branch}`);
      });
    }

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding inventory roles:', error);
    process.exit(1);
  }
}

seedInventoryRoles();
