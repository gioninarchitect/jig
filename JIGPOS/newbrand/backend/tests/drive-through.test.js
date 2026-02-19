// Retail Store Module Tests
const request = require('supertest');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

// Import models
const User = require('../modules/database/models/User');
const Product = require('../modules/database/models/Product');
const DriveThrough = require('../modules/database/models/DriveThrough');
const { ModuleInstallation } = require('../modules/database/models/Module');

// API base URL
const API_URL = 'http://localhost:3001/api/v1';

describe('Retail Store Module', () => {
    let adminToken;
    let customerToken;
    let adminUser;
    let customerUser;
    let testProduct;
    let moduleInstallation;

    beforeAll(async () => {
        // Connect to test database
        await mongoose.connect('mongodb://localhost:27017/jig_test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Clear collections
        await User.deleteMany({});
        await Product.deleteMany({});
        await DriveThrough.deleteMany({});
        await ModuleInstallation.deleteMany({});

        // Create admin user
        adminUser = await User.create({
            email: 'admin@test.com',
            password: 'Admin123!',
            username: 'admintest',
            firstName: 'Admin',
            lastName: 'User',
            name: 'Admin User',
            role: 'admin'
        });

        // Create customer user
        customerUser = await User.create({
            email: 'customer@test.com',
            password: 'Customer123!',
            username: 'customertest',
            firstName: 'Test',
            lastName: 'Customer',
            name: 'Test Customer',
            role: 'user', // customer role is 'user'
            phone: '+27123456789'
        });

        // Create test product with inventory
        testProduct = await Product.create({
            name: 'Test CBD Oil',
            sku: 'TEST-CBD-001',
            price: 299.99,
            category: 'lifestyle-cbd',
            description: 'Test product for retail-store',
            inventory: {
                quantity: 50,
                lowStockThreshold: 10,
                trackQuantity: true
            },
            status: 'active',
            section21Required: false
        });

        // Create module installation for retail-store
        moduleInstallation = await ModuleInstallation.create({
            businessId: adminUser._id,
            moduleId: 'retail-store',
            status: 'active',
            installedAt: new Date(),
            subscription: {
                plan: 'hq',
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                paymentStatus: 'paid'
            }
        });

        // Login to get tokens
        const adminLogin = await request(API_URL)
            .post('/auth/login')
            .send({
                email: 'admin@test.com',
                password: 'Admin123!'
            });
        adminToken = adminLogin.body.token;

        const customerLogin = await request(API_URL)
            .post('/auth/login')
            .send({
                email: 'customer@test.com',
                password: 'Customer123!'
            });
        customerToken = customerLogin.body.token;
    });

    afterAll(async () => {
        await User.deleteMany({});
        await Product.deleteMany({});
        await DriveThrough.deleteMany({});
        await ModuleInstallation.deleteMany({});
        await mongoose.connection.close();
    });

    describe('POST /api/v1/retail-store/order', () => {
        it('should create a retail-store order with pre-payment', async () => {
            const orderData = {
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 2
                    }
                ],
                payment: {
                    method: 'instapay',
                    reference: 'PAY-' + uuidv4()
                },
                customerInfo: {
                    name: 'Test Customer',
                    phone: '+27123456789',
                    vehicle: {
                        make: 'Toyota',
                        model: 'Corolla',
                        color: 'Silver',
                        licensePlate: 'ABC123GP'
                    }
                }
            };

            const response = await request(API_URL)
                .post('/retail-store/order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(orderData);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.order.orderId).toBeDefined();
            expect(response.body.order.queuePosition).toBeGreaterThan(0);
            expect(response.body.order.estimatedPickupTime).toBeDefined();
            expect(response.body.order.totalAmount).toBe(testProduct.price * 2);
        });

        it('should reject order without payment reference', async () => {
            const orderData = {
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 1
                    }
                ],
                payment: {
                    method: 'instapay'
                    // Missing reference
                },
                customerInfo: {
                    name: 'Test Customer',
                    phone: '+27123456789'
                }
            };

            const response = await request(API_URL)
                .post('/retail-store/order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(orderData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Payment reference required');
        });

        it('should reject cash payment method', async () => {
            const orderData = {
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 1
                    }
                ],
                payment: {
                    method: 'cash',
                    reference: 'CASH-123'
                },
                customerInfo: {
                    name: 'Test Customer',
                    phone: '+27123456789'
                }
            };

            const response = await request(API_URL)
                .post('/retail-store/order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(orderData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Invalid payment method');
        });

        it('should decrement product inventory when order placed', async () => {
            const initialStock = testProduct.inventory.quantity;

            const orderData = {
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 3
                    }
                ],
                payment: {
                    method: 'eft',
                    reference: 'EFT-' + uuidv4()
                },
                customerInfo: {
                    name: 'Test Customer',
                    phone: '+27123456789'
                }
            };

            await request(API_URL)
                .post('/retail-store/order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(orderData);

            const updatedProduct = await Product.findById(testProduct._id);
            expect(updatedProduct.inventory.quantity).toBe(initialStock - 3);
        });

        it('should reject order with insufficient stock', async () => {
            const orderData = {
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 1000 // More than available
                    }
                ],
                payment: {
                    method: 'instapay',
                    reference: 'PAY-' + uuidv4()
                },
                customerInfo: {
                    name: 'Test Customer',
                    phone: '+27123456789'
                }
            };

            const response = await request(API_URL)
                .post('/retail-store/order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(orderData);

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Insufficient stock');
        });
    });

    describe('GET /api/v1/retail-store/queue', () => {
        beforeEach(async () => {
            await DriveThrough.deleteMany({});

            // Create test orders in queue
            await DriveThrough.create({
                orderId: uuidv4(),
                customerId: customerUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        name: testProduct.name,
                        quantity: 1,
                        price: testProduct.price
                    }
                ],
                totalAmount: testProduct.price,
                payment: {
                    method: 'instapay',
                    status: 'paid',
                    reference: 'PAY-123',
                    paidAt: new Date()
                },
                queue: {
                    position: 1,
                    addedAt: new Date(),
                    estimatedPickupTime: new Date(Date.now() + 5 * 60000)
                },
                status: 'in-queue',
                customerInfo: {
                    name: 'Customer 1',
                    phone: '+27111111111'
                }
            });

            await DriveThrough.create({
                orderId: uuidv4(),
                customerId: customerUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        name: testProduct.name,
                        quantity: 2,
                        price: testProduct.price
                    }
                ],
                totalAmount: testProduct.price * 2,
                payment: {
                    method: 'eft',
                    status: 'paid',
                    reference: 'EFT-456',
                    paidAt: new Date()
                },
                queue: {
                    position: 2,
                    addedAt: new Date(),
                    estimatedPickupTime: new Date(Date.now() + 10 * 60000)
                },
                status: 'preparing',
                customerInfo: {
                    name: 'Customer 2',
                    phone: '+27222222222'
                }
            });
        });

        it('should return active queue', async () => {
            const response = await request(API_URL)
                .get('/retail-store/queue');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.totalOrders).toBe(2);
            expect(response.body.queue).toHaveLength(2);
            expect(response.body.estimatedWait).toBe(10); // 2 orders * 5 min
        });

        it('should show queue without authentication', async () => {
            const response = await request(API_URL)
                .get('/retail-store/queue');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /api/v1/retail-store/orders/:orderId', () => {
        let testOrder;

        beforeEach(async () => {
            testOrder = await DriveThrough.create({
                orderId: uuidv4(),
                customerId: customerUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        name: testProduct.name,
                        quantity: 1,
                        price: testProduct.price,
                        requiresSection21: false
                    }
                ],
                totalAmount: testProduct.price,
                payment: {
                    method: 'card',
                    status: 'paid',
                    reference: 'CARD-789',
                    paidAt: new Date()
                },
                queue: {
                    position: 1,
                    addedAt: new Date(),
                    estimatedPickupTime: new Date(Date.now() + 5 * 60000)
                },
                status: 'ready',
                compliance: {
                    requiresSection21: false
                },
                customerInfo: {
                    name: 'Test Customer',
                    phone: '+27123456789'
                }
            });
        });

        it('should get order details for owner', async () => {
            const response = await request(API_URL)
                .get(`/retail-store/orders/${testOrder.orderId}`)
                .set('Authorization', `Bearer ${customerToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.order.orderId).toBe(testOrder.orderId);
            expect(response.body.order.totalAmount).toBe(testProduct.price);
            expect(response.body.order.status).toBe('ready');
        });

        it('should get order details for staff', async () => {
            const response = await request(API_URL)
                .get(`/retail-store/orders/${testOrder.orderId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should reject unauthorized user', async () => {
            // Create another customer
            const otherCustomer = await User.create({
                email: 'other@test.com',
                password: 'Other123!',
                username: 'othertest',
                firstName: 'Other',
                lastName: 'Customer',
                name: 'Other Customer',
                role: 'user'
            });

            const otherLogin = await request(API_URL)
                .post('/auth/login')
                .send({
                    email: 'other@test.com',
                    password: 'Other123!'
                });

            const response = await request(API_URL)
                .get(`/retail-store/orders/${testOrder.orderId}`)
                .set('Authorization', `Bearer ${otherLogin.body.token}`);

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Unauthorized');

            await User.findByIdAndDelete(otherCustomer._id);
        });
    });

    describe('POST /api/v1/retail-store/complete', () => {
        let testOrder;

        beforeEach(async () => {
            testOrder = await DriveThrough.create({
                orderId: uuidv4(),
                customerId: customerUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        name: testProduct.name,
                        quantity: 1,
                        price: testProduct.price,
                        requiresSection21: true
                    }
                ],
                totalAmount: testProduct.price,
                payment: {
                    method: 'instapay',
                    status: 'paid',
                    reference: 'PAY-999',
                    paidAt: new Date()
                },
                queue: {
                    position: 1,
                    addedAt: new Date(),
                    estimatedPickupTime: new Date(Date.now() + 5 * 60000)
                },
                status: 'arrived',
                compliance: {
                    requiresSection21: true
                },
                customerInfo: {
                    name: 'Test Customer',
                    phone: '+27123456789'
                }
            });
        });

        it('should complete order with Section 21 verification (staff only)', async () => {
            const response = await request(API_URL)
                .post('/retail-store/complete')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderId: testOrder.orderId,
                    section21Verified: true,
                    idDocumentScanned: true
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('completed');

            const updatedOrder = await DriveThrough.findOne({ orderId: testOrder.orderId });
            expect(updatedOrder.status).toBe('completed');
            expect(updatedOrder.compliance.verifiedAt).toBeDefined();
            expect(updatedOrder.completedAt).toBeDefined();
        });

        it('should reject completion without Section 21 verification', async () => {
            const response = await request(API_URL)
                .post('/retail-store/complete')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    orderId: testOrder.orderId,
                    section21Verified: false,
                    idDocumentScanned: false
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Section 21 verification required');
        });

        it('should reject customer trying to complete order', async () => {
            const response = await request(API_URL)
                .post('/retail-store/complete')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId: testOrder.orderId,
                    section21Verified: true,
                    idDocumentScanned: true
                });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('staff only');
        });
    });

    describe('POST /api/v1/retail-store/cancel', () => {
        let testOrder;

        beforeEach(async () => {
            testOrder = await DriveThrough.create({
                orderId: uuidv4(),
                customerId: customerUser._id,
                products: [
                    {
                        productId: testProduct._id,
                        name: testProduct.name,
                        quantity: 2,
                        price: testProduct.price
                    }
                ],
                totalAmount: testProduct.price * 2,
                payment: {
                    method: 'eft',
                    status: 'paid',
                    reference: 'EFT-888',
                    paidAt: new Date()
                },
                queue: {
                    position: 1,
                    addedAt: new Date(),
                    estimatedPickupTime: new Date(Date.now() + 5 * 60000)
                },
                status: 'in-queue',
                customerInfo: {
                    name: 'Test Customer',
                    phone: '+27123456789'
                }
            });
        });

        it('should cancel order and return inventory', async () => {
            const initialStock = (await Product.findById(testProduct._id)).inventory.quantity;

            const response = await request(API_URL)
                .post('/retail-store/cancel')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId: testOrder.orderId,
                    reason: 'Customer changed mind'
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            const updatedOrder = await DriveThrough.findOne({ orderId: testOrder.orderId });
            expect(updatedOrder.status).toBe('cancelled');
            expect(updatedOrder.cancelledAt).toBeDefined();
            expect(updatedOrder.cancellationReason).toBe('Customer changed mind');

            const updatedProduct = await Product.findById(testProduct._id);
            expect(updatedProduct.inventory.quantity).toBe(initialStock + 2);
        });

        it('should not cancel completed order', async () => {
            testOrder.status = 'completed';
            testOrder.completedAt = new Date();
            await testOrder.save();

            const response = await request(API_URL)
                .post('/retail-store/cancel')
                .set('Authorization', `Bearer ${customerToken}`)
                .send({
                    orderId: testOrder.orderId,
                    reason: 'Test'
                });

            expect(response.status).toBe(400);
            expect(response.body.success).toBe(false);
            expect(response.body.error).toContain('Cannot cancel completed order');
        });
    });

    describe('Module Activation Check', () => {
        it('should reject request when module not installed', async () => {
            // Delete module installation
            await ModuleInstallation.deleteMany({});

            const orderData = {
                products: [
                    {
                        productId: testProduct._id,
                        quantity: 1
                    }
                ],
                payment: {
                    method: 'instapay',
                    reference: 'PAY-TEST'
                },
                customerInfo: {
                    name: 'Test',
                    phone: '+27123456789'
                }
            };

            const response = await request(API_URL)
                .post('/retail-store/order')
                .set('Authorization', `Bearer ${customerToken}`)
                .send(orderData);

            expect(response.status).toBe(403);
            expect(response.body.error).toContain('not installed');

            // Restore module installation
            await ModuleInstallation.create({
                businessId: adminUser._id,
                moduleId: 'retail-store',
                status: 'active',
                installedAt: new Date(),
                subscription: {
                    plan: 'hq',
                    startDate: new Date(),
                    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                    paymentStatus: 'paid'
                }
            });
        });
    });
});
