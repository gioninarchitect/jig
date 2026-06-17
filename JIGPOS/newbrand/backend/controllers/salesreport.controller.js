// Date-range takings report over the POS `sales` collection (the till), for managers.
const mongoose = require('mongoose');
const logger = require('../modules/logger');
const db = () => mongoose.connection.db;
const oid = (id) => { try { return new mongoose.Types.ObjectId(id); } catch (e) { return null; } };
const dayKeySAST = (d) => new Date(new Date(d).getTime() + 2 * 3600 * 1000).toISOString().slice(0, 10);
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

async function buildRange(from, to, branchId) {
  // Inclusive SAST day boundaries.
  const start = new Date(from + 'T00:00:00+02:00');
  const end = new Date(to + 'T23:59:59.999+02:00');
  const q = { createdAt: { $gte: start, $lte: end } };
  if (branchId) { const b = oid(branchId); if (b) q.branchId = b; }
  const sales = await db().collection('sales').find(q)
    .project({ totalAmount: 1, totalTax: 1, status: 1, payments: 1, items: 1, createdAt: 1 }).toArray();

  const completed = sales.filter(s => s.status === 'completed');
  const voided = sales.filter(s => s.status === 'voided' || s.status === 'refunded');
  const total = completed.reduce((a, s) => a + (s.totalAmount || 0), 0);
  const vat = completed.reduce((a, s) => a + (s.totalTax || 0), 0);

  const byMethod = {};
  completed.forEach(s => (s.payments || []).forEach(p => { byMethod[p.method] = (byMethod[p.method] || 0) + (p.amount || 0); }));
  Object.keys(byMethod).forEach(k => byMethod[k] = r2(byMethod[k]));

  const dayMap = {};
  completed.forEach(s => { const k = dayKeySAST(s.createdAt); (dayMap[k] = dayMap[k] || { date: k, sales: 0, tx: 0 }); dayMap[k].sales += s.totalAmount || 0; dayMap[k].tx++; });
  const daily = Object.values(dayMap).sort((a, b) => a.date < b.date ? -1 : 1).map(d => ({ ...d, sales: r2(d.sales) }));

  const pm = {};
  completed.forEach(s => (s.items || []).forEach(i => { const k = i.name || i.sku || 'item'; (pm[k] = pm[k] || { name: k, qty: 0, revenue: 0 }); pm[k].qty += i.quantity || 0; pm[k].revenue += i.total || 0; }));
  const topProducts = Object.values(pm).sort((a, b) => b.revenue - a.revenue).slice(0, 20).map(p => ({ ...p, revenue: r2(p.revenue) }));

  return {
    from, to,
    total: r2(total), net: r2(total - vat), vat: r2(vat),
    transactions: completed.length,
    avgBasket: completed.length ? r2(total / completed.length) : 0,
    byMethod,
    voided: { count: voided.length, amount: r2(voided.reduce((a, s) => a + (s.totalAmount || 0), 0)) },
    daily, topProducts, generatedAt: new Date()
  };
}

exports.rangeReport = async (req, res) => {
  try {
    const { from, to, branchId } = req.query;
    if (!from || !to) return res.status(400).json({ success: false, message: 'from and to dates are required' });
    const report = await buildRange(from, to, branchId);
    res.json({ success: true, ...report });
  } catch (e) { logger.error('rangeReport', { error: e.message }); res.status(500).json({ success: false, message: 'Error building report' }); }
};

exports.rangeCsv = async (req, res) => {
  try {
    const { from, to, branchId } = req.query;
    if (!from || !to) return res.status(400).json({ success: false, message: 'from and to dates are required' });
    const rpt = await buildRange(from, to, branchId);
    const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
    let csv = `Origin Takings Report,${from} to ${to}\n\n`;
    csv += `Total takings,${rpt.total}\nNet (excl VAT),${rpt.net}\nVAT,${rpt.vat}\nTransactions,${rpt.transactions}\nAvg basket,${rpt.avgBasket}\nVoided/refunded,${rpt.voided.count} (R${rpt.voided.amount})\n\n`;
    csv += `Payment method,Amount\n` + Object.entries(rpt.byMethod).map(([m, a]) => `${m},${a}`).join('\n') + '\n\n';
    csv += `Date,Sales,Transactions\n` + rpt.daily.map(d => `${d.date},${d.sales},${d.tx}`).join('\n') + '\n\n';
    csv += `Product,Qty,Revenue\n` + rpt.topProducts.map(p => `${esc(p.name)},${p.qty},${p.revenue}`).join('\n') + '\n';
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="origin-takings-${from}_to_${to}.csv"`);
    res.send(csv);
  } catch (e) { logger.error('rangeCsv', { error: e.message }); res.status(500).json({ success: false, message: 'Error building CSV' }); }
};
