// Seed Branch-Specific Staff Users
// Each branch gets its own staff with branch-prefixed emails
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

async function seedBranchStaff() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB: dbc\n');

    const User = require('./backend/modules/database/models/User');
    const Branch = require('./backend/modules/database/models/Branch');

    // Get all branches (don't filter by status since it may be undefined)
    const branches = await Branch.find({});
    console.log(`Found ${branches.length} branches\n`);

    if (branches.length === 0) {
      console.log('No branches found. Run branch seeding first.');
      process.exit(1);
    }

    // Update all branches to active status
    for (const branch of branches) {
      if (!branch.status) {
        branch.status = 'active';
        await branch.save();
      }
    }

    const defaultPassword = await bcrypt.hash('Test123!', 10);

    // Staff roles to create per branch
    const staffRoles = [
      { role: 'branch_manager', suffix: 'manager', firstName: 'Store', lastName: 'Manager' },
      { role: 'branch_assistant', suffix: 'assistant', firstName: 'Shop', lastName: 'Assistant' }
    ];

    console.log('Creating branch-specific staff users...\n');
    console.log('═══════════════════════════════════════════════════════════════');

    for (const branch of branches) {
      // Create slug from branch name (e.g., "Ormonde HQ" -> "ormonde")
      const branchSlug = branch.name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/hq$/, '');

      console.log(`\n${branch.name}:`);

      for (const staffDef of staffRoles) {
        const email = `${branchSlug}.${staffDef.suffix}@jig.cleva-ai.co.za`;
        const username = `${branchSlug}_${staffDef.suffix}`;

        // Check if user already exists
        const existing = await User.findOne({ email });
        if (existing) {
          // Update their branch assignment
          existing.primaryBranch = branch._id;
          if (!existing.assignedBranches.some(ab => ab.branch?.toString() === branch._id.toString())) {
            existing.assignedBranches.push({
              branch: branch._id,
              isPrimary: true,
              assignedAt: new Date()
            });
          }
          await existing.save();
          console.log(`  [Updated] ${email} (${staffDef.role})`);
          continue;
        }

        // Create new user
        const newUser = new User({
          email,
          username,
          password: defaultPassword,
          firstName: staffDef.firstName,
          lastName: `${staffDef.lastName} - ${branch.name}`,
          role: staffDef.role,
          status: 'active',
          primaryBranch: branch._id,
          assignedBranches: [{
            branch: branch._id,
            isPrimary: true,
            assignedAt: new Date()
          }]
        });

        await newUser.save();
        console.log(`  [Created] ${email} (${staffDef.role})`);
      }
    }

    // Create/Update Owner and Admin (access to all branches)
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('\nGlobal Admin Users (access to ALL branches):');

    const allBranchIds = branches.map(b => ({
      branch: b._id,
      isPrimary: false,
      assignedAt: new Date()
    }));

    // Set first branch as primary for admin users
    if (allBranchIds.length > 0) {
      allBranchIds[0].isPrimary = true;
    }

    const globalUsers = [
      { email: 'owner@jig.cleva-ai.co.za', username: 'owner', role: 'owner', firstName: 'Business', lastName: 'Owner' },
      { email: 'admin@jig.cleva-ai.co.za', username: 'admin', role: 'admin', firstName: 'System', lastName: 'Admin' }
    ];

    for (const userDef of globalUsers) {
      let user = await User.findOne({ email: userDef.email });
      if (user) {
        user.assignedBranches = allBranchIds;
        user.primaryBranch = branches[0]._id;
        await user.save();
        console.log(`  [Updated] ${userDef.email} - Has access to ALL ${branches.length} branches`);
      } else {
        const newUser = new User({
          ...userDef,
          password: defaultPassword,
          status: 'active',
          primaryBranch: branches[0]._id,
          assignedBranches: allBranchIds
        });
        await newUser.save();
        console.log(`  [Created] ${userDef.email} - Has access to ALL ${branches.length} branches`);
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('STAFF SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('Branch-Specific Staff:');
    for (const branch of branches) {
      const branchSlug = branch.name.toLowerCase().replace(/[^a-z0-9]+/g, '').replace(/hq$/, '');
      console.log(`  ${branch.name}:`);
      console.log(`    Manager:   ${branchSlug}.manager@jig.cleva-ai.co.za`);
      console.log(`    Assistant: ${branchSlug}.assistant@jig.cleva-ai.co.za`);
    }

    console.log('\nGlobal Admin:');
    console.log('  Owner: owner@jig.cleva-ai.co.za (ALL branches)');
    console.log('  Admin: admin@jig.cleva-ai.co.za (ALL branches)');

    console.log('\nAll passwords: Test123!');
    console.log('\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

seedBranchStaff();
