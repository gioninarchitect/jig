const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/bmh');
const Product = require('./backend/modules/database/models/Product');

async function fixCategories() {
    try {
        const beanBudUpdated = await Product.updateMany(
            { sku: { $regex: '^BB-' } },
            { $set: { category: 'bean-and-bud' } }
        );
        console.log(`✓ Updated ${beanBudUpdated.modifiedCount} Bean & Bud products`);

        const laBrewhaUpdated = await Product.updateMany(
            { sku: { $regex: '^LB-' } },
            { $set: { category: 'la-brewha' } }
        );
        console.log(`✓ Updated ${laBrewhaUpdated.modifiedCount} La Brewha products`);

        const categories = await Product.distinct('category');
        console.log('✓ All categories:', categories);

        const beanCount = await Product.countDocuments({ category: 'bean-and-bud' });
        const brewhaCount = await Product.countDocuments({ category: 'la-brewha' });
        console.log(`✓ Bean & Bud products: ${beanCount}`);
        console.log(`✓ La Brewha products: ${brewhaCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixCategories();
