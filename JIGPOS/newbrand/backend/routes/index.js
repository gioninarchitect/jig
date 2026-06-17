// Route Aggregator — Single mount point for all API routes
// server.js calls: require('./routes')(app)

module.exports = function(app) {
  // Core routes
  app.use('/api/v1/affiliate', require('./affiliate'));
  app.use('/api/v1/viral', require('./viral'));
  app.use('/api/v1/menu', require('./menu'));
  app.use('/api/v1/section21', require('./section21'));
  app.use('/api/v1/dashboard', require('./dashboard'));
  app.use('/api/v1/staff', require('./staff'));
  app.use('/api/v1/leads', require('./leads'));
  app.use('/api/v1/pos', require('./pos'));
  app.use('/api/v1/products', require('./products'));
  app.use('/api/v1/sops', require('./sop'));
  app.use('/api/v1/capa', require('./capa'));
  app.use('/api/v1/role-context', require('./rolecontext'));
  app.use('/api/v1/gmp-cert', require('./gmpcert'));
  app.use('/api/v1/popia', require('./popia'));
  app.use('/api/v1/orders', require('./order'));
  app.use('/api/v1/cart', require('./cart'));
  app.use('/api/v1/vouchers', require('./vouchers'));
  app.use('/api/v1/subscriptions', require('./subscriptions'));
  app.use('/api/v1/bug-reports', require('./bug-reports'));
  app.use('/api/v1/users', require('./users'));
  app.use('/api/v1/modules', require('./modules'));
  app.use('/api/v1/store', require('./drive-through'));
  app.use('/api/v1/branches', require('./branches'));
  app.use('/api/v1/origin-retail/pharmacy-core', require('./origin-retail'));

  // Feature parity routes
  app.use('/api/v1/batches', require('./batch'));
  app.use('/api/v1/stock-transfers', require('./stock-transfers'));
  app.use('/api/v1/suppliers', require('./supplier'));
  app.use('/api/v1/purchase-orders', require('./purchase-order'));
  app.use('/api/v1/purchase-limits', require('./purchase-limits'));
  app.use('/api/v1/marketing', require('./marketing'));
  app.use('/api/v1/auth/otp', require('./auth-otp'));
  app.use('/api/v1/stocktake', require('./stocktake'));
  app.use('/api/v1/reports', require('./reports'));

  // Odyssey feature parity routes
  app.use('/api/v1/menu-boards', require('./menu-boards'));
  app.use('/api/v1/budgets', require('./budgets'));
  app.use('/api/v1/reorder-rules', require('./reorder-rules'));
  app.use('/api/v1/staff-shifts', require('./staff-shifts'));

  // MDC Pipeline (Master Digital Catalogue)
  app.use('/api/v1/mdc', require('./mdc'));

  // Wholesale HQ routes
  app.use('/api/v1/wholesale', require('./wholesale'));

  // Medical Service Providers (Section 21 partners)
  app.use('/api/v1/medical-providers', require('./medical-providers'));

  // React app parity routes
  app.use('/api/v1/compliance', require('./compliance'));
  app.use('/api/v1/supplier', require('./supplier-portal'));
  app.use('/api/v1/branch-inventory', require('./branch-inventory'));
  app.use('/api/v1/payments', require('./payments'));

  // World Model Config + Sync
  app.use('/api/v1/config/world-model', require('./world-model-config'));

  // World Model Backend APIs (P29)
  app.use('/api/v1/risk', require('./risk'));
  app.use('/api/v1/stock', require('./stock-intelligence'));
  app.use('/api/v1/inventory', require('./potency'));

  // Stock Reconciliation (rolling baseline from stocktake)
  app.use('/api/v1/reconciliation', require('./reconciliation'));

  // NOTE: Cultivation Dashboard runs as its own server (cultivation-server.js)
  // It is NOT part of the POS system — separate PM2 process on port 3005
};
