// Seed Origin Teas (OT) — 14 individual herbs into Potchefstroom branch
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');

const BRANCH_CODE = 'OR-POT';

const OT_TEAS = [
  {
    sku: 'OT-BLU001', name: 'Blue Lotus Herb 30g',
    price: 180, costPrice: 99,
    shortDescription: 'Ceremonial Blue Lotus — relaxation & vivid dreaming',
    description: 'Nymphaea caerulea — ceremonial herb with a long history of use for deep relaxation, mild euphoria and vivid dreaming. Gently floral and subtly sweet. Brew at 90°C for 5 minutes. Use sparingly. Pairs beautifully with Lavender or Rose.',
    tags: ['blue-lotus', 'relaxation', 'ceremonial', 'sleep', 'floral', 'herbal-tea'],
    brewTemp: '90°C', brewTime: '5 min', initialStock: 15
  },
  {
    sku: 'OT-CAL001', name: 'Calendula Flowers 30g',
    price: 95, costPrice: 52,
    shortDescription: 'Calendula — skin health & anti-inflammatory',
    description: 'Calendula officinalis — bright orange petals with earthy, slightly bitter notes. A classic herb for skin health, lymphatic support and gentle anti-inflammatory action. Brew at 95°C for 7 minutes. Blends well with Rose and Chamomile.',
    tags: ['calendula', 'skin-health', 'anti-inflammatory', 'floral', 'herbal-tea'],
    brewTemp: '95°C', brewTime: '7 min', initialStock: 20
  },
  {
    sku: 'OT-CHA001', name: 'Chamomile Flowers 30g',
    price: 85, costPrice: 47,
    shortDescription: 'Chamomile — deep sleep & digestive calm',
    description: 'Matricaria chamomilla — apple-like, honey notes with a mild, comforting character. South Africa\'s most beloved bedtime herb. Promotes deep sleep, relieves anxiety and soothes digestive spasms. Brew at 90°C for 5 minutes.',
    tags: ['chamomile', 'sleep', 'anxiety', 'digestion', 'floral', 'herbal-tea'],
    brewTemp: '90°C', brewTime: '5 min', initialStock: 25
  },
  {
    sku: 'OT-DAN001', name: 'Dandelion Root 30g',
    price: 90, costPrice: 50,
    shortDescription: 'Dandelion — liver detox & digestive bitters',
    description: 'Taraxacum officinale — earthy, slightly bitter with a roasted depth. A powerful liver tonic and digestive bitter rich in vitamins A, C and K. Supports healthy bile production and natural detoxification. Brew at 100°C for 10 minutes.',
    tags: ['dandelion', 'liver', 'detox', 'digestion', 'bitter', 'herbal-tea'],
    brewTemp: '100°C', brewTime: '10 min', initialStock: 20
  },
  {
    sku: 'OT-ECH001', name: 'Echinacea Herb 30g',
    price: 120, costPrice: 66,
    shortDescription: 'Echinacea — immune boost & cold defence',
    description: 'Echinacea purpurea — earthy, slightly spicy with a characteristic tingling sensation on the tongue. The go-to herb for immune support, cold and flu defence and upper respiratory health. Brew at 95°C for 8 minutes.',
    tags: ['echinacea', 'immune', 'cold-flu', 'anti-viral', 'herbal-tea'],
    brewTemp: '95°C', brewTime: '8 min', initialStock: 20
  },
  {
    sku: 'OT-GIN001', name: 'Ginger Root 30g',
    price: 75, costPrice: 41,
    shortDescription: 'Ginger — circulation, digestion & anti-nausea',
    description: 'Zingiber officinale — warming, spicy and zesty. Ginger ignites digestive fire, relieves nausea, boosts circulation and reduces inflammation. A versatile foundation herb that pairs with almost anything. Brew at 100°C for 10 minutes.',
    tags: ['ginger', 'digestion', 'anti-nausea', 'circulation', 'warming', 'herbal-tea'],
    brewTemp: '100°C', brewTime: '10 min', initialStock: 30
  },
  {
    sku: 'OT-HOP001', name: 'Hops Strobile 30g',
    price: 95, costPrice: 52,
    shortDescription: 'Hops — sleep induction & anxiety relief',
    description: 'Humulus lupulus — bitter, earthy and slightly floral. Hops are a powerful sedative herb for sleep induction and anxiety relief. Historically combined with Valerian and Passionflower for sleep blends. Not recommended during pregnancy. Brew at 90°C for 5 minutes.',
    tags: ['hops', 'sleep', 'sedative', 'anxiety', 'herbal-tea'],
    brewTemp: '90°C', brewTime: '5 min', initialStock: 15
  },
  {
    sku: 'OT-LAV001', name: 'Lavender Flowers 30g',
    price: 110, costPrice: 60,
    shortDescription: 'Lavender — relaxation, mood lift & headache relief',
    description: 'Lavandula angustifolia — intensely floral, sweet and aromatic. Use light-handed — lavender is potent. Promotes relaxation, lifts mood, relieves headaches and improves sleep quality. Brew at 85°C for 4 minutes. Exquisite with Chamomile and Rose.',
    tags: ['lavender', 'relaxation', 'mood', 'headache', 'floral', 'herbal-tea'],
    brewTemp: '85°C', brewTime: '4 min', initialStock: 20
  },
  {
    sku: 'OT-LEM001', name: 'Lemon Balm Herb 30g',
    price: 95, costPrice: 52,
    shortDescription: 'Lemon Balm — cognitive calm & anxiety relief',
    description: 'Melissa officinalis — bright lemon, mint and delicate floral notes. A remarkable herb that simultaneously calms the nervous system and supports cognitive clarity. Anti-viral properties. Brew at 90°C for 5 minutes. Combines beautifully with Peppermint.',
    tags: ['lemon-balm', 'anxiety', 'cognitive', 'digestion', 'lemon', 'herbal-tea'],
    brewTemp: '90°C', brewTime: '5 min', initialStock: 20
  },
  {
    sku: 'OT-PAS001', name: 'Passionflower Herb 30g',
    price: 130, costPrice: 72,
    shortDescription: 'Passionflower — deep relaxation & insomnia relief',
    description: 'Passiflora incarnata — mild, earthy and slightly floral. One of nature\'s most powerful relaxants for racing thoughts, insomnia and anxiety. Works on GABA receptors for natural sedation without morning grogginess. Brew at 90°C for 8 minutes.',
    tags: ['passionflower', 'sleep', 'insomnia', 'anxiety', 'sedative', 'herbal-tea'],
    brewTemp: '90°C', brewTime: '8 min', initialStock: 15
  },
  {
    sku: 'OT-PEP001', name: 'Peppermint Leaf 30g',
    price: 80, costPrice: 44,
    shortDescription: 'Peppermint — digestive relief, clarity & sinus clearing',
    description: 'Mentha piperita — cool, refreshing and intensely minty. A classic digestive herb that relieves bloating, nausea and IBS. Also clears sinuses, relieves headaches and sharpens mental focus. Brew at 90°C for 5 minutes.',
    tags: ['peppermint', 'digestion', 'clarity', 'sinus', 'cooling', 'herbal-tea'],
    brewTemp: '90°C', brewTime: '5 min', initialStock: 30
  },
  {
    sku: 'OT-ROO001', name: 'Rooibos Leaf 50g',
    price: 65, costPrice: 36,
    shortDescription: 'Rooibos — South African antioxidant powerhouse, caffeine-free',
    description: 'Aspalathus linearis — nutty, sweet and earthy. South Africa\'s gift to the world. Caffeine-free, rich in unique antioxidants (aspalathin, nothofagin), supports bone health, skin radiance and healthy blood pressure. Our foundation blend herb. Brew at 100°C for 5 minutes.',
    tags: ['rooibos', 'antioxidant', 'caffeine-free', 'south-african', 'skin', 'herbal-tea'],
    brewTemp: '100°C', brewTime: '5 min', initialStock: 40
  },
  {
    sku: 'OT-ROS001', name: 'Rose Petals 30g',
    price: 105, costPrice: 58,
    shortDescription: 'Rose — heart opening, antioxidant & skin glow',
    description: 'Rosa damascena — delicate floral, gently sweet and subtly astringent. Rose petals are rich in antioxidants, support emotional balance and heart opening. Beautiful addition to any blend. Brew at 85°C for 4 minutes. Stunning with Hibiscus or Lavender.',
    tags: ['rose', 'antioxidant', 'skin', 'emotional-balance', 'floral', 'herbal-tea'],
    brewTemp: '85°C', brewTime: '4 min', initialStock: 20
  },
  {
    sku: 'OT-SAG001', name: 'Sage Leaf 30g',
    price: 90, costPrice: 50,
    shortDescription: 'Sage — memory, menopause support & antimicrobial',
    description: 'Salvia officinalis — savoury, earthy and slightly bitter. Sage is a remarkable herb for memory and focus, menopause symptom relief, sore throat and antimicrobial action. Avoid in high doses during pregnancy. Brew at 95°C for 7 minutes.',
    tags: ['sage', 'memory', 'menopause', 'antimicrobial', 'womens-health', 'herbal-tea'],
    brewTemp: '95°C', brewTime: '7 min', initialStock: 20
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/origin');
  console.log('Connected to MongoDB');

  const branch = await Branch.findOne({ branchCode: BRANCH_CODE });
  if (!branch) { console.error('Branch OR-POT not found'); process.exit(1); }
  console.log(`Branch: ${branch.name} (${branch._id})`);

  let created = 0, skipped = 0;

  for (const tea of OT_TEAS) {
    const { initialStock, brewTemp, brewTime, ...productData } = tea;

    productData.category = 'teas';
    productData.subcategory = 'herbal-tea';
    productData.track = 'lifestyle';
    productData.slug = tea.sku.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    productData.isActive = true;
    productData.status = 'active';
    productData.mdcStage = 'approved';
    productData.supplier = 'Origin Teas';
    productData.brand = 'Origin Teas';
    // Brew instructions stored in description metadata via tags
    productData.tags = [...(tea.tags || []), `brew:${brewTemp}`, `steep:${brewTime}`];

    try {
      const existing = await Product.findOne({ sku: productData.sku });
      if (existing) { skipped++; console.log(`  ~ ${productData.sku} already exists`); continue; }

      const product = await Product.create(productData);

      await BranchInventory.findOneAndUpdate(
        { branchId: branch._id, productId: product._id },
        {
          branchId: branch._id,
          productId: product._id,
          quantity: initialStock,
          reorderLevel: 5,
          isAvailable: true
        },
        { upsert: true, new: true }
      );
      created++;
      console.log(`  + ${product.sku} — ${product.name} (R${product.price})`);
    } catch (e) {
      console.error(`  ✗ ${productData.sku}: ${e.message}`);
    }
  }

  console.log(`\nDone: ${created} created, ${skipped} skipped`);
  await mongoose.disconnect();
}

seed().catch(e => { console.error(e); process.exit(1); });
