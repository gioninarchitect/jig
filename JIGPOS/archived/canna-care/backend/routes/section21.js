// Section 21 Medical Cannabis Prescription Routes
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Section21Document = require('../modules/database/models/Section21Document');
const User = require('../modules/database/models/User');

// Configure multer for file uploads
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
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

// CRITICAL: Check if user can access medical cannabis
router.get('/check-access/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const canAccess = await Section21Document.canUserAccessMedicalCannabis(userId);
    const activeDoc = await Section21Document.getUserActiveDocument(userId);

    res.json({
      canAccess,
      document: activeDoc ? {
        expiryDate: activeDoc.expiryDate,
        daysUntilExpiry: activeDoc.daysUntilExpiry,
        isExpiringSoon: activeDoc.isExpiringSoon
      } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's Section 21 documents
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const documents = await Section21Document.find({ userId })
      .sort({ uploadedAt: -1 })
      .select('-__v');

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Upload Section 21 document
router.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { userId, prescriptionNumber, prescribedBy, issuedDate, expiryDate } = req.body;

    // Calculate expiry date (6 months from issue date if not provided)
    const issued = new Date(issuedDate);
    const expiry = expiryDate ? new Date(expiryDate) : new Date(issued.setMonth(issued.getMonth() + 6));

    const document = await Section21Document.create({
      userId,
      documentUrl: `/uploads/section21/${req.file.filename}`,
      documentType: path.extname(req.file.originalname).substring(1),
      prescriptionNumber,
      prescribedBy,
      issuedDate: new Date(issuedDate),
      expiryDate: expiry,
      status: 'pending',
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    res.status(201).json({
      message: 'Section 21 document uploaded successfully. Awaiting admin approval.',
      document
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Get all pending documents
router.get('/admin/pending', async (req, res) => {
  try {
    const documents = await Section21Document.find({ status: 'pending' })
      .populate('userId', 'firstName lastName email')
      .sort({ uploadedAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Approve document
router.post('/admin/approve/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { adminId, adminNotes } = req.body;

    const document = await Section21Document.findByIdAndUpdate(
      documentId,
      {
        status: 'approved',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        adminNotes
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      message: 'Section 21 document approved. User can now access medical cannabis products.',
      document
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin: Reject document
router.post('/admin/reject/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { adminId, rejectionReason, adminNotes } = req.body;

    const document = await Section21Document.findByIdAndUpdate(
      documentId,
      {
        status: 'rejected',
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason,
        adminNotes
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    res.json({
      message: 'Section 21 document rejected.',
      document
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check for expiring documents (called by cron job)
router.get('/admin/expiring', async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const expiringDocs = await Section21Document.find({
      status: 'approved',
      isExpired: false,
      expiryDate: { $lte: thirtyDaysFromNow, $gt: new Date() }
    }).populate('userId', 'firstName lastName email');

    res.json(expiringDocs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
