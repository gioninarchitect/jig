/**
 * Distribute a voucher's rand discount across the cart lines it applies to.
 * Pure function (no deps) so it can be unit-tested in isolation, since it sits on the money path.
 *
 * Returns a per-line discount array aligned to `items` by index, summing EXACTLY to `discount`.
 * Product-scoped -> only matching productIds. Category-scoped -> only matching categories.
 * Neither -> the whole cart. Proportional by line gross; the rounding remainder goes to the last
 * eligible line so the parts always add up to the voucher discount (no cent drift at the till).
 *
 * @param {Array<{productId?:string, category?:string, unitPrice:number, quantity:number}>} items
 * @param {number} discount  rand amount to spread
 * @param {Array<string>} [applyIds]  product ids the voucher targets
 * @param {Array<string>} [applyCats] categories the voucher targets
 * @returns {number[]} per-line discount, same length/order as items
 */
function distributeVoucherDiscount(items, discount, applyIds, applyCats) {
  const gross = it => (Number(it.unitPrice) || 0) * (Number(it.quantity) || 0);
  const ids = (applyIds || []).map(String);
  const cats = (applyCats || []).map(c => String(c).toLowerCase());
  const out = (items || []).map(() => 0);
  if (!Array.isArray(items) || !items.length) return out;

  const eligible = [];
  items.forEach((it, idx) => {
    let ok;
    if (ids.length) ok = it.productId && ids.includes(String(it.productId));
    else if (cats.length) ok = it.category && cats.includes(String(it.category).toLowerCase());
    else ok = true;
    if (ok) eligible.push(idx);
  });

  const totalGross = eligible.reduce((s, i) => s + gross(items[i]), 0);
  if (totalGross <= 0 || discount <= 0) return out;

  let allocated = 0;
  eligible.forEach((i, k) => {
    let share;
    if (k === eligible.length - 1) {
      share = Math.round((discount - allocated) * 100) / 100; // remainder to last eligible line
    } else {
      share = Math.round(discount * (gross(items[i]) / totalGross) * 100) / 100;
      allocated += share;
    }
    out[i] = share;
  });
  return out;
}

module.exports = { distributeVoucherDiscount };
