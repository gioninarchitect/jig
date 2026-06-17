// Quick script to add products
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Product = require('../modules/database/models/Product');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

const newProducts = [
  {
    name: 'Sheet - Blades Single',
    sku: 'ACC-BLADE-001',
    description: 'Single blade sheets for rolling',
    price: 1.00,
    costPrice: 0.30,
    category: 'accessories',
    subcategory: 'papers',
    status: 'active',
    inventory: {
      quantity: 500,
      lowStockThreshold: 50,
      trackQuantity: true
    }
  },
  {
    name: 'StonerDayz Single Cone',
    sku: 'ACC-CONE-SD01',
    description: 'StonerDayz pre-rolled single cone',
    price: 10.00,
    costPrice: 3.00,
    category: 'accessories',
    subcategory: 'papers',
    status: 'active',
    inventory: {
      quantity: 200,
      lowStockThreshold: 30,
      trackQuantity: true
    }
  }
];

async function addProducts() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    for (const product of newProducts) {
      const existing = await Product.findOne({ sku: product.sku });
      if (existing) {
        console.log(`Skipping ${product.name} - already exists`);
        continue;
      }

      const newProduct = new Product(product);
      await newProduct.save();
      console.log(`Added: ${product.name} @ R${product.price.toFixed(2)}`);
    }

    console.log('Done!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

addProducts();
