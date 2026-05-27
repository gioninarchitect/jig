// Seed All Modules to Marketplace
const mongoose = require('mongoose');
const { Module } = require('./backend/modules/database/models/Module');

async function seedAllModules() {
    try {
        // Connect to MongoDB
        await mongoose.connect('mongodb://localhost:27017/origin', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Connected to MongoDB');

        // Array of all modules to seed
        const modules = [
            // 1. DRIVE-THROUGH MODULE (24/7 Retail Store)
            {
                moduleId: 'retail-store',
                name: '24/7 Retail Store',
                description: 'Complete retail-store ordering system with queue management, GPS tracking, and Section 21 compliance verification. Perfect for dispensaries offering convenient pickup services.',
                category: 'operations',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 3999,
                    currency: 'ZAR',
                    tiers: {
                        hq: {
                            amount: 3999,
                            description: 'Full-featured retail-store for headquarters - includes staff dashboard, queue management, GPS tracking'
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
                    { name: 'Customer Mobile Ordering', description: 'Mobile-optimized interface for customers to browse products and place orders', icon: 'mobile-alt' },
                    { name: 'Pre-Payment Enforcement', description: 'Requires InstaPay, EFT, or Card payment before order confirmation to prevent no-shows', icon: 'credit-card' },
                    { name: 'Real-Time Queue Management', description: 'Live queue dashboard for staff with position tracking and estimated wait times', icon: 'list-ol' },
                    { name: 'GPS Customer Tracking', description: 'Track customer location and distance to store for accurate arrival estimates', icon: 'map-marker-alt' },
                    { name: 'Section 21 Compliance', description: 'Built-in verification workflow for medical cannabis orders (prescription + ID scanning)', icon: 'shield-alt' },
                    { name: 'Staff Dashboard', description: 'Dedicated staff interface for managing queue, preparing orders, and completing pickups', icon: 'users-cog' },
                    { name: 'Order Status Updates', description: 'Customers receive real-time updates: in-queue → preparing → ready → completed', icon: 'bell' },
                    { name: 'Inventory Integration', description: 'Automatic stock reservation and management integrated with POS system', icon: 'boxes' },
                    { name: 'Audit Trail', description: 'Complete compliance audit trail for all orders and Section 21 verifications', icon: 'clipboard-check' },
                    { name: 'Analytics Dashboard', description: 'Track average wait times, peak hours, order volumes, and staff performance', icon: 'chart-line' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_orders', 'manage_inventory', 'staff_access']
                },
                status: 'available',
                icon: 'fa-car',
                screenshots: ['/images/modules/retail-store-customer.png', '/images/modules/retail-store-staff.png', '/images/modules/retail-store-queue.png'],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/retail-store',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['retail-store', 'ordering', 'queue', 'pickup', 'operations', 'compliance', 'section-21']
            },

            // 2. AFFILIATE PROGRAM (Wellness Advocates)
            {
                moduleId: 'affiliate-program',
                name: 'Wellness Advocates Program',
                description: 'Complete affiliate marketing system with tiered commission structure (Soldier, Captain, General). Includes referral tracking, automated commission payouts, and comprehensive performance analytics.',
                category: 'marketing',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 2499,
                    currency: 'ZAR',
                    tiers: {
                        starter: {
                            amount: 2499,
                            description: 'Up to 50 affiliates - includes basic tracking and payouts'
                        },
                        professional: {
                            amount: 4999,
                            description: 'Up to 200 affiliates - includes advanced analytics and automated tiered promotions'
                        },
                        enterprise: {
                            amount: 9999,
                            description: 'Unlimited affiliates - includes white-label portal and custom commission structures'
                        }
                    }
                },
                features: [
                    { name: 'Tiered Commission Structure', description: 'Soldier (15%), Captain (20%), General (25%) - automatic tier upgrades based on performance', icon: 'layer-group' },
                    { name: 'Unique Referral Links', description: 'Each affiliate gets personalized tracking links and QR codes for offline marketing', icon: 'link' },
                    { name: 'Real-Time Analytics', description: 'Track clicks, conversions, sales, and commissions in real-time dashboard', icon: 'chart-bar' },
                    { name: 'Automated Payouts', description: 'Configurable payout schedules (weekly, bi-weekly, monthly) with payment threshold controls', icon: 'money-check-alt' },
                    { name: 'Marketing Materials', description: 'Pre-designed banners, social media templates, and email swipes for affiliates', icon: 'images' },
                    { name: 'Performance Leaderboard', description: 'Gamified leaderboard showing top performers with badges and achievements', icon: 'trophy' },
                    { name: 'Multi-Channel Attribution', description: 'Track referrals across social media, email, and offline channels', icon: 'project-diagram' },
                    { name: 'Fraud Detection', description: 'Automated detection of suspicious activity and self-referrals', icon: 'shield-check' },
                    { name: 'Affiliate Dashboard', description: 'Dedicated portal for affiliates to track earnings, generate links, and access resources', icon: 'tachometer-alt' },
                    { name: 'Commission Reports', description: 'Export detailed commission reports for accounting and tax purposes', icon: 'file-invoice-dollar' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_affiliates', 'view_reports', 'manage_payments']
                },
                status: 'available',
                icon: 'fa-users',
                screenshots: ['/images/modules/affiliate-dashboard.png', '/images/modules/affiliate-analytics.png', '/images/modules/affiliate-payouts.png'],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/affiliate-program',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['affiliate', 'marketing', 'referral', 'commission', 'wellness-advocates', 'revenue']
            },

            // 3. VIRAL MARKETING ENGINE
            {
                moduleId: 'viral-marketing',
                name: 'Viral Marketing Engine',
                description: 'AI-powered viral marketing system with influencer verification (Firecrawl integration), viral score calculation, and campaign management. Track product virality and automate influencer partnerships.',
                category: 'marketing',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 5999,
                    currency: 'ZAR',
                    tiers: {
                        basic: {
                            amount: 5999,
                            description: 'Track up to 100 products - includes viral scoring and basic campaign management'
                        },
                        advanced: {
                            amount: 9999,
                            description: 'Unlimited products + influencer verification (500 checks/month) + automated campaigns'
                        },
                        premium: {
                            amount: 14999,
                            description: 'All features + white-label influencer portal + unlimited verification + API access'
                        }
                    }
                },
                features: [
                    { name: 'Viral Score Algorithm', description: 'AI algorithm calculates product virality based on social shares, engagement, and conversion rates', icon: 'brain' },
                    { name: 'Influencer Verification', description: 'Automated verification of Instagram, TikTok, YouTube followers using Firecrawl API', icon: 'user-check' },
                    { name: 'Campaign Management', description: 'Create and manage viral campaigns with trackable goals, budgets, and ROI metrics', icon: 'bullhorn' },
                    { name: 'Social Media Integration', description: 'Track shares, mentions, and engagement across Instagram, Facebook, TikTok, Twitter', icon: 'share-alt' },
                    { name: 'Influencer Portal', description: 'Dedicated portal for influencers to apply for campaigns, track performance, and claim rewards', icon: 'user-tie' },
                    { name: 'Product Recommendations', description: 'AI-powered product recommendations based on viral trends and customer behavior', icon: 'magic' },
                    { name: 'Viral Alerts', description: 'Real-time notifications when products start trending or campaigns go viral', icon: 'bell' },
                    { name: 'Engagement Tracking', description: 'Monitor likes, comments, shares, saves, and click-through rates for all campaigns', icon: 'heart' },
                    { name: 'Campaign Analytics', description: 'Comprehensive analytics showing campaign reach, engagement, conversions, and ROI', icon: 'chart-pie' },
                    { name: 'Automated Rewards', description: 'Automatically reward influencers based on campaign performance and viral score contribution', icon: 'gift' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_campaigns', 'view_analytics', 'manage_influencers']
                },
                status: 'available',
                icon: 'fa-rocket',
                screenshots: ['/images/modules/viral-dashboard.png', '/images/modules/viral-campaigns.png', '/images/modules/viral-analytics.png'],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/viral-marketing',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['viral', 'marketing', 'influencer', 'social-media', 'campaigns', 'analytics', 'ai']
            },

            // 4. MULTI-LOCATION POS
            {
                moduleId: 'multi-location-pos',
                name: 'Multi-Location POS',
                description: 'Enterprise-grade point-of-sale system supporting multiple branches, centralized inventory management, inter-branch transfers, and till session tracking. Includes SpeedPoint integration (Yoco, iKhokha, Paygate).',
                category: 'operations',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 7999,
                    currency: 'ZAR',
                    tiers: {
                        branch: {
                            amount: 2999,
                            description: 'Per branch - includes POS, inventory, and till management'
                        },
                        hq: {
                            amount: 7999,
                            description: 'Headquarters package - includes centralized dashboard, multi-branch analytics, and transfer management'
                        },
                        franchise: {
                            amount: 19999,
                            description: 'Franchise package (5+ locations) - includes all features + white-label branding'
                        }
                    }
                },
                features: [
                    { name: 'Multi-Branch Management', description: 'Manage unlimited branches from centralized dashboard with role-based access control', icon: 'store-alt' },
                    { name: 'Till Session Tracking', description: 'Track opening/closing balances, cash movements, and reconciliation for each till', icon: 'cash-register' },
                    { name: 'Centralized Inventory', description: 'Real-time inventory visibility across all branches with low-stock alerts', icon: 'warehouse' },
                    { name: 'Inter-Branch Transfers', description: 'Automated transfer requests, approvals, and tracking between branches', icon: 'exchange-alt' },
                    { name: 'SpeedPoint Integration', description: 'Direct integration with Yoco, iKhokha, and Paygate card machines', icon: 'credit-card' },
                    { name: 'Dual-Track Sales', description: 'Separate lifestyle and medical (Section 21) sales tracks with compliance enforcement', icon: 'route' },
                    { name: 'Invoice Generation', description: 'Automated PDF invoice generation with email/SMS delivery to customers', icon: 'file-invoice' },
                    { name: 'Branch Analytics', description: 'Compare performance across branches - sales, profits, inventory turnover, staff efficiency', icon: 'chart-line' },
                    { name: 'Operating Hours Config', description: 'Set different operating hours and timezone support for each branch', icon: 'clock' },
                    { name: 'Offline Mode', description: 'Continue sales during internet outages with automatic sync when reconnected', icon: 'sync-alt' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_branches', 'manage_inventory', 'manage_sales', 'staff_access']
                },
                status: 'available',
                icon: 'fa-cash-register',
                screenshots: ['/images/modules/pos-dashboard.png', '/images/modules/pos-till.png', '/images/modules/pos-inventory.png'],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/multi-location-pos',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['pos', 'point-of-sale', 'multi-location', 'inventory', 'branches', 'till', 'operations']
            },

            // 5. VOUCHER SYSTEM
            {
                moduleId: 'voucher-system',
                name: 'Advanced Voucher System',
                description: 'Comprehensive voucher and discount code management supporting percentage, fixed amount, and product-specific vouchers. Includes usage limits, expiry dates, and redemption tracking.',
                category: 'marketing',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 1999,
                    currency: 'ZAR',
                    tiers: {
                        basic: {
                            amount: 1999,
                            description: 'Up to 50 active vouchers - includes basic discount codes and redemption tracking'
                        },
                        professional: {
                            amount: 3999,
                            description: 'Unlimited vouchers + product-specific vouchers + customer segmentation + bulk generation'
                        },
                        enterprise: {
                            amount: 6999,
                            description: 'All features + API access + white-label voucher portal + advanced analytics'
                        }
                    }
                },
                features: [
                    { name: 'Flexible Discount Types', description: 'Percentage, fixed amount, buy-X-get-Y, product-specific, and tiered discounts', icon: 'tags' },
                    { name: 'Usage Limits', description: 'Set total usage limits and per-customer limits to prevent abuse', icon: 'sort-amount-down' },
                    { name: 'Expiry Management', description: 'Configurable start/end dates with automatic expiry notifications', icon: 'calendar-times' },
                    { name: 'Product Restrictions', description: 'Restrict vouchers to specific products, categories, or exclude sale items', icon: 'filter' },
                    { name: 'Minimum Order Value', description: 'Set minimum cart value requirements for voucher application', icon: 'shopping-cart' },
                    { name: 'Customer Segmentation', description: 'Target vouchers to specific customer tiers, new customers, or loyalty members', icon: 'users-cog' },
                    { name: 'Bulk Generation', description: 'Generate thousands of unique codes for promotional campaigns', icon: 'code' },
                    { name: 'Redemption Tracking', description: 'Track who used vouchers, when, and how much discount was applied', icon: 'history' },
                    { name: 'Section 21 Support', description: 'Separate voucher pools for lifestyle and medical products with compliance tracking', icon: 'shield-alt' },
                    { name: 'Analytics Dashboard', description: 'Monitor voucher performance - redemption rates, revenue impact, ROI', icon: 'chart-bar' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_vouchers', 'view_reports']
                },
                status: 'available',
                icon: 'fa-ticket-alt',
                screenshots: ['/images/modules/voucher-dashboard.png', '/images/modules/voucher-create.png', '/images/modules/voucher-analytics.png'],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/voucher-system',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['vouchers', 'discounts', 'coupons', 'promo-codes', 'marketing', 'sales']
            },

            // 6. LEAD MANAGEMENT CRM
            {
                moduleId: 'lead-management',
                name: 'Lead Management CRM',
                description: 'Complete CRM system for managing customer leads from waiting list sign-ups, franchise applications, and contact forms. Includes lead scoring, automated follow-ups, and conversion tracking.',
                category: 'engagement',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 3499,
                    currency: 'ZAR',
                    tiers: {
                        starter: {
                            amount: 3499,
                            description: 'Up to 1,000 leads - includes basic CRM, lead capture forms, and email follow-ups'
                        },
                        professional: {
                            amount: 6999,
                            description: 'Up to 10,000 leads + lead scoring + automated workflows + SMS campaigns'
                        },
                        enterprise: {
                            amount: 12999,
                            description: 'Unlimited leads + custom fields + API access + white-label forms + advanced automation'
                        }
                    }
                },
                features: [
                    { name: 'Lead Capture Forms', description: 'Embedded forms for waiting list, franchise applications, and general inquiries', icon: 'clipboard-list' },
                    { name: 'Lead Scoring', description: 'Automatically score leads based on engagement, source, and behavior to prioritize follow-ups', icon: 'star' },
                    { name: 'Status Pipeline', description: 'Visual pipeline: New → Contacted → Qualified → Converted → Lost with drag-and-drop management', icon: 'tasks' },
                    { name: 'Automated Follow-Ups', description: 'Schedule automated email and SMS follow-ups based on lead status and engagement', icon: 'paper-plane' },
                    { name: 'UTM Tracking', description: 'Track lead source with UTM parameters - which campaigns are generating quality leads', icon: 'link' },
                    { name: 'Duplicate Detection', description: 'Prevent duplicate leads from same email/mobile within 24 hours', icon: 'clone' },
                    { name: 'Notes & Activity Log', description: 'Add notes, log calls, meetings, and track all interactions with each lead', icon: 'comment-alt' },
                    { name: 'Franchise Pipeline', description: 'Specialized pipeline for franchise applications with investment tracking and location mapping', icon: 'map-marked-alt' },
                    { name: 'Conversion Analytics', description: 'Track conversion rates by source, campaign, and lead type with detailed funnel analysis', icon: 'funnel-dollar' },
                    { name: 'Export & Import', description: 'Bulk export leads to CSV, import from spreadsheets or other CRM systems', icon: 'file-export' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_leads', 'view_reports', 'send_communications']
                },
                status: 'available',
                icon: 'fa-user-friends',
                screenshots: ['/images/modules/crm-pipeline.png', '/images/modules/crm-lead-detail.png', '/images/modules/crm-analytics.png'],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/lead-management',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['crm', 'leads', 'pipeline', 'franchise', 'sales', 'marketing-automation']
            },

            // 7. SECTION 21 COMPLIANCE SUITE
            {
                moduleId: 'section21-compliance',
                name: 'Section 21 Compliance Suite',
                description: 'Complete medical cannabis compliance system with prescription management, ID verification, Section 21 document storage, and automated audit trails. Ensures full legal compliance for medical cannabis sales.',
                category: 'compliance',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 4999,
                    currency: 'ZAR',
                    tiers: {
                        single: {
                            amount: 4999,
                            description: 'Single location - includes prescription verification, document storage, and audit trails'
                        },
                        multi: {
                            amount: 8999,
                            description: 'Multi-location (3+ branches) - centralized compliance dashboard and cross-branch verification'
                        },
                        enterprise: {
                            amount: 14999,
                            description: 'Enterprise package - includes automated SAHPRA reporting and legal consultation support'
                        }
                    }
                },
                features: [
                    { name: 'Prescription Verification', description: 'Upload and verify Section 21 prescriptions with expiry tracking and quantity limits', icon: 'file-medical' },
                    { name: 'ID Document Scanning', description: 'Verify customer identity matches prescription with ID document scanning and validation', icon: 'id-card' },
                    { name: 'Secure Document Storage', description: 'Encrypted cloud storage for prescriptions and ID documents with access logging', icon: 'lock' },
                    { name: 'Quantity Tracking', description: 'Track prescribed quantities and prevent over-dispensing with automated alerts', icon: 'pills' },
                    { name: 'Expiry Notifications', description: 'Automated email/SMS reminders when prescriptions are expiring (30, 14, 7 days)', icon: 'bell' },
                    { name: 'Audit Trail', description: 'Complete audit log of all Section 21 transactions - who, what, when, why for compliance inspections', icon: 'clipboard-check' },
                    { name: 'Customer Verification Portal', description: 'Secure portal for customers to upload prescriptions and ID before visiting store', icon: 'user-shield' },
                    { name: 'SAHPRA Reporting', description: 'Automated report generation for SAHPRA compliance submissions', icon: 'file-contract' },
                    { name: 'Multi-Level Access', description: 'Role-based access control - only authorized staff can view medical documents', icon: 'user-lock' },
                    { name: 'Legal Updates', description: 'Receive notifications about Section 21 regulation changes and compliance updates', icon: 'gavel' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_section21', 'view_medical_documents', 'compliance_admin']
                },
                status: 'available',
                icon: 'fa-shield-alt',
                screenshots: ['/images/modules/section21-dashboard.png', '/images/modules/section21-verification.png', '/images/modules/section21-audit.png'],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/section21-compliance',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['section-21', 'compliance', 'medical-cannabis', 'prescription', 'verification', 'legal', 'sahpra']
            },

            // 8. MENU INTEGRATION (BEAN & BUD / LA BREWHA)
            {
                moduleId: 'menu-integration',
                name: 'Coffee Shop Menu Integration',
                description: 'Seamless integration with Bean & Bud and La Brewha café POS systems. Sync menu items, track CBD-infused products, and display live menu on website with real-time availability.',
                category: 'operations',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 2999,
                    currency: 'ZAR',
                    tiers: {
                        single: {
                            amount: 2999,
                            description: 'Single venue - includes menu sync, website display, and basic ordering'
                        },
                        multi: {
                            amount: 5999,
                            description: 'Multi-venue (2-5 locations) - centralized menu management across cafés'
                        },
                        franchise: {
                            amount: 9999,
                            description: 'Franchise package (6+ locations) - includes white-label menu system and custom integrations'
                        }
                    }
                },
                features: [
                    { name: 'POS Synchronization', description: 'Automatic menu sync from café POS systems every 5 minutes with real-time updates', icon: 'sync' },
                    { name: 'CBD Product Flagging', description: 'Clearly mark CBD-infused items with compliance warnings and dosage information', icon: 'cannabis' },
                    { name: 'Live Menu Display', description: 'Beautiful menu display on website with images, descriptions, and real-time pricing', icon: 'utensils' },
                    { name: 'Availability Tracking', description: 'Show "Available Now" or "Out of Stock" status based on POS inventory', icon: 'check-circle' },
                    { name: 'Category Management', description: 'Organize items by category - Coffee, Tea, Food, CBD Beverages, Wellness Shots', icon: 'folder' },
                    { name: 'Venue Switching', description: 'Customers can switch between Bean & Bud and La Brewha menus seamlessly', icon: 'exchange-alt' },
                    { name: 'Online Ordering', description: 'Accept online orders with pickup time selection and payment processing', icon: 'shopping-bag' },
                    { name: 'Allergen Information', description: 'Display allergen warnings and dietary information (vegan, gluten-free, etc.)', icon: 'leaf' },
                    { name: 'Pricing Management', description: 'Manage different pricing for dine-in, takeaway, and online orders', icon: 'dollar-sign' },
                    { name: 'Menu Analytics', description: 'Track most popular items, sales trends, and customer preferences', icon: 'chart-pie' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_menu', 'view_reports']
                },
                status: 'available',
                icon: 'fa-coffee',
                screenshots: ['/images/modules/menu-display.png', '/images/modules/menu-pos-sync.png', '/images/modules/menu-analytics.png'],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/menu-integration',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['menu', 'coffee', 'bean-bud', 'la-brewha', 'pos-integration', 'cbd-beverages', 'café']
            },

            // 9. CULTIVATION DASHBOARD (SAHPRA 22C Farm Management)
            {
                moduleId: 'cultivation-dashboard',
                name: 'Cultivation Dashboard',
                description: 'SAHPRA Section 22C licensed cannabis cultivation management. Track tunnel greenhouse and indoor growing operations with batch lifecycle management, environmental monitoring, harvest records, compliance tracking, and audit package generation.',
                category: 'operations',
                version: '1.0.0',
                pricing: {
                    type: 'monthly',
                    amount: 2500,
                    currency: 'ZAR',
                    setupFee: 15000,
                    tiers: {
                        starter: {
                            amount: 2500,
                            description: 'Up to 5 zones, batch tracking, environmental logging, basic compliance'
                        },
                        professional: {
                            amount: 4500,
                            description: 'Unlimited zones, full compliance suite, audit package generator, reports, document tracker'
                        },
                        enterprise: {
                            amount: 7500,
                            description: 'Multi-facility, API access, IoT sensor integration, dedicated support'
                        }
                    }
                },
                features: [
                    { name: 'Zone Management', description: 'Manage tunnel greenhouses and indoor grow rooms with capacity tracking and environmental thresholds', icon: 'warehouse' },
                    { name: 'Batch Lifecycle', description: 'Track batches from propagation through vegetative, flowering, harvest, processing to completion', icon: 'seedling' },
                    { name: 'Environmental Monitoring', description: 'Log and monitor temperature, humidity, CO2, light, VPD with SAHPRA spec reference lines', icon: 'thermometer-half' },
                    { name: 'Harvest Records', description: 'Record wet/dry/trim/waste weights, quality grades, and lab results with photo documentation', icon: 'cut' },
                    { name: 'SAHPRA Compliance', description: 'Traffic-light compliance dashboard with automatic scoring across environmental, batch, and harvest categories', icon: 'shield-alt' },
                    { name: 'Audit Package Generator', description: 'Generate comprehensive SAHPRA-ready audit packages for any date range with one click', icon: 'file-pdf' },
                    { name: 'Yield Analytics', description: 'Track yield trends by strain, zone, and period with bar and line charts', icon: 'chart-bar' },
                    { name: 'Waste Management', description: 'SAHPRA-required waste tracking including destroyed plants, trim, and disposal records', icon: 'trash-alt' },
                    { name: 'Reports', description: 'Production, environmental, yield, and waste reports with CSV export and print-friendly output', icon: 'file-alt' },
                    { name: 'Multi-Tenant Ready', description: 'White-label ready with tenant isolation for SaaS deployment to multiple cultivators', icon: 'building' }
                ],
                requirements: {
                    minimumVersion: '1.0.0',
                    dependencies: [],
                    requiredPermissions: ['manage_cultivation', 'view_reports']
                },
                status: 'available',
                icon: 'fa-cannabis',
                screenshots: [],
                documentation: 'https://docs.origin.cleva-ai.co.za/modules/cultivation-dashboard',
                supportEmail: 'support@cleva-ai.co.za',
                vendor: { name: 'Origin by ILCO Farming', website: 'https://origin.cleva-ai.co.za' },
                metrics: { installations: 0, rating: 5.0, reviews: 0 },
                tags: ['cultivation', 'farming', 'sahpra', 'section-22c', 'greenhouse', 'indoor-grow', 'harvest', 'compliance', 'environmental']
            }
        ];

        // Seed each module
        let created = 0;
        let skipped = 0;

        for (const moduleData of modules) {
            const existing = await Module.findOne({ moduleId: moduleData.moduleId });

            if (existing) {
                console.log(`⏭️  ${moduleData.name} already exists - skipping`);
                skipped++;
                continue;
            }

            const module = await Module.create(moduleData);
            console.log(`✅ ${module.name} - R${module.pricing.amount}/month`);
            created++;
        }

        console.log('\n📊 Summary:');
        console.log(`   ✅ Created: ${created} modules`);
        console.log(`   ⏭️  Skipped: ${skipped} modules`);
        console.log(`   📦 Total: ${modules.length} modules in marketplace`);

        await mongoose.connection.close();
        console.log('✅ Database connection closed');

    } catch (error) {
        console.error('❌ Error seeding modules:', error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

seedAllModules();
