const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./backend/modules/database/models/User');

  console.log('Deleting admin user...');
  const result = await User.deleteOne({ email: 'admin@basothomedicalherbs.ls' });

  console.log('Deleted:', result.deletedCount, 'user(s)');
  console.log('\nRestart the server with: pm2 restart cbd-wellness-24');
  console.log('It will auto-create admin with password: Admin123!');

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
