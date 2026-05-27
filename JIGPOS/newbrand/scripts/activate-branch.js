/**
 * Activate a Branch
 * Run: node scripts/activate-branch.js <branch-code>
 * Example: node scripts/activate-branch.js SPR-001
 *
 * This script:
 * 1. Activates the branch in the database
 * 2. Allocates initial inventory (copies from Potchefstroom)
 * 3. Outputs the checklist status
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Branch = require('../backend/modules/database/models/Branch');
const BranchInventory = require('../backend/modules/database/models/BranchInventory');
const Product = require('../backend/modules/database/models/Product');

const branchCode = process.argv[2];

if (!branchCode) {
  console.log('Usage: node scripts/activate-branch.js <branch-code>');
  console.log('Example: node scripts/activate-branch.js SPR-001');
  console.log('\nAvailable branch codes:');
  console.log('  ORM-001 - Potchefstroom (HQ)');
  console.log('  SPR-001 - Spruitview');
  console.log('  RUS-001 - Rustenburg');
  console.log('  KLK-001 - Klerksdorp');
  console.log('  MAY-001 - Mayfair');
  console.log('  LDY-001 - Ladybrand');
  console.log('  FIC-001 - Ficksburg');
  console.log('  WBM-001 - Wonderboom');
  process.exit(1);
}

async function activateBranch() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find the branch
    const branch = await Branch.findOne({ branchCode: branchCode.toUpperCase() });
    if (!branch) {
      console.error(`Branch not found: ${branchCode}`);
      console.log('Run "node scripts/seed-branches.js" first to create branches.');
      process.exit(1);
    }

    console.log(`\n========================================`);
    console.log(`ACTIVATING: ${branch.name} (${branch.branchCode})`);
    console.log(`========================================\n`);

    // Step 1: Activate the branch
    if (branch.isActive) {
      console.log('[OK] Branch already active');
    } else {
      branch.isActive = true;
      await branch.save();
      console.log('[DONE] Branch activated');
    }

    // Step 2: Check for existing inventory
    const existingInventory = await BranchInventory.countDocuments({ branchId: branch._id });
    if (existingInventory > 0) {
      console.log(`[OK] Inventory already allocated (${existingInventory} products)`);
    } else {
      // Allocate initial inventory from all active products
      console.log('[...] Allocating initial inventory...');

      const products = await Product.find({ status: 'active' });
      let allocated = 0;

      for (const product of products) {
        const inventory = new BranchInventory({
          branchId: branch._id,
          productId: product._id,
          quantity: 0, // Start with 0 - stock needs to be physically received
          lowStockThreshold: 10,
          reorderPoint: 20,
          reorderQuantity: 50,
          isActive: true,
          isAvailableForSale: true
        });

        try {
          await inventory.save();
          allocated++;
        } catch (err) {
          // Skip duplicates
          if (err.code !== 11000) {
            console.error(`Error allocating ${product.name}:`, err.message);
          }
        }
      }

      console.log(`[DONE] Allocated ${allocated} products to branch inventory`);
      console.log('[NOTE] Stock quantities are 0 - update after physical stock receipt');
    }

    // Step 3: Check for staff
    const User = require('../backend/modules/database/models/User');
    const staffCount = await User.countDocuments({
      $or: [
        { 'assignedBranches.branch': branch._id },
        { primaryBranch: branch._id }
      ]
    });

    if (staffCount > 0) {
      console.log(`[OK] ${staffCount} staff member(s) assigned`);
    } else {
      console.log('[PENDING] No staff assigned - create staff accounts');
    }

    // Summary
    console.log(`\n========================================`);
    console.log(`ACTIVATION SUMMARY: ${branch.name}`);
    console.log(`========================================`);
    console.log(`Branch Code: ${branch.branchCode}`);
    console.log(`Status: ${branch.isActive ? 'ACTIVE' : 'INACTIVE'}`);
    console.log(`City: ${branch.address.city}`);
    console.log(`Phone: ${branch.phone}`);
    console.log(`Email: ${branch.email}`);
    console.log(`Lifestyle Track: ${branch.hasLifestyleTrack ? 'Yes' : 'No'}`);
    console.log(`Medical Track: ${branch.hasMedicalTrack ? 'Yes' : 'No'}`);
    console.log(`Tills: ${branch.tills.length}`);
    console.log(`Staff: ${staffCount}`);
    console.log(`Inventory Items: ${await BranchInventory.countDocuments({ branchId: branch._id })}`);

    console.log(`\n========================================`);
    console.log(`NEXT STEPS:`);
    console.log(`========================================`);
    console.log(`1. Create staff accounts for this branch`);
    console.log(`   POST /api/v1/branches/${branch._id}/staff`);
    console.log(`2. Update inventory quantities after stock receipt`);
    console.log(`   PUT /api/v1/branches/${branch._id}/inventory`);
    console.log(`3. Update landing page (${branch.name.toLowerCase()}.html)`);
    console.log(`   Change from "Coming Soon" to active store`);
    console.log(`4. Configure tablet with POS URL:`);
    console.log(`   https://jig.cleva-ai.co.za/pos.html?branch=${branch.branchCode}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error activating branch:', error);
    process.exit(1);
  }
}

activateBranch();
