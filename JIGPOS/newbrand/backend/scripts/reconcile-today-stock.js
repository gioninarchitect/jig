// One-time reconcile: today's completed POS sales never decremented Product.inventory.quantity
// (the field the POS grid displays). Subtract today's sold quantities so on-screen stock is correct.
// Run: node reconcile-today-stock.js [--apply]
const mongoose = require('mongoose');

function sastDayStart() {
  const now = new Date();
  const sast = new Date(now.getTime() + 2 * 3600 * 1000);
  sast.setUTCHours(0, 0, 0, 0);
  return new Date(sast.getTime() - 2 * 3600 * 1000);
}

(async () => {
  const apply = process.argv.includes('--apply');
  await mongoose.connect('mongodb://localhost:27017/origin');
  const db = mongoose.connection.db;
  const start = sastDayStart();

  // Only completed sales (voided/refunded never reduced stock or were reversed).
  const sales = await db.collection('sales').find({ status: 'completed', createdAt: { $gte: start } })
    .project({ items: 1, saleNumber: 1 }).toArray();

  const sold = {}; // productId -> qty
  for (const s of sales) for (const it of (s.items || [])) {
    const pid = it.productId && it.productId.toString();
    if (pid) sold[pid] = (sold[pid] || 0) + (it.quantity || 0);
  }
  console.log(`Today's completed sales: ${sales.length} · distinct products sold: ${Object.keys(sold).length}`);

  let changed = 0;
  for (const [pid, qty] of Object.entries(sold)) {
    let _id; try { _id = new mongoose.Types.ObjectId(pid); } catch { continue; }
    const p = await db.collection('products').findOne({ _id }, { projection: { name: 1, inventory: 1 } });
    if (!p) continue;
    const cur = (p.inventory && p.inventory.quantity) || 0;
    const next = Math.max(0, cur - qty);
    console.log(`  ${p.name}: ${cur} - ${qty} sold = ${next}`);
    if (apply) await db.collection('products').updateOne({ _id }, { $set: { 'inventory.quantity': next, updatedAt: new Date() } });
    changed++;
  }
  console.log(`\n${apply ? 'APPLIED' : 'DRY-RUN'} — ${changed} products reconciled`);
  process.exit(0);
})().catch(e => { console.error('error', e.message); process.exit(1); });
