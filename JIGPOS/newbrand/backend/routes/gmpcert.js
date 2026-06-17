const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/gmpcert.controller');
router.get('/', authenticateToken, c.list);
router.post('/:id/followup', authenticateToken, c.addFollowUp);
router.patch('/:id', authenticateToken, c.update);
module.exports = router;
