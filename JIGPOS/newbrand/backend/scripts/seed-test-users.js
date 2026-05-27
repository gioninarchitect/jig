// Seed Test Users for Origin by ILCO Farming
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../modules/database/models/User');
const Branch = require('../modules/database/models/Branch');
require('dotenv').config();

async function seedTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/origin', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('Connected to MongoDB');

    // Get the main branch (should be created by previous seeding)
    let mainBranch = await Branch.findOne({ name: 'Main Store' });

    if (!mainBranch) {
      console.log('Creating Main Store branch...');
      mainBranch = await Branch.create({
        name: 'Main Store',
        branchCode: 'MAIN',
        address: {
          street: '123 Main Street',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2001',
          country: 'South Africa'
        },
        phone: '+27 11 123 4567',
        email: 'info@cleva-ai.co.za',
        isActive: true,
        isMainBranch: true
      });
    }

    const PIN = '123456';
    const hashedPin = await bcrypt.hash(PIN, 10);

    const testUsers = [
      // Customer — lifestyle products only
      {
        email: 'customer@cleva-ai.co.za',
        username: 'customer',
        firstName: 'Michael',
        lastName: 'Williams',
        role: 'user',
        phone: '+27 82 111 2222',
        permanentPin: PIN,
        dateOfBirth: new Date('1990-05-15'),
        address: {
          street: '456 Oak Avenue',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2001',
          country: 'South Africa'
        }
      },

      // Patient — Section 21 approved, medical access
      {
        email: 'patient@cleva-ai.co.za',
        username: 'patient',
        firstName: 'David',
        lastName: 'Brown',
        role: 'user',
        phone: '+27 82 555 6666',
        permanentPin: PIN,
        dateOfBirth: new Date('1978-12-10'),
        address: {
          street: '321 Elm Road',
          city: 'Durban',
          province: 'KwaZulu-Natal',
          postalCode: '4001',
          country: 'South Africa'
        },
        section21Status: 'approved',
        section21Details: {
          authorizationNumber: 'S21-2024-001234',
          doctorName: 'Dr. Jane Wilson',
          practiceNumber: 'MP-123456',
          issueDate: new Date('2024-06-01'),
          expiryDate: new Date('2025-12-01'),
          conditions: ['Chronic Pain', 'Anxiety'],
          approvedBy: 'System Admin',
          approvedDate: new Date('2024-06-02')
        }
      }
    ];

    console.log('\nCreating test users...\n');

    for (const userData of testUsers) {
      if (userData.skip) {
        console.log(`⏭️  Skipping ${userData.email} (admin already exists)`);
        continue;
      }

      // Check if user already exists
      const existing = await User.findOne({ email: userData.email });

      if (existing) {
        console.log(`  User ${userData.email} exists - updating PIN...`);
        await User.updateOne(
          { email: userData.email },
          { $set: { permanentPin: hashedPin, isActive: true, isEmailVerified: true } }
        );
        console.log(`  Updated ${userData.email}`);
      } else {
        await User.create({
          ...userData,
          permanentPin: hashedPin,
          isActive: true,
          isEmailVerified: true
        });

        console.log(`✅ Created ${userData.email}`);
      }
    }

    console.log('\nCustomer Test Accounts (all PIN: 123456):');
    console.log('==========================================');
    console.log('  customer@cleva-ai.co.za  — Regular customer (lifestyle)');
    console.log('  patient@cleva-ai.co.za   — Patient (Section 21 approved)');
    console.log('==========================================');
    console.log('Login via OTP at /login.html or PIN on staff dashboards\n');

    mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding test users:', error);
    mongoose.connection.close();
    process.exit(1);
  }
}

// Run the seed function
seedTestUsers();
