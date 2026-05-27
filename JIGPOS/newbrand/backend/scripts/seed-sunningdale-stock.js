#!/usr/bin/env node
/**
 * Seed Sunningdale Branch Stock — from Receiving Log (Oct 2025 – Feb 2026)
 * 118 unique products extracted from Sunningdale Inventory Management.xlsx
 *
 * Run: node backend/scripts/seed-sunningdale-stock.js
 *
 * What this does:
 *   1. Finds the Sunningdale branch (PG-SND)
 *   2. Creates/updates Product documents for each unique item
 *   3. Sets BranchInventory with total received quantities as initial stock
 *   4. SKU format: PG-SND-001, PG-SND-002, etc.
 *   5. Retail price = costPrice * 2.5, rounded up to nearest R5
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Branch = require('../modules/database/models/Branch');
const Product = require('../modules/database/models/Product');
const BranchInventory = require('../modules/database/models/BranchInventory');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

// ─── CATEGORY MAPPING ────────────────────────────────────────
// Spreadsheet "Product Type" → POS category
const CATEGORY_MAP = {
  'Bud':          'flower',
  'Joints':       'pre-rolls',
  'Edibles':      'edibles',
  'Concentrates': 'concentrates',
  'Cooldrinks':   'lifestyle-cbd',
  'Vapes':        'vapes'
};

// ─── TAG CLASSIFICATION HELPERS ──────────────────────────────

function classifyBudTags(name) {
  const lower = name.toLowerCase();
  const tags = [];

  // Grow method detection
  if (/\bgh\b|greenhouse|outdoor|\boutdoor\b/.test(lower)) {
    tags.push('greendoor');
  } else if (/\bindoor\b|\bbigz\b|\bsmalls\b/.test(lower)) {
    tags.push('indoor');
  } else if (/\bpops?\b/.test(lower)) {
    // "pops" items are typically greenhouse/outdoor pre-packs
    tags.push('greendoor');
  } else {
    // Default bud to indoor unless indicated otherwise
    tags.push('indoor');
  }

  // Pre-pack detection
  if (/\bpops?\b|\bpop\b/.test(lower)) {
    tags.push('pre-pack');
  }

  return tags;
}

function classifyJointTags(name) {
  const lower = name.toLowerCase();
  const tags = ['pre-roll'];
  let subcategory = null;

  if (/\bbhj\b/.test(lower)) {
    subcategory = 'single-joint';
  } else if (/\bbox\b|\b5pack\b|\b5\s*pack\b/.test(lower)) {
    subcategory = '5-pack';
  }

  return { tags, subcategory };
}

// ─── PRODUCT DATA ────────────────────────────────────────────
// Extracted from Sunningdale Inventory Management.xlsx
// costPrice = most recent receiving cost per unit
// totalQty  = sum of all received quantities
//
// Multi-type products (same name, different product types in spreadsheet):
//   - "Sour diesel": Bud (40 qty, R47) and Joints (50 qty, R22) → separate products
//   - "Gelato": Bud (50 qty, R35) and Joints (50 qty, R35) → separate products
//   - "Black cherry punch s": mostly Joints (1250 qty) + 1 Bud entry (100 qty) → treat as Joints
//   - "Orange kush cake": mostly Bud (218 qty) + 1 Edibles entry (50 qty) → treat as Bud
//   - "Weed leaf 20mg": listed under Edibles but name in user spec under Bud too → keep as Edibles
//   - "Elements gh"/"Elements GH": same product, different casing → merged

const sunningdaleProducts = [

  // ════════════════════════════════════════════════════════════
  // BUD / FLOWER — 85 items (including split multi-type items)
  // ════════════════════════════════════════════════════════════
  { name: 'Pink panties',              type: 'Bud', totalQty: 1350, costPrice: 55 },
  { name: 'Pink panties pop',          type: 'Bud', totalQty: 1085, costPrice: 20 },
  { name: 'Cheese pops',              type: 'Bud', totalQty: 1299, costPrice: 20 },
  { name: 'Mexican red hair',         type: 'Bud', totalQty: 854,  costPrice: 20 },
  { name: 'Blue dreams',              type: 'Bud', totalQty: 599,  costPrice: 60 },
  { name: 'Zoap pops',                type: 'Bud', totalQty: 494,  costPrice: 20 },
  { name: 'Super skunk',              type: 'Bud', totalQty: 448,  costPrice: 7 },
  { name: 'Gmo',                      type: 'Bud', totalQty: 420,  costPrice: 55 },
  { name: 'Outdoor',                  type: 'Bud', totalQty: 358,  costPrice: 7 },
  { name: 'Purple gas',               type: 'Bud', totalQty: 325,  costPrice: 10 },
  { name: 'Ameretto Di lemon',        type: 'Bud', totalQty: 310,  costPrice: 13 },
  { name: 'Orange kush cake',         type: 'Bud', totalQty: 268,  costPrice: 40 },
  { name: 'Biscotti cream',           type: 'Bud', totalQty: 265,  costPrice: 13 },
  { name: 'Creamery',                 type: 'Bud', totalQty: 250,  costPrice: 27 },
  { name: 'Lemon cherry gelato',      type: 'Bud', totalQty: 230,  costPrice: 40 },
  { name: 'London loud cake',         type: 'Bud', totalQty: 229,  costPrice: 50 },
  { name: 'Rajuili 1g',               type: 'Bud', totalQty: 215,  costPrice: 65 },
  { name: 'Strawberry cough',         type: 'Bud', totalQty: 212,  costPrice: 60 },
  { name: 'Animal tsunami',           type: 'Bud', totalQty: 195,  costPrice: 13 },
  { name: 'Mimosa Evo',               type: 'Bud', totalQty: 195,  costPrice: 13 },
  { name: 'Caramel apple gelato',     type: 'Bud', totalQty: 194,  costPrice: 35 },
  { name: 'Rainbow zoap',             type: 'Bud', totalQty: 194,  costPrice: 35 },
  { name: 'Blue cheese',              type: 'Bud', totalQty: 180,  costPrice: 47 },
  { name: 'Fat bastard',              type: 'Bud', totalQty: 180,  costPrice: 20 },
  { name: 'Black Sunday',             type: 'Bud', totalQty: 175,  costPrice: 40 },
  { name: 'Platinum kush',            type: 'Bud', totalQty: 175,  costPrice: 40 },
  { name: 'Los Angeles kush',         type: 'Bud', totalQty: 172,  costPrice: 55 },
  { name: 'Biscozzi',                 type: 'Bud', totalQty: 170,  costPrice: 45 },
  { name: 'Strawberry shortcake',     type: 'Bud', totalQty: 170,  costPrice: 60 },
  { name: 'UK cheese pops',           type: 'Bud', totalQty: 160,  costPrice: 17 },
  { name: 'Fruity pebbles gh keen',   type: 'Bud', totalQty: 155,  costPrice: 20 },
  { name: 'Tropical cookies',         type: 'Bud', totalQty: 155,  costPrice: 40 },
  { name: 'Dirty bird',               type: 'Bud', totalQty: 150,  costPrice: 16 },
  { name: 'Gelato pops',              type: 'Bud', totalQty: 150,  costPrice: 13 },
  { name: 'Orange cookies',           type: 'Bud', totalQty: 150,  costPrice: 27 },
  { name: 'Planet of the grapes',     type: 'Bud', totalQty: 135,  costPrice: 55 },
  { name: 'Sunset sherbet',           type: 'Bud', totalQty: 133,  costPrice: 60 },
  { name: 'Grape soda gh',            type: 'Bud', totalQty: 125,  costPrice: 20 },
  { name: 'Monster zkittles',         type: 'Bud', totalQty: 116,  costPrice: 35 },
  { name: 'Mimosa',                   type: 'Bud', totalQty: 105,  costPrice: 40 },
  { name: 'Northern lights pops',     type: 'Bud', totalQty: 100,  costPrice: 27 },
  { name: 'Candy express gh',         type: 'Bud', totalQty: 100,  costPrice: 16 },
  { name: 'Grape gasoline',           type: 'Bud', totalQty: 100,  costPrice: 33 },
  { name: 'Grapefruit gorilla',       type: 'Bud', totalQty: 100,  costPrice: 36 },
  { name: 'Jealousy',                 type: 'Bud', totalQty: 100,  costPrice: 60 },
  { name: 'Mac n cheese gh',          type: 'Bud', totalQty: 100,  costPrice: 18 },
  { name: 'Princess peaches',         type: 'Bud', totalQty: 100,  costPrice: 40 },
  { name: 'Puppies breath',           type: 'Bud', totalQty: 100,  costPrice: 18 },
  { name: 'Zkittles',                 type: 'Bud', totalQty: 100,  costPrice: 40 },
  { name: 'Tart pop indoor',          type: 'Bud', totalQty: 98,   costPrice: 43 },
  { name: 'Cherry pie',               type: 'Bud', totalQty: 97,   costPrice: 37 },
  { name: 'Ice cream dream',          type: 'Bud', totalQty: 95,   costPrice: 50 },
  { name: 'Blue berry',               type: 'Bud', totalQty: 95,   costPrice: 45 },
  { name: 'Green Crack',              type: 'Bud', totalQty: 93,   costPrice: 40 },
  { name: 'Mac',                      type: 'Bud', totalQty: 90,   costPrice: 45 },
  { name: 'Orange cannoli',           type: 'Bud', totalQty: 85,   costPrice: 50 },
  { name: 'Jet fuel',                 type: 'Bud', totalQty: 70,   costPrice: 40 },
  { name: 'Cali gold',                type: 'Bud', totalQty: 61,   costPrice: 14 },
  { name: 'Rainbow belt',             type: 'Bud', totalQty: 61,   costPrice: 24 },
  { name: 'Laser fuel',               type: 'Bud', totalQty: 50,   costPrice: 27 },
  { name: 'Kiwi berry kush pops',     type: 'Bud', totalQty: 50,   costPrice: 27 },
  { name: 'Animal mintz',             type: 'Bud', totalQty: 50,   costPrice: 27 },
  { name: 'Nebula',                   type: 'Bud', totalQty: 50,   costPrice: 27 },
  { name: 'Pot of gold',              type: 'Bud', totalQty: 50,   costPrice: 40 },
  { name: 'Elder berry',              type: 'Bud', totalQty: 50,   costPrice: 35 },
  { name: 'Gelato cheese',            type: 'Bud', totalQty: 50,   costPrice: 35 },
  { name: 'Fruity pebbles gh',        type: 'Bud', totalQty: 48,   costPrice: 18 },
  { name: 'Runts gh',                 type: 'Bud', totalQty: 48,   costPrice: 18 },
  { name: 'Grape pops',               type: 'Bud', totalQty: 50,   costPrice: 18 },
  { name: 'Tart pop gh',              type: 'Bud', totalQty: 49,   costPrice: 18 },
  { name: 'Banana cookie crunch',     type: 'Bud', totalQty: 40,   costPrice: 40 },
  { name: 'Sour diesel',              type: 'Bud', totalQty: 40,   costPrice: 47 },
  { name: 'El chivo',                 type: 'Bud', totalQty: 35,   costPrice: 40 },
  { name: 'Beach wedding',            type: 'Bud', totalQty: 31,   costPrice: 45 },
  { name: 'Gelato',                   type: 'Bud', totalQty: 50,   costPrice: 35 },
  { name: 'Cali crush bigz',          type: 'Bud', totalQty: 21,   costPrice: 325 },
  { name: 'French toast',             type: 'Bud', totalQty: 17,   costPrice: 60 },
  { name: 'Cali crush smalls',        type: 'Bud', totalQty: 12,   costPrice: 175 },
  { name: 'Dante\'s inferno (smalls)', type: 'Bud', totalQty: 9,   costPrice: 175 },
  { name: 'Red dragon (smalls)',       type: 'Bud', totalQty: 9,   costPrice: 175 },
  { name: 'Runtz (smalls)',            type: 'Bud', totalQty: 9,   costPrice: 175 },
  { name: 'Mango crush',              type: 'Bud', totalQty: 5,    costPrice: 330 },
  { name: 'Red dragon (bigz)',         type: 'Bud', totalQty: 5,   costPrice: 330 },
  { name: 'Runtz (bigz)',              type: 'Bud', totalQty: 5,   costPrice: 330 },
  { name: 'O.g sour',                 type: 'Bud', totalQty: 185,  costPrice: 13 },

  // ════════════════════════════════════════════════════════════
  // JOINTS / PRE-ROLLS — 26 items
  // ════════════════════════════════════════════════════════════
  { name: 'Black cherry punch s',     type: 'Joints', totalQty: 1350, costPrice: 20 },
  { name: 'Bluenicorn s',             type: 'Joints', totalQty: 1000, costPrice: 20 },
  { name: 'Backwoods singles',        type: 'Joints', totalQty: 648,  costPrice: 50 },
  { name: 'Bluenicorn ks loose',      type: 'Joints', totalQty: 469,  costPrice: 25 },
  { name: 'Diesel bhj',               type: 'Joints', totalQty: 387,  costPrice: 25 },
  { name: 'Moonsticks',               type: 'Joints', totalQty: 300,  costPrice: 35 },
  { name: 'Candy express 1\'s tube',  type: 'Joints', totalQty: 186,  costPrice: 25 },
  { name: 'Moonsettler bhj',          type: 'Joints', totalQty: 188,  costPrice: 80 },
  { name: 'Rajuili J\'s',             type: 'Joints', totalQty: 145,  costPrice: 62.5 },
  { name: 'Diesel ks 3\'s',           type: 'Joints', totalQty: 135,  costPrice: 60 },
  { name: 'Elements GH',              type: 'Joints', totalQty: 130,  costPrice: 32 },
  { name: 'Candy express loose',       type: 'Joints', totalQty: 100, costPrice: 25 },
  { name: 'Candy express loose ks',    type: 'Joints', totalQty: 100, costPrice: 25 },
  { name: 'Diesel KS loose',           type: 'Joints', totalQty: 100, costPrice: 25 },
  { name: 'Gelato J',                  type: 'Joints', totalQty: 50,  costPrice: 35 },
  { name: 'Ray KS',                    type: 'Joints', totalQty: 100, costPrice: 8 },
  { name: 'Ray S',                     type: 'Joints', totalQty: 100, costPrice: 7 },
  { name: 'Sour diesel J',             type: 'Joints', totalQty: 50,  costPrice: 22 },
  { name: 'Bluenicorn ks tube',        type: 'Joints', totalQty: 72,  costPrice: 35 },
  { name: 'In-house bhj',              type: 'Joints', totalQty: 30,  costPrice: 25 },
  { name: 'BHJ',                        type: 'Joints', totalQty: 20, costPrice: 24 },
  { name: 'Backwoods 5pack',            type: 'Joints', totalQty: 20, costPrice: 212.5 },
  { name: 'Black cherry punch loose',   type: 'Joints', totalQty: 20, costPrice: 25 },
  { name: 'Candy express box',          type: 'Joints', totalQty: 18, costPrice: 100 },
  { name: 'Diesel 2\'s',                type: 'Joints', totalQty: 17, costPrice: 50 },
  { name: 'Black cherry punch ks tube', type: 'Joints', totalQty: 10, costPrice: 35 },

  // ════════════════════════════════════════════════════════════
  // EDIBLES — 6 items
  // ════════════════════════════════════════════════════════════
  { name: 'Golden green 50mg',  type: 'Edibles', totalQty: 282,  costPrice: 360 },
  { name: 'Weed leaf 20mg',     type: 'Edibles', totalQty: 120,  costPrice: 10 },
  { name: 'Green lion 30mg',    type: 'Edibles', totalQty: 22,   costPrice: 210 },
  { name: 'Golden green 10mg',  type: 'Edibles', totalQty: 7,    costPrice: 120 },
  { name: 'Green lion 10mg',    type: 'Edibles', totalQty: 4,    costPrice: 130 },
  { name: 'Mothership 100mg',   type: 'Edibles', totalQty: 3,    costPrice: 350 },

  // ════════════════════════════════════════════════════════════
  // CONCENTRATES — 1 item
  // ════════════════════════════════════════════════════════════
  { name: 'Pacman 2ml',  type: 'Concentrates', totalQty: 4,  costPrice: 400 },

  // ════════════════════════════════════════════════════════════
  // COOLDRINKS — 1 item
  // ════════════════════════════════════════════════════════════
  { name: 'Green lion',  type: 'Cooldrinks', totalQty: 64,  costPrice: 30 },

  // ════════════════════════════════════════════════════════════
  // VAPES — 1 item
  // ════════════════════════════════════════════════════════════
  { name: 'Cookie boss vapes', type: 'Vapes', totalQty: 10, costPrice: 275 },
];

// ─── RETAIL PRICE CALCULATION ─────────────────────────────────
// Markup 2.5x, round up to nearest R5
function calcRetail(costPrice) {
  return Math.ceil(costPrice * 2.5 / 5) * 5;
}

// ─── GENERATE SKU ─────────────────────────────────────────────
function generateSku(index) {
  return `PG-SND-${String(index).padStart(3, '0')}`;
}

// ─── SEED FUNCTION ────────────────────────────────────────────
async function seedSunningdaleStock() {
  console.log('================================================');
  console.log('  SEEDING SUNNINGDALE — RECEIVING LOG DATA');
  console.log(`  ${sunningdaleProducts.length} products from Oct 2025 – Feb 2026`);
  console.log('================================================\n');

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected:', MONGODB_URI);

    // 1. Find Sunningdale branch
    console.log('\n1. Finding Sunningdale Branch...');
    const branch = await Branch.findOne({
      $or: [
        { branchCode: 'PG-SND' },
        { name: /sunningdale/i }
      ]
    });

    if (!branch) {
      console.error('ERROR: Sunningdale branch not found!');
      console.error('Run seed-branches.js first to create branches.');
      process.exit(1);
    }
    console.log(`   Found: ${branch.name} (${branch.branchCode}) — ID: ${branch._id}`);

    // 2. Determine next available SKU number
    //    Query for highest existing PG-SND-XXX to avoid duplicate SKU errors on re-run
    const existingSndProducts = await Product.find({ sku: /^PG-SND-/ }).select('sku').lean();
    let maxSkuNum = 0;
    for (const ep of existingSndProducts) {
      const match = ep.sku.match(/^PG-SND-(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSkuNum) maxSkuNum = num;
      }
    }
    console.log(`   Existing PG-SND-* products: ${existingSndProducts.length} (max SKU: ${maxSkuNum})`);

    // 3. Seed Products & Inventory
    console.log('\n3. Seeding Products & Inventory...\n');
    let created = 0;
    let existing = 0;
    let inventorySet = 0;
    let skuCounter = maxSkuNum + 1;

    const categoryStats = {};
    let totalCostValue = 0;
    let totalRetailValue = 0;

    for (const p of sunningdaleProducts) {
      const category = CATEGORY_MAP[p.type];
      if (!category) {
        console.warn(`   SKIP: Unknown type "${p.type}" for "${p.name}"`);
        continue;
      }

      // Calculate retail price
      const retailPrice = calcRetail(p.costPrice);

      // Build tags based on product type
      let tags = [];
      let subcategory = null;

      if (p.type === 'Bud') {
        tags = classifyBudTags(p.name);
      } else if (p.type === 'Joints') {
        const classification = classifyJointTags(p.name);
        tags = classification.tags;
        subcategory = classification.subcategory;
      } else if (p.type === 'Edibles') {
        tags = ['edible'];
      } else if (p.type === 'Concentrates') {
        tags = ['concentrate'];
      } else if (p.type === 'Cooldrinks') {
        tags = ['drink'];
      } else if (p.type === 'Vapes') {
        tags = ['vape'];
      }

      // Check if product already exists (case-insensitive)
      let product = await Product.findOne({
        name: { $regex: new RegExp(`^${escapeRegex(p.name)}$`, 'i') }
      });

      if (product) {
        // Update cost price and retail price if needed
        let updated = false;
        if (product.costPrice !== p.costPrice) {
          product.costPrice = p.costPrice;
          updated = true;
        }
        if (product.price !== retailPrice) {
          product.price = retailPrice;
          updated = true;
        }
        if (updated) {
          await product.save();
        }
        existing++;
        console.log(`   EXISTS: ${p.name} (${product.sku}) — updated prices`);
      } else {
        // Create new product
        const sku = generateSku(skuCounter++);
        const slug = p.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '');

        const productData = {
          name: p.name,
          sku: sku,
          slug: slug,
          category: category,
          price: retailPrice,
          costPrice: p.costPrice,
          description: `${p.name} — ${category}${subcategory ? ' (' + subcategory + ')' : ''}`,
          status: 'active',
          isPublished: true,
          track: 'medical',
          tags: tags,
          inventory: {
            quantity: p.totalQty,
            reserved: 0,
            lowStockThreshold: Math.max(5, Math.round(p.totalQty * 0.1)),
            trackQuantity: true,
            allowBackorder: false
          }
        };

        if (subcategory) {
          productData.subcategory = subcategory;
        }

        product = await Product.create(productData);
        created++;
        console.log(`   CREATE: ${p.name} → ${sku} | R${p.costPrice} cost → R${retailPrice} retail | ${p.totalQty} units`);
      }

      // Upsert BranchInventory
      const reorderLevel = Math.max(5, Math.round(p.totalQty * 0.1));
      await BranchInventory.findOneAndUpdate(
        { branchId: branch._id, productId: product._id },
        {
          branchId: branch._id,
          productId: product._id,
          quantity: p.totalQty,
          reserved: 0,
          lowStockThreshold: reorderLevel,
          reorderPoint: reorderLevel,
          reorderQuantity: Math.max(10, Math.round(p.totalQty * 0.25)),
          maxStock: Math.max(100, p.totalQty * 2),
          isActive: true,
          isAvailableForSale: true,
          lastRestocked: new Date(),
          lastRestockQuantity: p.totalQty,
          recentMovements: [{
            type: 'restock',
            quantity: p.totalQty,
            balanceBefore: 0,
            balanceAfter: p.totalQty,
            reference: 'SEED-SND-INITIAL',
            notes: 'Initial stock from receiving log (Oct 2025 – Feb 2026)',
            timestamp: new Date()
          }]
        },
        { upsert: true, new: true }
      );
      inventorySet++;

      // Track stats
      const catKey = p.type;
      if (!categoryStats[catKey]) {
        categoryStats[catKey] = { count: 0, units: 0, costValue: 0, retailValue: 0 };
      }
      categoryStats[catKey].count++;
      categoryStats[catKey].units += p.totalQty;
      categoryStats[catKey].costValue += p.totalQty * p.costPrice;
      categoryStats[catKey].retailValue += p.totalQty * retailPrice;
      totalCostValue += p.totalQty * p.costPrice;
      totalRetailValue += p.totalQty * retailPrice;
    }

    // ─── SUMMARY ───────────────────────────────────────────────
    console.log('\n================================================');
    console.log('  SEED SUMMARY');
    console.log('================================================');
    console.log(`  Products created:  ${created}`);
    console.log(`  Products existing: ${existing}`);
    console.log(`  Inventory records: ${inventorySet}`);
    console.log(`  Total products:    ${sunningdaleProducts.length}`);

    console.log('\n  Category Breakdown:');
    console.log('  ' + '-'.repeat(70));
    console.log('  Type            | Products | Units   | Cost Value     | Retail Value');
    console.log('  ' + '-'.repeat(70));
    for (const [cat, stats] of Object.entries(categoryStats).sort((a, b) => b[1].units - a[1].units)) {
      const type = cat.padEnd(16);
      const count = String(stats.count).padStart(8);
      const units = String(stats.units).padStart(7);
      const cost = ('R' + stats.costValue.toLocaleString('en-ZA')).padStart(14);
      const retail = ('R' + stats.retailValue.toLocaleString('en-ZA')).padStart(14);
      console.log(`  ${type}|${count} |${units} |${cost} |${retail}`);
    }
    console.log('  ' + '-'.repeat(70));
    const totalUnits = Object.values(categoryStats).reduce((s, c) => s + c.units, 0);
    console.log(`  ${'TOTAL'.padEnd(16)}|${String(sunningdaleProducts.length).padStart(8)} |${String(totalUnits).padStart(7)} |${('R' + totalCostValue.toLocaleString('en-ZA')).padStart(14)} |${('R' + totalRetailValue.toLocaleString('en-ZA')).padStart(14)}`);

    console.log('\n================================================');
    console.log('  SEEDING COMPLETE!');
    console.log('  Products & inventory only — no users touched');
    console.log('================================================');

  } catch (error) {
    console.error('\nERROR:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed.');
    process.exit(0);
  }
}

// ─── HELPER: Escape regex special characters ──────────────────
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

seedSunningdaleStock();
