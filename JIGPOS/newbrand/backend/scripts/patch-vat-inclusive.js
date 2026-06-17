// Switch VAT from added-on-top to VAT-INCLUSIVE (prices already include 15%).
const fs = require('fs');

// 1) Sale model pre-save hook
const sp = '/var/www/origin/pos/backend/modules/database/models/Sale.js';
let s = fs.readFileSync(sp, 'utf8');
const oldItems = `    item.subtotal = item.unitPrice * item.quantity;
    item.taxAmount = (item.subtotal - item.discount) * (item.taxRate / 100);
    item.total = item.subtotal - item.discount + item.taxAmount;`;
const newItems = `    const _gross = (item.unitPrice * item.quantity) - (item.discount || 0); // VAT-inclusive line
    const _rate = (item.taxRate || 0) / 100;
    item.taxAmount = _rate > 0 ? (_gross - (_gross / (1 + _rate))) : 0; // VAT portion within
    item.subtotal = _gross - item.taxAmount; // ex-VAT
    item.total = _gross; // what the customer pays (incl VAT)`;
const oldTotal = '  this.totalAmount = this.subtotal - this.totalDiscount + this.totalTax + this.deliveryFee + this.tip;';
const newTotal = '  this.totalAmount = this.subtotal + this.totalTax + this.deliveryFee + this.tip; // VAT-inclusive';
if (s.includes(newItems)) { console.log('Sale.js already VAT-inclusive.'); }
else if (s.includes(oldItems) && s.includes(oldTotal)) {
  s = s.replace(oldItems, newItems).replace(oldTotal, newTotal);
  fs.writeFileSync(sp, s); console.log('Patched Sale.js → VAT-inclusive.');
} else { console.log('!! Sale.js anchors not found.'); }

// 2) createSale controller payment total
const cp = '/var/www/origin/pos/backend/controllers/pos.controller.js';
let c = fs.readFileSync(cp, 'utf8');
const oldCalc = `    const calculatedSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const calculatedTax = calculatedSubtotal * VAT_RATE;
    const calculatedTotal = calculatedSubtotal + calculatedTax;`;
const newCalc = `    const calculatedTotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0); // VAT-inclusive
    const calculatedSubtotal = calculatedTotal / (1 + VAT_RATE);
    const calculatedTax = calculatedTotal - calculatedSubtotal;`;
if (c.includes(newCalc)) { console.log('controller already VAT-inclusive.'); }
else if (c.includes(oldCalc)) {
  c = c.replace(oldCalc, newCalc);
  fs.writeFileSync(cp, c); console.log('Patched pos.controller.js → VAT-inclusive.');
} else { console.log('!! controller anchor not found.'); }
