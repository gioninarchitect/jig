// Seed Menu Items for La Brewha & Bean & Bud
const mongoose = require('mongoose');
const MenuItem = require('../modules/database/models/MenuItem');
require('dotenv').config();

const menuItems = [
  // ===== LA BREWHA MENU =====
  {
    name: 'Classic Americano',
    description: 'Rich, bold espresso with hot water. Perfect for coffee purists.',
    venue: 'la-brewha',
    category: 'espresso',
    price: 28.00,
    sizes: [
      { name: 'Small', price: 28.00, available: true },
      { name: 'Medium', price: 35.00, available: true },
      { name: 'Large', price: 42.00, available: true }
    ],
    available: true,
    inStock: true,
    featured: true,
    popular: true,
    customizations: [
      { name: 'Extra Shot', price: 8.00, available: true },
      { name: 'Oat Milk', price: 5.00, available: true },
      { name: 'Vanilla Syrup', price: 7.00, available: true }
    ]
  },
  {
    name: 'CBD Infused Latte',
    description: 'Smooth latte infused with 25mg premium CBD isolate. Relaxation in a cup.',
    venue: 'la-brewha',
    category: 'cbd-infused',
    price: 65.00,
    sizes: [
      { name: 'Small', price: 65.00, available: true },
      { name: 'Large', price: 85.00, available: true }
    ],
    available: true,
    inStock: true,
    cbdInfused: true,
    cbdDosage: '25mg',
    featured: true,
    popular: true,
    customizations: [
      { name: 'Extra CBD Boost (10mg)', price: 20.00, available: true },
      { name: 'Almond Milk', price: 5.00, available: true },
      { name: 'Honey', price: 5.00, available: true }
    ]
  },
  {
    name: 'Cappuccino',
    description: 'Classic Italian espresso with steamed milk and velvety foam.',
    venue: 'la-brewha',
    category: 'espresso',
    price: 32.00,
    sizes: [
      { name: 'Small', price: 32.00, available: true },
      { name: 'Medium', price: 38.00, available: true },
      { name: 'Large', price: 45.00, available: true }
    ],
    available: true,
    inStock: true,
    popular: true,
    customizations: [
      { name: 'Extra Shot', price: 8.00, available: true },
      { name: 'Oat Milk', price: 5.00, available: true },
      { name: 'Cinnamon', price: 0.00, available: true }
    ]
  },
  {
    name: 'Flat White',
    description: 'Microfoam perfection with double ristretto shots.',
    venue: 'la-brewha',
    category: 'espresso',
    price: 35.00,
    sizes: [
      { name: 'Regular', price: 35.00, available: true },
      { name: 'Large', price: 42.00, available: true }
    ],
    available: true,
    inStock: true,
    popular: true
  },
  {
    name: 'Iced CBD Mocha',
    description: 'Rich chocolate mocha with 20mg CBD served over ice. Indulgent and relaxing.',
    venue: 'la-brewha',
    category: 'cbd-infused',
    price: 72.00,
    available: true,
    inStock: true,
    cbdInfused: true,
    cbdDosage: '20mg',
    featured: true,
    customizations: [
      { name: 'Extra CBD Boost (10mg)', price: 20.00, available: true },
      { name: 'Whipped Cream', price: 7.00, available: true }
    ]
  },
  {
    name: 'Croissant',
    description: 'Buttery, flaky French croissant. Perfect with coffee.',
    venue: 'la-brewha',
    category: 'pastries',
    price: 22.00,
    available: true,
    inStock: true,
    availableTimes: ['breakfast', 'all-day']
  },
  {
    name: 'CBD Brownie',
    description: 'Decadent chocolate brownie infused with 15mg CBD. Sweet relief.',
    venue: 'la-brewha',
    category: 'cbd-infused',
    price: 48.00,
    available: true,
    inStock: true,
    cbdInfused: true,
    cbdDosage: '15mg',
    featured: true,
    popular: true
  },
  {
    name: 'Matcha Latte',
    description: 'Premium Japanese matcha with steamed milk. Calm energy.',
    venue: 'la-brewha',
    category: 'tea',
    price: 42.00,
    sizes: [
      { name: 'Small', price: 42.00, available: true },
      { name: 'Large', price: 55.00, available: true }
    ],
    available: true,
    inStock: true,
    popular: true,
    customizations: [
      { name: 'Oat Milk', price: 5.00, available: true },
      { name: 'Honey', price: 5.00, available: true }
    ]
  },

  // ===== BEAN & BUD MENU =====
  {
    name: 'Wellness Blend Pour-Over',
    description: 'Single-origin Ethiopian coffee with floral notes. Expertly brewed pour-over.',
    venue: 'bean-and-bud',
    category: 'coffee',
    price: 45.00,
    available: true,
    inStock: true,
    featured: true,
    popular: true
  },
  {
    name: 'CBD Cold Brew',
    description: 'Smooth cold brew coffee infused with 30mg CBD. Energize and relax.',
    venue: 'bean-and-bud',
    category: 'cbd-infused',
    price: 68.00,
    sizes: [
      { name: 'Regular', price: 68.00, available: true },
      { name: 'Large', price: 88.00, available: true }
    ],
    available: true,
    inStock: true,
    cbdInfused: true,
    cbdDosage: '30mg',
    featured: true,
    popular: true,
    customizations: [
      { name: 'Extra CBD Boost (15mg)', price: 25.00, available: true },
      { name: 'Vanilla', price: 7.00, available: true }
    ]
  },
  {
    name: 'Sativa-Inspired Citrus Blend',
    description: 'Bright, energizing coffee blend with citrus notes. Pairs perfectly with Sativa strains.',
    venue: 'bean-and-bud',
    category: 'coffee',
    price: 52.00,
    available: true,
    inStock: true,
    cannabisPairing: true,
    recommendedStrain: 'Sativa',
    featured: true,
    popular: true
  },
  {
    name: 'Indica-Inspired Dark Roast',
    description: 'Rich, chocolatey dark roast. Perfect for evening relaxation with Indica strains.',
    venue: 'bean-and-bud',
    category: 'coffee',
    price: 52.00,
    available: true,
    inStock: true,
    cannabisPairing: true,
    recommendedStrain: 'Indica',
    popular: true
  },
  {
    name: 'CBD Turmeric Golden Latte',
    description: 'Anti-inflammatory turmeric latte with 20mg CBD. Wellness in every sip.',
    venue: 'bean-and-bud',
    category: 'cbd-infused',
    price: 58.00,
    available: true,
    inStock: true,
    cbdInfused: true,
    cbdDosage: '20mg',
    featured: true,
    customizations: [
      { name: 'Coconut Milk', price: 5.00, available: true },
      { name: 'Black Pepper', price: 0.00, available: true }
    ]
  },
  {
    name: 'Hemp Seed Smoothie Bowl',
    description: 'Acai bowl topped with hemp seeds, granola, and fresh fruit.',
    venue: 'bean-and-bud',
    category: 'food',
    price: 75.00,
    available: true,
    inStock: true,
    popular: true,
    availableTimes: ['breakfast', 'all-day']
  },
  {
    name: 'Espresso Tonic',
    description: 'Double espresso over tonic water with ice. Refreshingly unique.',
    venue: 'bean-and-bud',
    category: 'specialty-drinks',
    price: 38.00,
    available: true,
    inStock: true,
    popular: true,
    new: true
  },
  {
    name: 'CBD Honey Lavender Latte',
    description: 'Soothing lavender latte with CBD-infused honey. 25mg CBD.',
    venue: 'bean-and-bud',
    category: 'cbd-infused',
    price: 65.00,
    available: true,
    inStock: true,
    cbdInfused: true,
    cbdDosage: '25mg',
    featured: true,
    customizations: [
      { name: 'Extra Shot', price: 8.00, available: true },
      { name: 'Oat Milk', price: 5.00, available: true }
    ]
  },

  // ===== SHARED ITEMS =====
  {
    name: 'Fresh Squeezed Orange Juice',
    description: 'Pure, freshly squeezed orange juice. No additives.',
    venue: 'both',
    category: 'juices',
    price: 32.00,
    sizes: [
      { name: 'Small', price: 32.00, available: true },
      { name: 'Large', price: 45.00, available: true }
    ],
    available: true,
    inStock: true,
    availableTimes: ['breakfast', 'all-day']
  },
  {
    name: 'Sparkling Water',
    description: 'Premium sparkling mineral water.',
    venue: 'both',
    category: 'juices',
    price: 18.00,
    available: true,
    inStock: true
  }
];

async function seedMenu() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cbdwellness24', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Clear existing menu items
    await MenuItem.deleteMany({});
    console.log('Cleared existing menu items');

    // Insert new menu items
    const inserted = await MenuItem.insertMany(menuItems);
    console.log(`✅ Seeded ${inserted.length} menu items successfully`);

    // Display summary
    const laBrewhaCount = await MenuItem.countDocuments({ venue: { $in: ['la-brewha', 'both'] } });
    const beanBudCount = await MenuItem.countDocuments({ venue: { $in: ['bean-and-bud', 'both'] } });
    const cbdCount = await MenuItem.countDocuments({ cbdInfused: true });

    console.log('\n📊 Menu Summary:');
    console.log(`   La Brewha items: ${laBrewhaCount}`);
    console.log(`   Bean & Bud items: ${beanBudCount}`);
    console.log(`   CBD-infused items: ${cbdCount}`);

    mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding menu:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seed function
seedMenu();
