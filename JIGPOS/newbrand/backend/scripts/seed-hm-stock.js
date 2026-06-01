// Seed Harmonic Mycology products into Origin POS for Potchefstroom branch (OR-POT)
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');

const BRANCH_CODE = 'OR-POT';
const RAW = require('/Users/florisolivier/origin/inventory/HM/hm_products_clean.json');

// ── Category mapping ─────────────────────────────────────────────────────────
// Maps HM product types onto the Product model's allowed enum values:
//   categories: accessories | bundles | edibles | oils | lifestyle-cbd | ...
//   subcategories (edibles): capsules | tablets | lozenges | chocolates | gummies
//   subcategories (oils):    tinctures | cbd-oil | thc-oil | balanced-oil
//   subcategories (lifestyle-cbd): cbd-edibles | cbd-oils | cbd-topicals | ...
//   subcategories (accessories): storage | grinders | papers | ...
function mapCategory(p) {
  const n = p.name;
  if (n.includes('Bundle'))                                     return { category: 'bundles',      subcategory: null };
  if (n.includes('Grow Box') || n.includes('Mushroom - Grow')) return { category: 'accessories',   subcategory: 'storage' };
  if (n.includes('Capsule') || n.includes('Capsules'))          return { category: 'edibles',       subcategory: 'capsules' };
  if (n.includes('powder')  || n.includes('Powder'))            return { category: 'lifestyle-cbd', subcategory: 'cbd-edibles' };
  if (n.includes('extract') || n.includes('Extract'))           return { category: 'oils',          subcategory: 'tinctures' };
  if (p.type === 'Botanical extract')                           return { category: 'oils',          subcategory: 'tinctures' };
  return { category: 'lifestyle-cbd', subcategory: 'cbd-edibles' };
}

// ── Stock levels ──────────────────────────────────────────────────────────────
function stockLevels(p) {
  const n = p.name;
  if (n.includes('Bundle'))                                     return { initialStock: 5,  reorderLevel: 2 };
  if (n.includes('Grow Box') || n.includes('Mushroom - Grow')) return { initialStock: 8,  reorderLevel: 3 };
  return { initialStock: 10, reorderLevel: 3 };
}

// ── SKU generation ────────────────────────────────────────────────────────────
function makeSku(name, index) {
  const prefix = name.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase();
  return `HM-${prefix}${String(index + 1).padStart(3, '0')}`;
}

// ── Tag assembly ──────────────────────────────────────────────────────────────
function makeTags(p) {
  const base = ['harmonic-mycology', 'functional-mushrooms'];
  if (p.type && p.type.trim()) base.push(p.type.trim().toLowerCase().replace(/\s+/g, '-'));
  return base;
}

// ── Strip HTML from description snippets ─────────────────────────────────────
function stripHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').replace(/ /g, ' ').trim();
}

// ── Build product list (skip unavailable) ─────────────────────────────────────
const hmProducts = RAW
  .filter(p => p.available === true)
  .map((p, i) => {
    const { category, subcategory } = mapCategory(p);
    const { initialStock, reorderLevel } = stockLevels(p);
    const sku = makeSku(p.name, i);
    const desc = stripHtml(p.description_snippet);

    // Map image URLs to the schema's embedded object shape { url, alt, isPrimary }
    const imageObjs = (p.images || []).map((url, idx) => ({
      url,
      alt: p.name,
      isPrimary: idx === 0
    }));

    const record = {
      sku,
      name: p.name,
      category,
      track: 'lifestyle',
      price: p.price_zar,
      costPrice: Math.round(p.price_zar * 0.55 * 100) / 100,
      description: desc || p.name,
      shortDescription: p.name,
      tags: makeTags(p),
      images: imageObjs,
      sourceUrl: p.url,
      initialStock,
      reorderLevel,
      status: 'active',
      mdcStage: 'approved'
    };

    // Only set subcategory when it is a valid non-null value
    if (subcategory) record.subcategory = subcategory;

    return record;
  });

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/origin');
  console.log('Connected to MongoDB');

  const branch = await Branch.findOne({ branchCode: BRANCH_CODE });
  if (!branch) { console.error('Branch OR-POT not found'); process.exit(1); }
  console.log(`Branch: ${branch.name} (${branch._id})`);

  const totalInSource = RAW.length;
  const skippedUnavailable = RAW.filter(p => !p.available).length;
  console.log(`Source: ${totalInSource} products total, ${skippedUnavailable} skipped (unavailable), ${hmProducts.length} to process\n`);

  let created = 0, skipped = 0;

  for (const pd of hmProducts) {
    const { initialStock, reorderLevel, sourceUrl, ...productData } = pd;
    // slug is generated by the pre-save hook, but set explicitly to avoid unique collisions
    productData.slug = productData.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    try {
      const existing = await Product.findOne({ sku: productData.sku });
      if (existing) { skipped++; console.log(`  ~ ${productData.sku} — already exists, skipped`); continue; }

      const product = await Product.create(productData);

      await BranchInventory.findOneAndUpdate(
        { branchId: branch._id, productId: product._id },
        {
          branchId: branch._id,
          productId: product._id,
          quantity: initialStock,
          reorderLevel,
          isAvailable: true
        },
        { upsert: true, new: true }
      );

      created++;
      console.log(`  + ${product.sku} — ${product.name}`);
    } catch (e) {
      console.error(`  x ${productData.sku} (${pd.name}): ${e.message}`);
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped (duplicate SKU), ${skippedUnavailable} skipped (unavailable)`);
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
