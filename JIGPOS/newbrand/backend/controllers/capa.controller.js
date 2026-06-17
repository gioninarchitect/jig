// CAPA — Corrective & Preventive Action. SOP violation/deviation → ticket → re-training (re-sign).
const mongoose = require('mongoose');
const logger = require('../modules/logger');
const ADMIN_ROLES = ['owner', 'admin', 'super_admin', 'branch_manager'];
const db = () => mongoose.connection.db;
const oid = (id) => new mongoose.Types.ObjectId(id);

exports.options = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    // Scope to Origin staff only — exclude other brands sharing the DB (e.g. Ormonde)
    const branches = await db().collection('branches').find({}).project({ _id: 1 }).toArray();
    const originBranches = new Set(branches.map(b => String(b._id)));
    const allUsers = await db().collection('users').find({ isActive: true }).project({ firstName: 1, lastName: 1, role: 1, primaryBranch: 1 }).toArray();
    const users = allUsers.filter(u => !u.primaryBranch || originBranches.has(String(u.primaryBranch)));
    const sops = await db().collection('sops').find({ status: 'active' }).project({ code: 1, title: 1 }).sort({ code: 1 }).toArray();
    res.json({
      success: true,
      users: users.map(u => ({ id: String(u._id), name: ((u.firstName || '') + ' ' + (u.lastName || '')).trim() || u.role, role: u.role })),
      sops: sops.map(s => ({ id: String(s._id), code: s.code, title: s.title }))
    });
  } catch (e) { res.status(500).json({ success: false, message: 'Error' }); }
};

exports.list = async (req, res) => {
  try {
    const isAdmin = ADMIN_ROLES.includes(req.user.role);
    const q = isAdmin ? {} : { assignedTo: String(req.user.id) };
    const capas = await db().collection('capas').find(q).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, capas, isAdmin });
  } catch (e) { logger.error('capa list', { error: e.message }); res.status(500).json({ success: false, message: 'Error' }); }
};

exports.create = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const { title, description, type, severity, sopId, assignedTo, dueDate } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const now = new Date();
    const yr = now.getFullYear();
    const count = await db().collection('capas').countDocuments({});
    const ticketNo = 'CAPA-' + yr + '-' + String(count + 1).padStart(4, '0');

    let sopCode = '', assignedName = '', retrain = false;
    if (sopId) { const s = await db().collection('sops').findOne({ _id: oid(sopId) }); if (s) sopCode = s.code; }
    if (assignedTo) { const u = await db().collection('users').findOne({ _id: oid(assignedTo) }); if (u) assignedName = ((u.firstName || '') + ' ' + (u.lastName || '')).trim(); }

    // The loop: clear the assignee's sign-off on the linked SOP so they must re-read & re-sign (= re-training)
    if (sopId && assignedTo) {
      const s = await db().collection('sops').findOne({ _id: oid(sopId) });
      if (s) { await db().collection('sopsignoffs').deleteMany({ sopId: String(s._id), userId: String(assignedTo) }); retrain = true; }
    }

    const doc = {
      ticketNo, title, description: description || '', type: type || 'sop_violation',
      severity: severity || 'medium', sopId: sopId || null, sopCode,
      assignedTo: assignedTo || null, assignedToName: assignedName,
      retrainingRequired: retrain, status: 'open', correctiveAction: '',
      raisedBy: req.user.id, raisedByEmail: req.user.email, createdAt: now,
      dueDate: dueDate ? new Date(dueDate) : null
    };
    const r = await db().collection('capas').insertOne(doc);
    logger.info('CAPA created', { ticketNo, sop: sopCode, assignee: assignedName, retrain, by: req.user.email });
    res.json({ success: true, id: r.insertedId, ticketNo, retrainingTriggered: retrain });
  } catch (e) { logger.error('capa create', { error: e.message }); res.status(500).json({ success: false, message: 'Error creating CAPA' }); }
};

exports.update = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const id = oid(req.params.id);
    const { status, correctiveAction } = req.body;
    const set = {};
    if (status) { set.status = status; if (status === 'closed') { set.closedAt = new Date(); set.closedBy = req.user.email; } }
    if (correctiveAction != null) set.correctiveAction = correctiveAction;
    await db().collection('capas').updateOne({ _id: id }, { $set: set });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Error' }); }
};
