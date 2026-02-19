// Run on production: node migrate-stocktake-prod.js
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/jig').then(async () => {
  const StockTake = require('./backend/modules/database/models/StockTake');
  const Product = require('./backend/modules/database/models/Product');

  const sessions = await StockTake.find({ status: { $in: ['draft', 'in_progress'] } });
  console.log('Updating', sessions.length, 'sessions...');

  for (const session of sessions) {
    const productIds = session.lineItems.map(item => item.productId);
    const products = await Product.find({ _id: { $in: productIds } }).select('_id name tags');
    const productMap = new Map(products.map(p => [p._id.toString(), p]));

    let updated = 0;
    for (const item of session.lineItems) {
      const product = productMap.get(item.productId?.toString());
      if (product) {
        const tags = product.tags || [];
        const nameLower = (product.name || '').toLowerCase();

        // Extract grow method
        let growMethod = tags.find(t => ['indoor', 'greendoor'].includes((t || '').toLowerCase())) || '';
        if (!growMethod) {
          if (nameLower.includes('i.d')) growMethod = 'indoor';
          else if (nameLower.includes('g.d')) growMethod = 'greendoor';
        }

        // Extract product type
        let productType = 'loose';
        if (tags.includes('pre-roll') || nameLower.includes('pre roll') || nameLower.includes('preroll') || nameLower.includes('joint')) {
          productType = 'pre-roll';
        } else if (tags.includes('pre-pack') || nameLower.includes('5g') || nameLower.includes('3g') || nameLower.includes('pre pack')) {
          productType = 'pre-pack';
        }

        item.tags = tags;
        item.growMethod = growMethod;
        item.productType = productType;
        updated++;
      }
    }

    await session.save();
    console.log('Session', session._id.toString(), '- updated', updated, 'line items');
  }

  console.log('Done!');
  await mongoose.disconnect();
}).catch(err => console.error(err));
