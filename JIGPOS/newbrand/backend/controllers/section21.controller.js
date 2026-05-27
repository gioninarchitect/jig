// Section 21 Controller — Medical Cannabis Prescription Management
const Section21Document = require('../modules/database/models/Section21Document');
const User = require('../modules/database/models/User');
const jwt = require('jsonwebtoken');
const path = require('path');

// GET /status - Get current user's Section 21 status (inline JWT auth)
const getStatus = async (req, res) => {
  try {
    // Extract user ID from authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.id;

    // Find user's Section 21 documents
    const documents = await Section21Document.find({ userId }).sort({ uploadedAt: -1 });

    // Check for approved authorization letter
    const approvedAuthLetter = documents.find(doc =>
      doc.documentType === 'authorization_letter' && doc.status === 'approved'
    );

    // Check for approved prescription
    const approvedPrescription = documents.find(doc =>
      doc.documentType === 'prescription' && doc.status === 'approved'
    );

    // Check for pending documents
    const pendingDoc = documents.find(doc => doc.status === 'pending');

    // If no documents at all, return no access state
    if (documents.length === 0) {
      return res.json({
        hasApprovedPrescription: false,
        hasPendingPrescription: false,
        hasApprovedAuthLetter: false
      });
    }

    // Build response based on document status
    const response = {
      hasApprovedPrescription: !!approvedPrescription,
      hasPendingPrescription: !!pendingDoc,
      hasApprovedAuthLetter: !!approvedAuthLetter,
      submittedAt: pendingDoc?.uploadedAt || documents[0]?.uploadedAt,
      doctorName: approvedAuthLetter?.prescribedBy || documents[0]?.prescribedBy || 'N/A',
      authLetterDate: approvedAuthLetter?.issuedDate || documents[0]?.issuedDate
    };

    res.json(response);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Section 21 status error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /my-status - Simplified status for Potchefstroom collection point (inline JWT auth)
const getMyStatus = async (req, res) => {
  try {
    // Extract user ID from authorization token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const userId = decoded.id;

    // Find user's most recent Section 21 document
    const latestDoc = await Section21Document.findOne({ userId })
      .sort({ uploadedAt: -1 });

    if (!latestDoc) {
      return res.json({
        hasDocument: false,
        status: null
      });
    }

    // Check if document is expired
    const now = new Date();
    const isExpired = latestDoc.expiryDate && new Date(latestDoc.expiryDate) < now;

    // Get pending orders count (placeholder - would need Order model integration)
    const pendingOrders = 0; // TODO: integrate with Order model

    // Get monthly usage (placeholder - would need PurchaseRecord integration)
    const monthlyUsage = '0g'; // TODO: integrate with PurchaseRecord model

    res.json({
      hasDocument: true,
      status: latestDoc.status,
      isExpired,
      expiryDate: latestDoc.expiryDate,
      submittedDate: latestDoc.uploadedAt,
      rejectionReason: latestDoc.rejectionReason,
      pendingOrders,
      monthlyUsage
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    console.error('Section 21 my-status error:', error);
    res.status(500).json({ error: error.message });
  }
};

// GET /check-access/:userId - Check if user can access medical cannabis
const checkAccess = async (req, res) => {
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
};

// GET /user/:userId - Get user's Section 21 documents
const getUserDocuments = async (req, res) => {
  try {
    const { userId } = req.params;
    const documents = await Section21Document.find({ userId })
      .sort({ uploadedAt: -1 })
      .select('-__v');

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /upload - Upload Section 21 document (multer handled in router)
const upload = async (req, res) => {
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
};

// GET /admin/pending - All pending documents
const adminGetPending = async (req, res) => {
  try {
    const documents = await Section21Document.find({ status: 'pending' })
      .populate('userId', 'firstName lastName email')
      .sort({ uploadedAt: -1 });

    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// POST /admin/approve/:documentId - Approve document
const adminApprove = async (req, res) => {
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
};

// POST /admin/reject/:documentId - Reject document
const adminReject = async (req, res) => {
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
};

// GET /admin/expiring - Documents expiring within 30 days
const adminGetExpiring = async (req, res) => {
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
};

// GET /compliance-stats — Aggregated Section 21 compliance metrics
const getComplianceStats = async (req, res) => {
  try {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [totalPatients, activePrescriptions, expiringThisMonth] = await Promise.all([
      User.countDocuments({ section21Certified: true }),
      Section21Document.countDocuments({ status: 'approved', expiryDate: { $gt: now } }),
      Section21Document.countDocuments({
        status: 'approved',
        expiryDate: { $gt: now, $lte: endOfMonth }
      })
    ]);

    res.json({ success: true, totalPatients, activePrescriptions, expiringThisMonth });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching compliance stats' });
  }
};

module.exports = {
  getStatus,
  getMyStatus,
  checkAccess,
  getUserDocuments,
  upload,
  adminGetPending,
  adminApprove,
  adminReject,
  adminGetExpiring,
  getComplianceStats
};
