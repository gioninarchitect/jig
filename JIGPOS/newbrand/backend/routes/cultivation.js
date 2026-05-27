// Cultivation Routes — Thin router, business logic in controllers/cultivation.controller.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/cultivation.controller');

// Configure multer for harvest photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/cultivation');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `cult-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'));
    }
  }
});

// Overview
router.get('/overview', authenticateToken, controller.overview);

// Zones
router.get('/zones', authenticateToken, controller.listZones);
router.post('/zones', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager']), controller.createZone);
router.put('/zones/:id', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager']), controller.updateZone);
router.get('/zones/:id', authenticateToken, controller.getZone);

// Batches
router.get('/batches', authenticateToken, controller.listBatches);
router.post('/batches', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'cultivator']), controller.createBatch);
router.put('/batches/:id', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'cultivator']), controller.updateBatch);
router.post('/batches/:id/transition', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'cultivator']), controller.transitionBatch);
router.post('/batches/:id/nutrient-log', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'cultivator']), controller.addNutrientLog);
router.post('/batches/:id/pest-log', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'cultivator']), controller.addPestLog);

// Environment
router.get('/environment', authenticateToken, controller.listReadings);
router.post('/environment', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'cultivator', 'compliance_officer']), controller.createReading);
router.get('/environment/latest', authenticateToken, controller.latestReadings);

// Harvests
router.get('/harvests', authenticateToken, controller.listHarvests);
router.post('/harvests', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'cultivator']), upload.single('scalePhoto'), controller.createHarvest);

// Compliance
router.get('/compliance/score', authenticateToken, controller.complianceScore);
router.get('/compliance/logs', authenticateToken, controller.listComplianceLogs);
router.post('/compliance/logs', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'compliance_officer']), controller.createComplianceLog);
router.post('/compliance/audit-package', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'farm_manager', 'compliance_officer']), controller.generateAuditPackage);

// Reports
router.get('/reports/:type', authenticateToken, controller.generateReport);

// IoT Sensor Webhook (API key auth, not JWT)
router.post('/sensor/webhook', controller.sensorWebhook);

module.exports = router;
