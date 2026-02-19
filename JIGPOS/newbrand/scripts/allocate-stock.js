/**
 * Allocate Stock to a Branch
 * Run: node scripts/allocate-stock.js <branch-code> <quantity>
 * Example: node scripts/allocate-stock.js SPR-001 50
 *
 * Allocates specified quantity of ALL active products to a branch
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const Branch = require('../backend/modules/database/models/Branch');
const BranchInventory = require('../backend/modules/database/models/BranchInventory');
const Product = require('../backend/modules/database/models/Product');

const branchCode = process.argv[2];
const quantity = parseInt(process.argv[3]) || 50;

if (!branchCode) {
  console.log('Usage: node scripts/allocate-stock.js <branch-code> [quantity]');
  console.log('Example: node scripts/allocate-stock.js SPR-001 50');
  process.exit(1);
}

async function allocateStock() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find the branch
    const branch = await Branch.findOne({ branchCode: branchCode.toUpperCase() });
    if (!branch) {
      console.error(`Branch not found: ${branchCode}`);
      process.exit(1);
    }

    console.log(`\nAllocating ${quantity} units of each product to ${branch.name}...`);

    const products = await Product.find({ status: 'active' });
    let updated = 0;
    let created = 0;

    for (const product of products) {
      let inventory = await BranchInventory.findOne({
        branchId: branch._id,
        productId: product._id
      });

      if (inventory) {
        // Update existing
        inventory.quantity = quantity;
        inventory.isActive = true;
        inventory.isAvailableForSale = true;
        inventory.lastRestocked = new Date();
        inventory.lastRestockQuantity = quantity;
        await inventory.save();
        updated++;
      } else {
        // Create new
        inventory = new BranchInventory({
          branchId: branch._id,
          productId: product._id,
          quantity: quantity,
          lowStockThreshold: 10,
          reorderPoint: 20,
          reorderQuantity: 50,
          isActive: true,
          isAvailableForSale: true,
          lastRestocked: new Date(),
          lastRestockQuantity: quantity
        });
        await inventory.save();
        created++;
      }
    }

    console.log(`\n========================================`);
    console.log(`STOCK ALLOCATION COMPLETE: ${branch.name}`);
    console.log(`========================================`);
    console.log(`Created: ${created} inventory records`);
    console.log(`Updated: ${updated} inventory records`);
    console.log(`Quantity per product: ${quantity} units`);
    console.log(`Total products: ${created + updated}`);
    console.log(`Total units: ${(created + updated) * quantity}`);

    // Get inventory value
    const inventoryValue = await BranchInventory.getBranchInventoryValue(branch._id);
    console.log(`\nInventory Value:`);
    console.log(`  Cost Value: R${inventoryValue.costValue.toLocaleString()}`);
    console.log(`  Retail Value: R${inventoryValue.retailValue.toLocaleString()}`);
    console.log(`  Potential Profit: R${inventoryValue.potentialProfit.toLocaleString()}`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error allocating stock:', error);
    process.exit(1);
  }
}

allocateStock();
