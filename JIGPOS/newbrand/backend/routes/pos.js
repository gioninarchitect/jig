// POS Routes — Thin router, business logic in controllers/pos.controller.js
const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const controller = require('../controllers/pos.controller');
const salesReport = require('../controllers/salesreport.controller');
const REPORT_ROLES = ['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant'];

// Date-range takings report (manager reporting)
router.get('/report/range', authenticateToken, requireRole(REPORT_ROLES), salesReport.rangeReport);
router.get('/report/range/csv', authenticateToken, requireRole(REPORT_ROLES), salesReport.rangeCsv);

// Sale operations
router.post('/sale', authenticateToken, controller.createSale);
router.get('/sales/today', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant']), controller.getSalesToday);
router.get('/sales', authenticateToken, controller.getSales);
router.get('/sales/export/csv', authenticateToken, controller.exportSalesCsv);
router.post('/sale/:saleId/void', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.voidSale);
router.post('/sale/:saleId/refund', authenticateToken, controller.refundSale);
router.post('/sale/:saleId/quick-void', authenticateToken, controller.quickVoid);
router.post('/sale/:saleId/quick-refund', authenticateToken, controller.quickRefund);
router.get('/till/:sessionId/zreport.pdf', authenticateToken, controller.getZReportPdf);
router.get('/till/:sessionId/zreport.csv', authenticateToken, controller.getZReportCsv);
router.post('/till/:sessionId/email-report', authenticateToken, controller.emailZReport);
router.post('/sale/offline-sync', authenticateToken, controller.offlineSync);

// Sale documents
router.get('/sale/:saleId/invoice', authenticateToken, controller.getInvoice);
router.get('/sale/:saleId/receipt', authenticateToken, controller.getReceipt);
router.get('/sale/:saleId/receipt-text', authenticateToken, controller.getReceiptText);
router.post('/sale/:saleId/email', authenticateToken, controller.emailDocument);

// Payment management
router.post('/payment/:saleId/approve', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.approvePayment);
router.get('/payments/pending', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.getPendingPayments);

// Till session management
router.post('/till/open', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant']), controller.openTill);
router.get('/till/active', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant']), controller.getActiveTill);
router.post('/till/close', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant']), controller.closeTill);
router.post('/till/cash-in', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant']), controller.recordCashIn);
router.post('/till/cash-out', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant']), controller.recordCashOut);
router.get('/till/sessions/today', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.getTodaySessions);
router.get('/till/sessions/history', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.getSessionHistory);
router.post('/till/session/:sessionId/approve', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.approveSession);

// Daily cashup management
router.post('/cashup/start', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.startCashup);
router.get('/cashup/today', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant']), controller.getTodayCashup);
router.put('/cashup/:cashupId', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.updateCashup);
router.post('/cashup/:cashupId/submit', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.submitCashup);
router.post('/cashup/:cashupId/approve', authenticateToken, requireRole(['super_admin', 'owner', 'admin']), controller.approveCashup);
router.get('/cashup/history', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.getCashupHistory);
router.get('/cashup/pending', authenticateToken, requireRole(['super_admin', 'owner', 'admin']), controller.getPendingCashups);
router.post('/cashup/:cashupId/safe-drop', authenticateToken, requireRole(['super_admin', 'owner', 'admin', 'branch_manager']), controller.recordSafeDrop);
router.get('/cashup/:cashupId/report', authenticateToken, controller.getCashupReport);

module.exports = router;
