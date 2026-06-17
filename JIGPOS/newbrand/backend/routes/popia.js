const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/popia.controller');
router.get('/subject', authenticateToken, c.subjectAccess);
router.post('/erase', authenticateToken, c.erase);
module.exports = router;
