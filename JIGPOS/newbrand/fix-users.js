const mongoose = require('mongoose');
const User = require('./backend/modules/database/models/User');

mongoose.connect('mongodb://localhost:27017/jig').then(async () => {
  // Fix users with null section21Status
  const result = await User.updateMany(
    { section21Status: null },
    { $set: { section21Status: 'none' } }
  );
  console.log('Fixed users:', result.modifiedCount);
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
