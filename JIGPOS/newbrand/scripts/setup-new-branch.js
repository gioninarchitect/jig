/**
 * MASTER BRANCH SETUP SCRIPT
 * Run: node scripts/setup-new-branch.js <branch-code> <manager-phone> <manager-first> <manager-last>
 * Example: node scripts/setup-new-branch.js SPR-001 0831234567 John Smith
 *
 * This ONE script does EVERYTHING:
 * 1. Activates the branch
 * 2. Creates the branch manager account
 * 3. Allocates initial inventory (50 units of each product)
 * 4. Outputs the setup summary
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const args = process.argv.slice(2);
const branchCode = args[0];
const managerPhone = args[1];
const managerFirst = args[2];
const managerLast = args[3];

if (!branchCode) {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Origin - BRANCH SETUP WIZARD                  ║
╚══════════════════════════════════════════════════════════════╝

Usage: node scripts/setup-new-branch.js <branch-code> <manager-phone> <manager-first> <manager-last>

Example: node scripts/setup-new-branch.js SPR-001 0831234567 John Smith

Available Branch Codes:
  ORM-001   Potchefstroom (HQ)
  SPR-001   Spruitview
  RUS-001   Rustenburg
  KLK-001   Klerksdorp
  MAY-001   Mayfair
  LDY-001   Ladybrand
  FIC-001   Ficksburg
  WBM-001   Wonderboom

This script will:
  1. Activate the branch in the database
  2. Create a manager account (if provided)
  3. Allocate 50 units of each product
  4. Generate setup summary

`);
  process.exit(1);
}

async function setupBranch() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';
    await mongoose.connect(mongoUri);

    const Branch = require('../backend/modules/database/models/Branch');
    const BranchInventory = require('../backend/modules/database/models/BranchInventory');
    const Product = require('../backend/modules/database/models/Product');
    const User = require('../backend/modules/database/models/User');

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           Origin - BRANCH SETUP                         ║
╚══════════════════════════════════════════════════════════════╝
`);

    // Step 1: Find and activate branch
    console.log('Step 1: Finding branch...');
    const branch = await Branch.findOne({ branchCode: branchCode.toUpperCase() });

    if (!branch) {
      console.error(`\n[ERROR] Branch not found: ${branchCode}`);
      console.log('Run "node scripts/seed-branches.js" first to create all branches.');
      process.exit(1);
    }

    if (!branch.isActive) {
      branch.isActive = true;
      await branch.save();
      console.log(`[OK] Branch activated: ${branch.name}`);
    } else {
      console.log(`[OK] Branch already active: ${branch.name}`);
    }

    // Step 2: Create manager account (if details provided)
    let manager = null;
    let tempPassword = null;

    if (managerPhone && managerFirst && managerLast) {
      console.log('\nStep 2: Setting up branch manager...');

      const normalizedPhone = managerPhone.replace(/\D/g, '');
      const formattedPhone = normalizedPhone.startsWith('27') ? normalizedPhone : `27${normalizedPhone.replace(/^0/, '')}`;

      manager = await User.findOne({
        $or: [
          { phone: formattedPhone },
          { phone: managerPhone }
        ]
      });

      if (manager) {
        console.log(`[OK] Manager exists: ${manager.firstName} ${manager.lastName}`);

        // Assign to branch if not already
        const alreadyAssigned = manager.assignedBranches?.some(
          ab => ab.branch?.toString() === branch._id.toString()
        );

        if (!alreadyAssigned) {
          manager.assignedBranches = manager.assignedBranches || [];
          manager.assignedBranches.push({
            branch: branch._id,
            isPrimary: true,
            assignedAt: new Date()
          });
          manager.primaryBranch = branch._id;
          await manager.save();
          console.log(`[OK] Manager assigned to ${branch.name}`);
        }
      } else {
        // Create new manager
        const email = `${managerFirst.toLowerCase()}.${managerLast.toLowerCase()}@jig.cleva-ai.co.za`;
        const username = `${managerFirst.toLowerCase()}${managerLast.toLowerCase()}${Date.now().toString().slice(-4)}`;
        tempPassword = `Origin${Date.now().toString().slice(-6)}!`;
        const hashedPassword = await bcrypt.hash(tempPassword, 10);

        manager = new User({
          email,
          username,
          password: hashedPassword,
          firstName: managerFirst,
          lastName: managerLast,
          phone: formattedPhone,
          role: 'branch_manager',
          isActive: true,
          primaryBranch: branch._id,
          assignedBranches: [{
            branch: branch._id,
            isPrimary: true,
            assignedAt: new Date()
          }],
          staffInfo: {
            hireDate: new Date(),
            department: 'management',
            workSchedule: 'full-time'
          }
        });

        await manager.save();
        console.log(`[OK] Manager created: ${managerFirst} ${managerLast}`);
      }

      // Set manager on branch
      branch.manager = manager._id;
      await branch.save();
    } else {
      console.log('\nStep 2: No manager details provided, skipping...');
    }

    // Step 3: Allocate inventory
    console.log('\nStep 3: Allocating inventory...');

    const products = await Product.find({ status: 'active' });
    let created = 0;
    let updated = 0;
    const INITIAL_QUANTITY = 50;

    for (const product of products) {
      let inventory = await BranchInventory.findOne({
        branchId: branch._id,
        productId: product._id
      });

      if (inventory) {
        if (inventory.quantity === 0) {
          inventory.quantity = INITIAL_QUANTITY;
          inventory.lastRestocked = new Date();
          inventory.lastRestockQuantity = INITIAL_QUANTITY;
          await inventory.save();
          updated++;
        }
      } else {
        inventory = new BranchInventory({
          branchId: branch._id,
          productId: product._id,
          quantity: INITIAL_QUANTITY,
          lowStockThreshold: 10,
          reorderPoint: 20,
          reorderQuantity: 50,
          isActive: true,
          isAvailableForSale: true,
          lastRestocked: new Date(),
          lastRestockQuantity: INITIAL_QUANTITY
        });
        await inventory.save();
        created++;
      }
    }

    console.log(`[OK] Inventory: ${created} new, ${updated} updated`);

    // Summary
    const inventoryValue = await BranchInventory.getBranchInventoryValue(branch._id);
    const staffCount = await User.countDocuments({
      $or: [
        { 'assignedBranches.branch': branch._id },
        { primaryBranch: branch._id }
      ]
    });

    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    SETUP COMPLETE                            ║
╚══════════════════════════════════════════════════════════════╝

Branch Information:
  Name:           ${branch.name}
  Code:           ${branch.branchCode}
  Status:         ${branch.isActive ? 'ACTIVE' : 'INACTIVE'}
  City:           ${branch.address.city}
  Phone:          ${branch.phone}

${manager ? `
Manager Account:
  Name:           ${manager.firstName} ${manager.lastName}
  Phone:          ${manager.phone}
  Email:          ${manager.email}
  Role:           ${manager.role}
${tempPassword ? `
  --- TEMPORARY LOGIN ---
  Phone:          ${manager.phone}
  Password:       ${tempPassword}
  [!] Change password on first login or use OTP
` : ''}` : 'Manager:         Not configured'}

Inventory:
  Products:       ${await BranchInventory.countDocuments({ branchId: branch._id })}
  Total Units:    ${inventoryValue.totalUnits}
  Cost Value:     R${inventoryValue.costValue.toLocaleString()}
  Retail Value:   R${inventoryValue.retailValue.toLocaleString()}

Staff:
  Total:          ${staffCount}

╔══════════════════════════════════════════════════════════════╗
║                    NEXT STEPS                                ║
╚══════════════════════════════════════════════════════════════╝

1. Update the landing page:
   Open ${branch.name.toLowerCase()}.html
   Change from "Coming Soon" to active store

2. Configure tablet with POS URL:
   https://jig.cleva-ai.co.za/pos.html?branch=${branch.branchCode}

3. Test staff login:
   Manager logs in with phone: ${manager?.phone || 'N/A'}

4. Verify inventory in system:
   Check products show correct quantities

5. Process test sale:
   Complete a test transaction to verify everything works

`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n[ERROR]', error.message);
    process.exit(1);
  }
}

setupBranch();
