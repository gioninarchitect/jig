/**
 * Seed Test Orders for Pack & Dispatch (PND) Apps
 * Creates orders at various statuses for testing the workflow:
 * - confirmed: Ready for packer to pick up
 * - processing: Currently being packed
 * - packed: Ready for dispatch
 * - dispatched: Out for delivery
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Order = require('../modules/database/models/Order');
const Product = require('../modules/database/models/Product');
const User = require('../modules/database/models/User');
const Branch = require('../modules/database/models/Branch');

async function seedPNDOrders() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/jig';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Get some products
    const products = await Product.find({ status: 'active' }).limit(5);
    if (products.length === 0) {
      console.log('No products found. Please seed products first.');
      process.exit(1);
    }

    // Get Ormonde branch
    const branch = await Branch.findOne({ branchCode: 'ORM' });
    if (!branch) {
      console.log('Ormonde branch not found');
    }

    // Get a packer user (or any user)
    const packer = await User.findOne({ role: 'packer' });

    // Sample customer data
    const customers = [
      { firstName: 'John', lastName: 'Mokete', email: 'john@test.com', phone: '0712345678' },
      { firstName: 'Sarah', lastName: 'Letsoela', email: 'sarah@test.com', phone: '0723456789' },
      { firstName: 'David', lastName: 'Ramokoena', email: 'david@test.com', phone: '0734567890' },
      { firstName: 'Thabo', lastName: 'Moeti', email: 'thabo@test.com', phone: '0745678901' },
      { firstName: 'Lindiwe', lastName: 'Molefe', email: 'lindiwe@test.com', phone: '0756789012' },
      { firstName: 'Mpho', lastName: 'Sello', email: 'mpho@test.com', phone: '0767890123' },
      { firstName: 'Lerato', lastName: 'Tau', email: 'lerato@test.com', phone: '0778901234' },
      { firstName: 'Kagiso', lastName: 'Malope', email: 'kagiso@test.com', phone: '0789012345' },
    ];

    const addresses = [
      { street: '123 Main Street', suburb: 'Maseru Central', city: 'Maseru', province: 'Maseru', postalCode: '100', country: 'Lesotho' },
      { street: '45 Kingsway Road', suburb: 'Maseru West', city: 'Maseru', province: 'Maseru', postalCode: '100', country: 'Lesotho' },
      { street: '78 Pioneer Road', suburb: 'Town Centre', city: 'Ladybrand', province: 'Free State', postalCode: '9745', country: 'South Africa' },
      { street: '22 Church Street', suburb: 'CBD', city: 'Bloemfontein', province: 'Free State', postalCode: '9301', country: 'South Africa' },
      { street: '89 Nelson Mandela Drive', suburb: 'Maseru East', city: 'Maseru', province: 'Maseru', postalCode: '100', country: 'Lesotho' },
      { street: '15 Moshoeshoe Road', suburb: 'Ha Thetsane', city: 'Maseru', province: 'Maseru', postalCode: '100', country: 'Lesotho' },
      { street: '67 Constitution Hill', suburb: 'Constitution Hill', city: 'Johannesburg', province: 'Gauteng', postalCode: '2001', country: 'South Africa' },
      { street: '34 Cathedral Area', suburb: 'Maseru Central', city: 'Maseru', province: 'Maseru', postalCode: '100', country: 'Lesotho' },
    ];

    // Create random order items
    function createOrderItems() {
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items
      const items = [];
      const usedProducts = new Set();

      for (let i = 0; i < numItems; i++) {
        let product;
        do {
          product = products[Math.floor(Math.random() * products.length)];
        } while (usedProducts.has(product._id.toString()) && usedProducts.size < products.length);

        usedProducts.add(product._id.toString());
        const qty = Math.floor(Math.random() * 3) + 1;
        items.push({
          product: product._id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: qty,
          subtotal: product.price * qty
        });
      }
      return items;
    }

    // Delete existing test orders
    await Order.deleteMany({ orderNumber: /^TEST-PND-/ });
    console.log('Cleared existing test orders');

    const ordersToCreate = [];

    // 3 orders in "confirmed" status (ready for packing)
    for (let i = 1; i <= 3; i++) {
      const items = createOrderItems();
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const customer = customers[(i - 1) % customers.length];

      ordersToCreate.push({
        orderNumber: `TEST-PND-CONF-${i}`,
        customer,
        shippingAddress: addresses[(i - 1) % addresses.length],
        items,
        subtotal,
        shipping: { method: 'standard', cost: 0 },
        total: subtotal,
        payment: { method: 'eft', status: 'paid' },
        payments: [{ method: 'eft', amount: subtotal, status: 'completed', processedAt: new Date() }],
        status: 'confirmed',
        branch: branch?._id,
        createdAt: new Date(Date.now() - Math.random() * 3600000), // Random time within last hour
      });
    }

    // 2 orders in "processing" status (currently being packed)
    for (let i = 1; i <= 2; i++) {
      const items = createOrderItems();
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const customer = customers[(i + 2) % customers.length];

      ordersToCreate.push({
        orderNumber: `TEST-PND-PROC-${i}`,
        customer,
        shippingAddress: addresses[(i + 2) % addresses.length],
        items,
        subtotal,
        shipping: { method: 'standard', cost: 0 },
        total: subtotal,
        payment: { method: 'cash', status: 'paid' },
        payments: [{ method: 'cash', amount: subtotal, status: 'completed', processedAt: new Date() }],
        status: 'processing',
        branch: branch?._id,
        packingStartedAt: new Date(Date.now() - 600000), // 10 minutes ago
        packingStartedBy: packer?._id,
        createdAt: new Date(Date.now() - 3600000 - Math.random() * 3600000), // 1-2 hours ago
      });
    }

    // 3 orders in "packed" status (ready for dispatch)
    for (let i = 1; i <= 3; i++) {
      const items = createOrderItems();
      const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
      const customer = customers[(i + 4) % customers.length];

      ordersToCreate.push({
        orderNumber: `TEST-PND-PACK-${i}`,
        customer,
        shippingAddress: addresses[(i + 4) % addresses.length],
        items,
        subtotal,
        shipping: { method: 'overnight', cost: 50 },
        total: subtotal + 50,
        payment: { method: 'card', status: 'paid' },
        payments: [{ method: 'card', amount: subtotal + 50, status: 'completed', processedAt: new Date() }],
        status: 'packed',
        branch: branch?._id,
        packingStartedAt: new Date(Date.now() - 1800000),
        packingStartedBy: packer?._id,
        packedAt: new Date(Date.now() - 900000), // 15 minutes ago
        packedBy: packer?._id,
        packingNotes: i === 1 ? 'Fragile items - handle with care' : null,
        createdAt: new Date(Date.now() - 7200000 - Math.random() * 3600000), // 2-3 hours ago
      });
    }

    // Insert all orders
    const createdOrders = await Order.insertMany(ordersToCreate);
    console.log(`\nCreated ${createdOrders.length} test orders:`);

    // Summary
    const confirmed = createdOrders.filter(o => o.status === 'confirmed');
    const processing = createdOrders.filter(o => o.status === 'processing');
    const packed = createdOrders.filter(o => o.status === 'packed');

    console.log(`\n--- PACKER APP ORDERS ---`);
    console.log(`Confirmed (ready to pack): ${confirmed.length}`);
    confirmed.forEach(o => console.log(`  - ${o.orderNumber}: ${o.customer.firstName} ${o.customer.lastName} (R${o.total})`));

    console.log(`Processing (being packed): ${processing.length}`);
    processing.forEach(o => console.log(`  - ${o.orderNumber}: ${o.customer.firstName} ${o.customer.lastName} (R${o.total})`));

    console.log(`\n--- DISPATCH APP ORDERS ---`);
    console.log(`Packed (ready to dispatch): ${packed.length}`);
    packed.forEach(o => console.log(`  - ${o.orderNumber}: ${o.customer.firstName} ${o.customer.lastName} - ${o.shippingAddress}`));

    console.log('\nTest orders seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding test orders:', error);
    process.exit(1);
  }
}

seedPNDOrders();
