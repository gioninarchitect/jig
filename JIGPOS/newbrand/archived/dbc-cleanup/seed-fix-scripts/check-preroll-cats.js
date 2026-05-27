#!/usr/bin/env node
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  // Find Ormonde branch
  const branch = await db.collection('branches').findOne({ branchCode: 'DBC-ORM' });
  const inv = await db.collection('branchinventories').find({ branchId: branch._id }).toArray();
  const productIds = inv.map(i => i.productId);

  // Get Ormonde products that are pre-rolls
  const products = await db.collection('products').find({
    _id: { $in: productIds },
    $or: [
      { name: { $regex: /pre.?roll|just blaze|JB |cone|joint/i } },
      { productType: 'pre-roll' },
      { tags: 'pre-roll' }
    ]
  }).toArray();

  console.log('=== ORMONDE PRE-ROLLS: CATEGORY & TAGS ===\n');
  products.forEach(p => {
    console.log('  ' + (p.name || '').padEnd(40) + 'cat=' + (p.category || 'NONE').padEnd(20) + 'type=' + (p.productType || 'NONE').padEnd(15) + 'tags=' + JSON.stringify(p.tags || []));
  });
  console.log('\nTotal: ' + products.length);

  // Also check if there's an active stocktake session for Ormonde
  const sessions = await db.collection('stocktakesessions').find({
    branchId: branch._id
  }).sort({ createdAt: -1 }).limit(3).toArray();

  console.log('\n=== RECENT STOCKTAKE SESSIONS ===');
  sessions.forEach(s => {
    console.log('  ID: ' + s._id + ' | Status: ' + s.status + ' | Items: ' + (s.lineItems || []).length + ' | Created: ' + s.createdAt);
  });

  // If active session exists, check how many of its items are pre-rolls
  const active = sessions.find(s => s.status === 'in_progress' || s.status === 'active');
  if (active) {
    const prerollItems = (active.lineItems || []).filter(li => {
      const name = (li.productName || '').toLowerCase();
      return name.includes('pre') || name.includes('just blaze') || name.includes('jb ');
    });
    console.log('\nActive session has ' + prerollItems.length + ' pre-roll/JB items out of ' + (active.lineItems || []).length + ' total');
  } else {
    console.log('\nNo active stocktake session for Ormonde');
  }

  await mongoose.disconnect();
});
