const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bmh';

async function fixTestPasswords() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const testCredentials = [
      { email: 'admin@basothomedicalherbs.ls', password: 'Admin123!' },
      { email: 'manager@basothomedicalherbs.ls', password: 'Manager123!' },
      { email: 'assistant@basothomedicalherbs.ls', password: 'Assistant123!' },
      { email: 'user@basothomedicalherbs.ls', password: 'User123!' },
      { email: 'pending@basothomedicalherbs.ls', password: 'Pending123!' },
      { email: 'patient@basothomedicalherbs.ls', password: 'Patient123!' }
    ];

    console.log('\nResetting test user passwords...\n');

    for (const cred of testCredentials) {
      const hashedPassword = await bcrypt.hash(cred.password, 10);

      const result = await User.updateOne(
        { email: cred.email },
        {
          $set: {
            password: hashedPassword,
            loginAttempts: 0,
            lockUntil: null
          }
        }
      );

      if (result.matchedCount > 0) {
        console.log(`✅ Reset password for ${cred.email}`);
      } else {
        console.log(`⚠️  User not found: ${cred.email}`);
      }
    }

    console.log('\n📊 Test Credentials Summary:');
    console.log('=====================================');
    console.log('Email                              | Password');
    console.log('-----------------------------------|-------------');
    console.log('admin@basothomedicalherbs.ls          | Admin123!');
    console.log('manager@basothomedicalherbs.ls        | Manager123!');
    console.log('assistant@basothomedicalherbs.ls      | Assistant123!');
    console.log('user@basothomedicalherbs.ls           | User123!');
    console.log('pending@basothomedicalherbs.ls        | Pending123!');
    console.log('patient@basothomedicalherbs.ls        | Patient123!');
    console.log('=====================================\n');

    mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

fixTestPasswords();
