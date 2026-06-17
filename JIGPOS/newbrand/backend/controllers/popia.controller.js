// POPIA compliance — data subject access (DSAR), erasure, consent & retention.
const mongoose = require('mongoose');
const logger = require('../modules/logger');
const ADMIN_ROLES = ['owner', 'admin', 'super_admin'];
const db = () => mongoose.connection.db;

// What we hold for a person (Data Subject Access Request)
exports.subjectAccess = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const email = (req.query.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const user = await db().collection('users').findOne({ email });
    const sales = await db().collection('sales').find({ $or: [{ customerEmail: email }, { 'customerInfo.email': email }] })
      .project({ saleNumber: 1, totalAmount: 1, createdAt: 1, status: 1, paymentMethod: 1 }).sort({ createdAt: -1 }).toArray();
    res.json({
      success: true,
      found: !!user || sales.length > 0,
      profile: user ? {
        name: ((user.firstName || '') + ' ' + (user.lastName || '')).trim(), email: user.email,
        phone: user.mobile || user.profile?.phone || '', role: user.role,
        createdAt: user.createdAt, isCustomer: ['user', 'customer'].includes(user.role) || user.isGuestAccount,
        loyaltyPoints: user.loyalty?.points || 0, marketingConsent: user.preferences?.marketingEmails || false,
        erased: user.popiaErased || null
      } : null,
      sales, salesCount: sales.length
    });
  } catch (e) { logger.error('popia dsar', { error: e.message }); res.status(500).json({ success: false, message: 'Error' }); }
};

// Erase a customer's personal data (POPIA right to erasure) — keeps anonymised transaction records for accounting
exports.erase = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const email = (req.body.email || '').toLowerCase().trim();
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });
    const user = await db().collection('users').findOne({ email });
    // Safety: never erase staff accounts
    if (user && !(['user', 'customer'].includes(user.role) || user.isGuestAccount)) {
      return res.status(400).json({ success: false, message: 'This is a staff account — not a data subject. Erasure refused.' });
    }
    const stamp = Date.now();
    if (user) {
      await db().collection('users').updateOne({ _id: user._id }, {
        $set: { firstName: '[erased]', lastName: '', email: 'erased-' + stamp + '@removed.local', username: 'erased-' + stamp, mobile: '', profile: {}, isActive: false, popiaErased: new Date(), popiaErasedBy: req.user.email }
      });
    }
    const r = await db().collection('sales').updateMany({ $or: [{ customerEmail: email }, { 'customerInfo.email': email }] },
      { $set: { customerEmail: '', customerName: '[erased]', 'customerInfo.email': '', 'customerInfo.name': '[erased]', 'customerInfo.phone': '' } });
    logger.info('POPIA erasure', { email, byUser: req.user.email, salesAnonymised: r.modifiedCount });
    res.json({ success: true, message: 'Personal data erased', salesAnonymised: r.modifiedCount, profileErased: !!user });
  } catch (e) { logger.error('popia erase', { error: e.message }); res.status(500).json({ success: false, message: 'Error' }); }
};
