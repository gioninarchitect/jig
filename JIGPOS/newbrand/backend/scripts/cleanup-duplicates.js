const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

async function cleanupDuplicates() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jig');

  const Product = require('../modules/database/models/Product');

  // Known duplicates to merge (keep first, delete second)
  const duplicates = [
    { keep: 'Bakers', remove: 'Baker' },
    { keep: 'Gary Payton', remove: 'Gary Peyton' },
    { keep: 'Pink Runtz', remove: 'Pink Runts' },
    { keep: 'Purple Peanut Butter', remove: 'Purple Peanut' },
    { keep: 'Rainbow Royale', remove: 'Rainbow Royal' },
    { keep: 'Rainbow Sherbet', remove: 'Rainbow Sherbit' },
    { keep: 'Block Berry', remove: 'Blockberry' },
    { keep: 'Don Perinon', remove: 'Don Pernan' },
    { keep: 'Gorilla Zkittles', remove: 'Gorilla Zkittles Big' },
    { keep: 'K-Snow', remove: 'K Snow' },
  ];

  console.log('\n========================================');
  console.log('CLEANING UP DUPLICATE PRODUCTS');
  console.log('========================================\n');

  let deleted = 0;

  for (const dup of duplicates) {
    const keepProduct = await Product.findOne({ name: dup.keep });
    const removeProduct = await Product.findOne({ name: dup.remove });

    if (removeProduct) {
      console.log(`Removing: "${dup.remove}" (duplicate of "${dup.keep}")`);
      await Product.deleteOne({ _id: removeProduct._id });
      deleted++;
    } else {
      console.log(`Skip: "${dup.remove}" not found`);
    }
  }

  console.log(`\nDeleted ${deleted} duplicate products`);

  // Also fix subcategories that are wrong
  console.log('\nFixing incorrect subcategories...');

  // Fix 'indoor-premium' -> should be indica/sativa/hybrid based on name
  const badSubcats = await Product.find({
    category: 'flower',
    subcategory: { $in: ['indoor-premium', 'greenhouse'] }
  });

  for (const p of badSubcats) {
    // Default to hybrid if unsure
    let newSubcat = 'hybrid';
    const nameLower = p.name.toLowerCase();

    if (nameLower.includes('cheese') || nameLower.includes('punch') || nameLower.includes('zkittles')) {
      newSubcat = 'indica';
    } else if (nameLower.includes('storm') || nameLower.includes('sky') || nameLower.includes('lemonade')) {
      newSubcat = 'sativa';
    }

    console.log(`  ${p.name}: ${p.subcategory} -> ${newSubcat}`);
    p.subcategory = newSubcat;
    await p.save();
  }

  console.log('\n========================================');
  console.log('CLEANUP COMPLETE');
  console.log('========================================\n');

  await mongoose.disconnect();
}

cleanupDuplicates().catch(console.error);
