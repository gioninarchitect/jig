// Server-to-server bridge routes (TnT-ZA Owner Dashboard). Shared-secret header, not user JWT.
const express = require('express');
const router = express.Router();
const c = require('../controllers/bridge.controller');

function requireBridgeKey(req, res, next) {
  const key = req.headers['x-bridge-key'] || '';
  if (!process.env.BRIDGE_KEY || key !== process.env.BRIDGE_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized bridge request' });
  }
  next();
}

router.get('/retail-summary', requireBridgeKey, c.retailSummary);
router.get('/products', requireBridgeKey, c.products);
router.post('/retail-receipt', requireBridgeKey, c.stockReceipt);

module.exports = router;
