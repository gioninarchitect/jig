/**
 * Tag flower products with grow method (indoor/greendoor)
 * Based on handwritten stock count sheets from 11 Feb 2026 Ormonde physical count
 */
require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
const SESSION_ID = '698c7fdab9ef95c0232430e0';

// Names from the handwritten Indoor page (matched to likely DB names)
const INDOOR_NAMES = [
  'nfs', 'gelato', 'bakers', 'pineapple chunk', 'la candy',
  'rainbow royal', 'frozen peach', 'ice cream cake', 'blackberry', 'block berry',
  'cereal milk', 'rainbow sherbit', 'rainbow sherbet', 'ice queen',
  'monster zkittles', 'monster skittles', 'blu zuchi', 'blue zucci', 'blue zuchi',
  'blu pave', 'blue pava', 'blue pave', 'face on fire', 'pitbull', 'pit bull',
  'king truck', 'kings truck'
];

// Names from the handwritten Greendoor page
const GREENDOOR_NAMES = [
  'durban sky', 'gorilla zkittlez', 'gorilla zkittles', 'gorilla skittles',
  'super cheese', 'garry peyton', 'gary payton', 'gary peyton',
  'beach wedding', 'allien cookies', 'alien cookie', 'alien cookies',
  'jungle diamond', 'diven storm', 'divine storm',
  'cheese', 'black cherry punch'
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // Step 1: Get all flower products
  const products = await db.collection('products').find({ category: 'flower' }).toArray();
  console.log(`\nTotal flower products: ${products.length}`);

  // Step 2: Match and categorize
  const indoorMatches = [];
  const greendoorMatches = [];
  const alreadyTagged = [];
  const unmatched = [];

  for (const p of products) {
    const nameLower = p.name.toLowerCase().trim();
    const tags = (p.tags || []).map(t => t.toLowerCase());
    const hasGrowMethod = tags.includes('indoor') || tags.includes('greendoor') || tags.includes('greenhouse');

    // Check if name matches indoor list
    const isIndoor = INDOOR_NAMES.some(n => {
      if (n === 'cheese') return false; // "cheese" alone is greendoor, "super cheese" is greendoor
      return nameLower.includes(n) || n.includes(nameLower);
    });

    // Check if name matches greendoor list
    const isGreendoor = GREENDOOR_NAMES.some(n => {
      // Special case: "cheese" alone should only match products that are literally "cheese" (not "super cheese" which also matches)
      if (n === 'cheese') return nameLower === 'cheese' || nameLower.startsWith('cheese ') || nameLower.endsWith(' cheese');
      return nameLower.includes(n) || n.includes(nameLower);
    });

    if (hasGrowMethod) {
      alreadyTagged.push({ id: p._id, name: p.name, tags: p.tags });
    } else if (isIndoor) {
      indoorMatches.push({ id: p._id, name: p.name, tags: p.tags || [] });
    } else if (isGreendoor) {
      greendoorMatches.push({ id: p._id, name: p.name, tags: p.tags || [] });
    } else {
      unmatched.push({ id: p._id, name: p.name, tags: p.tags || [] });
    }
  }

  console.log(`\n--- Already tagged (${alreadyTagged.length}) ---`);
  alreadyTagged.forEach(p => console.log(`  ${p.name} -> ${p.tags.filter(t => ['indoor','greendoor','greenhouse'].includes(t.toLowerCase())).join(', ')}`));

  console.log(`\n--- Will tag INDOOR (${indoorMatches.length}) ---`);
  indoorMatches.forEach(p => console.log(`  ${p.name} (current tags: ${p.tags.join(', ') || 'none'})`));

  console.log(`\n--- Will tag GREENDOOR (${greendoorMatches.length}) ---`);
  greendoorMatches.forEach(p => console.log(`  ${p.name} (current tags: ${p.tags.join(', ') || 'none'})`));

  console.log(`\n--- UNMATCHED flower products (${unmatched.length}) ---`);
  unmatched.forEach(p => console.log(`  ${p.name} (tags: ${p.tags.join(', ') || 'none'})`));

  // Step 3: Update Products
  let updatedProducts = 0;

  for (const p of indoorMatches) {
    const newTags = [...new Set([...p.tags, 'indoor'])];
    await db.collection('products').updateOne(
      { _id: p.id },
      { $set: { tags: newTags } }
    );
    updatedProducts++;
  }

  for (const p of greendoorMatches) {
    const newTags = [...new Set([...p.tags, 'greendoor'])];
    await db.collection('products').updateOne(
      { _id: p.id },
      { $set: { tags: newTags } }
    );
    updatedProducts++;
  }

  console.log(`\nUpdated ${updatedProducts} products with grow method tags`);

  // Step 4: Update stocktake session lineItems
  const session = await db.collection('stocktakes').findOne({ _id: new mongoose.Types.ObjectId(SESSION_ID) });
  if (!session) {
    console.log('WARNING: Stocktake session not found!');
    await mongoose.disconnect();
    return;
  }

  let updatedLineItems = 0;
  const allMatchedIds = [
    ...indoorMatches.map(p => p.id.toString()),
    ...greendoorMatches.map(p => p.id.toString())
  ];

  const indoorIds = new Set(indoorMatches.map(p => p.id.toString()));
  const greendoorIds = new Set(greendoorMatches.map(p => p.id.toString()));

  const updatedItems = session.lineItems.map(item => {
    const pid = item.productId.toString();
    if (indoorIds.has(pid)) {
      const newTags = [...new Set([...(item.tags || []), 'indoor'])];
      updatedLineItems++;
      return { ...item, tags: newTags };
    }
    if (greendoorIds.has(pid)) {
      const newTags = [...new Set([...(item.tags || []), 'greendoor'])];
      updatedLineItems++;
      return { ...item, tags: newTags };
    }
    return item;
  });

  await db.collection('stocktakes').updateOne(
    { _id: new mongoose.Types.ObjectId(SESSION_ID) },
    { $set: { lineItems: updatedItems } }
  );

  console.log(`Updated ${updatedLineItems} lineItems in stocktake session`);

  // Step 5: Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Products already tagged: ${alreadyTagged.length}`);
  console.log(`Products tagged indoor: ${indoorMatches.length}`);
  console.log(`Products tagged greendoor: ${greendoorMatches.length}`);
  console.log(`Session lineItems updated: ${updatedLineItems}`);
  console.log(`Unmatched flower products: ${unmatched.length}`);

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch(err => {
  console.error('Error:', err);
  mongoose.disconnect();
  process.exit(1);
});
