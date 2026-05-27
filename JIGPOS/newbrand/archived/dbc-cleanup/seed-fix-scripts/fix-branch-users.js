#!/usr/bin/env node
/**
 * Fix Branch Users — Re-point staff to new DBC- branches
 * and ensure each branch has a branch_manager + staff_assistant
 *
 * Usage:
 *   node fix-branch-users.js              — Run for real
 *   node fix-branch-users.js --dry-run    — Preview only
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./backend/modules/database/models/User');
const Branch = require('./backend/modules/database/models/Branch');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
const DRY_RUN = process.argv.includes('--dry-run');

// Map: old branchCode → new branchCode
const branchMapping = {
  'ORM': 'DBC-ORM',
  'FKS': 'DBC-FBG',
  'KLD': 'DBC-KDP',
  'MYF': 'DBC-MYF',
  'LDB': 'DBC-LDB',
  'RST': 'DBC-RSB',
  'SPV': 'DBC-SPV',
  'WDB': 'DBC-WBM',
};

// What each new branch needs (following Ormonde pattern)
const branchStaff = {
  'DBC-ORM': { manager: 'ormonde.manager@jig.cleva-ai.co.za',   assistant: 'ormonde.assistant@jig.cleva-ai.co.za' },
  'DBC-FBG': { manager: 'ficksburg.manager@jig.cleva-ai.co.za', assistant: 'ficksburg.assistant@jig.cleva-ai.co.za' },
  'DBC-KDP': { manager: 'klerksdorp.manager@jig.cleva-ai.co.za',assistant: 'klerksdorp.assistant@jig.cleva-ai.co.za' },
  'DBC-MYF': { manager: 'mayfair.manager@jig.cleva-ai.co.za',   assistant: 'mayfair.assistant@jig.cleva-ai.co.za' },
  'DBC-LDB': { manager: 'ladybrand.manager@jig.cleva-ai.co.za', assistant: 'ladybrand.assistant@jig.cleva-ai.co.za' },
  'DBC-RSB': { manager: 'rustenburg.manager@jig.cleva-ai.co.za',assistant: 'rustenburg.assistant@jig.cleva-ai.co.za' },
  'DBC-SPV': { manager: 'spruitview.manager@jig.cleva-ai.co.za',assistant: 'spruitview.assistant@jig.cleva-ai.co.za' },
  'DBC-WBM': { manager: 'wonderboom.manager@jig.cleva-ai.co.za',assistant: 'wonderboom.assistant@jig.cleva-ai.co.za' },
};

async function run() {
  console.log('='.repeat(70));
  console.log('  Fix Branch Users — Re-point to DBC- branches');
  if (DRY_RUN) console.log('  *** DRY RUN — no database writes ***');
  console.log('='.repeat(70));
  console.log();

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}\n`);

  // Load all branches
  const allBranches = await Branch.find({});
  const branchByCode = {};
  for (const b of allBranches) {
    branchByCode[b.branchCode] = b;
  }

  // STEP 1: Re-point existing users from old branches to new DBC- branches
  console.log('STEP 1: Re-point existing users to new DBC- branches\n');

  for (const [oldCode, newCode] of Object.entries(branchMapping)) {
    const oldBranch = branchByCode[oldCode];
    const newBranch = branchByCode[newCode];
    if (!oldBranch || !newBranch) {
      console.log(`  SKIP ${oldCode} → ${newCode} (branch not found)`);
      continue;
    }

    const usersOnOld = await User.find({ primaryBranch: oldBranch._id });
    if (usersOnOld.length === 0) {
      console.log(`  ${oldCode} → ${newCode}: no users to move`);
      continue;
    }

    for (const u of usersOnOld) {
      // Fix invalid roles during move
      let newRole = u.role;
      if (u.role === 'staff_manager') newRole = 'branch_manager';
      if (u.role === 'staff_assistant') newRole = 'branch_assistant';

      if (DRY_RUN) {
        const roleNote = newRole !== u.role ? ` (role fix: ${u.role}→${newRole})` : '';
        console.log(`  MOVE ${u.email} (${u.role}) from ${oldCode} → ${newCode}${roleNote}`);
      } else {
        u.primaryBranch = newBranch._id;
        u.role = newRole;
        await u.save();
        const roleNote = newRole !== u.role ? ` (role fixed)` : '';
        console.log(`  MOVED ${u.email} (${newRole}) from ${oldCode} → ${newCode}${roleNote}`);
      }
    }
  }

  // STEP 2: Ensure each DBC- branch has a branch_manager + staff_assistant
  console.log('\nSTEP 2: Verify branch_manager + staff_assistant per branch\n');

  for (const [code, staff] of Object.entries(branchStaff)) {
    const branch = branchByCode[code];
    if (!branch) {
      console.log(`  SKIP ${code} — branch not found`);
      continue;
    }

    // Check manager
    const mgr = await User.findOne({ email: staff.manager });
    if (mgr) {
      // Ensure role is branch_manager and primaryBranch is correct
      const needsUpdate = mgr.role !== 'branch_manager' || String(mgr.primaryBranch) !== String(branch._id);
      if (needsUpdate) {
        if (DRY_RUN) {
          console.log(`  FIX ${staff.manager}: role=${mgr.role}→branch_manager, branch→${code}`);
        } else {
          mgr.role = 'branch_manager';
          mgr.primaryBranch = branch._id;
          await mgr.save();
          console.log(`  FIXED ${staff.manager}: role=branch_manager, branch=${code}`);
        }
      } else {
        console.log(`  OK ${staff.manager} — branch_manager @ ${code}`);
      }
    } else {
      console.log(`  MISSING ${staff.manager} — needs to be created`);
    }

    // Check assistant
    const asst = await User.findOne({ email: staff.assistant });
    if (asst) {
      const needsUpdate = asst.role !== 'branch_assistant' || String(asst.primaryBranch) !== String(branch._id);
      if (needsUpdate) {
        if (DRY_RUN) {
          console.log(`  FIX ${staff.assistant}: role=${asst.role}→branch_assistant, branch→${code}`);
        } else {
          asst.role = 'branch_assistant';
          asst.primaryBranch = branch._id;
          await asst.save();
          console.log(`  FIXED ${staff.assistant}: role=branch_assistant, branch=${code}`);
        }
      } else {
        console.log(`  OK ${staff.assistant} — branch_assistant @ ${code}`);
      }
    } else {
      console.log(`  MISSING ${staff.assistant} — needs to be created`);
    }
  }

  // Also move the global staff (owner, admin, etc.) that were on old ORM to new DBC-ORM
  console.log('\nSTEP 3: Summary\n');
  for (const [code, _] of Object.entries(branchStaff)) {
    const branch = branchByCode[code];
    if (!branch) continue;
    const count = await User.countDocuments({ primaryBranch: branch._id });
    console.log(`  ${code} ${branch.name}: ${count} users`);
  }

  console.log();
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
