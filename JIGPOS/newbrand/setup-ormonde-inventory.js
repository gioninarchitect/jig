// Setup Ormonde Branch Inventory with DBC Products
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';

async function setupOrmondeInventory() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB: dbc');

    const Branch = require('./backend/modules/database/models/Branch');
    const Product = require('./backend/modules/database/models/Product');
    const BranchInventory = require('./backend/modules/database/models/BranchInventory');

    // Get or update Ormonde branch
    let ormonde = await Branch.findOne({ branchCode: 'ORM' });

    if (!ormonde) {
      console.log('Creating Ormonde branch...');
      ormonde = new Branch({
        name: 'Ormonde HQ',
        branchCode: 'ORM',
        status: 'active',
        address: {
          street: 'Ormonde',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2091',
          country: 'South Africa'
        },
        contact: {
          phone: '+27 11 000 0000',
          email: 'ormonde@jig.cleva-ai.co.za'
        },
        operatingHours: {
          monday: { open: '08:00', close: '17:00', closed: false },
          tuesday: { open: '08:00', close: '17:00', closed: false },
          wednesday: { open: '08:00', close: '17:00', closed: false },
          thursday: { open: '08:00', close: '17:00', closed: false },
          friday: { open: '08:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '14:00', closed: false },
          sunday: { open: '00:00', close: '00:00', closed: true }
        },
        tillCount: 2
      });
      await ormonde.save();
    } else {
      // Update existing branch to be active
      ormonde.status = 'active';
      await ormonde.save();
    }

    console.log('Ormonde branch ID:', ormonde._id);
    console.log('Ormonde status:', ormonde.status);

    // Get all products
    const products = await Product.find({ status: 'active' });
    console.log(`\nFound ${products.length} active products`);

    // Clear existing branch inventory for Ormonde
    await BranchInventory.deleteMany({ branchId: ormonde._id });
    console.log('Cleared existing Ormonde inventory');

    // Create branch inventory entries for each product
    const inventoryEntries = [];
    for (const product of products) {
      const entry = new BranchInventory({
        branchId: ormonde._id,
        productId: product._id,
        quantity: product.inventory?.quantity || 50,
        reservedQuantity: 0,
        minimumStock: product.inventory?.lowStockThreshold || 10,
        reorderPoint: 15,
        maxStock: 100,
        lastRestockDate: new Date(),
        lastRestockQuantity: product.inventory?.quantity || 50,
        location: 'Main Floor',
        status: 'active'
      });
      inventoryEntries.push(entry);
    }

    // Save all inventory entries
    await BranchInventory.insertMany(inventoryEntries);
    console.log(`Created ${inventoryEntries.length} inventory entries for Ormonde`);

    // Summary
    console.log('\n=== ORMONDE INVENTORY SETUP COMPLETE ===');
    console.log(`Branch: ${ormonde.name} (${ormonde.branchCode})`);
    console.log(`Branch ID: ${ormonde._id}`);
    console.log(`Products: ${products.length}`);
    console.log(`Total inventory entries: ${inventoryEntries.length}`);

    // List products with stock
    console.log('\n=== PRODUCTS WITH STOCK ===');
    for (const entry of inventoryEntries.slice(0, 10)) {
      const product = products.find(p => p._id.toString() === entry.productId.toString());
      if (product) {
        console.log(`  ${product.name}: ${entry.quantity} units @ R${product.price}`);
      }
    }
    if (inventoryEntries.length > 10) {
      console.log(`  ... and ${inventoryEntries.length - 10} more products`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Setup error:', error);
    process.exit(1);
  }
}

setupOrmondeInventory();
