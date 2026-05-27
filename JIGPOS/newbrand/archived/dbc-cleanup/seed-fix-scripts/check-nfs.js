#!/usr/bin/env node
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  // Search for NFS / Not For Sale
  const products = await db.collection('products').find({
    $or: [
      { name: { $regex: /nfs|not.?for.?sale/i } },
      { sku: { $regex: /nfs/i } },
      { tags: { $regex: /nfs/i } }
    ]
  }).toArray();

  console.log('=== NFS / NOT FOR SALE PRODUCTS ===');
  if (products.length === 0) {
    console.log('  NONE FOUND in products collection');
  } else {
    products.forEach(p => {
      console.log('  ' + (p.sku || '?').padEnd(15) + (p.name || '').padEnd(40) + 'R' + (p.price || 0) + '  cat:' + (p.category || 'none'));
    });
  }

  // Also check Ormonde branch inventory
  const branch = await db.collection('branches').findOne({ branchCode: 'DBC-ORM' });
  const inv = await db.collection('branchinventories').find({ branchId: branch._id }).toArray();
  const productIds = inv.map(i => i.productId);

  // Check if any Ormonde products have NFS in name
  const ormondeNfs = await db.collection('products').find({
    _id: { $in: productIds },
    name: { $regex: /nfs|not.?for.?sale/i }
  }).toArray();

  console.log('\n=== NFS IN ORMONDE INVENTORY ===');
  if (ormondeNfs.length === 0) {
    console.log('  NONE - NFS strain is NOT in Ormonde branch inventory');
  } else {
    ormondeNfs.forEach(p => console.log('  ' + p.name));
  }

  await mongoose.disconnect();
});
