const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Product = require('./backend/modules/database/models/Product');

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jig').then(async () => {
  const all = await Product.find({}, 'sku name').sort('name');

  console.log('=== NON-NUMERIC SKU PRODUCTS ===');
  const nonNumeric = [];
  const numeric = [];
  for (const p of all) {
    const isNum = /^[0-9]+$/.test(p.sku);
    if (isNum) {
      numeric.push(p);
    } else {
      nonNumeric.push(p);
      console.log(p.sku + ' -> ' + p.name);
    }
  }
  console.log('Total non-numeric:', nonNumeric.length);
  console.log('Total numeric:', numeric.length);
  console.log('Grand total:', all.length);

  mongoose.disconnect();
});
