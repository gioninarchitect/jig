#!/usr/bin/env node
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

const newStrains = [
  { name: 'Gelato I.D', sku: 'GELATO-ID', slug: 'gelato-id-loose', price: 100, category: 'flower', productType: 'loose', tags: ['indoor'], growMethod: 'indoor' },
  { name: 'LA Candy', sku: 'LA-CANDY', slug: 'la-candy-loose', price: 100, category: 'flower', productType: 'loose', tags: ['indoor'], growMethod: 'indoor' },
  { name: 'NFS (Not For Sale)', sku: 'NFS', slug: 'nfs-not-for-sale', price: 100, category: 'flower', productType: 'loose', tags: ['indoor'], growMethod: 'indoor' },
  { name: 'Cereal Milk', sku: 'CEREAL-MILK', slug: 'cereal-milk-loose', price: 100, category: 'flower', productType: 'loose', tags: ['indoor'], growMethod: 'indoor' },
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  // Find Ormonde branch
  const branch = await db.collection('branches').findOne({ branchCode: 'DBC-ORM' });
  if (!branch) { console.log('Branch not found!'); process.exit(1); }
  console.log('Ormonde branch: ' + branch._id);

  for (const strain of newStrains) {
    // Check if already exists
    const existing = await db.collection('products').findOne({
      $or: [
        { sku: strain.sku },
        { name: strain.name }
      ]
    });

    if (existing) {
      console.log('  EXISTS: ' + strain.name + ' (sku: ' + existing.sku + ', id: ' + existing._id + ')');

      // Make sure it's in Ormonde inventory
      const inv = await db.collection('branchinventories').findOne({
        branchId: branch._id,
        productId: existing._id
      });
      if (!inv) {
        await db.collection('branchinventories').insertOne({
          branchId: branch._id,
          productId: existing._id,
          quantity: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log('    -> Added to Ormonde inventory (qty: 0 - count during stock take)');
      } else {
        console.log('    -> Already in Ormonde inventory (qty: ' + inv.quantity + ')');
      }
      continue;
    }

    // Create new product
    const result = await db.collection('products').insertOne({
      name: strain.name,
      sku: strain.sku,
      slug: strain.slug,
      price: strain.price,
      category: strain.category,
      productType: strain.productType,
      tags: strain.tags,
      growMethod: strain.growMethod,
      unit: 'g',
      isActive: true,
      inventory: { quantity: 0 },
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('  CREATED: ' + strain.name + ' (R' + strain.price + '/g, id: ' + result.insertedId + ')');

    // Add to Ormonde branch inventory
    await db.collection('branchinventories').insertOne({
      branchId: branch._id,
      productId: result.insertedId,
      quantity: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('    -> Added to Ormonde inventory (qty: 0 - count during stock take)');
  }

  // Also check Premium Blend Pre-Roll
  const premBlend = await db.collection('products').findOne({ name: { $regex: /premium blend/i } });
  if (premBlend) {
    console.log('\n=== PREMIUM BLEND PRE-ROLL CHECK ===');
    console.log('  Product: ' + premBlend.name + ' (sku: ' + premBlend.sku + ')');
    console.log('  Category: ' + premBlend.category + ' | Type: ' + premBlend.productType + ' | Tags: ' + JSON.stringify(premBlend.tags));
    const premInv = await db.collection('branchinventories').findOne({
      branchId: branch._id,
      productId: premBlend._id
    });
    console.log('  In Ormonde: ' + (premInv ? 'YES (qty: ' + premInv.quantity + ')' : 'NO'));
  }

  // Check active stocktake session
  const session = await db.collection('stocktakesessions').findOne({
    branchId: branch._id,
    status: { $in: ['in_progress', 'active'] }
  });
  if (session) {
    console.log('\n=== ACTIVE STOCKTAKE SESSION ===');
    console.log('  ID: ' + session._id);
    console.log('  Items: ' + (session.lineItems || []).length);
    console.log('  Status: ' + session.status);

    // Check if Premium Blend is in the session
    const hasPremBlend = (session.lineItems || []).find(li =>
      (li.productName || '').toLowerCase().includes('premium blend')
    );
    console.log('  Premium Blend in session: ' + (hasPremBlend ? 'YES' : 'NO - may need new session'));
  } else {
    console.log('\n  No active stocktake session for Ormonde');
  }

  await mongoose.disconnect();
  console.log('\nDone.');
});
