// Seed per-role permanent approval (override) codes. Idempotent (upsert by role).
// Change codes anytime: db.approvalCodes.updateOne({role},{ $set:{code:'NEW'} })
const mongoose = require('mongoose');

const CODES = [
  { role: 'super_admin',      code: '990011', label: 'Super Admin',        holder: 'Floris' },
  { role: 'owner',            code: '880022', label: 'Owner',              holder: '' },
  { role: 'admin',            code: '770033', label: 'Admin',              holder: '' },
  { role: 'branch_manager',   code: '660044', label: 'Branch Manager',     holder: 'Potchefstroom' },
  { role: 'inventory_manager',code: '550055', label: 'Inventory Manager',  holder: '' },
  { role: 'quality_manager',  code: '440066', label: 'Quality Manager (QA)',holder: 'Keke' },
];

(async () => {
  await mongoose.connect('mongodb://localhost:27017/origin');
  for (const c of CODES) {
    await mongoose.connection.db.collection('approvalCodes').updateOne(
      { role: c.role },
      { $set: { code: c.code, label: c.label, holder: c.holder, active: true, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true }
    );
  }
  await mongoose.connection.db.collection('approvalCodes').createIndex({ code: 1 });
  const all = await mongoose.connection.db.collection('approvalCodes').find({}).toArray();
  console.log('Approval codes seeded:');
  all.forEach(a => console.log('  ' + (a.label || a.role).padEnd(24) + ' ' + a.code + (a.active === false ? ' (disabled)' : '')));
  process.exit(0);
})().catch(e => { console.error('seed error', e.message); process.exit(1); });
