#!/usr/bin/env node
// Quick script to add stock to all products for testing
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./backend/modules/database/models/Product');

async function seedStock() {
    try {
        // Connect to MongoDB
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cbdwellness24';
        await mongoose.connect(mongoURI);
        console.log('Connected to MongoDB');

        // Update all products to have stock
        const result = await Product.updateMany(
            {},
            {
                $set: {
                    'inventory.quantity': 50,
                    'inventory.lowStockThreshold': 10,
                    'inventory.trackQuantity': true,
                    'inventory.allowBackorder': false,
                    status: 'active'
                }
            }
        );

        console.log(`✅ Updated ${result.modifiedCount} products with stock`);
        console.log('All products now have 50 units in stock');

        // Show some products
        const products = await Product.find({}).limit(5).select('name sku inventory.quantity category');
        console.log('\nSample products:');
        products.forEach(p => {
            console.log(`- ${p.name} (${p.sku}): ${p.inventory.quantity} units [${p.category}]`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Stock seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding stock:', error);
        process.exit(1);
    }
}

seedStock();
