/**
 * Complete Test Users Seed Script
 * Seeds all roles needed for testing DBC dashboards
 */

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

const TEST_USERS = [
    // Owner - Full system control
    {
        email: 'owner@jig.cleva-ai.co.za',
        password: 'Owner123!',
        username: 'owner',
        firstName: 'Power',
        lastName: 'Owner',
        role: 'owner',
        permissions: ['all']
    },
    // Admin - System administration
    {
        email: 'admin@jig.cleva-ai.co.za',
        password: 'Admin123!',
        username: 'admin',
        firstName: 'System',
        lastName: 'Admin',
        role: 'admin',
        permissions: ['all']
    },
    // Inventory Manager - MDC Control, Batches, POs
    {
        email: 'inventory@jig.cleva-ai.co.za',
        password: 'Inventory123!',
        username: 'inventorymgr',
        firstName: 'Inventory',
        lastName: 'Manager',
        role: 'inventory_manager',
        permissions: ['manageInventory', 'manageBatches', 'managePurchaseOrders', 'manageSuppliers']
    },
    // Packer - Pack orders
    {
        email: 'packer@jig.cleva-ai.co.za',
        password: 'Packer123!',
        username: 'packer',
        firstName: 'Pack',
        lastName: 'Worker',
        role: 'packer',
        permissions: ['viewOrders', 'packOrders']
    },
    // Dispatch Manager - Dispatch orders
    {
        email: 'dispatch@jig.cleva-ai.co.za',
        password: 'Dispatch123!',
        username: 'dispatch',
        firstName: 'Dispatch',
        lastName: 'Manager',
        role: 'dispatch_manager',
        permissions: ['viewOrders', 'dispatchOrders']
    },
    // Staff Manager
    {
        email: 'manager@jig.cleva-ai.co.za',
        password: 'Manager123!',
        username: 'manager',
        firstName: 'Store',
        lastName: 'Manager',
        role: 'branch_manager',
        permissions: ['manageBranch', 'manageInventory', 'manageStaff', 'manageSales', 'viewReports']
    },
    // Staff Assistant (POS)
    {
        email: 'staff@jig.cleva-ai.co.za',
        password: 'Staff123!',
        username: 'staff',
        firstName: 'Staff',
        lastName: 'Assistant',
        role: 'branch_assistant',
        permissions: ['manageSales', 'usePOS']
    },
    // Regular User (Customer) - No purchase limits
    {
        email: 'customer@jig.cleva-ai.co.za',
        password: 'Customer123!',
        username: 'dbccustomer',
        firstName: 'Test',
        lastName: 'Customer',
        role: 'user',
        purchaseLimits: {
            enabled: false,  // DISABLED - regular customers don't have limits
            dailyLimit: 150,
            monthlyLimit: 600,
            currentDayUsage: 0,
            currentMonthUsage: 0
        }
    },
    // Patient (Section 21 approved with purchase limits ENABLED)
    {
        email: 'patient@jig.cleva-ai.co.za',
        password: 'Patient123!',
        username: 'dbcpatient',
        firstName: 'Medical',
        lastName: 'Patient',
        role: 'user',
        section21Status: 'approved',
        purchaseLimits: {
            enabled: true,  // ENABLED for testing purchase limits widget
            dailyLimit: 150,
            monthlyLimit: 600,
            currentDayUsage: 120,
            currentMonthUsage: 450,
            lastDayReset: new Date(),
            lastMonthReset: new Date()
        }
    }
];

// Test Supplier
const TEST_SUPPLIER = {
    name: 'Green Farms SA',
    supplierId: 'SUP-2026-000001',
    contactPerson: 'John Farmer',
    email: 'supplier@greenfarms.co.za',
    phone: '+27 82 123 4567',
    address: {
        street: '123 Farm Road',
        city: 'Stellenbosch',
        province: 'Western Cape',
        postalCode: '7600',
        country: 'South Africa'
    },
    license: {
        number: 'SAHPRA-CUL-2024-001',
        type: 'cultivator',
        expiryDate: new Date('2026-12-31')
    },
    complianceStatus: 'pending',
    productCategories: ['flower', 'concentrates'],
    status: 'active',
    totalOrders: 0,
    totalValue: 0
};

// Test Branch
const TEST_BRANCH = {
    name: 'DBC Main Store',
    branchCode: 'DBC-MAIN-01',
    phone: '+27 11 123 4567',
    email: 'main@jig.cleva-ai.co.za',
    address: {
        street: '123 Main Street',
        city: 'Johannesburg',
        suburb: 'Sandton',
        province: 'Gauteng',
        postalCode: '2196',
        country: 'South Africa'
    },
    isActive: true,
    isMainBranch: true
};

async function seedTestData() {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log('Connected to MongoDB\n');

        const db = client.db('dbc');
        const usersCollection = db.collection('users');
        const suppliersCollection = db.collection('suppliers');
        const branchesCollection = db.collection('branches');

        // Seed Branch
        console.log('=== Seeding Branch ===');
        const existingBranch = await branchesCollection.findOne({ branchCode: TEST_BRANCH.branchCode });
        let branchId;
        if (existingBranch) {
            branchId = existingBranch._id;
            console.log('Branch exists: ' + TEST_BRANCH.name);
        } else {
            const result = await branchesCollection.insertOne({
                ...TEST_BRANCH,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            branchId = result.insertedId;
            console.log('Created branch: ' + TEST_BRANCH.name);
        }

        // Seed Users
        console.log('\n=== Seeding Users ===');
        for (const user of TEST_USERS) {
            const hashedPassword = await bcrypt.hash(user.password, 10);
            const existingUser = await usersCollection.findOne({ email: user.email });

            const userData = {
                email: user.email,
                password: hashedPassword,
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                permissions: user.permissions || [],
                branch: branchId,
                isEmailVerified: true,
                isActive: true,
                membership: { status: 'active' },
                updatedAt: new Date()
            };

            // Only set optional fields if they exist
            if (user.purchaseLimits) userData.purchaseLimits = user.purchaseLimits;
            if (user.section21Status) userData.section21Status = user.section21Status;

            if (existingUser) {
                await usersCollection.updateOne(
                    { email: user.email },
                    { $set: userData }
                );
                console.log('Updated: ' + user.email + ' (' + user.role + ')');
            } else {
                await usersCollection.insertOne({
                    ...userData,
                    createdAt: new Date()
                });
                console.log('Created: ' + user.email + ' (' + user.role + ')');
            }
        }

        // Seed Supplier
        console.log('\n=== Seeding Supplier ===');
        const existingSupplier = await suppliersCollection.findOne({ email: TEST_SUPPLIER.email });
        if (existingSupplier) {
            console.log('Supplier exists: ' + TEST_SUPPLIER.name);
        } else {
            await suppliersCollection.insertOne({
                ...TEST_SUPPLIER,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            console.log('Created supplier: ' + TEST_SUPPLIER.name);
        }

        // Summary
        console.log('\n==========================================');
        console.log('TEST CREDENTIALS');
        console.log('==========================================');
        console.log('');
        console.log('DASHBOARDS TO TEST:');
        console.log('');
        console.log('1. OWNER DASHBOARD (owner-dashboard.html)');
        console.log('   Email: owner@jig.cleva-ai.co.za');
        console.log('   Password: Owner123!');
        console.log('');
        console.log('2. INVENTORY MANAGER (inventory-manager-dashboard.html)');
        console.log('   Email: inventory@jig.cleva-ai.co.za');
        console.log('   Password: Inventory123!');
        console.log('');
        console.log('3. PND DASHBOARD - PACKER (pnd-dashboard.html)');
        console.log('   Email: packer@jig.cleva-ai.co.za');
        console.log('   Password: Packer123!');
        console.log('');
        console.log('4. PND DASHBOARD - DISPATCH (pnd-dashboard.html)');
        console.log('   Email: dispatch@jig.cleva-ai.co.za');
        console.log('   Password: Dispatch123!');
        console.log('');
        console.log('5. POS (pos.html)');
        console.log('   Email: staff@jig.cleva-ai.co.za');
        console.log('   Password: Staff123!');
        console.log('');
        console.log('6. ADMIN PANEL (admin.html)');
        console.log('   Email: admin@jig.cleva-ai.co.za');
        console.log('   Password: Admin123!');
        console.log('');
        console.log('7. SUPPLIER PORTAL (supplier-portal.html)');
        console.log('   Email: supplier@greenfarms.co.za');
        console.log('   (Note: Need to create supplier login system)');
        console.log('');
        console.log('8. CUSTOMER (for POS testing)');
        console.log('   Email: patient@jig.cleva-ai.co.za');
        console.log('   Password: Patient123!');
        console.log('   (Has purchase limits for testing)');
        console.log('==========================================');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await client.close();
        console.log('\nDatabase connection closed');
    }
}

seedTestData();
