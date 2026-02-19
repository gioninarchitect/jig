// Seed Test Users for CBD Wellness 24
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../modules/database/models/User');
const Branch = require('../modules/database/models/Branch');
require('dotenv').config();

async function seedTestUsers() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cbdwellness24', {
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
        email: 'main@cbdwellness24.co.za',
        isActive: true,
        isMainBranch: true
      });
    }

    const testUsers = [
      // 1. Admin User
      {
        email: 'admin@cbdwellness24.co.za',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        role: 'admin',
        phone: '+27 11 111 1111'
      },

      // 2. Store Owner / Manager
      {
        email: 'manager@cbdwellness24.co.za',
        password: 'Manager123!',
        username: 'manager',
        firstName: 'Sarah',
        lastName: 'Johnson',
        role: 'staff_manager',
        phone: '+27 11 222 2222',
        branch: mainBranch._id,
        permissions: ['manageBranch', 'manageInventory', 'manageStaff', 'manageSales', 'viewReports', 'manageSuppliers']
      },

      // 3. Staff Assistant (Bartender/Assistant)
      {
        email: 'assistant@cbdwellness24.co.za',
        password: 'Assistant123!',
        username: 'assistant',
        firstName: 'John',
        lastName: 'Smith',
        role: 'staff_assistant',
        phone: '+27 11 333 3333',
        branch: mainBranch._id,
        permissions: ['manageSales']
      },

      // 4. Regular User (Customer - No Section 21)
      {
        email: 'user@cbdwellness24.co.za',
        password: 'User123!',
        username: 'user',
        firstName: 'Michael',
        lastName: 'Williams',
        role: 'user',
        phone: '+27 82 111 2222',
        dateOfBirth: new Date('1990-05-15'),
        address: {
          street: '456 Oak Avenue',
          city: 'Johannesburg',
          province: 'Gauteng',
          postalCode: '2001',
          country: 'South Africa'
        }
      },

      // 5. User with Pending Section 21
      {
        email: 'pending@cbdwellness24.co.za',
        password: 'Pending123!',
        username: 'pending',
        firstName: 'Emma',
        lastName: 'Davis',
        role: 'user',
        phone: '+27 82 333 4444',
        dateOfBirth: new Date('1985-08-20'),
        address: {
          street: '789 Pine Street',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8001',
          country: 'South Africa'
        },
        section21Status: 'pending'
      },

      // 6. Patient (User with Approved Section 21)
      {
        email: 'patient@cbdwellness24.co.za',
        password: 'Patient123!',
        username: 'patient',
        firstName: 'David',
        lastName: 'Brown',
        role: 'user', // Note: Role stays 'user', Section 21 status determines patient access
        phone: '+27 82 555 6666',
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
          expiryDate: new Date('2024-12-01'),
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
        console.log(`⚠️  User ${userData.email} already exists - updating...`);

        // Update password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        await User.updateOne(
          { email: userData.email },
          {
            $set: {
              password: hashedPassword,
              ...userData,
              email: undefined,
              password: undefined
            }
          }
        );
        console.log(`✅ Updated ${userData.email}`);
      } else {
        // Create new user
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        await User.create({
          ...userData,
          password: hashedPassword,
          isActive: true,
          emailVerified: true
        });

        console.log(`✅ Created ${userData.email}`);
      }
    }

    // Display summary
    console.log('\n📊 Test Users Summary:');
    console.log('=====================================');
    console.log('Role              | Email                           | Password');
    console.log('------------------|----------------------------------|-------------');
    console.log('Admin             | admin@cbdwellness24.co.za       | Admin123!');
    console.log('Store Manager     | manager@cbdwellness24.co.za     | Manager123!');
    console.log('Staff Assistant   | assistant@cbdwellness24.co.za   | Assistant123!');
    console.log('Regular User      | user@cbdwellness24.co.za        | User123!');
    console.log('Pending S21       | pending@cbdwellness24.co.za     | Pending123!');
    console.log('Patient (S21)     | patient@cbdwellness24.co.za     | Patient123!');
    console.log('=====================================\n');

    console.log('💡 Testing Guide:');
    console.log('=====================================');
    console.log('1. Admin: Full system access - admin.html');
    console.log('2. Store Manager: Branch management, staff, inventory, POS');
    console.log('3. Staff Assistant: POS access, bartender/assistant duties');
    console.log('4. Regular User: Lifestyle products, can upload Section 21');
    console.log('5. Pending S21: Section 21 under review');
    console.log('6. Patient: Access to medical cannabis products');
    console.log('=====================================\n');

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
