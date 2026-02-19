// Reseed Products for Basotho Medical Herbs
// This script drops existing products and seeds the correct ones
const mongoose = require('mongoose');
const Product = require('../modules/database/models/Product');
require('dotenv').config();

async function reseedProducts() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/basothomedicalherbs', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Delete all existing products
    const deleted = await Product.deleteMany({});
    console.log(`Deleted ${deleted.deletedCount} existing products`);

    const sampleProducts = [
      // ===== PUBLIC ACCESSORIES (No Section 21 Required) =====
      {
        name: 'Premium Glass Water Pipe - 12"',
        slug: 'premium-glass-water-pipe-12',
        sku: 'BMH-PIPE-001',
        description: 'High-quality borosilicate glass water pipe with percolator. Premium craftsmanship for aromatherapy enthusiasts.',
        shortDescription: 'Premium 12" glass water pipe with percolator',
        price: 899,
        category: 'glassware',
        subcategory: 'water-pipes',
        tags: ['glassware', 'water-pipe', 'premium', 'accessories'],
        images: [{ url: '/images/products/pipe1.jpg', alt: 'Glass Water Pipe', isPrimary: true }],
        colors: [{ name: 'Clear', hex: '#FFFFFF' }],
        inventory: { quantity: 25, trackQuantity: true, lowStockThreshold: 5 },
        status: 'active',
        isFeatured: true,
        isPublished: true,
        requiresSection21: false
      },
      {
        name: 'CBD Oil 1000mg - Full Spectrum',
        slug: 'cbd-oil-1000mg-full-spectrum',
        sku: 'BMH-OIL-1000',
        description: 'Premium full-spectrum CBD oil, 1000mg concentration. Organic, lab-tested, and THC-free. Perfect for wellness and relaxation.',
        shortDescription: '1000mg full-spectrum CBD oil',
        price: 599,
        category: 'lifestyle-cbd',
        subcategory: 'cbd-oils',
        tags: ['cbd', 'oil', 'wellness', 'organic'],
        images: [{ url: '/images/products/cbd-oil.jpg', alt: 'CBD Oil', isPrimary: true }],
        inventory: { quantity: 50, trackQuantity: true, lowStockThreshold: 10 },
        status: 'active',
        isFeatured: true,
        isPublished: true,
        requiresSection21: false
      },
      {
        name: 'Rolling Papers - Organic Hemp',
        slug: 'rolling-papers-organic-hemp',
        sku: 'BMH-PAPER-001',
        description: 'Organic hemp rolling papers, slow-burning and chemical-free. Pack of 50 papers.',
        shortDescription: 'Organic hemp rolling papers (50 pack)',
        price: 79,
        category: 'accessories',
        subcategory: 'papers',
        tags: ['papers', 'hemp', 'organic'],
        images: [{ url: '/images/products/papers.jpg', alt: 'Rolling Papers', isPrimary: true }],
        inventory: { quantity: 200, trackQuantity: true, lowStockThreshold: 20 },
        status: 'active',
        isFeatured: false,
        isPublished: true,
        requiresSection21: false
      },
      {
        name: 'Ceramic Grinder - 4 Piece',
        slug: 'ceramic-grinder-4-piece',
        sku: 'BMH-GRIND-001',
        description: 'Premium 4-piece ceramic grinder with pollen catcher. Durable and easy to clean.',
        shortDescription: '4-piece ceramic herb grinder',
        price: 349,
        category: 'accessories',
        subcategory: 'grinders',
        tags: ['grinder', 'ceramic', 'premium'],
        images: [{ url: '/images/products/grinder.jpg', alt: 'Ceramic Grinder', isPrimary: true }],
        colors: [{ name: 'Black', hex: '#000000' }, { name: 'Silver', hex: '#C0C0C0' }],
        inventory: { quantity: 40, trackQuantity: true, lowStockThreshold: 8 },
        status: 'active',
        isFeatured: true,
        isPublished: true,
        requiresSection21: false
      },
      {
        name: 'Vape Pen - Rechargeable',
        slug: 'vape-pen-rechargeable',
        sku: 'BMH-VAPE-001',
        description: 'Sleek rechargeable vape pen with variable temperature control. Compatible with all 510-thread cartridges.',
        shortDescription: 'Rechargeable vape pen with temp control',
        price: 499,
        category: 'vaporizers',
        subcategory: 'pen-vapes',
        tags: ['vape', 'pen', 'rechargeable'],
        images: [{ url: '/images/products/vape.jpg', alt: 'Vape Pen', isPrimary: true }],
        colors: [{ name: 'Black', hex: '#000000' }, { name: 'Silver', hex: '#C0C0C0' }, { name: 'Gold', hex: '#FFD700' }],
        inventory: { quantity: 30, trackQuantity: true, lowStockThreshold: 5 },
        status: 'active',
        isFeatured: true,
        isPublished: true,
        requiresSection21: false
      },
      {
        name: 'Storage Jar - Airtight Glass',
        slug: 'storage-jar-airtight-glass',
        sku: 'BMH-JAR-001',
        description: 'UV-protected airtight glass storage jar. Keeps your herbs fresh and potent.',
        shortDescription: 'Airtight UV glass storage jar',
        price: 199,
        category: 'accessories',
        subcategory: 'storage',
        tags: ['storage', 'jar', 'glass', 'uv-protection'],
        images: [{ url: '/images/products/jar.jpg', alt: 'Storage Jar', isPrimary: true }],
        colors: [{ name: 'Amber', hex: '#FF7E00' }, { name: 'Green', hex: '#228B22' }],
        inventory: { quantity: 60, trackQuantity: true, lowStockThreshold: 10 },
        status: 'active',
        isFeatured: false,
        isPublished: true,
        requiresSection21: false
      },

      // ===== MEDICAL CANNABIS (Section 21 Required - NOT visible publicly) =====
      {
        name: 'Medical Cannabis - Indica Strain 5g',
        slug: 'medical-cannabis-indica-5g',
        sku: 'BMH-MED-INDICA-001',
        description: 'Premium medical-grade Indica cannabis strain. Prescribed for pain relief, insomnia, and anxiety management. Section 21 prescription required.',
        shortDescription: 'Medical Indica strain - 5g',
        price: 550,
        category: 'flower',
        subcategory: 'indica',
        track: 'medical',
        tags: ['medical', 'cannabis', 'indica', 'prescription', 'section21'],
        images: [{ url: '/images/products/medical-indica.jpg', alt: 'Medical Cannabis Indica', isPrimary: true }],
        inventory: { quantity: 20, trackQuantity: true, lowStockThreshold: 5 },
        status: 'active',
        isFeatured: true,
        isPublished: true,
        requiresSection21: true
      },
      {
        name: 'Medical Cannabis - Sativa Strain 5g',
        slug: 'medical-cannabis-sativa-5g',
        sku: 'BMH-MED-SATIVA-001',
        description: 'Premium medical-grade Sativa cannabis strain. Prescribed for depression, fatigue, and ADHD. Section 21 prescription required.',
        shortDescription: 'Medical Sativa strain - 5g',
        price: 550,
        category: 'flower',
        subcategory: 'sativa',
        track: 'medical',
        tags: ['medical', 'cannabis', 'sativa', 'prescription', 'section21'],
        images: [{ url: '/images/products/medical-sativa.jpg', alt: 'Medical Cannabis Sativa', isPrimary: true }],
        inventory: { quantity: 20, trackQuantity: true, lowStockThreshold: 5 },
        status: 'active',
        isFeatured: true,
        isPublished: true,
        requiresSection21: true
      },
      {
        name: 'THC Oil - Medical Grade 10ml',
        slug: 'thc-oil-medical-10ml',
        sku: 'BMH-MED-THC-OIL',
        description: 'Medical-grade THC oil, 10ml bottle. High potency for chronic pain and severe conditions. Section 21 prescription required.',
        shortDescription: 'Medical THC oil - 10ml',
        price: 850,
        category: 'oils',
        subcategory: 'thc-oil',
        track: 'medical',
        tags: ['medical', 'thc', 'oil', 'prescription', 'section21'],
        images: [{ url: '/images/products/thc-oil.jpg', alt: 'THC Oil', isPrimary: true }],
        inventory: { quantity: 15, trackQuantity: true, lowStockThreshold: 3 },
        status: 'active',
        isFeatured: true,
        isPublished: true,
        requiresSection21: true
      },
      {
        name: 'Medical Cannabis - Hybrid Strain 10g',
        slug: 'medical-cannabis-hybrid-10g',
        sku: 'BMH-MED-HYBRID-001',
        description: 'Balanced hybrid medical cannabis strain. Best for versatile symptom management. Section 21 prescription required.',
        shortDescription: 'Medical Hybrid strain - 10g',
        price: 1000,
        category: 'flower',
        subcategory: 'hybrid',
        track: 'medical',
        tags: ['medical', 'cannabis', 'hybrid', 'prescription', 'section21'],
        images: [{ url: '/images/products/medical-hybrid.jpg', alt: 'Medical Cannabis Hybrid', isPrimary: true }],
        inventory: { quantity: 25, trackQuantity: true, lowStockThreshold: 5 },
        status: 'active',
        isFeatured: true,
        isPublished: true,
        requiresSection21: true
      }
    ];

    await Product.insertMany(sampleProducts);
    console.log(`Seeded ${sampleProducts.length} products successfully`);

    // Display summary
    const publicCount = await Product.countDocuments({ requiresSection21: false });
    const medicalCount = await Product.countDocuments({ requiresSection21: true });

    console.log('\nProduct Summary:');
    console.log('=====================================');
    console.log(`Public products (no S21 required): ${publicCount}`);
    console.log(`Medical products (S21 required): ${medicalCount}`);
    console.log(`Total products: ${sampleProducts.length}`);
    console.log('=====================================\n');

    mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error reseeding products:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

reseedProducts();
