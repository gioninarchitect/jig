// Fix Section 21 Setup - Add lifestyle products and update patient
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

async function fixSetup() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB: dbc\n');

    const Product = require('./backend/modules/database/models/Product');
    const User = require('./backend/modules/database/models/User');

    // ═══════════════════════════════════════════════════════════════
    // 1. Add Lifestyle Products (accessories - public, no Section 21)
    // ═══════════════════════════════════════════════════════════════
    console.log('1. Adding LIFESTYLE products (public access)...\n');

    const lifestyleProducts = [
      {
        name: 'Premium Grinder - 4 Piece',
        description: 'High-quality 4-piece metal grinder with kief catcher',
        price: 199,
        category: 'accessories',
        subcategory: 'grinders',
        tags: ['lifestyle', 'grinder', 'accessories'],
        track: 'lifestyle',
        requiresSection21: false,
        sku: 'ACC-GRINDER-4PC',
        inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true },
        status: 'active',
        images: [{ url: '/images/products/grinder.jpg', isPrimary: true }]
      },
      {
        name: 'Glass Storage Jar - 500ml',
        description: 'Airtight glass storage jar with bamboo lid',
        price: 149,
        category: 'accessories',
        subcategory: 'storage',
        tags: ['lifestyle', 'storage', 'accessories'],
        track: 'lifestyle',
        requiresSection21: false,
        sku: 'ACC-JAR-500ML',
        inventory: { quantity: 40, lowStockThreshold: 10, trackQuantity: true },
        status: 'active',
        images: [{ url: '/images/products/jar.jpg', isPrimary: true }]
      },
      {
        name: 'Organic Hemp Papers - King Size',
        description: 'Unbleached organic hemp rolling papers, 50 pack',
        price: 49,
        category: 'accessories',
        subcategory: 'papers',
        tags: ['lifestyle', 'papers', 'accessories'],
        track: 'lifestyle',
        requiresSection21: false,
        sku: 'ACC-PAPERS-KING',
        inventory: { quantity: 100, lowStockThreshold: 20, trackQuantity: true },
        status: 'active',
        images: [{ url: '/images/products/papers.jpg', isPrimary: true }]
      },
      {
        name: 'Glass Pipe - Spoon Style',
        description: 'Hand-blown glass pipe, spoon style with carb hole',
        price: 299,
        category: 'accessories',
        subcategory: 'pipes',
        tags: ['lifestyle', 'pipe', 'glass'],
        track: 'lifestyle',
        requiresSection21: false,
        sku: 'ACC-PIPE-SPOON',
        inventory: { quantity: 25, lowStockThreshold: 5, trackQuantity: true },
        status: 'active',
        images: [{ url: '/images/products/pipe1.jpg', isPrimary: true }]
      },
      {
        name: 'Portable Dry Herb Vaporizer',
        description: 'Compact portable vaporizer for dry herbs, USB-C charging',
        price: 899,
        category: 'vaporizers',
        subcategory: 'portable-vapes',
        tags: ['lifestyle', 'vaporizer', 'portable'],
        track: 'lifestyle',
        requiresSection21: false,
        sku: 'ACC-VAPE-PORT',
        inventory: { quantity: 15, lowStockThreshold: 3, trackQuantity: true },
        status: 'active',
        images: [{ url: '/images/products/vape.jpg', isPrimary: true }]
      },
      {
        name: 'Rolling Tray - Metal',
        description: 'Large metal rolling tray with curved edges',
        price: 129,
        category: 'accessories',
        subcategory: 'storage',
        tags: ['lifestyle', 'tray', 'accessories'],
        track: 'lifestyle',
        requiresSection21: false,
        sku: 'ACC-TRAY-METAL',
        inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true },
        status: 'active',
        images: [{ url: '/images/products/placeholder.png', isPrimary: true }]
      }
    ];

    // Generate slugs
    lifestyleProducts.forEach(p => {
      p.slug = p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    });

    // Check if lifestyle products already exist
    const existingLifestyle = await Product.countDocuments({ track: 'lifestyle' });
    if (existingLifestyle === 0) {
      for (const product of lifestyleProducts) {
        const doc = new Product(product);
        await doc.save();
        console.log('   ✓ Added:', product.name, '- R' + product.price);
      }
      console.log('\n   Added', lifestyleProducts.length, 'lifestyle products\n');
    } else {
      console.log('   Lifestyle products already exist:', existingLifestyle, '\n');
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. Update Patient User with Section 21 Approval
    // ═══════════════════════════════════════════════════════════════
    console.log('2. Updating PATIENT user with Section 21 approval...\n');

    const patient = await User.findOne({ email: 'patient@jig.cleva-ai.co.za' });
    if (patient) {
      patient.section21 = {
        status: 'approved',
        approvedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        documentNumber: 'S21-2026-001234',
        prescribingDoctor: 'Dr. Test Doctor',
        condition: 'Chronic Pain Management'
      };
      await patient.save();
      console.log('   ✓ Patient Section 21 status: APPROVED');
      console.log('   Document:', patient.section21.documentNumber);
      console.log('   Expires:', patient.section21.expiresAt.toDateString());
    } else {
      console.log('   ✗ Patient user not found');
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. Create a regular test user (no Section 21)
    // ═══════════════════════════════════════════════════════════════
    console.log('\n3. Creating REGULAR test user (no Section 21)...\n');

    let testUser = await User.findOne({ email: 'testuser@jig.cleva-ai.co.za' });
    if (!testUser) {
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('Test123!', 10);

      testUser = new User({
        email: 'testuser@jig.cleva-ai.co.za',
        username: 'testuser',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        phone: '0821234567',
        role: 'user',
        status: 'active'
        // No section21 field = no approval
      });
      await testUser.save();
      console.log('   ✓ Created test user: testuser@jig.cleva-ai.co.za');
    } else {
      // Make sure no Section 21
      testUser.section21 = undefined;
      await testUser.save();
      console.log('   ✓ Test user exists (no Section 21)');
    }

    // ═══════════════════════════════════════════════════════════════
    // Summary
    // ═══════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('                        SETUP COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const totalProducts = await Product.countDocuments({ status: 'active' });
    const medicalCount = await Product.countDocuments({ requiresSection21: true, status: 'active' });
    const lifestyleCount = await Product.countDocuments({ requiresSection21: { $ne: true }, status: 'active' });

    console.log('Products:');
    console.log('  Total:', totalProducts);
    console.log('  Medical (Section 21):', medicalCount);
    console.log('  Lifestyle (public):', lifestyleCount);
    console.log('');
    console.log('Test Users:');
    console.log('  - testuser@jig.cleva-ai.co.za / Test123! → NO Section 21 (sees lifestyle only)');
    console.log('  - patient@jig.cleva-ai.co.za / Test123! → Section 21 APPROVED (sees ALL)');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
}

fixSetup();
