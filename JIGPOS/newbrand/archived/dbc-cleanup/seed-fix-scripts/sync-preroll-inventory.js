const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/jig').then(async () => {
  const Product = require('./backend/modules/database/models/Product');
  const BranchInventory = require('./backend/modules/database/models/BranchInventory');
  const Branch = require('./backend/modules/database/models/Branch');

  // Find Ormonde branch
  const ormonde = await Branch.findOne({ name: /ormonde/i });
  if (!ormonde) {
    console.log('Ormonde branch not found!');
    await mongoose.disconnect();
    return;
  }
  console.log('Ormonde branch:', ormonde._id);

  // Find the R10 products
  const products = await Product.find({
    $or: [
      { sku: 'BLADES-SINGLE' },
      { sku: 'STONERDAYZ-CONE' },
      { name: 'Perfect Joint (Single)' }
    ]
  });

  console.log('\nAdding to Ormonde BranchInventory:');

  for (const p of products) {
    const result = await BranchInventory.findOneAndUpdate(
      { branchId: ormonde._id, productId: p._id },
      {
        branchId: ormonde._id,
        productId: p._id,
        quantity: p.inventory?.quantity || 100,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );
    console.log('  -', p.name, ':', result.quantity, 'units');
  }

  console.log('\nDone!');
  await mongoose.disconnect();
}).catch(err => console.error(err));
