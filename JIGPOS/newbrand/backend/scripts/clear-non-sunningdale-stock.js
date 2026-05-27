#!/usr/bin/env node
/**
 * Clear BranchInventory for all branches EXCEPT Sunningdale.
 * Only Sunningdale has real physical stock right now.
 * Also cleans up orphaned records from deleted DBC/JIG branches.
 *
 * Run: node backend/scripts/clear-non-sunningdale-stock.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  // Show all branches in system
  const allBranches = await Branch.find({}).sort({ name: 1 });
  console.log(`\nBranches in database (${allBranches.length}):`);
  allBranches.forEach(b => console.log(`  [${b.branchCode || '???'}] ${b.name} (${b._id})`));

  // Find Sunningdale branch
  const sunningdale = await Branch.findOne({ name: /sunningdale/i });
  if (!sunningdale) {
    console.error('\nSunningdale branch not found!');
    process.exit(1);
  }
  console.log(`\nKeeping stock for: ${sunningdale.name} (${sunningdale._id})`);

  // Count records
  const total = await BranchInventory.countDocuments({});
  const keeping = await BranchInventory.countDocuments({ branchId: sunningdale._id });
  const toDelete = total - keeping;

  console.log(`\nBranchInventory records total: ${total}`);
  console.log(`Sunningdale records (keeping): ${keeping}`);
  console.log(`Other records (deleting):      ${toDelete}`);

  if (toDelete === 0) {
    console.log('\nNothing to clear. Done.');
    await mongoose.disconnect();
    process.exit(0);
  }

  // Delete all BranchInventory except Sunningdale
  const result = await BranchInventory.deleteMany({ branchId: { $ne: sunningdale._id } });
  console.log(`\nDeleted ${result.deletedCount} BranchInventory records.`);
  console.log('Sunningdale stock preserved.');

  // Also clear global product inventory quantities (Product.inventory.quantity)
  // so the "All Branches (Master)" view doesn't show phantom stock
  const Product = require('../modules/database/models/Product');
  const sunningdaleProductIds = (await BranchInventory.find({ branchId: sunningdale._id }).select('productId')).map(i => i.productId);
  const cleared = await Product.updateMany(
    { _id: { $nin: sunningdaleProductIds } },
    { $set: { 'inventory.quantity': 0 } }
  );
  console.log(`Cleared global inventory on ${cleared.modifiedCount} products (non-Sunningdale).`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
