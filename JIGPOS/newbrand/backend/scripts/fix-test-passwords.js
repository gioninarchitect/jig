const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

async function fixTestPasswords() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    const testCredentials = [
      { email: 'admin@origin.cleva-ai.co.za', password: 'Admin123!' },
      { email: 'manager@origin.cleva-ai.co.za', password: 'Manager123!' },
      { email: 'assistant@origin.cleva-ai.co.za', password: 'Assistant123!' },
      { email: 'user@origin.cleva-ai.co.za', password: 'User123!' },
      { email: 'pending@origin.cleva-ai.co.za', password: 'Pending123!' },
      { email: 'patient@origin.cleva-ai.co.za', password: 'Patient123!' }
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
    console.log('admin@origin.cleva-ai.co.za          | Admin123!');
    console.log('manager@origin.cleva-ai.co.za        | Manager123!');
    console.log('assistant@origin.cleva-ai.co.za      | Assistant123!');
    console.log('user@origin.cleva-ai.co.za           | User123!');
    console.log('pending@origin.cleva-ai.co.za        | Pending123!');
    console.log('patient@origin.cleva-ai.co.za        | Patient123!');
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
