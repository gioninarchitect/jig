// Per-role AI compliance assistant context — defines what each role's assistant knows,
// grounded to that role's SOPs, KPIs and the legal/EU-GMP foundation.
const mongoose = require('mongoose');
const logger = require('../modules/logger');
const ADMIN_ROLES = ['owner', 'admin', 'super_admin', 'branch_manager'];
const db = () => mongoose.connection.db;

const GUARDRAIL = 'Answer ONLY from this role\'s SOPs, KPIs and the grounded legal/EU-GMP foundation. ' +
  'If asked about SA cannabis scheduling, Section 21 specifics or licence conditions, state the framework but add: ' +
  '"to be confirmed by a SA medicines-law specialist." Never invent regulatory facts. Cite the SOP code or Source ID you used.';

async function assemble(ctx) {
  // resolve the active SOPs that apply to this role (role[] empty = all staff, or includes the role)
  const sops = await db().collection('sops').find({ status: 'active' }).project({ code: 1, title: 1, version: 1, role: 1 }).toArray();
  const applicable = sops.filter(s => !s.role || !s.role.length || (s.role || []).includes(ctx.role))
    .map(s => ({ code: s.code, title: s.title, version: s.version }));
  const grounding = `You are the Origin/ILCO compliance assistant for the ${ctx.label}.\n` +
    `Mission: ${ctx.mission}\nScope: ${ctx.scope}\n` +
    `KPIs you track: ${(ctx.kpis || []).join(', ')}\n` +
    `Legal/standard grounding: ${(ctx.lawRefs || []).join(', ')}\n` +
    `Applicable SOPs: ${applicable.map(s => s.code + ' ' + s.title).join('; ')}\n` +
    GUARDRAIL;
  return { ...ctx, sops: applicable, grounding };
}

exports.list = async (req, res) => {
  try {
    if (!ADMIN_ROLES.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Not authorised' });
    const ctxs = await db().collection('rolecontexts').find({}).sort({ order: 1 }).toArray();
    const full = [];
    for (const c of ctxs) full.push(await assemble(c));
    res.json({ success: true, contexts: full });
  } catch (e) { logger.error('rolecontext list', { error: e.message }); res.status(500).json({ success: false, message: 'Error' }); }
};

exports.getRole = async (req, res) => {
  try {
    const role = req.params.role;
    const ctx = await db().collection('rolecontexts').findOne({ role });
    if (!ctx) return res.status(404).json({ success: false, message: 'No context for this role' });
    res.json({ success: true, context: await assemble(ctx) });
  } catch (e) { res.status(500).json({ success: false, message: 'Error' }); }
};
