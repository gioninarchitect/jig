// Rewire the stock-manage routes: open list to any logged-in staff (view),
// gate writes behind the approval code, add the audit endpoint. Idempotent.
const fs = require('fs');
const path = '/var/www/origin/pos/backend/routes/products.js';
let s = fs.readFileSync(path, 'utf8');

if (s.includes('stockmanage.controller')) { console.log('Already patched.'); process.exit(0); }

// Insert requires just before the first manage route line
const anchor = "router.get('/manage/list'";
const requires = "const sm = require('../controllers/stockmanage.controller');\nconst { requireApprovalCode } = require('../middleware/approvalCode');\n";
s = s.replace(anchor, requires + anchor);

// Replace the three manage route lines (any requireRole signature) with the new wiring
s = s.replace(/router\.get\('\/manage\/list'[^\n]*\n/, "router.get('/manage/list', authenticateToken, controller.manageList);\nrouter.get('/manage/audit', authenticateToken, sm.auditList);\n");
s = s.replace(/router\.patch\('\/:id\/manage'[^\n]*\n/, "router.patch('/:id/manage', authenticateToken, requireApprovalCode, sm.manageProduct);\n");
s = s.replace(/router\.post\('\/manage\/create'[^\n]*\n/, "router.post('/manage/create', authenticateToken, requireApprovalCode, sm.createProduct);\n");

fs.writeFileSync(path, s);
console.log('Patched. New manage routes:');
s.split('\n').filter(l => l.includes('/manage')).forEach(l => console.log('  ' + l.trim()));
