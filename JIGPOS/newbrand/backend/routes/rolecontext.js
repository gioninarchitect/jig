const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/rolecontext.controller');
router.get('/', authenticateToken, c.list);
router.get('/:role', authenticateToken, c.getRole);
module.exports = router;
