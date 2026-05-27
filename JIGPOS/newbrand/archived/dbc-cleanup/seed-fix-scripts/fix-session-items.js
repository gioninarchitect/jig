#!/usr/bin/env node
// Fix: Add ALL missing products to the active Ormonde stocktake session
// Products in BranchInventory but NOT in the session get added
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  // Find Ormonde branch
  const branch = await db.collection('branches').findOne({ branchCode: 'DBC-ORM' });
  if (!branch) { console.log('Branch not found!'); process.exit(1); }
  console.log('Ormonde branch:', branch._id);

  // Find active stocktake session
  const session = await db.collection('stocktakesessions').findOne({
    branchId: branch._id,
    status: { $in: ['in_progress', 'active', 'scheduled'] }
  });

  if (!session) {
    console.log('NO active stocktake session for Ormonde!');
    const recent = await db.collection('stocktakesessions').find({ branchId: branch._id }).sort({ createdAt: -1 }).limit(3).toArray();
    console.log('Recent sessions:', recent.map(s => ({ id: s._id, status: s.status, items: (s.lineItems||[]).length, created: s.createdAt })));
    await mongoose.disconnect();
    return;
  }

  console.log('Session:', session._id);
  console.log('Status:', session.status);
  console.log('Current lineItems:', (session.lineItems || []).length);
  console.log('Created:', session.createdAt);

  // Get existing productIds in session
  const existingIds = new Set((session.lineItems || []).map(li => li.productId?.toString()));

  // Count pre-rolls in session
  const prerollsInSession = (session.lineItems || []).filter(li => {
    const tags = (li.tags || []).join(' ').toLowerCase();
    const pType = (li.productType || '').toLowerCase();
    const name = (li.productName || '').toLowerCase();
    return tags.includes('pre-roll') || pType === 'pre-roll' || name.includes('pre roll') || name.includes('preroll') || name.includes('joint');
  });
  console.log('Pre-rolls already in session:', prerollsInSession.length);

  // Get ALL Ormonde branch inventory
  const branchInv = await db.collection('branchinventories').find({ branchId: branch._id }).toArray();
  console.log('Total BranchInventory entries:', branchInv.length);

  // Get ALL active products
  const allProducts = await db.collection('products').find({ status: 'active' }).toArray();
  console.log('Total active products:', allProducts.length);

  // Find products in BranchInventory but NOT in session
  const missingItems = [];
  const branchInvMap = new Map(branchInv.map(inv => [inv.productId.toString(), inv]));

  for (const product of allProducts) {
    const pid = product._id.toString();
    if (existingIds.has(pid)) continue; // Already in session

    const inv = branchInvMap.get(pid);
    // Add products that are in branch inventory OR are active products for this branch
    // We add all active products so nothing is missed
    const tags = product.tags || [];
    const isFlower = product.category?.toLowerCase() === 'flower';
    const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack');
    const isCountable = !isFlower || isPreRollOrPack;

    const growMethod = tags.find(t => ['indoor', 'greendoor'].includes((t || '').toLowerCase())) || '';
    const nameLower = (product.name || '').toLowerCase();
    let productType = 'loose';
    if (tags.includes('pre-roll') || nameLower.includes('pre roll') || nameLower.includes('preroll') || nameLower.includes('joint')) {
      productType = 'pre-roll';
    } else if (tags.includes('pre-pack') || nameLower.includes('5g') || nameLower.includes('3g') || nameLower.includes('pre pack')) {
      productType = 'pre-pack';
    }

    missingItems.push({
      productId: product._id,
      productName: product.name,
      sku: product.sku || '',
      category: product.category,
      growMethod,
      productType,
      tags,
      expectedQty: inv?.quantity || 0,
      unit: isCountable ? 'units' : 'g',
      isCountable,
      validationStatus: 'pending'
    });
  }

  console.log('\n=== MISSING FROM SESSION ===');
  console.log('Total missing:', missingItems.length);

  // Count missing pre-rolls
  const missingPrerolls = missingItems.filter(i => i.productType === 'pre-roll');
  const missingPrePacks = missingItems.filter(i => i.productType === 'pre-pack');
  const missingLoose = missingItems.filter(i => i.productType === 'loose' && i.category === 'flower');
  const missingOther = missingItems.filter(i => i.category !== 'flower');

  console.log('  Pre-rolls:', missingPrerolls.length);
  console.log('  Pre-packs:', missingPrePacks.length);
  console.log('  Loose flower:', missingLoose.length);
  console.log('  Non-flower:', missingOther.length);

  if (missingPrerolls.length > 0) {
    console.log('\n  Missing pre-rolls:');
    missingPrerolls.forEach(p => console.log('    -', p.productName, '(' + p.sku + ') tags:', JSON.stringify(p.tags)));
  }

  if (missingItems.length === 0) {
    console.log('All products already in session!');
    await mongoose.disconnect();
    return;
  }

  // Add all missing items to the session
  console.log('\nAdding', missingItems.length, 'missing products to session...');

  const result = await db.collection('stocktakesessions').updateOne(
    { _id: session._id },
    {
      $push: { lineItems: { $each: missingItems } },
      $set: {
        totalItems: (session.lineItems || []).length + missingItems.length,
        updatedAt: new Date()
      }
    }
  );

  console.log('Update result:', result.modifiedCount > 0 ? 'SUCCESS' : 'FAILED');

  // Verify
  const updated = await db.collection('stocktakesessions').findOne({ _id: session._id });
  console.log('Session now has', (updated.lineItems || []).length, 'items');

  // Count pre-rolls in updated session
  const updatedPrerolls = (updated.lineItems || []).filter(li => {
    const tags = (li.tags || []).join(' ').toLowerCase();
    const pType = (li.productType || '').toLowerCase();
    return tags.includes('pre-roll') || pType === 'pre-roll';
  });
  console.log('Pre-rolls in session:', updatedPrerolls.length);

  await mongoose.disconnect();
  console.log('\nDone! Refresh the stocktake app.');
}).catch(err => { console.error(err); process.exit(1); });
