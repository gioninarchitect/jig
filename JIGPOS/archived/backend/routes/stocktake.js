// Stock Take Routes — Thin router, business logic in controllers/stocktake.controller.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/stocktake.controller');

// Configure multer for stock take photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/stocktake');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const sessionId = req.params.sessionId || 'temp';
    const ext = path.extname(file.originalname);
    cb(null, `st-${sessionId}-${timestamp}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
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

// Session management
router.post('/session', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant']), controller.createSession);
router.get('/session/:sessionId', authenticateToken, controller.getSession);
router.post('/session/:sessionId/start', authenticateToken, controller.startSession);
router.get('/active/:branchId', authenticateToken, controller.getActiveSession);

// Line item management
router.put('/session/:sessionId/item/:itemIndex', authenticateToken, controller.updateLineItem);
router.post('/session/:sessionId/item/:itemIndex/photo', authenticateToken, upload.single('photo'), controller.uploadScalePhoto);
router.post('/session/:sessionId/item/:itemIndex/unit-photo', authenticateToken, upload.single('photo'), controller.uploadUnitPhoto);

// Submission & approval
router.post('/session/:sessionId/submit', authenticateToken, controller.submitSession);
router.post('/session/:sessionId/approve', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.approveSession);
router.get('/pending', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.getPendingApprovals);
router.get('/history', authenticateToken, controller.getHistory);
router.get('/session/:sessionId/variance-report', authenticateToken, controller.getVarianceReport);

module.exports = router;
