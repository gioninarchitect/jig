// Add delete + bulk-delete routes (gated by approval code). Idempotent.
const fs = require('fs');
const path = '/var/www/origin/pos/backend/routes/products.js';
let s = fs.readFileSync(path, 'utf8');
if (s.includes('sm.deleteProduct')) { console.log('Already patched.'); process.exit(0); }
const anchor = "router.post('/manage/create', authenticateToken, requireApprovalCode, sm.createProduct);";
const add = anchor + "\n" +
  "router.delete('/:id/manage', authenticateToken, requireApprovalCode, sm.deleteProduct);\n" +
  "router.post('/manage/bulk-delete', authenticateToken, requireApprovalCode, sm.bulkDelete);";
s = s.replace(anchor, add);
fs.writeFileSync(path, s);
console.log('Patched delete routes:');
s.split('\n').filter(l => l.includes('manage') && (l.includes('delete') || l.includes('Delete'))).forEach(l => console.log('  ' + l.trim()));
