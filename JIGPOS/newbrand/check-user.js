// Check user details
const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jig').then(async () => {
  const User = require('./backend/modules/database/models/User');
  const assistant = await User.findOne({ email: 'assistant@jig.cleva-ai.co.za' });

  if (assistant) {
    console.log('Assistant user found:');
    console.log('  email:', assistant.email);
    console.log('  role:', assistant.role);
    console.log('  branchId:', assistant.branchId);
    console.log('  has password:', assistant.password ? 'YES' : 'NO');
  } else {
    console.log('Assistant user NOT FOUND');
  }

  // Also check admin
  const admin = await User.findOne({ email: 'admin@jig.cleva-ai.co.za' });
  if (admin) {
    console.log('\nAdmin user found:');
    console.log('  email:', admin.email);
    console.log('  role:', admin.role);
    console.log('  has password:', admin.password ? 'YES' : 'NO');
  }

  process.exit(0);
}).catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
