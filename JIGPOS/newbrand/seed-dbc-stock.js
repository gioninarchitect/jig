// Seed DBC Stock - Greendoor & Indoor Cannabis Products
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

// JIG Stock from Ormonde Branch
// Using 'flower' category with 'hybrid' subcategory (most common)
// Tags: 'greendoor' (outdoor/greenhouse R40-70) or 'indoor' (premium R80-150)
const products = [
  // =============== GREENDOOR (Outdoor/Greenhouse) R40-R70 ===============
  {
    name: 'Divine Storm',
    description: 'Greendoor grade cannabis - Divine Storm strain. Outdoor grown, excellent quality.',
    price: 70,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['greendoor', 'outdoor', 'R70'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-DIVINE-STORM',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Jungle Diamond',
    description: 'Greendoor grade cannabis - Jungle Diamond strain. Outdoor grown, excellent quality.',
    price: 70,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['greendoor', 'outdoor', 'R70'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-JUNGLE-DIAMOND',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Gary Peyton',
    description: 'Greendoor grade cannabis - Gary Peyton strain. Outdoor grown, excellent quality.',
    price: 70,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['greendoor', 'outdoor', 'R70'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-GARY-PEYTON',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Black Cherry Punch',
    description: 'Greendoor grade cannabis - Black Cherry Punch strain. Outdoor grown, excellent quality.',
    price: 70,
    category: 'flower',
    subcategory: 'indica',
    tags: ['greendoor', 'outdoor', 'R70'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-BLACK-CHERRY',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Alien Cookies',
    description: 'Greendoor grade cannabis - Alien Cookies strain. Outdoor grown, excellent quality.',
    price: 60,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['greendoor', 'outdoor', 'R60'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-ALIEN-COOKIES',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Beach Wedding',
    description: 'Greendoor grade cannabis - Beach Wedding strain. Outdoor grown, excellent quality.',
    price: 60,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['greendoor', 'outdoor', 'R60'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-BEACH-WEDDING',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Gorilla Zkittles Big',
    description: 'Greendoor grade cannabis - Gorilla Zkittles Big strain. Outdoor grown, excellent quality.',
    price: 60,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['greendoor', 'outdoor', 'R60'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-GORILLA-ZKITTLES',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Cheese',
    description: 'Greendoor grade cannabis - Cheese strain. Classic cheese genetics, outdoor grown.',
    price: 60,
    category: 'flower',
    subcategory: 'indica',
    tags: ['greendoor', 'outdoor', 'R60'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-CHEESE',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Super Cheese',
    description: 'Greendoor grade cannabis - Super Cheese strain. Enhanced cheese genetics, outdoor grown.',
    price: 50,
    category: 'flower',
    subcategory: 'indica',
    tags: ['greendoor', 'outdoor', 'R50'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-SUPER-CHEESE',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Strawberry Lemonade',
    description: 'Greendoor grade cannabis - Strawberry Lemonade strain. Sweet citrus notes, outdoor grown.',
    price: 40,
    category: 'flower',
    subcategory: 'sativa',
    tags: ['greendoor', 'outdoor', 'R40', 'budget'],
    track: 'medical',
    requiresSection21: true,
    sku: 'GD-STRAWBERRY-LEMONADE',
    inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },

  // =============== INDOOR (Premium Grade) R80-R150 ===============
  {
    name: 'Blu Zuchi',
    description: 'Indoor premium cannabis - Blu Zuchi strain. Top-shelf quality, controlled environment.',
    price: 150,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'premium', 'R150', 'top-shelf'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-BLU-ZUCHI',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Blockberry',
    description: 'Indoor premium cannabis - Blockberry strain. Top-shelf quality, controlled environment.',
    price: 120,
    category: 'flower',
    subcategory: 'indica',
    tags: ['indoor', 'premium', 'R120'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-BLOCKBERRY',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Rainbow Sherbit',
    description: 'Indoor premium cannabis - Rainbow Sherbit strain. Top-shelf quality, controlled environment.',
    price: 150,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'premium', 'R150', 'top-shelf'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-RAINBOW-SHERBIT',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Rainbow Royal',
    description: 'Indoor premium cannabis - Rainbow Royal strain. Top-shelf quality, controlled environment.',
    price: 150,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'premium', 'R150', 'top-shelf'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-RAINBOW-ROYAL',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Baker',
    description: 'Indoor premium cannabis - Baker strain. Top-shelf quality, controlled environment.',
    price: 120,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'premium', 'R120'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-BAKER',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Don Perinon',
    description: 'Indoor premium cannabis - Don Perinon strain. Top-shelf quality, controlled environment.',
    price: 120,
    category: 'flower',
    subcategory: 'indica',
    tags: ['indoor', 'premium', 'R120'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-DON-PERINON',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Purple Peanut Butter',
    description: 'Indoor premium cannabis - Purple Peanut Butter strain. Rich earthy notes.',
    price: 100,
    category: 'flower',
    subcategory: 'indica',
    tags: ['indoor', 'premium', 'R100'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-PURPLE-PB',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Ice Cream Cake',
    description: 'Indoor premium cannabis - Ice Cream Cake strain. Sweet creamy notes.',
    price: 100,
    category: 'flower',
    subcategory: 'indica',
    tags: ['indoor', 'premium', 'R100'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-ICE-CREAM-CAKE',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Pitbull',
    description: 'Indoor premium cannabis - Pitbull strain. Strong potent effects.',
    price: 100,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'premium', 'R100'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-PITBULL',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'King Truck',
    description: 'Indoor premium cannabis - King Truck strain. Powerful hybrid effects.',
    price: 100,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'premium', 'R100'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-KING-TRUCK',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Pink Runts',
    description: 'Indoor premium cannabis - Pink Runts strain. Sweet candy-like flavors.',
    price: 80,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'R80'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-PINK-RUNTS',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'K Snow',
    description: 'Indoor premium cannabis - K Snow strain. Frosty trichome coverage.',
    price: 80,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'R80'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-K-SNOW',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  },
  {
    name: 'Zoap',
    description: 'Indoor premium cannabis - Zoap strain. Clean soapy floral notes.',
    price: 80,
    category: 'flower',
    subcategory: 'hybrid',
    tags: ['indoor', 'R80'],
    track: 'medical',
    requiresSection21: true,
    sku: 'IN-ZOAP',
    inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false },
    status: 'active',
    images: [{ url: '/images/jig-logo-nobg.png', isPrimary: true }]
  }
];

async function seedStock() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB: dbc');

    const Product = require('./backend/modules/database/models/Product');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Generate slugs for each product before inserting
    products.forEach(p => {
      p.slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    });

    // Insert products one by one to trigger pre-save hooks properly
    const inserted = [];
    for (const product of products) {
      const doc = new Product(product);
      await doc.save();
      inserted.push(doc);
    }
    console.log(`\nSeeded ${inserted.length} DBC products:`);

    // Summary by category
    const greendoor = products.filter(p => p.category === 'greendoor');
    const indoor = products.filter(p => p.category === 'indoor');

    console.log(`\n=== GREENDOOR (${greendoor.length} products) ===`);
    greendoor.forEach(p => console.log(`  - ${p.name}: R${p.price}`));

    console.log(`\n=== INDOOR (${indoor.length} products) ===`);
    indoor.forEach(p => console.log(`  - ${p.name}: R${p.price}`));

    console.log('\nStock seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedStock();
