// Bug Report Routes — Thin router, business logic in controllers/bug-reports.controller.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/bug-reports.controller');

// Named routes before parameterized
router.get('/stats/summary', controller.getStats);

router.post('/', controller.create);
router.get('/', controller.getAll);
router.get('/:bugId', controller.getById);
router.put('/:bugId', controller.update);
router.delete('/:bugId', controller.remove);

module.exports = router;
