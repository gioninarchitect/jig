// Create Demo Users Script
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../modules/database/models/User');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

async function createDemoUsers() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Delete existing demo users if they exist
    await User.deleteMany({
      email: { $in: ['demo@origin.cleva-ai.co.za', 'admin@origin.cleva-ai.co.za'] }
    });
    console.log('Cleared existing demo users');

    // Create regular user
    const regularUser = new User({
      email: 'demo@origin.cleva-ai.co.za',
      username: 'demouser',
      password: 'Demo123456!',
      firstName: 'Demo',
      lastName: 'User',
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      profile: {
        phone: '+27123456789',
        address: {
          street: '123 Wellness Street',
          suburb: 'Green Point',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8001',
          country: 'South Africa'
        }
      },
      loyalty: {
        ldCoins: 500,
        tier: 'silver',
        totalSpent: 2500,
        totalEarned: 500
      },
      gamification: {
        level: 5,
        xp: 1250,
        streak: 7
      },
      referralCode: 'DEMO2024',
      lastLogin: new Date()
    });

    await regularUser.save();
    console.log('Regular user created successfully');

    // Create admin/store owner
    const adminUser = new User({
      email: 'admin@origin.cleva-ai.co.za',
      username: 'admin',
      password: 'Admin123456!',
      firstName: 'Store',
      lastName: 'Owner',
      role: 'admin',
      permissions: ['manage_products', 'manage_orders', 'manage_users', 'view_analytics'],
      isActive: true,
      isEmailVerified: true,
      profile: {
        phone: '+27987654321',
        address: {
          street: '456 Business Avenue',
          suburb: 'Waterfront',
          city: 'Cape Town',
          province: 'Western Cape',
          postalCode: '8002',
          country: 'South Africa'
        }
      },
      loyalty: {
        ldCoins: 0,
        tier: 'platinum',
        totalSpent: 0,
        totalEarned: 0
      },
      gamification: {
        level: 1,
        xp: 0,
        streak: 0
      },
      lastLogin: new Date()
    });

    await adminUser.save();
    console.log('Admin user created successfully');

    console.log('\n===========================================');
    console.log('DEMO USERS CREATED SUCCESSFULLY');
    console.log('===========================================\n');

    console.log('REGULAR USER CREDENTIALS:');
    console.log('Email: demo@origin.cleva-ai.co.za');
    console.log('Password: Demo123456!');
    console.log('Role: User (Customer Dashboard)\n');

    console.log('ADMIN/STORE OWNER CREDENTIALS:');
    console.log('Email: admin@origin.cleva-ai.co.za');
    console.log('Password: Admin123456!');
    console.log('Role: Admin (Store Owner Dashboard)\n');

    console.log('===========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error creating demo users:', error);
    process.exit(1);
  }
}

createDemoUsers();
