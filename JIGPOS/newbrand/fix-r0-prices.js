#!/usr/bin/env node
/**
 * fix-r0-prices.js
 * Fixes 146 products that have R0 price on production.
 *
 * Usage (on production server):
 *   node /tmp/fix-r0-prices.js
 *
 * Connects to MongoDB via process.env.MONGODB_URI loaded from /var/www/dbc/.env
 */

process.chdir('/var/www/dbc');

require('/var/www/dbc/node_modules/dotenv').config({ path: '/var/www/dbc/.env' });
const mongoose = require('/var/www/dbc/node_modules/mongoose');

// SKU -> correct price mapping (146 products)
const skuPriceMap = {
  // -- SINGLES (individual edibles) --
  '27':  150,
  '30':  180,
  '33':  240,
  '34':  120,
  '62':  180,
  '63':  320,
  '64':  240,
  '80':  180,
  '111': 150,
  '115': 350,
  '116': 350,
  '202': 240,
  '203': 320,
  '204': 240,
  '205': 180,
  '206': 180,
  '245': 180,
  '247': 220,
  '307': 180,
  '864': 350,

  // -- LOOSE FLOWER - G.D strains (R40-70/g) --
  '6':   60,
  '88':  60,
  '243': 60,
  '244': 70,
  '260': 60,
  '295': 40,
  '300': 60,
  '316': 60,
  '493': 60,
  '497': 60,
  '616': 60,
  '978': 60,
  '979': 60,
  '338': 60,
  '317': 60,

  // -- LOOSE FLOWER - I.D / Indoor strains (R80-150/g) --
  '70':  100,
  '120': 120,
  '122': 100,
  '148': 80,
  '171': 100,
  '195': 100,
  '214': 100,
  '224': 100,
  '232': 100,
  '233': 100,
  '274': 100,
  '277': 100,
  '306': 100,
  '308': 100,
  '324': 100,
  '363': 100,
  '364': 100,
  '400': 100,
  '413': 100,
  '432': 100,
  '438': 120,
  '472': 100,
  '473': 100,
  '474': 100,
  '475': 100,
  '476': 100,
  '482': 100,
  '539': 100,
  '540': 100,
  '544': 100,
  '545': 120,
  '559': 100,
  '563': 100,
  '567': 100,
  '571': 100,
  '579': 100,
  '580': 100,
  '581': 100,
  '582': 100,
  '596': 100,
  '609': 100,
  '610': 100,
  '613': 100,
  '620': 120,
  '621': 120,
  '678': 100,
  '863': 120,
  '867': 100,
  '871': 100,
  '890': 100,
  '891': 120,
  '896': 100,
  '928': 100,
  '929': 150,
  '955': 100,
  '956': 100,

  // -- PRE-ROLLS (non-JB) --
  'PRE-ROLLS-CONES': 80,
  '54':  80,
  '231': 80,
  '236': 80,
  '237': 80,
  '441': 80,
  '442': 80,
  '470': 80,
  '471': 80,
  '492': 80,
  '494': 80,
  '924': 80,

  // -- JUST BLAZE - Standard R90 --
  '932': 90,
  '967': 90,

  // -- JUST BLAZE - Premium R120 --
  '292': 120,
  '448': 120,
  '542': 120,
  '565': 120,
  '575': 120,
  '577': 120,
  '603': 120,
  '661': 120,
  '668': 120,
  '673': 120,
  '937': 120,

  // -- JUST BLAZE - Ultra-Premium R150 --
  '72':  150,
  '129': 150,
  '543': 150,
  '564': 150,
  '566': 150,
  '599': 150,
  '606': 150,
  '635': 150,
  '667': 150,
  '669': 150,
  '670': 150,
  '675': 150,
  '677': 150,
  '939': 150,

  // -- EDIBLE PACKS --
  '66':   350,
  '103':  100,
  '107':  180,
  '186':  350,
  '275':  320,
  '276':  180,
  '345':  180,
  '465':  120,
  '638':  120,
  '639':  50,
  '641':  80,
  '642':  120,
  '906':  180,
  '1004': 150,

  // -- OTHER --
  '637': 600,
  '135': 200,
};

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set. Ensure /var/www/dbc/.env exists and contains it.');
    process.exit(1);
  }

  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  console.log('Connected.');

  const db = mongoose.connection.db;
  const collection = db.collection('products');

  const totalEntries = Object.keys(skuPriceMap).length;
  console.log('Processing ' + totalEntries + ' SKU price entries...\n');

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const [sku, price] of Object.entries(skuPriceMap)) {
    const product = await collection.findOne({ sku: sku });

    if (!product) {
      console.log('  NOT FOUND: sku ' + sku);
      notFound++;
      continue;
    }

    const currentPrice = product.price || 0;

    if (currentPrice !== 0 && currentPrice !== null) {
      console.log('  SKIPPED: sku ' + sku + ' "' + product.name + '" already has price R' + currentPrice);
      skipped++;
      continue;
    }

    await collection.updateOne(
      { _id: product._id },
      { $set: { price: price } }
    );

    console.log('  UPDATED: sku ' + sku + ' "' + product.name + '" R0 -> R' + price);
    updated++;
  }

  console.log('\n--- RESULTS ---');
  console.log('Updated:   ' + updated);
  console.log('Skipped:   ' + skipped + ' (already had a price)');
  console.log('Not found: ' + notFound);
  console.log('Total:     ' + totalEntries);

  await mongoose.disconnect();
  console.log('Disconnected. Done.');
}

run().catch(function(err) {
  console.error('Fatal error:', err);
  mongoose.disconnect();
  process.exit(1);
});
