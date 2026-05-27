const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function getFlowerStock() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/origin');

  const Product = require('../modules/database/models/Product');

  // Get all flower products
  const flowers = await Product.find({ category: 'flower' }).sort({ name: 1 });

  console.log('\n========================================');
  console.log('FLOWER CATEGORY STOCK COUNT');
  console.log('========================================\n');

  // Group by grow type (indoor vs greendoor)
  const indoor = flowers.filter(p => p.tags && p.tags.includes('indoor'));
  const greendoor = flowers.filter(p => p.tags && p.tags.includes('greendoor'));
  const shake = flowers.filter(p => p.tags && p.tags.includes('shake'));
  const other = flowers.filter(p => {
    const hasIndoor = p.tags && p.tags.includes('indoor');
    const hasGreendoor = p.tags && p.tags.includes('greendoor');
    const hasShake = p.tags && p.tags.includes('shake');
    return !hasIndoor && !hasGreendoor && !hasShake;
  });

  console.log('--- INDOOR ---');
  indoor.forEach(p => {
    const qty = p.inventory?.quantity || 0;
    const unit = p.inventory?.unit || 'g';
    console.log(`  ${p.name.padEnd(30)} ${String(qty).padStart(8)} ${unit}  [${p.subcategory || '-'}]`);
  });
  const indoorTotal = indoor.reduce((sum, p) => sum + (p.inventory?.quantity || 0), 0);
  console.log(`  INDOOR TOTAL: ${indoorTotal.toFixed(1)} g\n`);

  console.log('--- GREENDOOR ---');
  greendoor.forEach(p => {
    const qty = p.inventory?.quantity || 0;
    const unit = p.inventory?.unit || 'g';
    console.log(`  ${p.name.padEnd(30)} ${String(qty).padStart(8)} ${unit}  [${p.subcategory || '-'}]`);
  });
  const greendoorTotal = greendoor.reduce((sum, p) => sum + (p.inventory?.quantity || 0), 0);
  console.log(`  GREENDOOR TOTAL: ${greendoorTotal.toFixed(1)} g\n`);

  console.log('--- SHAKE/KRUSH ---');
  shake.forEach(p => {
    const qty = p.inventory?.quantity || 0;
    const unit = p.inventory?.unit || 'g';
    console.log(`  ${p.name.padEnd(30)} ${String(qty).padStart(8)} ${unit}  [${p.subcategory || '-'}]`);
  });
  const shakeTotal = shake.reduce((sum, p) => sum + (p.inventory?.quantity || 0), 0);
  console.log(`  SHAKE TOTAL: ${shakeTotal.toFixed(1)} g\n`);

  if (other.length > 0) {
    console.log('--- OTHER (no grow type tag) ---');
    other.forEach(p => {
      const qty = p.inventory?.quantity || 0;
      const unit = p.inventory?.unit || 'g';
      console.log(`  ${p.name.padEnd(30)} ${String(qty).padStart(8)} ${unit}  [${p.subcategory || '-'}]`);
    });
    const otherTotal = other.reduce((sum, p) => sum + (p.inventory?.quantity || 0), 0);
    console.log(`  OTHER TOTAL: ${otherTotal.toFixed(1)} g\n`);
  }

  console.log('========================================');
  console.log(`FLOWER CATEGORY: ${flowers.length} products`);
  console.log(`  Indoor:    ${indoor.length} products | ${indoorTotal.toFixed(1)} g`);
  console.log(`  Greendoor: ${greendoor.length} products | ${greendoorTotal.toFixed(1)} g`);
  console.log(`  Shake:     ${shake.length} products | ${shakeTotal.toFixed(1)} g`);
  console.log('========================================\n');

  // Subcategory breakdown
  console.log('--- BY SUBCATEGORY ---');
  const subcats = {};
  flowers.forEach(p => {
    const sub = p.subcategory || 'uncategorized';
    if (!subcats[sub]) subcats[sub] = { count: 0, qty: 0 };
    subcats[sub].count++;
    subcats[sub].qty += p.inventory?.quantity || 0;
  });
  Object.entries(subcats).sort((a,b) => b[1].qty - a[1].qty).forEach(([sub, data]) => {
    console.log(`  ${sub.padEnd(15)} ${String(data.count).padStart(3)} products | ${String(data.qty.toFixed(1)).padStart(10)} g`);
  });

  await mongoose.disconnect();
}

getFlowerStock().catch(console.error);
