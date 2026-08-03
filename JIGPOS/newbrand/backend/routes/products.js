// Product Routes — Thin router, business logic in controllers/products.controller.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/products.controller');

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '../../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        if (file.fieldname === 'csvFile') {
            if (!file.originalname.match(/\.(csv)$/)) {
                return cb(new Error('Only CSV files are allowed'));
            }
        } else if (file.fieldname === 'productImage') {
            if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
                return cb(new Error('Only image files are allowed'));
            }
        }
        cb(null, true);
    }
});

// Public product listing
router.get('/', controller.getAll);

// Medical products (MUST come before /:id)
router.get('/medical', controller.getMedical);

// CSV template (MUST come before /:id)
router.get('/template', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.getTemplate);

// Export products (MUST come before /:id)
router.get('/export', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), controller.exportProducts);

// Product stats & categories (MUST come before /:id)
router.get('/stats', authenticateToken, controller.getStats);
router.get('/categories', controller.getCategories);

// Single product by ID (catches /:id param — must be last GET)
router.get('/:id', controller.getById);

// Bulk upload & image upload
router.post('/bulk-upload', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), upload.single('csvFile'), controller.bulkUpload);
router.post('/image-upload', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager']), upload.single('productImage'), controller.uploadImage);

// Stock management
router.patch('/:id/stock', authenticateToken, requireRole(['admin', 'owner', 'inventory_manager', 'branch_manager']), controller.updateStock);
router.patch('/:id/quick-edit', authenticateToken, controller.quickEdit);
const sm = require('../controllers/stockmanage.controller');
const { requireApprovalCode } = require('../middleware/approvalCode');
router.get('/manage/list', authenticateToken, controller.manageList);
router.get('/manage/audit', authenticateToken, sm.auditList);
// Spreadsheet import — PREVIEW only (dry-run, writes nothing). Owner/admin.
router.post('/manage/import/preview', authenticateToken, requireRole(['super_admin', 'owner', 'admin']), sm.importPreview);
router.patch('/:id/manage', authenticateToken, requireApprovalCode, sm.manageProduct);
router.post('/manage/create', authenticateToken, requireApprovalCode, sm.createProduct);
router.delete('/:id/manage', authenticateToken, requireApprovalCode, sm.deleteProduct);
router.post('/manage/bulk-delete', authenticateToken, requireApprovalCode, sm.bulkDelete);

module.exports = router;
