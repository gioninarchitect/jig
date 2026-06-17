// SAHPRA GMP certificate application tracker — submission, status, follow-ups.
const mongoose = require('mongoose');
const logger = require('../modules/logger');
const ADMIN_ROLES = ['owner', 'admin', 'super_admin', 'branch_manager'];
const db = () => mongoose.connection.db;
const oid = (id) => new mongoose.Types.ObjectId(id);
const days = (d) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

exports.list = async (req, res) => {
  try {
    const apps = await db().collection('gmpapplications').find({}).sort({ submittedDate: -1 }).toArray();
    const out = apps.map(a => ({
      ...a,
      daysSinceSubmission: a.submittedDate ? days(a.submittedDate) : null,
      followUps: (a.followUps || []).sort((x, y) => new Date(y.date) - new Date(x.date))
    }));
    res.json({ success: true, applications: out, canEdit: ADMIN_ROLES.includes(req.user.role) });
  } catch (e) { logger.error('gmpcert list', { error: e.message }); res.status(500).json({ success: false, message: 'Error' }); }
};

exports.addFollowUp = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const { date, note } = req.body;
    if (!note) return res.status(400).json({ success: false, message: 'Note required' });
    await db().collection('gmpapplications').updateOne(
      { _id: oid(req.params.id) },
      { $push: { followUps: { date: date ? new Date(date) : new Date(), note, by: req.user.email, createdAt: new Date() } } }
    );
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Error' }); }
};

exports.update = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const { status, nextFollowUp, contact } = req.body;
    const set = { updatedAt: new Date() };
    if (status) set.status = status;
    if (nextFollowUp) set.nextFollowUp = new Date(nextFollowUp);
    if (contact != null) set.contact = contact;
    await db().collection('gmpapplications').updateOne({ _id: oid(req.params.id) }, { $set: set });
    res.json({ success: true });
  } catch (e) { res.status(500).json({ success: false, message: 'Error' }); }
};
