const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./backend/modules/database/models/User');

  console.log('\n=== Checking all admin users ===\n');

  const admins = await User.find({
    $or: [
      { email: 'admin@basothomedicalherbs.ls' },
      { role: 'admin' },
      { isAdmin: true }
    ]
  });

  console.log(`Found ${admins.length} admin user(s):\n`);

  admins.forEach(admin => {
    console.log('Email:', admin.email);
    console.log('Username:', admin.username);
    console.log('Role:', admin.role);
    console.log('isAdmin:', admin.isAdmin);
    console.log('isActive:', admin.isActive);
    console.log('loginAttempts:', admin.loginAttempts);
    console.log('lockUntil:', admin.lockUntil);
    console.log('Password exists:', !!admin.password);
    console.log('Password length:', admin.password?.length);
    console.log('---\n');
  });

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
