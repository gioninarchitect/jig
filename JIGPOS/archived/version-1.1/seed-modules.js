const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/cbdwellness24');
const { Module } = require('./backend/modules/database/models/Module');

async function seedModules() {
    try {
        console.log('Seeding modules...\n');

        // Clear existing modules
        await Module.deleteMany({});
        console.log('Cleared existing modules');

        const modules = [
            {
                moduleId: 'drive-through',
                name: '24/7 Drive-Through',
                description: 'Enable 24/7 drive-through pickup for medical cannabis and wellness products with GPS tracking, queue management, and Section 21 compliance.',
                category: 'operations',
                version: '1.0.0',
                pricing: {
                    type: 'tiered',
                    amount: 3999, // Base price (HQ)
                    currency: 'ZAR',
                    tiers: {
                        hq: {
                            amount: 3999,
                            description: 'HQ/Main Location (Fourways) - Premium pilot site with full support'
                        },
                        branch: {
                            amount: 1999,
                            description: 'Additional Branch Locations - 50% discount per branch'
                        },
                        multiLocation: {
                            minLocations: 3,
                            amount: 1499,
                            description: '3+ Locations - Enterprise discount (62% off HQ price)'
                        }
                    }
                },
                features: [
                    {
                        name: 'GPS Tracking',
                        description: 'Real-time customer location tracking and arrival notifications',
                        icon: 'fa-map-marker-alt'
                    },
                    {
                        name: 'Queue Management',
                        description: 'Smart queue system with estimated wait times',
                        icon: 'fa-clock'
                    },
                    {
                        name: 'Section 21 Compliance',
                        description: 'Automated prescription verification at pickup',
                        icon: 'fa-shield-alt'
                    },
                    {
                        name: 'Payment Integration',
                        description: 'Pre-payment or pay-at-window options',
                        icon: 'fa-credit-card'
                    }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: ['pos', 'inventory', 'section21'],
                    requiredPermissions: ['admin', 'staff_manager']
                },
                status: 'coming-soon',
                icon: 'fa-car',
                documentation: 'https://docs.cbdwellness24.co.za/modules/drive-through',
                supportEmail: 'support@cbdwellness24.co.za',
                vendor: {
                    name: 'CBD Wellness 24',
                    website: 'https://cbdwellness24.co.za'
                },
                tags: ['operations', 'medical-cannabis', 'compliance', '24-7']
            },
            {
                moduleId: 'affiliates',
                name: 'Wellness Advocates Program',
                description: 'Comprehensive affiliate marketing system with commission tracking, influencer verification, and viral campaign management.',
                category: 'marketing',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 1999,
                    currency: 'ZAR'
                },
                features: [
                    {
                        name: 'Commission Tracking',
                        description: 'Automated 15% commission calculation and payouts',
                        icon: 'fa-percentage'
                    },
                    {
                        name: 'Referral Links',
                        description: 'Unique tracking links for each affiliate',
                        icon: 'fa-link'
                    },
                    {
                        name: 'Performance Dashboard',
                        description: 'Real-time analytics for affiliates and admins',
                        icon: 'fa-chart-line'
                    },
                    {
                        name: 'Tiered Rewards',
                        description: 'Bronze, Silver, Gold, Platinum affiliate tiers',
                        icon: 'fa-trophy'
                    }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: ['orders', 'users'],
                    requiredPermissions: ['admin']
                },
                status: 'available',
                icon: 'fa-users',
                documentation: 'https://docs.cbdwellness24.co.za/modules/affiliates',
                supportEmail: 'support@cbdwellness24.co.za',
                vendor: {
                    name: 'CBD Wellness 24',
                    website: 'https://cbdwellness24.co.za'
                },
                tags: ['marketing', 'affiliates', 'commissions', 'influencers']
            },
            {
                moduleId: 'viral-campaigns',
                name: 'Viral Marketing Engine',
                description: 'Launch and manage viral marketing campaigns with influencer verification, viral scoring, and social media tracking.',
                category: 'marketing',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 1499,
                    currency: 'ZAR'
                },
                features: [
                    {
                        name: 'Campaign Management',
                        description: 'Create and track viral marketing campaigns',
                        icon: 'fa-rocket'
                    },
                    {
                        name: 'Viral Scoring',
                        description: 'AI-powered viral potential scoring for products',
                        icon: 'fa-fire'
                    },
                    {
                        name: 'Influencer Verification',
                        description: 'Automated influencer profile verification via Firecrawl',
                        icon: 'fa-user-check'
                    },
                    {
                        name: 'Social Analytics',
                        description: 'Track social media performance and engagement',
                        icon: 'fa-chart-bar'
                    }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: ['products', 'affiliates'],
                    requiredPermissions: ['admin', 'staff_manager']
                },
                status: 'available',
                icon: 'fa-bullhorn',
                documentation: 'https://docs.cbdwellness24.co.za/modules/viral-campaigns',
                supportEmail: 'support@cbdwellness24.co.za',
                vendor: {
                    name: 'CBD Wellness 24',
                    website: 'https://cbdwellness24.co.za'
                },
                tags: ['marketing', 'viral', 'influencers', 'social-media']
            },
            {
                moduleId: 'gamification',
                name: 'Wellness Points & Rewards',
                description: 'Engage customers with wellness points, tiered memberships, achievement badges, and exclusive rewards.',
                category: 'engagement',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 999,
                    currency: 'ZAR'
                },
                features: [
                    {
                        name: 'Wellness Points',
                        description: 'Earn points on purchases and activities',
                        icon: 'fa-coins'
                    },
                    {
                        name: 'Membership Tiers',
                        description: 'Bronze, Silver, Gold, Platinum tiers with benefits',
                        icon: 'fa-medal'
                    },
                    {
                        name: 'Achievement Badges',
                        description: 'Unlock badges for milestones and activities',
                        icon: 'fa-certificate'
                    },
                    {
                        name: 'Leaderboards',
                        description: 'Compete with other wellness enthusiasts',
                        icon: 'fa-list-ol'
                    }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: ['users', 'orders'],
                    requiredPermissions: ['admin']
                },
                status: 'available',
                icon: 'fa-gamepad',
                documentation: 'https://docs.cbdwellness24.co.za/modules/gamification',
                supportEmail: 'support@cbdwellness24.co.za',
                vendor: {
                    name: 'CBD Wellness 24',
                    website: 'https://cbdwellness24.co.za'
                },
                tags: ['engagement', 'loyalty', 'rewards', 'points']
            },
            {
                moduleId: 'analytics-pro',
                name: 'Analytics Pro',
                description: 'Advanced business intelligence with sales forecasting, customer insights, inventory optimization, and custom reports.',
                category: 'analytics',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 1799,
                    currency: 'ZAR'
                },
                features: [
                    {
                        name: 'Sales Forecasting',
                        description: 'AI-powered sales predictions and trends',
                        icon: 'fa-chart-line'
                    },
                    {
                        name: 'Customer Insights',
                        description: 'Deep customer behavior analysis',
                        icon: 'fa-user-chart'
                    },
                    {
                        name: 'Inventory Optimization',
                        description: 'Smart reorder suggestions and stock alerts',
                        icon: 'fa-boxes'
                    },
                    {
                        name: 'Custom Reports',
                        description: 'Build and schedule custom reports',
                        icon: 'fa-file-invoice'
                    }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: ['orders', 'products', 'users'],
                    requiredPermissions: ['admin', 'staff_manager']
                },
                status: 'beta',
                icon: 'fa-chart-pie',
                documentation: 'https://docs.cbdwellness24.co.za/modules/analytics-pro',
                supportEmail: 'support@cbdwellness24.co.za',
                vendor: {
                    name: 'CBD Wellness 24',
                    website: 'https://cbdwellness24.co.za'
                },
                tags: ['analytics', 'reporting', 'business-intelligence', 'forecasting']
            },
            {
                moduleId: 'multi-branch',
                name: 'Multi-Branch Management',
                description: 'Manage multiple locations with centralized inventory, inter-branch transfers, and location-based reporting.',
                category: 'operations',
                version: '1.0.0',
                pricing: {
                    type: 'annual',
                    amount: 19999,
                    currency: 'ZAR'
                },
                features: [
                    {
                        name: 'Centralized Dashboard',
                        description: 'Manage all locations from one interface',
                        icon: 'fa-building'
                    },
                    {
                        name: 'Branch Inventory',
                        description: 'Track inventory across all locations',
                        icon: 'fa-warehouse'
                    },
                    {
                        name: 'Inter-Branch Transfers',
                        description: 'Move stock between locations with tracking',
                        icon: 'fa-exchange-alt'
                    },
                    {
                        name: 'Location Reports',
                        description: 'Performance metrics by branch',
                        icon: 'fa-map-marked-alt'
                    }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: ['inventory', 'staff'],
                    requiredPermissions: ['admin']
                },
                status: 'available',
                icon: 'fa-store-alt',
                documentation: 'https://docs.cbdwellness24.co.za/modules/multi-branch',
                supportEmail: 'support@cbdwellness24.co.za',
                vendor: {
                    name: 'CBD Wellness 24',
                    website: 'https://cbdwellness24.co.za'
                },
                tags: ['operations', 'multi-branch', 'inventory', 'franchise']
            }
        ];

        // Insert modules
        await Module.insertMany(modules);
        console.log(`\n✓ Inserted ${modules.length} modules successfully\n`);

        // Show summary
        modules.forEach(module => {
            const status = module.status === 'available' ? '✓' : module.status === 'beta' ? 'β' : '◷';
            const price = module.pricing.type === 'free' ? 'FREE' : `R${module.pricing.amount}/${module.pricing.type}`;
            console.log(`${status} ${module.name} - ${price} (${module.category})`);
        });

        console.log('\n✓ Module marketplace ready!\n');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding modules:', error);
        process.exit(1);
    }
}

seedModules();
