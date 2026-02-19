const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/bmh');
const Product = require('./backend/modules/database/models/Product');

async function fixPOS() {
    try {
        console.log('Fixing POS products...\n');

        // 1. Fix Bean & Bud icons and ensure correct category
        const beanBudResult = await Product.updateMany(
            { sku: { $regex: '^BB-' } },
            {
                $set: {
                    category: 'bean-and-bud',
                    'images.0.url': '/images/weedicons/bb.png'
                }
            }
        );
        console.log(`✓ Fixed ${beanBudResult.modifiedCount} Bean & Bud products`);

        // 2. Fix La Brewha icons and ensure correct category
        const laBrewhaResult = await Product.updateMany(
            { sku: { $regex: '^LB-' } },
            {
                $set: {
                    category: 'la-brewha',
                    'images.0.url': '/images/weedicons/lb.png'
                }
            }
        );
        console.log(`✓ Fixed ${laBrewhaResult.modifiedCount} La Brewha products`);

        // 3. Show final category counts
        const categories = await Product.aggregate([
            { $group: { _id: '$category', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        console.log('\n✓ Final category counts:');
        categories.forEach(cat => {
            console.log(`  ${cat._id}: ${cat.count} products`);
        });

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixPOS();
