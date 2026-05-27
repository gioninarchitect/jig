#!/usr/bin/env node
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  // Find Ormonde branch
  const branch = await db.collection('branches').findOne({ branchCode: 'DBC-ORM' });
  if (!branch) {
    console.log('Ormonde branch not found!');
    await mongoose.disconnect();
    return;
  }
  console.log('Ormonde branch ID: ' + branch._id);

  // Get all Ormonde branch inventory
  const inv = await db.collection('branchinventories').find({ branchId: branch._id }).toArray();
  console.log('Total Ormonde inventory entries: ' + inv.length);

  // Get product IDs from inventory
  const productIds = inv.map(i => i.productId);

  // Find pre-roll products in the system
  const prerolls = await db.collection('products').find({
    $or: [
      { name: { $regex: /pre.?roll|cone|just blaze|JB /i } },
      { category: { $regex: /pre.?roll|joint/i } },
      { sku: 'PRE-ROLLS-CONES' }
    ]
  }).toArray();

  console.log('\n=== ALL PRE-ROLL PRODUCTS IN DB ===');
  console.log('Found: ' + prerolls.length);
  prerolls.forEach(p => {
    const inOrmonde = inv.find(i => i.productId.toString() === p._id.toString());
    const qty = inOrmonde ? inOrmonde.quantity : 0;
    const status = inOrmonde ? 'IN STOCK (' + qty + ')' : 'NOT IN ORMONDE';
    console.log('  ' + (p.sku || '?').padEnd(20) + (p.name || '').padEnd(40) + 'R' + (p.price || 0).toString().padEnd(8) + status);
  });

  // Also check what categories exist in Ormonde stock
  const ormondeProducts = await db.collection('products').find({
    _id: { $in: productIds }
  }).toArray();

  const categories = {};
  ormondeProducts.forEach(p => {
    const cat = p.category || 'uncategorized';
    if (!categories[cat]) categories[cat] = 0;
    categories[cat]++;
  });

  console.log('\n=== ORMONDE STOCK BY CATEGORY ===');
  Object.entries(categories).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log('  ' + cat.padEnd(30) + count + ' products');
  });

  await mongoose.disconnect();
  console.log('\nDone.');
});
