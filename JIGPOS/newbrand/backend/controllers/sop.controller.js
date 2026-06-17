// SOP Library — role-based, version-controlled, digital sign-off
const mongoose = require('mongoose');
const logger = require('../modules/logger');

const ADMIN_ROLES = ['owner', 'admin', 'super_admin', 'branch_manager'];
const db = () => mongoose.connection.db;
const oid = (id) => new mongoose.Types.ObjectId(id);

exports.list = async (req, res) => {
  try {
    const role = req.user && req.user.role;
    const isAdmin = ADMIN_ROLES.includes(role);
    const statuses = isAdmin ? ['active', 'draft', 'archived'] : ['active'];
    const sops = await db().collection('sops').find({ status: { $in: statuses } }).sort({ category: 1, code: 1 }).toArray();
    const visible = sops.filter(s => isAdmin || !s.role || !s.role.length || s.role.includes(role));
    const signs = await db().collection('sopsignoffs').find({ userId: String(req.user.id) }).toArray();
    const signed = new Set(signs.map(x => x.sopId + '|' + x.version));
    const out = visible.map(s => ({
      _id: s._id, code: s.code, title: s.title, category: s.category, role: s.role || [],
      version: s.version, status: s.status, effectiveDate: s.effectiveDate,
      signed: signed.has(String(s._id) + '|' + s.version)
    }));
    res.json({ success: true, sops: out, isAdmin });
  } catch (e) { logger.error('sop list', { error: e.message }); res.status(500).json({ success: false, message: 'Error loading SOPs' }); }
};

exports.get = async (req, res) => {
  try {
    const s = await db().collection('sops').findOne({ _id: oid(req.params.id) });
    if (!s) return res.status(404).json({ success: false, message: 'SOP not found' });
    const sign = await db().collection('sopsignoffs').findOne({ sopId: String(s._id), version: s.version, userId: String(req.user.id) });
    res.json({ success: true, sop: s, signed: !!sign });
  } catch (e) { res.status(500).json({ success: false, message: 'Error' }); }
};

exports.create = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const { code, title, category, role, body } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' });
    const now = new Date();
    const doc = {
      code: code || ('SOP-' + Date.now()), title, category: category || 'General',
      role: Array.isArray(role) ? role : (role ? [role] : []),
      body: body || '', version: 1, status: 'active', effectiveDate: now,
      createdBy: req.user.email, createdAt: now
    };
    const r = await db().collection('sops').insertOne(doc);
    logger.info('SOP created', { code: doc.code, by: req.user.email });
    res.json({ success: true, id: r.insertedId });
  } catch (e) { res.status(500).json({ success: false, message: 'Error creating SOP' }); }
};

exports.newVersion = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const id = oid(req.params.id);
    const cur = await db().collection('sops').findOne({ _id: id });
    if (!cur) return res.status(404).json({ success: false, message: 'SOP not found' });
    await db().collection('sops').updateOne({ _id: id }, { $set: { status: 'archived' } });
    const now = new Date();
    const doc = {
      code: cur.code, title: req.body.title || cur.title, category: req.body.category || cur.category,
      role: req.body.role || cur.role, body: req.body.body != null ? req.body.body : cur.body,
      version: (cur.version || 1) + 1, status: 'active', effectiveDate: now,
      supersedes: String(id), createdBy: req.user.email, createdAt: now
    };
    const r = await db().collection('sops').insertOne(doc);
    logger.info('SOP new version', { code: cur.code, version: doc.version, by: req.user.email });
    res.json({ success: true, id: r.insertedId, version: doc.version });
  } catch (e) { res.status(500).json({ success: false, message: 'Error creating version' }); }
};

exports.sign = async (req, res) => {
  try {
    const s = await db().collection('sops').findOne({ _id: oid(req.params.id) });
    if (!s) return res.status(404).json({ success: false, message: 'SOP not found' });
    await db().collection('sopsignoffs').updateOne(
      { sopId: String(s._id), version: s.version, userId: String(req.user.id) },
      { $set: { sopId: String(s._id), version: s.version, userId: String(req.user.id), userEmail: req.user.email, sopCode: s.code, signedAt: new Date(), ip: req.ip || '' } },
      { upsert: true }
    );
    res.json({ success: true, message: 'Signed v' + s.version });
  } catch (e) { res.status(500).json({ success: false, message: 'Error signing' }); }
};

exports.compliance = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const sops = await db().collection('sops').find({ status: 'active' }).toArray();
    // Scope staff to THIS brand (Origin) only — exclude other brands sharing the DB (e.g. Ormonde)
    const branches = await db().collection('branches').find({}).project({ _id: 1 }).toArray();
    const originBranches = new Set(branches.map(b => String(b._id)));
    const allUsers = await db().collection('users').find({ isActive: true }).project({ firstName: 1, lastName: 1, role: 1, primaryBranch: 1 }).toArray();
    const users = allUsers.filter(u => !u.primaryBranch || originBranches.has(String(u.primaryBranch)));
    const signs = await db().collection('sopsignoffs').find({}).toArray();
    const key = new Set(signs.map(x => x.sopId + '|' + x.version + '|' + x.userId));
    const report = sops.map(s => {
      const assigned = users.filter(u => !s.role || !s.role.length || s.role.includes(u.role));
      const outstanding = assigned.filter(u => !key.has(String(s._id) + '|' + s.version + '|' + String(u._id)));
      return {
        code: s.code, title: s.title, version: s.version,
        assigned: assigned.length, signed: assigned.length - outstanding.length,
        outstanding: outstanding.map(u => ({ name: ((u.firstName || '') + ' ' + (u.lastName || '')).trim(), role: u.role }))
      };
    });
    res.json({ success: true, report });
  } catch (e) { res.status(500).json({ success: false, message: 'Error' }); }
};
