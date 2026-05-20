// Origin Retail routes - proxy pharmacy pickup/dispensing partner CTAs
// to the Postgres transactional core.
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const core = require('../services/originRetailCoreClient');

const staffRoles = [
  'super_admin',
  'owner',
  'admin',
  'inventory_manager',
  'packer',
  'dispatch_manager',
  'branch_manager',
  'branch_assistant',
  'pharmacy_admin',
  'responsible_pharmacist',
  'pharmacist',
  'pharmacy_assistant'
];

function forward(method) {
  return async (req, res) => {
    try {
      const path = req.originalUrl.replace(/^\/api\/v1\/origin-retail\/pharmacy-core/, '') || '/';
      const payload = await core.request(path, {
        method,
        body: method === 'GET' ? undefined : req.body
      });
      res.status(method === 'POST' ? 201 : 200).json(payload);
    } catch (error) {
      res.status(error.status || 502).json({
        success: false,
        message: error.message,
        details: error.payload
      });
    }
  };
}

router.use(authenticateToken);
router.use(requireRole(staffRoles));

router.get('/*', forward('GET'));
router.post('/*', forward('POST'));
router.patch('/*', forward('PATCH'));

module.exports = router;
