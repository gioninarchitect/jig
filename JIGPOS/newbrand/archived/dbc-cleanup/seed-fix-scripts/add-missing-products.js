#!/usr/bin/env node
// Add missing products to DB + Ormonde inventory
process.chdir('/var/www/dbc');
require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

const newProducts = [
  { name: 'Cartridge Plug', sku: 'CART-PLUG', slug: 'cartridge-plug', price: 35, category: 'vapes', unit: 'units', tags: [], productType: 'unit' },
  { name: 'Mediblz Singles 40mg', sku: 'MEDIBLZ-40', slug: 'mediblz-singles-40mg', price: 40, category: 'edibles', unit: 'units', tags: [], productType: 'unit' },
  { name: 'Joynt Pre-Roll (G.D)', sku: 'JOYNT-GD', slug: 'joynt-pre-roll-gd', price: 80, category: 'flower', unit: 'units', tags: ['greendoor', 'pre-roll'], productType: 'pre-roll' },
  { name: 'Synergy Medibles Waves', sku: 'SYN-WAVES', slug: 'synergy-medibles-waves', price: 40, category: 'edibles', unit: 'units', tags: [], productType: 'unit' },
  { name: 'Magic Mushroom', sku: 'MAGIC-MUSH', slug: 'magic-mushroom', price: 100, category: 'edibles', unit: 'units', tags: [], productType: 'unit' },
  { name: 'Coder Fruit Juice', sku: 'CODER-JUICE', slug: 'coder-fruit-juice', price: 30, category: 'lifestyle-cbd', unit: 'units', tags: ['drink'], productType: 'unit' },
  { name: 'Blueberry (5g) I.D', sku: 'BLUEBERRY-5G-ID', slug: 'blueberry-5g-id', price: 550, category: 'flower', unit: 'units', tags: ['indoor', 'pre-pack'], productType: 'pre-pack' },
];

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const db = mongoose.connection.db;

  const branch = await db.collection('branches').findOne({ branchCode: 'DBC-ORM' });
  if (!branch) { console.log('Branch not found!'); process.exit(1); }

  for (const p of newProducts) {
    const existing = await db.collection('products').findOne({
      $or: [{ sku: p.sku }, { name: p.name }]
    });

    if (existing) {
      console.log('EXISTS:', p.name, '(sku:', existing.sku, 'id:', existing._id, ')');
      // Ensure in Ormonde inventory
      const inv = await db.collection('branchinventories').findOne({ branchId: branch._id, productId: existing._id });
      if (!inv) {
        await db.collection('branchinventories').insertOne({ branchId: branch._id, productId: existing._id, quantity: 0, createdAt: new Date(), updatedAt: new Date() });
        console.log('  -> Added to Ormonde inventory (qty: 0)');
      } else {
        console.log('  -> Already in Ormonde inventory (qty:', inv.quantity, ')');
      }
      continue;
    }

    const result = await db.collection('products').insertOne({
      name: p.name, sku: p.sku, slug: p.slug, price: p.price,
      category: p.category, unit: p.unit, tags: p.tags,
      productType: p.productType, status: 'active',
      isActive: true, inventory: { quantity: 0 },
      createdAt: new Date(), updatedAt: new Date()
    });

    console.log('CREATED:', p.name, '(R' + p.price + ', id:', result.insertedId, ')');

    await db.collection('branchinventories').insertOne({
      branchId: branch._id, productId: result.insertedId,
      quantity: 0, createdAt: new Date(), updatedAt: new Date()
    });
    console.log('  -> Added to Ormonde inventory (qty: 0)');
  }

  await mongoose.disconnect();
  console.log('Done.');
}).catch(err => { console.error(err); process.exit(1); });
