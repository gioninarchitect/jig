const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./backend/modules/database/models/User');
  const admin = await User.findOne({ email: 'admin@cbdwellness24.co.za' });

  if (admin) {
    console.log('Found admin user');
    console.log('Current role:', admin.role);
    console.log('Current isAdmin:', admin.isAdmin);

    // Fix the admin user properties
    admin.role = 'admin';
    admin.isAdmin = true;
    admin.password = await bcrypt.hash('Admin123!', 10);
    admin.loginAttempts = 0;
    admin.lockUntil = null;
    admin.isActive = true;

    await admin.save();

    console.log('\n✅ Admin user fixed!');
    console.log('Role:', admin.role);
    console.log('isAdmin:', admin.isAdmin);
    console.log('Password reset to: Admin123!');
    console.log('Account unlocked and active');
    console.log('\nTry logging in now with:');
    console.log('Email: admin@cbdwellness24.co.za');
    console.log('Password: Admin123!');
  } else {
    console.log('❌ Admin user not found!');
  }

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
