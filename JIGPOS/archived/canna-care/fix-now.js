const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const User = require('./backend/modules/database/models/User');

  // Delete old admin
  await User.deleteOne({ email: 'admin@cbdwellness24.co.za' });
  console.log('✅ Deleted old admin');

  // Create fresh admin with correct password
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  await User.create({
    email: 'admin@cbdwellness24.co.za',
    password: hashedPassword,
    username: 'cbdadmin',
    firstName: 'CBD',
    lastName: 'Admin',
    role: 'admin',
    isAdmin: true,
    isActive: true,
    loginAttempts: 0,
    lockUntil: null
  });

  console.log('✅ Created new admin user');
  console.log('Email: admin@cbdwellness24.co.za');
  console.log('Password: Admin123!');
  console.log('\nLogin should work now!');

  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
