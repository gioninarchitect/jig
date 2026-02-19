const mongoose = require('mongoose');
const User = require('./backend/modules/database/models/User');

mongoose.connect('mongodb://localhost:27017/jig').then(async () => {
  const users = await User.find({}).select('email firstName lastName role').limit(10);
  console.log(JSON.stringify(users, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
