// Seed Potchefstroom branch stock: Lamelle + Bio Sculpture Gemini + Harmonic Mycology
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');

const BRANCH_CODE = 'OR-POT';

// ── Lamelle Pharmaceuticals ────────────────────────────────────────────────────
const lamelleProducts = [
  {
    sku: 'LAM-MATR001', name: 'Matricoll ECM 90 Caps',
    category: 'supplements', subcategory: 'capsules', track: 'lifestyle',
    price: 790, costPrice: 508.86,
    description: 'Premium oral anti-ageing supplement with bio-active GPH peptides, marine collagen tri-peptides (Matricoll), elastin di-peptides, low-molecular-weight hyaluronic acid, astaxanthin, and niacinamide. Clinical trials demonstrate improvements in skin hydration, elasticity and wrinkle reduction.',
    shortDescription: 'Oral anti-ageing peptide supplement — 90 caps',
    barcode: '6009804352036', nappiCode: '3010716001',
    tags: ['lamelle', 'anti-ageing', 'collagen', 'peptides', 'skin-health'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 10
  },
  {
    sku: 'LAM-CEN001', name: 'Centar Lotion 100ml',
    category: 'skincare', subcategory: 'creams', track: 'lifestyle',
    price: 580, costPrice: 373.59,
    description: 'Light cream-gel emulsion for treating stretch marks and scar repair. Contains Ultra Distillate of Centella Asiatica, stabilised Copper Tri-peptide and purified Avena Sativa extract. Safe for use in pregnancy and breastfeeding.',
    shortDescription: 'Scar & stretch mark repair lotion — 100ml',
    barcode: '6009880902804', nappiCode: '3008720001',
    tags: ['lamelle', 'scar-repair', 'stretch-marks', 'centar', 'skincare'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 10
  },
  {
    sku: 'LAM-CEN002', name: 'Centar Gel 20ml',
    category: 'skincare', subcategory: 'creams', track: 'lifestyle',
    price: 290, costPrice: 186.79,
    description: 'Super-concentrate Centar offering with 6 dedicated anti-scar actives. Contains Ultra Distillate of Centella Asiatica, Copper Tri-Peptide, Avena extract, dex-panthenol, Ectoin, and HAFI fragment polymer. Safe for use during pregnancy.',
    shortDescription: 'Concentrated scar repair gel — 20ml',
    barcode: '6009880902811', nappiCode: '3008721001',
    tags: ['lamelle', 'scar-repair', 'centar', 'gel', 'skincare'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 15
  },
  {
    sku: 'LAM-NIA002', name: 'Nia-Sol Kit (60 Caps + 9ml Gel)',
    category: 'pharmacy', subcategory: 'capsules', track: 'lifestyle',
    price: 340, costPrice: 219,
    description: 'Two-part defence system for long-term UV-damaged skin presenting with pre-cancerous skin lesions (Actinic Keratosis). Capsules contain Nicotinamide, Pycnogenol and Vit D3. Gel applies directly to lesions to find and repair DNA damage.',
    shortDescription: 'Inside-out UV skin protection kit',
    barcode: '6009880902255', nappiCode: '3004319001',
    tags: ['lamelle', 'nia-sol', 'uv-protection', 'actinic-keratosis', 'sun-damage'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 8
  },
  {
    sku: 'LAM-NIA001', name: 'Nia-Sol Lotion 125ml',
    category: 'pharmacy', subcategory: 'creams', track: 'lifestyle',
    price: 380, costPrice: 244.76,
    description: 'Ceramide-based lotion for sun-damaged skin presenting with Actinic Keratosis. Contains Ceramides, Photolyase and Panthenol to find and repair DNA damage in dry, damaged skin.',
    shortDescription: 'Ceramide lotion for UV-damaged skin — 125ml',
    barcode: '6009880902262', nappiCode: '3005950001',
    tags: ['lamelle', 'nia-sol', 'uv-damage', 'ceramides', 'actinic-keratosis'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 8
  },
  {
    sku: 'LAM-NIA003', name: 'Nia-Sol Gel 125ml',
    category: 'pharmacy', subcategory: 'creams', track: 'lifestyle',
    price: 360, costPrice: 231.88,
    description: 'High-dose Nicotinamide and Photolyase gel to correct long-term UV damage presenting with Actinic Keratosis. Addresses DNA damage and restores healthy skin.',
    shortDescription: 'UV-damage correction gel — 125ml',
    barcode: '6009880902781', nappiCode: '3007919001',
    tags: ['lamelle', 'nia-sol', 'uv-damage', 'nicotinamide', 'photolyase'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 8
  },
  {
    sku: 'LAM-OVA001', name: 'Ovaria Orange 30 Sachets',
    category: 'supplements', subcategory: 'capsules', track: 'lifestyle',
    price: 440, costPrice: 283.41,
    description: 'Contains 4000mg Myoinositol — the clinically proven daily dose for PCOS symptoms. Helps normalise blood insulin levels, improving weight, fertility, oily skin, acne and hair growth. Sugarfree. Halal certified. Suitable for vegans.',
    shortDescription: 'PCOS supplement — 30 sachets (orange flavour)',
    barcode: '6009880902125', nappiCode: '3002155001',
    tags: ['lamelle', 'ovaria', 'pcos', 'womens-health', 'myo-inositol'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 12
  },
  {
    sku: 'LAM-OVA002', name: 'Ovaria Peach 30 Sachets',
    category: 'supplements', subcategory: 'capsules', track: 'lifestyle',
    price: 440, costPrice: 283.41,
    description: 'Contains 4000mg Myoinositol — the clinically proven daily dose for PCOS symptoms. Helps normalise blood insulin levels, improving weight, fertility, oily skin, acne and hair growth. Sugarfree. Halal certified. Suitable for vegans.',
    shortDescription: 'PCOS supplement — 30 sachets (peach flavour)',
    barcode: '6009880902118', nappiCode: '3002156001',
    tags: ['lamelle', 'ovaria', 'pcos', 'womens-health', 'myo-inositol'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 12
  },
  {
    sku: 'LAM-PRE004', name: 'Prelox Male Enhancement 20 Caps',
    category: 'supplements', subcategory: 'capsules', track: 'lifestyle',
    price: 290, costPrice: 186.79,
    description: 'Patented combination of L-Arginine and Pycnogenol clinically proven to increase a man\'s ability to achieve and sustain an erection. Stimulates circulation, protects blood vessels and enhances sexual stamina. Halal certified. Suitable for vegans.',
    shortDescription: 'Male enhancement supplement — 20 caps',
    barcode: '6009825730769', nappiCode: '719427002',
    tags: ['lamelle', 'prelox', 'mens-health', 'sexual-health', 'pycnogenol'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 10
  },
  {
    sku: 'LAM-PRE002', name: 'Prelox Male Enhancement 60 Caps',
    category: 'supplements', subcategory: 'capsules', track: 'lifestyle',
    price: 795, costPrice: 512.07,
    description: 'Patented combination of L-Arginine and Pycnogenol clinically proven to increase a man\'s ability to achieve and sustain an erection. Stimulates circulation, protects blood vessels and enhances sexual stamina. Halal certified. Suitable for vegans.',
    shortDescription: 'Male enhancement supplement — 60 caps',
    barcode: '6009825730653', nappiCode: '719427001',
    tags: ['lamelle', 'prelox', 'mens-health', 'sexual-health', 'pycnogenol'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 10
  },
  {
    sku: 'LAM-PRE001', name: 'Prelox Male Fertility 60 Caps',
    category: 'supplements', subcategory: 'capsules', track: 'lifestyle',
    price: 795, costPrice: 512.07,
    description: 'Patented formula to improve male fertility. Improved sperm concentration 83%, improved morphology 93%. Contains Pycnogenol and L-arginine. No side effects reported. Halal certified. Suitable for vegans.',
    shortDescription: 'Male fertility supplement — 60 caps',
    barcode: '6009825730615', nappiCode: '3004356001',
    tags: ['lamelle', 'prelox', 'mens-health', 'fertility', 'pycnogenol'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 8
  },
  {
    sku: 'LAM-PRE005', name: 'Lady Prelox Intimacy 60 Caps',
    category: 'supplements', subcategory: 'capsules', track: 'lifestyle',
    price: 795, costPrice: 512.07,
    description: 'Patented female intimacy supplement with Pycnogenol, Rose Hip, L-Arginine and L-Citrulline. Increases blood flow and significantly improves menopausal symptoms without interfering with sex hormone levels. Halal certified. Suitable for vegans.',
    shortDescription: 'Female intimacy supplement — 60 caps',
    barcode: '6009804352005', nappiCode: '3009335001',
    tags: ['lamelle', 'lady-prelox', 'womens-health', 'intimacy', 'menopause'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 8
  },
  {
    sku: 'LAM-PRE006', name: 'Lady Prelox Menopause 60 Caps',
    category: 'supplements', subcategory: 'capsules', track: 'lifestyle',
    price: 795, costPrice: 512.07,
    description: 'Patented female supplement with 4 premium plant-based ingredients including Pycnogenol for peri and post menopausal women. Improves menopausal symptoms without interfering with hormone levels. Halal certified. Suitable for vegans.',
    shortDescription: 'Menopause support supplement — 60 caps',
    barcode: '6009804352012', nappiCode: '3009320001',
    tags: ['lamelle', 'lady-prelox', 'womens-health', 'menopause', 'pycnogenol'],
    supplier: 'Lamelle Pharmaceuticals', initialStock: 8
  }
];

// ── Bio Sculpture Gemini (first 50 colours as starter stock) ─────────────────
const geminiData = require('/var/www/origin/inventory/BioSculpture/biosculpture_gemini_full.json');
const geminiProducts = geminiData.slice(0, 50).map(p => ({
  sku: `BS-${p.product_number}`,
  name: p.name.trim(),
  category: 'nail-care',
  track: 'lifestyle',
  price: p.rsp_incl_vat,
  costPrice: Math.round(p.rsp_incl_vat * 0.55 * 100) / 100,
  description: `Bio Sculpture Gemini professional nail gel — ${p.name.trim()}. 14ml UV/LED cured gel colour. Long-lasting, flexible and chip-resistant. Suitable for natural nails.`,
  shortDescription: `Gemini Gel ${p.name.replace('14ml Gemini ', '')} — 14ml`,
  tags: ['bio-sculpture', 'gemini', 'nail-gel', 'uv-gel', 'beauty'],
  supplier: 'Bio Sculpture',
  initialStock: 5
}));

// ── Main ──────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/origin');
  console.log('Connected to MongoDB');

  const branch = await Branch.findOne({ branchCode: BRANCH_CODE });
  if (!branch) { console.error('Branch OR-POT not found'); process.exit(1); }
  console.log(`Branch: ${branch.name} (${branch._id})`);

  const allProducts = [...lamelleProducts, ...geminiProducts];
  let created = 0, skipped = 0;

  for (const pd of allProducts) {
    const { initialStock, supplier, nappiCode, ...productData } = pd;
    productData.slug = productData.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    productData.isActive = true;
    productData.status = 'active';
    productData.mdcStage = 'approved';
    productData['inventory.quantity'] = initialStock;
    if (nappiCode) productData.barcode = productData.barcode || nappiCode;

    try {
      const existing = await Product.findOne({ sku: productData.sku });
      if (existing) { skipped++; continue; }

      const product = await Product.create(productData);

      await BranchInventory.findOneAndUpdate(
        { branchId: branch._id, productId: product._id },
        {
          branchId: branch._id,
          productId: product._id,
          quantity: initialStock,
          reorderLevel: 3,
          isAvailable: true
        },
        { upsert: true, new: true }
      );
      created++;
      console.log(`  + ${product.sku} — ${product.name}`);
    } catch (e) {
      console.error(`  ✗ ${productData.sku}: ${e.message}`);
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
