/**
 * Set permanentPin and primaryBranch for all DBC branch staff
 *
 * - Assigns 6-digit numeric PINs to specified users
 * - Maps branch staff emails to their correct primaryBranch
 * - Generic staff emails (manager@, assistant@, etc.) get Ormonde (HQ)
 */

const mongoose = require('mongoose');
const User = require('./backend/modules/database/models/User');
const Branch = require('./backend/modules/database/models/Branch');

const MONGODB_URI = 'mongodb://localhost:27017/jig';

// Branch IDs
const BRANCHES = {
  ormonde:    '698b03204ecf5ff887c128ad',
  ficksburg:  '698b03204ecf5ff887c128c5',
  klerksdorp: '698b03204ecf5ff887c128c8',
  ladybrand:  '698b03204ecf5ff887c128ce',
  mayfair:    '698b03204ecf5ff887c128cb',
  rustenburg: '698b03204ecf5ff887c128d1',
  spruitview: '698b03204ecf5ff887c128d4',
  wonderboom: '698b03204ecf5ff887c128d7'
};

// Branch name lookup for display
const BRANCH_NAMES = {
  [BRANCHES.ormonde]:    'JIG Ormonde',
  [BRANCHES.ficksburg]:  'DBC Ficksburg',
  [BRANCHES.klerksdorp]: 'DBC Klerksdorp',
  [BRANCHES.ladybrand]:  'DBC Ladybrand',
  [BRANCHES.mayfair]:    'DBC Mayfair',
  [BRANCHES.rustenburg]: 'DBC Rustenburg',
  [BRANCHES.spruitview]: 'DBC Spruitview',
  [BRANCHES.wonderboom]: 'DBC Wonderboom'
};

// Generate a random 6-digit PIN
function generatePin() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Users who need PINs assigned
const PIN_USERS = [
  { email: 'admin@dabudchef.co.za',        id: '698b5daf0e49dd1144438cd4' },
  { email: 'assistant@jig.cleva-ai.co.za',     id: '697cfcaa00b2b89f25fe0988' },
  { email: 'dispatch@jig.cleva-ai.co.za',      id: '697cfcaa00b2b89f25fe096b' },
  { email: 'hello@jig.cleva-ai.co.za',         id: '697e4850098b17c2c7ebd469' },
  { email: 'manager@jig.cleva-ai.co.za',       id: '697ecd6ca6a907a0589c535c' },
  { email: 'packer@jig.cleva-ai.co.za',        id: '697cfcaa00b2b89f25fe095c' },
  { email: 'storemanager@jig.cleva-ai.co.za',  id: '697cfcaa00b2b89f25fe097a' }
];

// Determine primaryBranch from email prefix
function getBranchIdForEmail(email) {
  const prefix = email.split('@')[0].split('.')[0].toLowerCase();

  // Branch-specific prefixes
  if (prefix === 'ormonde')    return BRANCHES.ormonde;
  if (prefix === 'ficksburg')  return BRANCHES.ficksburg;
  if (prefix === 'klerksdorp') return BRANCHES.klerksdorp;
  if (prefix === 'ladybrand')  return BRANCHES.ladybrand;
  if (prefix === 'mayfair')    return BRANCHES.mayfair;
  if (prefix === 'rustenburg') return BRANCHES.rustenburg;
  if (prefix === 'spruitview') return BRANCHES.spruitview;
  if (prefix === 'wonderboom') return BRANCHES.wonderboom;

  // Generic accounts -> Ormonde HQ
  return BRANCHES.ormonde;
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB\n');

    // Step 1: Set PINs for the specified users
    console.log('=== Setting permanentPin for specified users ===\n');
    const pinResults = [];

    for (const entry of PIN_USERS) {
      const pin = generatePin();
      const result = await User.findByIdAndUpdate(
        entry.id,
        { $set: { permanentPin: pin } },
        { new: true }
      );

      if (result) {
        pinResults.push({ email: result.email, role: result.role, pin, found: true });
        console.log(`  [OK] ${result.email} (${result.role}) -> PIN: ${pin}`);
      } else {
        pinResults.push({ email: entry.email, role: '?', pin, found: false });
        console.log(`  [MISS] ${entry.email} - user ID ${entry.id} not found`);
      }
    }

    // Step 2: Set primaryBranch for ALL branch staff (managers + assistants)
    console.log('\n=== Setting primaryBranch for branch staff ===\n');

    // Find all users with branch staff roles
    const branchStaff = await User.find({
      role: { $in: ['branch_manager', 'branch_assistant', 'packer', 'dispatch_manager', 'inventory_manager', 'admin'] },
      isActive: true
    }).select('email role primaryBranch permanentPin');

    console.log(`  Found ${branchStaff.length} staff users\n`);

    const branchResults = [];

    for (const user of branchStaff) {
      const branchId = getBranchIdForEmail(user.email);
      const branchName = BRANCH_NAMES[branchId] || 'Unknown';

      await User.findByIdAndUpdate(user._id, {
        $set: { primaryBranch: new mongoose.Types.ObjectId(branchId) }
      });

      branchResults.push({
        email: user.email,
        role: user.role,
        branchName
      });

      console.log(`  [OK] ${user.email} (${user.role}) -> ${branchName}`);
    }

    // Step 3: Verification - query back all updated users
    console.log('\n=== Verification: Querying back all staff ===\n');

    const allStaff = await User.find({
      role: { $in: ['branch_manager', 'branch_assistant', 'packer', 'dispatch_manager', 'inventory_manager', 'admin', 'owner', 'super_admin'] },
      isActive: true
    }).populate('primaryBranch', 'name code').select('email role permanentPin primaryBranch').lean();

    // Print summary table
    console.log('EMAIL'.padEnd(42) + 'ROLE'.padEnd(20) + 'PIN'.padEnd(10) + 'PRIMARY BRANCH');
    console.log('-'.repeat(110));

    for (const u of allStaff) {
      const email = (u.email || '').padEnd(42);
      const role = (u.role || '').padEnd(20);
      const pin = (u.permanentPin || '-').padEnd(10);
      const branch = u.primaryBranch ? (u.primaryBranch.name || u.primaryBranch.toString()) : '-';
      console.log(`${email}${role}${pin}${branch}`);
    }

    console.log('\nDone. Updated ' + pinResults.filter(r => r.found).length + ' PINs and ' + branchResults.length + ' primaryBranch assignments.');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

run();
