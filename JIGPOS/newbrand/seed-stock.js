#!/usr/bin/env node
// Seed stock for all branches — updates Product inventory AND creates BranchInventory records
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./backend/modules/database/models/Product');
const Branch = require('./backend/modules/database/models/Branch');
const BranchInventory = require('./backend/modules/database/models/BranchInventory');

async function seedStock() {
    try {
        const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';
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
        console.log(`Updated ${result.modifiedCount} products with stock`);

        // Get all branches and products
        const branches = await Branch.find({ isActive: true });
        const products = await Product.find({});
        console.log(`\nAllocating stock: ${products.length} products x ${branches.length} branches`);

        // Clear existing branch inventory
        await BranchInventory.deleteMany({});

        // Create BranchInventory for every product at every branch
        const records = [];
        for (const branch of branches) {
            for (const product of products) {
                records.push({
                    branchId: branch._id,
                    productId: product._id,
                    quantity: 50,
                    reserved: 0,
                    lowStockThreshold: 10,
                    reorderPoint: 20,
                    reorderQuantity: 50
                });
            }
        }

        if (records.length > 0) {
            await BranchInventory.insertMany(records);
        }

        console.log(`Created ${records.length} branch inventory records`);

        // Show summary
        for (const branch of branches) {
            const count = await BranchInventory.countDocuments({ branchId: branch._id, quantity: { $gt: 0 } });
            console.log(`  [${branch.branchCode}] ${branch.name}: ${count} products in stock`);
        }

        await mongoose.disconnect();
        console.log('\nStock seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding stock:', error);
        process.exit(1);
    }
}

seedStock();
