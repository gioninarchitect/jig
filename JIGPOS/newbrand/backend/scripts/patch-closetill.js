// Fix day-end close: normalize denomination keys (NaN bug) + manager self-authorises variance.
const fs = require('fs');
const path = '/var/www/origin/pos/backend/controllers/pos.controller.js';
let s = fs.readFileSync(path, 'utf8');
let changed = 0;

// 1) Normalize denominations to lowercase + numbers before closeSession (fixes NaN actualCash)
const closeAnchor = 'await tillSession.closeSession(req.user.id, denominations, closingNotes);';
const closeFix = `const _normDenom = {};
    for (const _dk in (denominations || {})) { _normDenom[String(_dk).toLowerCase()] = Number(denominations[_dk]) || 0; }
    await tillSession.closeSession(req.user.id, _normDenom, closingNotes);`;
if (s.includes('_normDenom')) { console.log('denom-normalise already applied'); }
else if (s.includes(closeAnchor)) { s = s.replace(closeAnchor, closeFix); changed++; console.log('Applied denom-normalise.'); }
else { console.log('!! closeSession anchor not found'); }

// 2) Variance gate: a manager/owner closing is self-authorised; only a cashier needs a manager PIN
const oldGate = `    if (Math.abs(_variance) > 50) {
      const _User = require('../modules/database/models/User');
      const _appr = await _User.findOne({ permanentPin: String(req.body.approvalPin || ''), role: { $in: ['owner','admin','super_admin','branch_manager'] }, isActive: true });
      if (!_appr) return res.status(403).json({ success: false, requiresApproval: true, message: 'Variance of R' + _variance.toFixed(2) + ' exceeds R50 — a manager/admin PIN is required to close.' });
      if (!closingNotes || !String(closingNotes).trim()) return res.status(400).json({ success: false, message: 'A closing note is required when the variance exceeds R50.' });
    }`;
const newGate = `    if (Math.abs(_variance) > 50) {
      const _MGR = ['owner','admin','super_admin','branch_manager'];
      if (!_MGR.includes(req.user && req.user.role)) {
        const _User = require('../modules/database/models/User');
        const _appr = await _User.findOne({ permanentPin: String(req.body.approvalPin || ''), role: { $in: _MGR }, isActive: true });
        if (!_appr) return res.status(403).json({ success: false, requiresApproval: true, message: 'Variance of R' + _variance.toFixed(2) + ' exceeds R50 — a manager/admin PIN is required to close.' });
        if (!closingNotes || !String(closingNotes).trim()) return res.status(400).json({ success: false, message: 'A closing note is required when the variance exceeds R50.' });
      }
    }`;
if (s.includes('!_MGR.includes(req.user')) { console.log('variance-gate already role-aware'); }
else if (s.includes(oldGate)) { s = s.replace(oldGate, newGate); changed++; console.log('Made variance gate role-aware.'); }
else { console.log('!! variance gate anchor not found'); }

if (changed) fs.writeFileSync(path, s);
console.log('Done. changes=' + changed);
