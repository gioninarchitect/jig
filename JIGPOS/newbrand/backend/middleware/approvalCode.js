// Per-role permanent approval (override) codes.
// An operator (e.g. cashier) triggers a change; an authorised role's code approves it.
// The resolved role + code are recorded on req.approval and written to the audit trail.
const mongoose = require('mongoose');
const logger = require('../modules/logger');

// Roles whose code may approve a stock change
const APPROVE_ROLES = ['super_admin', 'owner', 'admin', 'branch_manager', 'inventory_manager', 'quality_manager', 'qa'];

module.exports.requireApprovalCode = async (req, res, next) => {
  try {
    // An already-authenticated APPROVER (owner / admin / manager) does not need a separate
    // override code - their login IS the authorisation. The audit then records the real
    // person instead of a shared code. Operators WITHOUT an approver role (e.g. cashier)
    // still require a code, so the two-person control on the shop floor is unchanged.
    if (req.user && APPROVE_ROLES.includes(req.user.role)) {
      req.approval = {
        role: req.user.role,
        label: req.user.role,
        holder: req.user.email || req.user.username || req.user.role,
        viaLogin: true,
      };
      return next();
    }

    const code = String(req.body.approvalCode || '').trim();
    if (!code) return res.status(400).json({ success: false, message: 'Override code required' });
    const rec = await mongoose.connection.db.collection('approvalCodes').findOne({ code, active: { $ne: false } });
    if (!rec) {
      logger.warn('approval: invalid code', { by: req.user && req.user.email });
      return res.status(403).json({ success: false, message: 'Invalid override code' });
    }
    if (!APPROVE_ROLES.includes(rec.role)) {
      return res.status(403).json({ success: false, message: 'This code is not authorised to approve stock changes' });
    }
    req.approval = { role: rec.role, label: rec.label || rec.role, codeId: rec._id, holder: rec.holder || '' };
    next();
  } catch (e) {
    logger.error('requireApprovalCode', { error: e.message });
    res.status(500).json({ success: false, message: 'Approval check failed' });
  }
};
module.exports.APPROVE_ROLES = APPROVE_ROLES;
