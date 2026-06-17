// CAPA routes
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const c = require('../controllers/capa.controller');

router.get('/', authenticateToken, c.list);
router.get('/options', authenticateToken, c.options);
router.post('/', authenticateToken, c.create);
router.patch('/:id', authenticateToken, c.update);

module.exports = router;
