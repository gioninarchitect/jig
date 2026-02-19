// Seed Drive-Through Module to Marketplace
const mongoose = require('mongoose');
const { Module } = require('./backend/modules/database/models/Module');

async function seedDriveThroughModule() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/cbdwellness24', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to MongoDB');

        // Check if module already exists
        const existing = await Module.findOne({ moduleId: 'drive-through' });
        if (existing) {
            console.log('ℹ️  Drive-Through module already exists');
            await mongoose.connection.close();
            return;
        }

        // Create Drive-Through Module
        const driveThroughModule = await Module.create({
            moduleId: 'drive-through',
            name: '24/7 Drive-Through',
            description: 'Complete drive-through ordering system with queue management, GPS tracking, and Section 21 compliance verification. Perfect for dispensaries offering convenient pickup services.',
            category: 'operations',
            version: '1.0.0',
            pricing: {
                type: 'monthly',
                amount: 3999,
                currency: 'ZAR',
                tiers: {
                    hq: {
                        amount: 3999,
                        description: 'Full-featured drive-through for headquarters - includes staff dashboard, queue management, GPS tracking'
                    },
                    branch: {
                        amount: 1999,
                        description: 'Drive-through for branch locations - connects to HQ system'
                    },
                    multiLocation: {
                        minLocations: 3,
                        amount: 8999,
                        description: 'Multi-location package (3+ locations) - centralized queue management'
                    }
                }
            },
            features: [
                {
                    name: 'Customer Mobile Ordering',
                    description: 'Mobile-optimized interface for customers to browse products and place orders',
                    icon: 'mobile-alt'
                },
                {
                    name: 'Pre-Payment Enforcement',
                    description: 'Requires InstaPay, EFT, or Card payment before order confirmation to prevent no-shows',
                    icon: 'credit-card'
                },
                {
                    name: 'Real-Time Queue Management',
                    description: 'Live queue dashboard for staff with position tracking and estimated wait times',
                    icon: 'list-ol'
                },
                {
                    name: 'GPS Customer Tracking',
                    description: 'Track customer location and distance to store for accurate arrival estimates',
                    icon: 'map-marker-alt'
                },
                {
                    name: 'Section 21 Compliance',
                    description: 'Built-in verification workflow for medical cannabis orders (prescription + ID scanning)',
                    icon: 'shield-alt'
                },
                {
                    name: 'Staff Dashboard',
                    description: 'Dedicated staff interface for managing queue, preparing orders, and completing pickups',
                    icon: 'users-cog'
                },
                {
                    name: 'Order Status Updates',
                    description: 'Customers receive real-time updates: in-queue → preparing → ready → completed',
                    icon: 'bell'
                },
                {
                    name: 'Inventory Integration',
                    description: 'Automatic stock reservation and management integrated with POS system',
                    icon: 'boxes'
                },
                {
                    name: 'Audit Trail',
                    description: 'Complete compliance audit trail for all orders and Section 21 verifications',
                    icon: 'clipboard-check'
                },
                {
                    name: 'Analytics Dashboard',
                    description: 'Track average wait times, peak hours, order volumes, and staff performance',
                    icon: 'chart-line'
                }
            ],
            requirements: {
                minimumVersion: '1.0.0',
                dependencies: [],
                requiredPermissions: ['manage_orders', 'manage_inventory', 'staff_access']
            },
            status: 'available',
            icon: 'fa-car',
            screenshots: [
                '/images/modules/drive-through-customer.png',
                '/images/modules/drive-through-staff.png',
                '/images/modules/drive-through-queue.png'
            ],
            documentation: 'https://docs.cbdwellness24.co.za/modules/drive-through',
            supportEmail: 'support@cbdwellness24.co.za',
            vendor: {
                name: 'CBD Wellness 24',
                website: 'https://cbdwellness24.co.za'
            },
            metrics: {
                installations: 0,
                rating: 5.0,
                reviews: 0
            },
            tags: ['drive-through', 'ordering', 'queue', 'pickup', 'operations', 'compliance', 'section-21']
        });

        console.log('✅ Drive-Through module created successfully!');
        console.log('📦 Module ID:', driveThroughModule.moduleId);
        console.log('💰 Pricing: R', driveThroughModule.pricing.amount, '/month');
        console.log('🎯 Category:', driveThroughModule.category);
        console.log('✨ Features:', driveThroughModule.features.length);

        await mongoose.connection.close();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error seeding Drive-Through module:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

seedDriveThroughModule();
