const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/bmh');
const Product = require('./backend/modules/database/models/Product');

async function restore() {
    try {
        // Update existing products with inventory
        const updated = await Product.updateMany({}, {
            $set: {
                'inventory.quantity': 50,
                'inventory.lowStockThreshold': 10,
                'inventory.trackQuantity': true,
                'inventory.allowBackorder': false,
                'status': 'active'
            }
        });
        console.log(`✓ Updated ${updated.modifiedCount} existing products`);

        // Add lifestyle products
        const lifestyleProducts = [
            { name: 'Sativa FLOS - Premium Daytime Blend', sku: 'FLOS-SAT-001', price: 180, category: 'flower', description: 'Uplifting sativa blend', inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'Indica FLOS - Relaxation Blend', sku: 'FLOS-IND-001', price: 180, category: 'flower', description: 'Calming indica blend', inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'Hybrid FLOS - Balanced Wellness', sku: 'FLOS-HYB-001', price: 180, category: 'flower', description: 'Balanced hybrid', inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'Premium Herb Grinder - 4-Piece', sku: 'ACC-GRN-001', price: 120, category: 'accessories', description: 'Aluminum grinder with kief catcher', inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'Rolling Papers - King Size', sku: 'ACC-PAP-001', price: 45, category: 'accessories', description: 'Premium slow-burn papers', inventory: { quantity: 100, lowStockThreshold: 20, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'Glass Storage Jar - 250ml', sku: 'ACC-JAR-001', price: 85, category: 'accessories', description: 'UV-protected glass jar', inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'CBD Wellness Oil - 1000mg', sku: 'CBD-OIL-001', price: 450, category: 'lifestyle-cbd', description: 'Full-spectrum CBD oil', inventory: { quantity: 30, lowStockThreshold: 5, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'CBD Gummies - Mixed Berry', sku: 'CBD-GUM-001', price: 280, category: 'lifestyle-cbd', description: '10mg CBD per gummy', inventory: { quantity: 50, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'Bean & Bud - CBD Espresso Blend', sku: 'COFFEE-ESP-001', price: 220, category: 'coffee', description: 'Premium espresso with CBD', inventory: { quantity: 40, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] },
            { name: 'Bean & Bud - Morning Blend', sku: 'COFFEE-MOR-001', price: 180, category: 'coffee', description: 'Smooth morning blend with CBD', inventory: { quantity: 40, lowStockThreshold: 10, trackQuantity: true, allowBackorder: false }, status: 'active', images: [{ url: '/images/weedicons/cannabis.png' }] }
        ];

        let added = 0;
        for (const prod of lifestyleProducts) {
            const exists = await Product.findOne({ sku: prod.sku });
            if (!exists) {
                await Product.create(prod);
                added++;
            }
        }
        console.log(`✓ Added ${added} new lifestyle products`);

        const total = await Product.countDocuments();
        console.log(`✓ Total products in database: ${total}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

restore();
