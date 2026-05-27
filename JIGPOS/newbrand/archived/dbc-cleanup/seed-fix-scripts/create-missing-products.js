#!/usr/bin/env node
/**
 * Create Missing POS Products
 *
 * These ~163 products exist in the Odyssey POS stock take PDFs but NOT in the
 * web database. We create them here so load-branch-stock.js can match 100%.
 *
 * Usage:
 *   node create-missing-products.js              — Create for real
 *   node create-missing-products.js --dry-run    — Preview only
 */

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const Product = require('./backend/modules/database/models/Product');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
const DRY_RUN = process.argv.includes('--dry-run');

// ============================================================================
// MISSING PRODUCTS — extracted from 8 stock take PDFs (January 2026)
// SKU = POS PRODUCT CODE (numeric string)
// ============================================================================

const missingProducts = [
  // ──────────────────────────────────────────────────────────────────────────
  // FLOWER (~83 products) — category: 'flower', track: 'medical'
  // ──────────────────────────────────────────────────────────────────────────
  { sku: '6',   name: 'Zkittlez',                   category: 'flower' },
  { sku: '70',  name: 'Dark Planet',                 category: 'flower' },
  { sku: '88',  name: 'Zkittles',                    category: 'flower' },
  { sku: '120', name: 'Black Cherry Punch I.D',      category: 'flower' },
  { sku: '122', name: 'Original Blitz',              category: 'flower' },
  { sku: '148', name: 'Afghan Kush',                 category: 'flower' },
  { sku: '161', name: 'Caribbean Breeze 5g I.D',     category: 'flower' },
  { sku: '171', name: 'Apple Pie',                   category: 'flower' },
  { sku: '195', name: 'Lemon Cherry',                category: 'flower' },
  { sku: '214', name: 'Banana Daddy',                category: 'flower' },
  { sku: '224', name: 'Bad Berry',                   category: 'flower' },
  { sku: '232', name: 'Cherry Pie',                  category: 'flower' },
  { sku: '233', name: 'Huckleberry',                 category: 'flower' },
  { sku: '239', name: 'Jello-O 5g G.D',             category: 'flower' },
  { sku: '243', name: 'Strawberry Cough G.D',        category: 'flower' },
  { sku: '244', name: 'Jungle Cake',                 category: 'flower' },
  { sku: '248', name: 'O.G Cheese 5g I.D',          category: 'flower' },
  { sku: '260', name: 'Cherry Lemonade',             category: 'flower' },
  { sku: '274', name: 'Prophecy',                    category: 'flower' },
  { sku: '277', name: 'Exo Cheese',                  category: 'flower' },
  { sku: '295', name: 'Durban Poison G.D',           category: 'flower' },
  { sku: '300', name: 'OG Cheese',                   category: 'flower' },
  { sku: '306', name: 'Blue Java Banana',            category: 'flower' },
  { sku: '308', name: 'Chikitaz',                    category: 'flower' },
  { sku: '316', name: 'Rainbow Sherbit G.D',         category: 'flower' },
  { sku: '317', name: 'Watermelon',                  category: 'flower' },
  { sku: '324', name: 'Wedding Cake',                category: 'flower' },
  { sku: '338', name: 'Baked Alaska',                category: 'flower' },
  { sku: '363', name: 'Orange Chernobly',            category: 'flower' },
  { sku: '364', name: 'Red Beard',                   category: 'flower' },
  { sku: '400', name: 'Disco Rose',                  category: 'flower' },
  { sku: '413', name: 'Flower Power',                category: 'flower' },
  { sku: '432', name: 'Snow Cake',                   category: 'flower' },
  { sku: '438', name: 'Blackberry Gelato',           category: 'flower' },
  { sku: '472', name: 'King Jama',                   category: 'flower' },
  { sku: '473', name: 'Passion Fruit Punch',         category: 'flower' },
  { sku: '474', name: 'Cherry Rainbow',              category: 'flower' },
  { sku: '475', name: 'Bereshit',                    category: 'flower' },
  { sku: '476', name: 'Beach Wedding I.D',           category: 'flower' },
  { sku: '482', name: 'Persian Pie',                 category: 'flower' },
  { sku: '483', name: 'Gorilla Glue 5g G.D',        category: 'flower' },
  { sku: '486', name: 'Synergy Nova 5g I.D',        category: 'flower' },
  { sku: '493', name: 'Gorilla Glue G.D',           category: 'flower' },
  { sku: '497', name: 'Caribbean Breeze',            category: 'flower' },
  { sku: '539', name: 'Amarula Daddy',               category: 'flower' },
  { sku: '540', name: 'Sugar Cookies',               category: 'flower' },
  { sku: '544', name: 'Mango Skunk',                 category: 'flower' },
  { sku: '545', name: 'White Truffle',               category: 'flower' },
  { sku: '559', name: '2CB',                         category: 'flower' },
  { sku: '562', name: 'Ice Cream Cake',              category: 'flower' },
  { sku: '563', name: 'Gelato 41',                   category: 'flower' },
  { sku: '567', name: 'Blueberry Kush',              category: 'flower' },
  { sku: '571', name: 'Gas Face',                    category: 'flower' },
  { sku: '579', name: 'Girl Scout Cookies',          category: 'flower' },
  { sku: '580', name: 'Key Lime Pie',                category: 'flower' },
  { sku: '581', name: 'Gorilla 41',                  category: 'flower' },
  { sku: '582', name: 'Soap',                        category: 'flower' },
  { sku: '596', name: 'Mints Cookies',               category: 'flower' },
  { sku: '609', name: 'Gold Fish',                   category: 'flower' },
  { sku: '610', name: 'Lemon Berry Candy',           category: 'flower' },
  { sku: '613', name: 'Blue Sherbet',                category: 'flower' },
  { sku: '616', name: 'Bluenicorn G.D',             category: 'flower' },
  { sku: '620', name: 'Blue Cheese I.D',            category: 'flower' },
  { sku: '621', name: 'Crescendo Punch Special',     category: 'flower' },
  { sku: '678', name: 'Quantum Fusion',              category: 'flower' },
  { sku: '701', name: 'Purple Dream 5g G.D',        category: 'flower' },
  { sku: '703', name: 'The Church 5g G.D',          category: 'flower' },
  { sku: '705', name: 'Rainbow Marker 5g G.D',      category: 'flower' },
  { sku: '863', name: 'Block Berry Hydro',           category: 'flower' },
  { sku: '867', name: 'Fruit Loops',                 category: 'flower' },
  { sku: '871', name: 'Juicy J',                     category: 'flower' },
  { sku: '890', name: 'Jedi Code',                   category: 'flower' },
  { sku: '891', name: 'Bluenicorn I.D',             category: 'flower' },
  { sku: '896', name: 'J.M.O',                       category: 'flower' },
  { sku: '922', name: 'Serious Cherry 5g I.D',      category: 'flower' },
  { sku: '928', name: 'Gold Dust',                   category: 'flower' },
  { sku: '929', name: 'Platinum Jedi',               category: 'flower' },
  { sku: '955', name: 'Tequila',                     category: 'flower' },
  { sku: '956', name: 'Super Nova',                  category: 'flower' },
  { sku: '973', name: 'Chocolate Candy 5g I.D',     category: 'flower' },
  { sku: '978', name: 'Ice Cream Cake G.D',         category: 'flower' },
  { sku: '979', name: 'Gelato G.D',                 category: 'flower' },

  // ──────────────────────────────────────────────────────────────────────────
  // PRE-ROLLS (~11 products) — category: 'pre-rolls', track: 'medical'
  // ──────────────────────────────────────────────────────────────────────────
  { sku: '54',  name: 'Black Cherry Punch Pre-Roll', category: 'pre-rolls' },
  { sku: '231', name: 'Cherry Pie Pre-Roll',         category: 'pre-rolls' },
  { sku: '236', name: 'Crumble Lime Pre-Roll',       category: 'pre-rolls' },
  { sku: '237', name: 'Jack Herer Pre-Roll',         category: 'pre-rolls' },
  { sku: '441', name: 'Grapefruit Gift Pre-Roll',    category: 'pre-rolls' },
  { sku: '442', name: 'Apple Stank Pre-Roll',        category: 'pre-rolls' },
  { sku: '470', name: 'Permanent Marker Pre-Roll',   category: 'pre-rolls' },
  { sku: '471', name: 'Moroccan Kush Pre-Roll',      category: 'pre-rolls' },
  { sku: '492', name: 'Sour Punch Pre-Roll',         category: 'pre-rolls' },
  { sku: '494', name: 'Train Wreck Pre-Roll',        category: 'pre-rolls' },
  { sku: '924', name: 'Gorilla Glue Pre-Roll',       category: 'pre-rolls' },

  // ──────────────────────────────────────────────────────────────────────────
  // JUST BLAZE PRE-ROLLS (~27 products) — category: 'pre-rolls', track: 'medical'
  // ──────────────────────────────────────────────────────────────────────────
  { sku: '72',  name: 'JB Pineapple Skittles',       category: 'pre-rolls' },
  { sku: '129', name: 'JB Honey-Comb',               category: 'pre-rolls' },
  { sku: '292', name: 'JB M.A.C',                    category: 'pre-rolls' },
  { sku: '448', name: 'JB Slurricane',               category: 'pre-rolls' },
  { sku: '542', name: 'JB LA Confidential',          category: 'pre-rolls' },
  { sku: '543', name: 'JB Tropical Cookies',         category: 'pre-rolls' },
  { sku: '564', name: 'JB Pineapple Kush',           category: 'pre-rolls' },
  { sku: '565', name: 'JB Blue Viking',              category: 'pre-rolls' },
  { sku: '566', name: 'JB Rasta Wedding',            category: 'pre-rolls' },
  { sku: '575', name: 'JB Alien Candi',              category: 'pre-rolls' },
  { sku: '577', name: 'JB Grim Reefer',              category: 'pre-rolls' },
  { sku: '599', name: 'JB Buddaman',                 category: 'pre-rolls' },
  { sku: '603', name: 'JB Animal Cracker',           category: 'pre-rolls' },
  { sku: '606', name: 'JB Sticky Lips',              category: 'pre-rolls' },
  { sku: '635', name: 'JB Fruit Basket',             category: 'pre-rolls' },
  { sku: '661', name: 'JB Highway 420',              category: 'pre-rolls' },
  { sku: '667', name: 'JB Gorilla Skittles',         category: 'pre-rolls' },
  { sku: '668', name: 'JB Mint Trinity',             category: 'pre-rolls' },
  { sku: '669', name: 'JB Strawberry Lemonade',      category: 'pre-rolls' },
  { sku: '670', name: 'JB Space Cake',               category: 'pre-rolls' },
  { sku: '673', name: 'JB Skittles Shake',           category: 'pre-rolls' },
  { sku: '675', name: 'JB Pineapple Jet',            category: 'pre-rolls' },
  { sku: '677', name: 'JB Bluney Cake',              category: 'pre-rolls' },
  { sku: '932', name: 'JB Sour Apple',               category: 'pre-rolls' },
  { sku: '937', name: 'JB Hurricane',                category: 'pre-rolls' },
  { sku: '939', name: 'JB Creme Brulee',             category: 'pre-rolls' },
  { sku: '967', name: 'JB Permafrost',               category: 'pre-rolls' },

  // ──────────────────────────────────────────────────────────────────────────
  // EDIBLES (~34 products) — category: 'edibles', track: 'medical'
  // ──────────────────────────────────────────────────────────────────────────
  { sku: '27',   name: 'Buzz Pops 120mg Single',         category: 'edibles' },
  { sku: '30',   name: 'Fruit Pastilles 150mg Single',   category: 'edibles' },
  { sku: '33',   name: 'Rainbow Strips Single',          category: 'edibles' },
  { sku: '34',   name: 'Cookies 90mg Single',            category: 'edibles' },
  { sku: '62',   name: 'Gummy Bears 150mg Single',       category: 'edibles' },
  { sku: '63',   name: 'Wacky Worms Single',             category: 'edibles' },
  { sku: '64',   name: 'Loaded Leaf 240mg Single',       category: 'edibles' },
  { sku: '66',   name: 'Toffees 330mg',                  category: 'edibles' },
  { sku: '80',   name: 'Love Bites Single',              category: 'edibles' },
  { sku: '103',  name: 'Brownies 40mg',                  category: 'edibles' },
  { sku: '107',  name: 'Coconut Wheels',                 category: 'edibles' },
  { sku: '111',  name: 'Buzz Pops 120mg Single (v2)',    category: 'edibles' },
  { sku: '115',  name: 'OG Gummies 330mg Single',        category: 'edibles' },
  { sku: '116',  name: 'Toffees 330mg Single',           category: 'edibles' },
  { sku: '186',  name: 'Toffees 330mg (Pack)',           category: 'edibles' },
  { sku: '202',  name: 'Red Vines Ropes 200mg Single',   category: 'edibles' },
  { sku: '203',  name: 'Wacky Worms Single (v2)',        category: 'edibles' },
  { sku: '204',  name: 'Rainbow Strips Single (v2)',     category: 'edibles' },
  { sku: '205',  name: 'Coconut Wheels Single',          category: 'edibles' },
  { sku: '206',  name: 'Gummies Single',                 category: 'edibles' },
  { sku: '245',  name: 'Blazed Blocks Single',           category: 'edibles' },
  { sku: '247',  name: 'Medibles Single',                category: 'edibles' },
  { sku: '275',  name: 'Love Bites 300mg',               category: 'edibles' },
  { sku: '276',  name: 'Coconut Wheels 150mg',           category: 'edibles' },
  { sku: '307',  name: 'Blazed Blocks 150mg Single',     category: 'edibles' },
  { sku: '345',  name: 'Coconut Ice Bar 150g',           category: 'edibles' },
  { sku: '465',  name: 'Peanut Brittle 100mg',           category: 'edibles' },
  { sku: '638',  name: 'Kings Original Gummies 100mg',   category: 'edibles' },
  { sku: '639',  name: 'Kings Original Lollipop 15mg',   category: 'edibles' },
  { sku: '641',  name: 'Kings Original Lollipop 60mg',   category: 'edibles' },
  { sku: '642',  name: 'Kings Original Lollipop 90mg',   category: 'edibles' },
  { sku: '864',  name: 'Toffees 330mg Single (v2)',      category: 'edibles' },
  { sku: '906',  name: 'Wacky Worms 150mg',              category: 'edibles' },
  { sku: '1004', name: 'Rice Krispies',                  category: 'edibles' },

  // ──────────────────────────────────────────────────────────────────────────
  // VAPES (~1 product) — category: 'vapes', track: 'medical'
  // ──────────────────────────────────────────────────────────────────────────
  { sku: '637', name: '1ml Rossen Cartridge',          category: 'vapes' },

  // ──────────────────────────────────────────────────────────────────────────
  // LIFESTYLE-CBD / TOPICALS (~8 products) — track: 'lifestyle'
  // ──────────────────────────────────────────────────────────────────────────
  { sku: '74',  name: 'Diet Capsules',                category: 'lifestyle-cbd', track: 'lifestyle' },
  { sku: '76',  name: 'Sleep Capsules',               category: 'lifestyle-cbd', track: 'lifestyle' },
  { sku: '77',  name: 'Recovery Capsules',             category: 'lifestyle-cbd', track: 'lifestyle' },
  { sku: '132', name: '15mg x30 Pill',                category: 'lifestyle-cbd', track: 'lifestyle' },
  { sku: '133', name: '20mg x30 Pill',                category: 'lifestyle-cbd', track: 'lifestyle' },
  { sku: '135', name: '100ml Topical Cream',          category: 'topicals',      track: 'lifestyle' },
  { sku: '137', name: 'Starter Packs',                category: 'lifestyle-cbd', track: 'lifestyle' },
  { sku: '553', name: 'Sleep Capsules (v2)',           category: 'lifestyle-cbd', track: 'lifestyle' },
];

// ============================================================================
// MAIN
// ============================================================================

async function run() {
  console.log('='.repeat(70));
  console.log('  Create Missing POS Products');
  console.log(`  Total products to create: ${missingProducts.length}`);
  if (DRY_RUN) console.log('  *** DRY RUN — no database writes ***');
  console.log('='.repeat(70));
  console.log();

  await mongoose.connect(MONGO_URI);
  console.log(`Connected to ${MONGO_URI}\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const p of missingProducts) {
    // Check if SKU already exists
    const existing = await Product.findOne({ sku: p.sku });
    if (existing) {
      console.log(`  SKIP  sku=${p.sku} "${p.name}" — already exists as "${existing.name}"`);
      skipped++;
      continue;
    }

    // Determine track: medical by default for flower/pre-rolls/edibles/vapes/concentrates
    const medicalCategories = ['flower', 'pre-rolls', 'concentrates', 'edibles', 'oils', 'topicals', 'vapes'];
    const track = p.track || (medicalCategories.includes(p.category) ? 'medical' : 'lifestyle');

    // Default price: R0 (to be set later via MDC pipeline)
    const price = p.price || 0;

    // Auto-generate description from name + category
    const description = `${p.name} — ${p.category}`;

    const doc = {
      sku: p.sku,
      name: p.name,
      description,
      category: p.category,
      track,
      price,
      status: price > 0 ? 'active' : 'draft',
      mdcStage: price > 0 ? 'live' : 'pending',
      isPublished: price > 0,
      requiresSection21: track === 'medical',
      inventory: {
        quantity: 0,
        reserved: 0,
        lowStockThreshold: 10,
        trackQuantity: true,
        allowBackorder: false,
      },
    };

    if (DRY_RUN) {
      console.log(`  CREATE sku=${doc.sku} "${doc.name}" [${doc.category}/${doc.track}]`);
    } else {
      try {
        await Product.create(doc);
        console.log(`  CREATED sku=${doc.sku} "${doc.name}" [${doc.category}/${doc.track}]`);
      } catch (err) {
        console.error(`  ERROR  sku=${doc.sku} "${doc.name}": ${err.message}`);
        errors++;
        continue;
      }
    }
    created++;
  }

  console.log();
  console.log('='.repeat(70));
  console.log(`  Results: ${created} created, ${skipped} skipped, ${errors} errors`);
  console.log(`  Total products in DB: ${await Product.countDocuments()}`);
  console.log('='.repeat(70));

  await mongoose.disconnect();
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
