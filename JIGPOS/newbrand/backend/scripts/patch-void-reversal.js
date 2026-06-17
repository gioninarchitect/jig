// Patch quickVoid to reverse till totals + recompute the current open session(s).
const fs = require('fs');
const path = '/var/www/origin/pos/backend/controllers/pos.controller.js';
let src = fs.readFileSync(path, 'utf8');

const anchor = "await sale.voidSale(approver._id, req.body.reason || 'Voided at till');";
const reversal = anchor + `
    // Reverse this sale's contribution to the till totals (voids must not count as takings)
    try {
      if (sale.tillSessionId) {
        const _ts = await TillSession.findById(sale.tillSessionId);
        if (_ts) {
          const _m = (sale.payments && sale.payments[0] && sale.payments[0].method) || sale.paymentMethod || 'cash';
          const _amt = sale.totalAmount || 0;
          _ts.totalSales = Math.max(0, (_ts.totalSales || 0) - _amt);
          _ts.transactionCount = Math.max(0, (_ts.transactionCount || 0) - 1);
          if (_m === 'cash') _ts.totalCash = Math.max(0, (_ts.totalCash || 0) - _amt);
          else if (_m === 'card' || _m === 'instapay') _ts.totalCard = Math.max(0, (_ts.totalCard || 0) - _amt);
          else if (_m === 'eft') _ts.totalEFT = Math.max(0, (_ts.totalEFT || 0) - _amt);
          await _ts.save();
        }
      }
    } catch (_e) { logger.warn('void till-reversal failed: ' + _e.message); }`;

if (src.includes('void till-reversal')) {
  console.log('quickVoid already patched.');
} else if (src.includes(anchor)) {
  src = src.replace(anchor, reversal);
  fs.writeFileSync(path, src);
  console.log('Patched quickVoid with till reversal.');
} else {
  console.log('!! Anchor not found — quickVoid not patched.');
}
