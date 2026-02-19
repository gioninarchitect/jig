// Wholesale Controller — Business logic for B2B customers and orders
const WholesaleCustomer = require('../modules/database/models/WholesaleCustomer');
const WholesaleOrder = require('../modules/database/models/WholesaleOrder');
const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');

// ============================================================================
// WHOLESALE CUSTOMERS
// ============================================================================

exports.getCustomers = async (req, res) => {
  try {
    const { status, type, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.customerType = type;
    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { tradingName: { $regex: search, $options: 'i' } }
      ];
    }
    const customers = await WholesaleCustomer.find(query)
      .populate('linkedBranch', 'name branchCode')
      .populate('salesRep', 'name email')
      .sort('businessName');
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await WholesaleCustomer.findById(req.params.id)
      .populate('linkedBranch', 'name branchCode')
      .populate('salesRep', 'name email');
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    const recentOrders = await WholesaleOrder.find({ customer: customer._id })
      .sort('-createdAt').limit(10)
      .select('orderNumber status total createdAt paymentStatus');
    res.json({ success: true, data: { customer, recentOrders } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const customer = new WholesaleCustomer({ ...req.body, createdBy: req.user.id });
    await customer.save();
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const customer = await WholesaleCustomer.findByIdAndUpdate(
      req.params.id, req.body, { new: true, runValidators: true }
    );
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.createFromBranch = async (req, res) => {
  try {
    const branch = await Branch.findById(req.params.branchId);
    if (!branch) {
      return res.status(404).json({ success: false, message: 'Branch not found' });
    }
    const existing = await WholesaleCustomer.findOne({ linkedBranch: branch._id });
    if (existing) {
      return res.json({ success: true, data: existing, message: 'Customer already exists for this branch' });
    }
    const customer = new WholesaleCustomer({
      businessName: `DBC ${branch.name}`, customerType: 'internal_branch',
      linkedBranch: branch._id,
      contactPerson: { name: 'Branch Manager', email: branch.email, phone: branch.phone },
      billingAddress: branch.address, deliveryAddress: branch.address,
      paymentTerms: 'cod', priceTier: 'platinum', status: 'active', createdBy: req.user.id
    });
    await customer.save();
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================================================
// WHOLESALE ORDERS
// ============================================================================

exports.getOrders = async (req, res) => {
  try {
    const { status, type, customer, branch, startDate, endDate } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.orderType = type;
    if (customer) query.customer = customer;
    if (branch) query.destinationBranch = branch;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    const orders = await WholesaleOrder.find(query)
      .populate('customer', 'businessName customerType')
      .populate('destinationBranch', 'name branchCode')
      .populate('sourceBranch', 'name')
      .sort('-createdAt');
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const order = await WholesaleOrder.findById(req.params.id)
      .populate('customer')
      .populate('destinationBranch', 'name branchCode address')
      .populate('sourceBranch', 'name')
      .populate('items.product', 'name sku images')
      .populate('createdBy', 'name')
      .populate('approvedBy', 'name');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createOrder = async (req, res) => {
  try {
    const { customerId, items, orderType = 'standard', deliveryMethod, notes } = req.body;

    const customer = await WholesaleCustomer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const hqBranch = await Branch.findOne({ isHeadquarters: true });
    if (!hqBranch) {
      return res.status(400).json({ success: false, message: 'HQ branch not configured' });
    }

    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;

      let unitPrice = product.wholesalePrice || product.price * 0.7;
      if (customer.discountPercent > 0) {
        unitPrice = unitPrice * (1 - customer.discountPercent / 100);
      }
      const customPrice = customer.customPricing?.find(p => p.product?.toString() === product._id.toString());
      if (customPrice) unitPrice = customPrice.customPrice;

      orderItems.push({
        product: product._id, sku: product.sku, name: product.name,
        quantity: item.quantity, unitPrice, lineTotal: item.quantity * unitPrice
      });
    }

    if (customer.paymentTerms !== 'cod' && customer.paymentTerms !== 'prepaid') {
      const orderTotal = orderItems.reduce((sum, i) => sum + i.lineTotal, 0) * 1.15;
      const canOrder = customer.canPlaceOrder(orderTotal);
      if (!canOrder.allowed) {
        return res.status(400).json({ success: false, message: canOrder.reason });
      }
    }

    const order = new WholesaleOrder({
      customer: customer._id, sourceBranch: hqBranch._id,
      destinationBranch: customer.linkedBranch,
      orderType: orderType === 'quote' ? 'quote' : (customer.customerType === 'internal_branch' ? 'branch_resupply' : 'standard'),
      items: orderItems,
      subtotal: orderItems.reduce((sum, i) => sum + i.lineTotal, 0),
      paymentTerms: customer.paymentTerms,
      deliveryMethod: deliveryMethod || (customer.customerType === 'internal_branch' ? 'internal_transfer' : 'collection'),
      deliveryAddress: customer.deliveryAddress, customerNotes: notes,
      status: orderType === 'quote' ? 'quote' : 'pending_approval',
      createdBy: req.user.id
    });

    if (customer.paymentTerms !== 'cod' && customer.paymentTerms !== 'prepaid') {
      const days = parseInt(customer.paymentTerms) || 30;
      order.dueDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    }

    await order.save();
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.convertToOrder = async (req, res) => {
  try {
    const order = await WholesaleOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    await order.convertToOrder(req.user.id);
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.approveOrder = async (req, res) => {
  try {
    const order = await WholesaleOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    order.status = 'approved';
    order.approvedAt = new Date();
    order.approvedBy = req.user.id;
    await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await WholesaleOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    order.status = status;
    order.lastModifiedBy = req.user.id;

    switch (status) {
      case 'picking':
        order.pickingStartedAt = new Date();
        order.pickedBy = req.user.id;
        break;
      case 'packed':
        order.packedAt = new Date();
        order.packedBy = req.user.id;
        break;
      case 'dispatched':
        order.dispatchedAt = new Date();
        order.dispatchedBy = req.user.id;
        for (const item of order.items) {
          await BranchInventory.findOneAndUpdate(
            { branch: order.sourceBranch, product: item.product },
            { $inc: { quantity: -item.quantity } }
          );
        }
        break;
      case 'delivered':
        order.deliveredAt = new Date();
        if (order.orderType === 'branch_resupply' && order.destinationBranch) {
          for (const item of order.items) {
            await BranchInventory.findOneAndUpdate(
              { branch: order.destinationBranch, product: item.product },
              { $inc: { quantity: item.quantity } },
              { upsert: true }
            );
          }
        }
        break;
      case 'invoiced':
        order.invoicedAt = new Date();
        const customer = await WholesaleCustomer.findById(order.customer);
        if (customer && !['cod', 'prepaid'].includes(order.paymentTerms)) {
          customer.currentBalance += order.total;
          await customer.save();
        }
        break;
    }

    await order.save();
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.recordPayment = async (req, res) => {
  try {
    const { amount, method, reference } = req.body;
    const order = await WholesaleOrder.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    await order.addPayment(amount, method, reference, req.user.id);

    const customer = await WholesaleCustomer.findById(order.customer);
    if (customer) {
      customer.currentBalance = Math.max(0, customer.currentBalance - amount);
      await customer.save();
    }
    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getOverdueOrders = async (req, res) => {
  try {
    const orders = await WholesaleOrder.getOverdueOrders();
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ============================================================================
// BRANCH RESUPPLY
// ============================================================================

exports.getResupply = async (req, res) => {
  try {
    const orders = await WholesaleOrder.getBranchResupplyOrders(req.params.branchId);
    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createResupply = async (req, res) => {
  try {
    const { branchId, items, notes } = req.body;

    let customer = await WholesaleCustomer.findOne({ linkedBranch: branchId });
    if (!customer) {
      const branch = await Branch.findById(branchId);
      if (!branch) {
        return res.status(404).json({ success: false, message: 'Branch not found' });
      }
      customer = new WholesaleCustomer({
        businessName: `DBC ${branch.name}`, customerType: 'internal_branch',
        linkedBranch: branch._id,
        contactPerson: { name: 'Branch Manager', email: branch.email, phone: branch.phone },
        paymentTerms: 'cod', priceTier: 'platinum', status: 'active', createdBy: req.user.id
      });
      await customer.save();
    }

    const hqBranch = await Branch.findOne({ isHeadquarters: true });
    if (!hqBranch) {
      return res.status(400).json({ success: false, message: 'HQ not configured' });
    }

    const orderItems = [];
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) continue;
      orderItems.push({
        product: product._id, sku: product.sku, name: product.name,
        quantity: item.quantity,
        unitPrice: product.costPrice || product.wholesalePrice || product.price * 0.5,
        lineTotal: item.quantity * (product.costPrice || product.wholesalePrice || product.price * 0.5)
      });
    }

    const order = new WholesaleOrder({
      customer: customer._id, sourceBranch: hqBranch._id, destinationBranch: branchId,
      orderType: 'branch_resupply', items: orderItems,
      subtotal: orderItems.reduce((sum, i) => sum + i.lineTotal, 0),
      paymentTerms: 'cod', deliveryMethod: 'internal_transfer',
      customerNotes: notes, status: 'pending_approval', createdBy: req.user.id
    });

    await order.save();
    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ============================================================================
// REPORTS
// ============================================================================

exports.getAgingReport = async (req, res) => {
  try {
    const customers = await WholesaleCustomer.find({
      currentBalance: { $gt: 0 }, status: 'active'
    }).select('businessName currentBalance creditLimit paymentTerms stats.lastOrderDate');

    const aging = customers.map(c => {
      const daysSinceOrder = c.stats?.lastOrderDate
        ? Math.floor((Date.now() - c.stats.lastOrderDate) / (1000 * 60 * 60 * 24))
        : null;
      return {
        customer: c.businessName, balance: c.currentBalance,
        creditLimit: c.creditLimit,
        utilizationPercent: c.creditLimit > 0 ? (c.currentBalance / c.creditLimit * 100).toFixed(1) : 0,
        daysSinceOrder, paymentTerms: c.paymentTerms
      };
    });
    res.json({ success: true, data: aging });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSalesByCustomer = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const match = { status: 'completed' };
    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const sales = await WholesaleOrder.aggregate([
      { $match: match },
      { $group: { _id: '$customer', totalOrders: { $sum: 1 }, totalRevenue: { $sum: '$total' }, avgOrderValue: { $avg: '$total' } } },
      { $lookup: { from: 'wholesalecustomers', localField: '_id', foreignField: '_id', as: 'customerInfo' } },
      { $unwind: '$customerInfo' },
      { $project: { customer: '$customerInfo.businessName', customerType: '$customerInfo.customerType', totalOrders: 1, totalRevenue: 1, avgOrderValue: 1 } },
      { $sort: { totalRevenue: -1 } }
    ]);
    res.json({ success: true, data: sales });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
