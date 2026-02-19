const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/cbdwellness24');
const Product = require('./backend/modules/database/models/Product');

async function seedCafeMenus() {
    try {
        const cafeProducts = [
            // Bean & Bud Coffee Shop
            { name: 'Espresso', sku: 'BB-ESP-001', price: 25, category: 'bean-and-bud', description: 'Classic espresso shot', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Americano', sku: 'BB-AME-001', price: 30, category: 'bean-and-bud', description: 'Espresso with hot water', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Cappuccino', sku: 'BB-CAP-001', price: 35, category: 'bean-and-bud', description: 'Espresso with steamed milk and foam', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Latte', sku: 'BB-LAT-001', price: 35, category: 'bean-and-bud', description: 'Espresso with steamed milk', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Flat White', sku: 'BB-FLT-001', price: 35, category: 'bean-and-bud', description: 'Smooth espresso with velvety milk', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Mocha', sku: 'BB-MOC-001', price: 40, category: 'bean-and-bud', description: 'Chocolate espresso with steamed milk', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'CBD Latte', sku: 'BB-CBD-001', price: 45, category: 'bean-and-bud', description: 'Latte infused with 10mg CBD', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/cbd-oil.png' }] },
            { name: 'Iced Coffee', sku: 'BB-ICE-001', price: 35, category: 'bean-and-bud', description: 'Cold brew over ice', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Croissant', sku: 'BB-CRO-001', price: 25, category: 'bean-and-bud', description: 'Butter croissant', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/edibles.png' }] },
            { name: 'Muffin', sku: 'BB-MUF-001', price: 30, category: 'bean-and-bud', description: 'Fresh baked muffin', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/edibles.png' }] },

            // La Brewha Cafe
            { name: 'Filter Coffee', sku: 'LB-FIL-001', price: 20, category: 'la-brewha', description: 'Classic filter coffee', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Rooibos Latte', sku: 'LB-ROO-001', price: 30, category: 'la-brewha', description: 'Rooibos tea latte', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Chai Latte', sku: 'LB-CHA-001', price: 35, category: 'la-brewha', description: 'Spiced chai with steamed milk', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Hot Chocolate', sku: 'LB-HOT-001', price: 30, category: 'la-brewha', description: 'Rich hot chocolate', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/coffee.png' }] },
            { name: 'Smoothie Bowl', sku: 'LB-SMO-001', price: 55, category: 'la-brewha', description: 'Acai smoothie bowl with granola', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/edibles.png' }] },
            { name: 'Avocado Toast', sku: 'LB-AVO-001', price: 50, category: 'la-brewha', description: 'Smashed avo on sourdough', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/edibles.png' }] },
            { name: 'Breakfast Wrap', sku: 'LB-WRA-001', price: 45, category: 'la-brewha', description: 'Egg and bacon wrap', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/edibles.png' }] },
            { name: 'Pancakes', sku: 'LB-PAN-001', price: 55, category: 'la-brewha', description: 'Stack of pancakes with syrup', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/edibles.png' }] },
            { name: 'Caesar Salad', sku: 'LB-SAL-001', price: 60, category: 'la-brewha', description: 'Classic caesar salad', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/edibles.png' }] },
            { name: 'Club Sandwich', sku: 'LB-CLU-001', price: 65, category: 'la-brewha', description: 'Triple decker club sandwich', inventory: { quantity: 999, trackQuantity: false }, status: 'active', images: [{ url: '/images/weedicons/edibles.png' }] }
        ];

        let added = 0;
        for (const prod of cafeProducts) {
            const exists = await Product.findOne({ sku: prod.sku });
            if (!exists) {
                await Product.create(prod);
                added++;
            }
        }

        console.log(`✓ Added ${added} cafe menu items`);

        const totalCoffee = await Product.countDocuments({ category: 'coffee' });
        console.log(`✓ Total coffee category products: ${totalCoffee}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

seedCafeMenus();
