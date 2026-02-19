// Section 21 Routes — Thin router, business logic in controllers/section21.controller.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const controller = require('../controllers/section21.controller');

// Multer config (stays in router - it's middleware)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/section21/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'section21-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, JPEG, and PNG files are allowed'));
    }
  }
});

// User routes (inline JWT in controller)
router.get('/status', controller.getStatus);
router.get('/my-status', controller.getMyStatus);
router.get('/check-access/:userId', controller.checkAccess);
router.get('/user/:userId', controller.getUserDocuments);
router.post('/upload', upload.single('document'), controller.upload);

// Compliance stats (must come before admin/* to avoid route clash)
router.get('/compliance-stats', controller.getComplianceStats);

// Admin routes
router.get('/admin/pending', controller.adminGetPending);
router.get('/admin/expiring', controller.adminGetExpiring);
router.post('/admin/approve/:documentId', controller.adminApprove);
router.post('/admin/reject/:documentId', controller.adminReject);

module.exports = router;
