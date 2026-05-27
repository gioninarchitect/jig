// prod-halve-stock.js — Halve all existing product stock for Power's 50% share
// Run on production: mongosh dbc prod-halve-stock.js
//
// The 175 original products have FULL Meri Jane Ormonde quantities.
// Power (PureGro Premium Cannabis Care) only gets half. This halves all inventory.

print('=== HALVING STOCK FOR POWER\'S 50% SHARE ===');
print('');

// Only halve products that are already live (the original 175)
// Don't touch the new pending products (they have 0 stock)
const cursor = db.products.find({ mdcStage: 'live' });
let updated = 0;
let skipped = 0;

while (cursor.hasNext()) {
  const p = cursor.next();
  const currentQty = (p.inventory && p.inventory.quantity) || 0;

  if (currentQty <= 0) {
    skipped++;
    continue;
  }

  const newQty = Math.round(currentQty / 2);

  db.products.updateOne(
    { _id: p._id },
    { $set: { 'inventory.quantity': newQty } }
  );

  print('  ' + p.name + ': ' + currentQty + ' -> ' + newQty);
  updated++;
}

print('');
print('=== COMPLETE ===');
print('Updated: ' + updated);
print('Skipped (zero stock): ' + skipped);
