// SOP Library routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/sop.controller');

router.get('/', authenticateToken, c.list);
router.get('/compliance', authenticateToken, c.compliance);
router.get('/:id', authenticateToken, c.get);
router.post('/', authenticateToken, c.create);
router.post('/:id/version', authenticateToken, c.newVersion);
router.post('/:id/sign', authenticateToken, c.sign);

module.exports = router;
