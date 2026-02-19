// Seed Lifestyle Cannabis Products for Testing
const mongoose = require('mongoose');
const Product = require('../modules/database/models/Product');
require('dotenv').config();

async function seedLifestyleProducts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jig');
    console.log('Connected to MongoDB');

    const lifestyleProducts = [
      // Cannabis Flower
      {
        sku: 'LF-001',
        name: 'Premium Sativa - Durban Poison',
        category: 'flower',
        track: 'lifestyle',
        price: 350.00,
        costPrice: 200.00,
        stock: 25,
        reorderLevel: 5,
        description: 'A pure sativa strain from South Africa. Known for its energizing and uplifting effects. Perfect for daytime use.',
        shortDescription: 'Energizing South African Sativa - 3.5g',
        thcContent: 18.5,
        cbdContent: 0.5,
        strainType: 'sativa',
        weight: 3.5,
        unit: 'g',
        effects: ['Energetic', 'Uplifted', 'Creative', 'Focused'],
        isActive: true,
        requiresPrescription: false
      },
      {
        sku: 'LF-002',
        name: 'Indica Blend - Northern Lights',
        category: 'flower',
        track: 'lifestyle',
        price: 320.00,
        costPrice: 180.00,
        stock: 30,
        reorderLevel: 5,
        description: 'Classic indica strain perfect for relaxation and evening use. Sweet and earthy aroma with relaxing effects.',
        shortDescription: 'Relaxing Indica - 3.5g',
        thcContent: 16.0,
        cbdContent: 1.0,
        strainType: 'indica',
        weight: 3.5,
        unit: 'g',
        effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric'],
        isActive: true,
        requiresPrescription: false
      },
      {
        sku: 'LF-003',
        name: 'Hybrid - Blue Dream',
        category: 'flower',
        track: 'lifestyle',
        price: 380.00,
        costPrice: 220.00,
        stock: 20,
        reorderLevel: 5,
        description: 'Balanced hybrid offering the best of both worlds. Sweet berry aroma with balanced effects suitable for any time of day.',
        shortDescription: 'Balanced Hybrid - 3.5g',
        thcContent: 17.5,
        cbdContent: 0.8,
        strainType: 'hybrid',
        weight: 3.5,
        unit: 'g',
        effects: ['Balanced', 'Creative', 'Relaxed', 'Happy'],
        isActive: true,
        requiresPrescription: false
      },

      // Pre-Rolls
      {
        sku: 'PR-001',
        name: 'Sativa Pre-Roll - 5 Pack',
        category: 'pre-rolls',
        track: 'lifestyle',
        price: 250.00,
        costPrice: 150.00,
        stock: 40,
        reorderLevel: 10,
        description: 'Pack of 5 premium sativa pre-rolls. Perfect for sharing or enjoying throughout the week. Each joint contains 0.5g of premium flower.',
        shortDescription: '5x Sativa Pre-Rolls (0.5g each)',
        thcContent: 18.0,
        cbdContent: 0.5,
        strainType: 'sativa',
        weight: 2.5,
        unit: 'g',
        effects: ['Energetic', 'Uplifted', 'Social'],
        isActive: true,
        requiresPrescription: false
      },
      {
        sku: 'PR-002',
        name: 'Indica Pre-Roll - 5 Pack',
        category: 'pre-rolls',
        track: 'lifestyle',
        price: 250.00,
        costPrice: 150.00,
        stock: 35,
        reorderLevel: 10,
        description: 'Pack of 5 premium indica pre-rolls for ultimate relaxation. Perfect for evening use. Each joint contains 0.5g.',
        shortDescription: '5x Indica Pre-Rolls (0.5g each)',
        thcContent: 16.5,
        cbdContent: 1.0,
        strainType: 'indica',
        weight: 2.5,
        unit: 'g',
        effects: ['Relaxed', 'Sleepy', 'Calm'],
        isActive: true,
        requiresPrescription: false
      },
      {
        sku: 'PR-003',
        name: 'CBD Rich Pre-Roll - 5 Pack',
        category: 'pre-rolls',
        track: 'lifestyle',
        price: 280.00,
        costPrice: 160.00,
        stock: 30,
        reorderLevel: 10,
        description: 'High CBD, low THC pre-rolls perfect for those seeking therapeutic benefits without strong psychoactive effects.',
        shortDescription: '5x CBD Pre-Rolls (1:1 THC:CBD)',
        thcContent: 8.0,
        cbdContent: 8.0,
        strainType: 'hybrid',
        weight: 2.5,
        unit: 'g',
        effects: ['Calm', 'Focused', 'Clear-headed'],
        isActive: true,
        requiresPrescription: false
      },

      // Vapes
      {
        sku: 'VP-001',
        name: 'Sativa Vape Cartridge - 1g',
        category: 'vapes',
        track: 'lifestyle',
        price: 450.00,
        costPrice: 250.00,
        stock: 25,
        reorderLevel: 5,
        description: 'Premium sativa distillate vape cartridge. Clean, smooth vapor with energizing effects. 510 thread compatible.',
        shortDescription: 'Sativa Distillate - 1g Cart',
        thcContent: 85.0,
        cbdContent: 2.0,
        strainType: 'sativa',
        volume: 1,
        unit: 'ml',
        effects: ['Energetic', 'Focused', 'Creative', 'Uplifted'],
        isActive: true,
        requiresPrescription: false
      },
      {
        sku: 'VP-002',
        name: 'Indica Vape Cartridge - 1g',
        category: 'vapes',
        track: 'lifestyle',
        price: 450.00,
        costPrice: 250.00,
        stock: 22,
        reorderLevel: 5,
        description: 'Premium indica distillate vape cartridge for deep relaxation. Perfect for evening use. 510 thread compatible.',
        shortDescription: 'Indica Distillate - 1g Cart',
        thcContent: 82.0,
        cbdContent: 3.0,
        strainType: 'indica',
        volume: 1,
        unit: 'ml',
        effects: ['Relaxed', 'Sleepy', 'Calm', 'Euphoric'],
        isActive: true,
        requiresPrescription: false
      },
      {
        sku: 'VP-003',
        name: 'Full Spectrum CBD Vape - 1g',
        category: 'vapes',
        track: 'lifestyle',
        price: 420.00,
        costPrice: 230.00,
        stock: 28,
        reorderLevel: 5,
        description: 'High CBD, low THC full spectrum vape for therapeutic benefits. Contains beneficial terpenes and cannabinoids.',
        shortDescription: 'CBD Full Spectrum - 1g Cart',
        thcContent: 10.0,
        cbdContent: 75.0,
        strainType: 'hybrid',
        volume: 1,
        unit: 'ml',
        effects: ['Calm', 'Focused', 'Relief', 'Clear-headed'],
        isActive: true,
        requiresPrescription: false
      }
    ];

    console.log('\nSeeding lifestyle cannabis products...\n');

    for (const productData of lifestyleProducts) {
      const existing = await Product.findOne({ sku: productData.sku });

      if (existing) {
        await Product.updateOne({ sku: productData.sku }, { $set: productData });
        console.log(`✅ Updated ${productData.sku} - ${productData.name}`);
      } else {
        await Product.create(productData);
        console.log(`✅ Created ${productData.sku} - ${productData.name}`);
      }
    }

    console.log('\n📊 Lifestyle Products Summary:');
    console.log('========================================');
    console.log('Flower Products: 3');
    console.log('Pre-Roll Packs: 3');
    console.log('Vape Cartridges: 3');
    console.log('========================================');
    console.log('\nTotal: 9 lifestyle cannabis products');
    console.log('\n💡 Testing:');
    console.log('- Login as user@basothomedicalherbs.ls');
    console.log('- Navigate to "Lifestyle Cannabis" tab');
    console.log('- Browse and add products to cart\n');

    mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding lifestyle products:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seed function
seedLifestyleProducts();
