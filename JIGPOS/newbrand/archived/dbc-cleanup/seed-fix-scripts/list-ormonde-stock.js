#!/usr/bin/env node
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  const branch = await db.collection('branches').findOne({ branchCode: 'DBC-ORM' });
  const inv = await db.collection('branchinventories').find({ branchId: branch._id }).toArray();
  const invMap = {};
  inv.forEach(i => { invMap[i.productId.toString()] = i.quantity; });

  const productIds = inv.map(i => i.productId);
  const products = await db.collection('products').find({ _id: { $in: productIds } }).toArray();

  // Group by category
  const grouped = {};
  products.forEach(p => {
    const cat = p.category || 'uncategorized';
    if (!grouped[cat]) grouped[cat] = [];
    const qty = invMap[p._id.toString()] || 0;
    grouped[cat].push({
      name: p.name,
      sku: p.sku,
      price: p.price || 0,
      qty: qty,
      tags: p.tags || [],
      productType: p.productType || '',
      growMethod: p.growMethod || ''
    });
  });

  // Print
  Object.keys(grouped).sort().forEach(cat => {
    const items = grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    console.log('\n=== ' + cat.toUpperCase() + ' (' + items.length + ' items) ===');
    items.forEach(p => {
      const flags = [];
      if (p.productType) flags.push('type:' + p.productType);
      if (p.growMethod) flags.push('grow:' + p.growMethod);
      if (p.tags.length) flags.push('tags:' + p.tags.join(','));
      const flagStr = flags.length ? '  [' + flags.join(' | ') + ']' : '';
      console.log('  ' + p.name.padEnd(45) + 'R' + p.price.toString().padEnd(6) + 'Qty:' + p.qty.toString().padEnd(5) + flagStr);
    });
  });

  console.log('\n=== TOTAL: ' + products.length + ' products ===');
  await mongoose.disconnect();
});
