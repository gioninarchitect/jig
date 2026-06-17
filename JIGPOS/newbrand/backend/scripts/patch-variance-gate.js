// One-shot patch: insert a variance-approval gate into closeTill, before closeSession()
const fs = require('fs');
const path = '/var/www/origin/pos/backend/controllers/pos.controller.js';
let src = fs.readFileSync(path, 'utf8');

if (src.includes('Variance approval gate')) {
  console.log('Already patched — skipping.');
  process.exit(0);
}

const marker = 'await tillSession.closeSession(req.user.id, denominations, closingNotes);';
const gate = `
    // Variance approval gate — over R50 needs a manager/admin PIN + note
    const _dv = { r200:200, r100:100, r50:50, r20:20, r10:10, r5:5, r2:2, r1:1, c50:0.5, c20:0.2, c10:0.1, c5:0.05 };
    let _actual = 0;
    for (const _k in denominations) { const _v = _dv[String(_k).toLowerCase()]; if (_v) _actual += (Number(denominations[_k]) || 0) * _v; }
    const _expected = (tillSession.expectedCash != null ? tillSession.expectedCash : ((tillSession.openingFloat || 0) + (tillSession.totalCash || 0) - (tillSession.totalRefunds || 0)));
    const _variance = _actual - _expected;
    if (Math.abs(_variance) > 50) {
      const _User = require('../modules/database/models/User');
      const _appr = await _User.findOne({ permanentPin: String(req.body.approvalPin || ''), role: { $in: ['owner','admin','super_admin','branch_manager'] }, isActive: true });
      if (!_appr) return res.status(403).json({ success: false, requiresApproval: true, message: 'Variance of R' + _variance.toFixed(2) + ' exceeds R50 — a manager/admin PIN is required to close.' });
      if (!closingNotes || !String(closingNotes).trim()) return res.status(400).json({ success: false, message: 'A closing note is required when the variance exceeds R50.' });
    }
    ` + marker;

src = src.replace(marker, gate);
fs.writeFileSync(path, src);
console.log('Patched closeTill with variance gate.');
