// Branch Inventory Routes — Aggregated inventory queries
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const controller = require('../controllers/branch-inventory.controller');

router.get('/', authenticateToken, controller.getAll);

module.exports = router;
