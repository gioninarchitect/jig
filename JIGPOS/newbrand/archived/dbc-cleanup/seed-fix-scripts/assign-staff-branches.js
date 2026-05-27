// Assign Branch IDs to Staff Users - CORRECTLY
// Each staff member gets assigned to their OWN branch based on email prefix
// e.g., spruitview.manager@jig.cleva-ai.co.za → Spruitview branch

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

async function assignBranches() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB: dbc\n');

    const User = require('./backend/modules/database/models/User');
    const Branch = require('./backend/modules/database/models/Branch');

    // Get all branches
    const allBranches = await Branch.find({});
    console.log('Available branches:');
    allBranches.forEach(b => console.log(`  - ${b.name} (${b._id})`));
    console.log('');

    if (allBranches.length === 0) {
      throw new Error('No branches found in database. Run branch seeding first.');
    }

    // Create a lookup map for branch names (lowercase for matching)
    const branchMap = {};
    allBranches.forEach(branch => {
      // Store by lowercase name for easy matching
      const key = branch.name.toLowerCase().replace(/\s+/g, '');
      branchMap[key] = branch;

      // Also store common variations
      if (branch.name.toLowerCase().includes('ormonde')) {
        branchMap['ormonde'] = branch;
        branchMap['ormondehq'] = branch;
      }
    });

    // Staff roles that need branch assignment
    const staffRoles = ['branch_manager', 'branch_assistant', 'inventory_manager', 'dispatch_manager', 'packer'];

    // Find all staff users
    const staffUsers = await User.find({
      role: { $in: staffRoles }
    });

    console.log(`Found ${staffUsers.length} staff users\n`);

    let assigned = 0;
    let skipped = 0;

    for (const user of staffUsers) {
      // Extract branch name from email prefix
      // e.g., "spruitview.manager@jig.cleva-ai.co.za" → "spruitview"
      // e.g., "ormonde.assistant@jig.cleva-ai.co.za" → "ormonde"
      const emailPrefix = user.email.split('@')[0]; // "spruitview.manager"
      const branchPrefix = emailPrefix.split('.')[0].toLowerCase(); // "spruitview"

      // Find matching branch
      let targetBranch = branchMap[branchPrefix];

      // Special handling for global roles (no branch prefix in email)
      if (!targetBranch) {
        // Check if email doesn't follow branch.role pattern
        if (!emailPrefix.includes('.')) {
          // This is a global user like "admin@" or "inventory@"
          // Assign to Ormonde HQ
          targetBranch = branchMap['ormonde'] || allBranches[0];
          console.log(`  ${user.email} (global role) → ${targetBranch.name} (HQ)`);
        } else {
          console.log(`  WARNING: No branch found for "${branchPrefix}" (${user.email})`);
          skipped++;
          continue;
        }
      }

      // Assign the branch
      user.primaryBranch = targetBranch._id;

      // Update assignedBranches array
      const alreadyAssigned = user.assignedBranches.some(
        ab => ab.branch && ab.branch.toString() === targetBranch._id.toString()
      );

      if (!alreadyAssigned) {
        user.assignedBranches.push({
          branch: targetBranch._id,
          isPrimary: true,
          assignedAt: new Date()
        });
      }

      await user.save();
      console.log(`  ${user.email} → ${targetBranch.name}`);
      assigned++;
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log(`BRANCH ASSIGNMENT COMPLETE`);
    console.log(`  Assigned: ${assigned}`);
    console.log(`  Skipped: ${skipped}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    // Verification report
    console.log('VERIFICATION - Staff by Branch:');
    console.log('─────────────────────────────────────────────────────────────────');

    for (const branch of allBranches) {
      const branchStaff = await User.find({
        role: { $in: staffRoles },
        primaryBranch: branch._id
      }).select('email role');

      if (branchStaff.length > 0) {
        console.log(`\n${branch.name}:`);
        branchStaff.forEach(u => {
          console.log(`  - ${u.email} (${u.role})`);
        });
      }
    }

    console.log('\nPOS will now work correctly - each staff sees their own branch stock.\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

assignBranches();
