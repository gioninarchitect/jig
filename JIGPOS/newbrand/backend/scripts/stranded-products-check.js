// Stranded-Product Detector — Origin POS health check
// ---------------------------------------------------------------------------
// Catches products that are silently hidden from the till/store, so we never
// again miss something like the Red Hibiscus tea (catalogue stock 12, branch
// stock 0 at Potch -> the branch-scoped till excluded it).
//
// ROOT CAUSE guarded against (verified in products.controller.js GET products):
//   When a branchId is supplied, the till re-queries to ONLY products that have
//   a BranchInventory row with quantity > 0 for that branch. So a product can be
//   status:'active', isActive!=false, inventory.quantity > 0 at the catalogue
//   level yet have 0 branch stock -> invisible on the till.
//   Separately, isPublished != true hides a product from the online store
//   (but NOT the till).
//
// A product is STRANDED if it is status:'active' AND isActive != false AND not
// archived, AND either:
//   (A) HIDDEN FROM TILL  — catalogue stock (inventory.quantity > 0) but NO
//       BranchInventory row with quantity > 0 at a physical trading branch.
//       BranchInventory fields are branchId / productId / quantity.
//       (A) is the serious one: lost sales at the till.
//   (B) HIDDEN FROM STORE — isPublished != true.
//
// Read-only. The ONLY side effect is sending the owner an email when (A) is
// found. Email is non-fatal (logged if SMTP fails). Safe to run on the live DB.
//
// Run:   node backend/scripts/stranded-products-check.js
// ---------------------------------------------------------------------------

const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Product = require('../modules/database/models/Product');
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');

// Reuse the same email service the takings report uses (services/emailService).
let emailService = null;
try {
  emailService = require('../services/emailService');
} catch (e) {
  console.warn('[stranded-check] emailService not available:', e.message);
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/origin';

// Owner recipients — same address set the takings report defaults to
// (pos.controller.js emailDailyReport). Override with STRANDED_REPORT_TO.
const OWNER_RECIPIENTS = (process.env.STRANDED_REPORT_TO
  ? process.env.STRANDED_REPORT_TO.split(',').map(s => s.trim()).filter(Boolean)
  : ['originbyilcofarming@gmail.com', 'florisolivier7@gmail.com']);

// The "Origin Online" branch is the online sales CHANNEL, not a physical till.
// (A) — hidden-from-till — only applies to physical trading branches, so we
// exclude the online channel by branchCode/name. Online visibility is governed
// by isPublished, which is what (B) checks.
const ONLINE_BRANCH_CODES = ['OR-ONL'];
function isPhysicalTradingBranch(branch) {
  if (ONLINE_BRANCH_CODES.includes((branch.branchCode || '').toUpperCase())) return false;
  if (/online/i.test(branch.name || '')) return false;
  return true;
}

async function run() {
  await mongoose.connect(MONGODB_URI);

  // ---- Load active, sellable catalogue products ---------------------------
  // status 'active' AND isActive != false AND not archived.
  // (Product has no isActive field today; isActive:{$ne:false} also matches
  //  documents where the field is absent, so this is forward-compatible.)
  const activeProducts = await Product.find({
    status: 'active',
    isActive: { $ne: false }
  })
    .select('name category sku inventory.quantity isPublished status isActive')
    .lean();

  // (A) only considers products that actually have catalogue stock to sell.
  const stockedCatalogue = activeProducts.filter(
    p => (p.inventory && p.inventory.quantity > 0)
  );

  // ---- Physical trading branches ------------------------------------------
  const allBranches = await Branch.find({ isActive: true })
    .select('name branchCode type')
    .lean();
  const tradingBranches = allBranches.filter(isPhysicalTradingBranch);

  // ---- (A) HIDDEN FROM TILL, per trading branch ---------------------------
  const hiddenFromTill = []; // { product, branch }
  for (const branch of tradingBranches) {
    const rows = await BranchInventory.find({
      branchId: branch._id,
      quantity: { $gt: 0 }
    })
      .select('productId')
      .lean();
    const stockedIds = new Set(rows.map(r => String(r.productId)));

    for (const p of stockedCatalogue) {
      if (!stockedIds.has(String(p._id))) {
        hiddenFromTill.push({ product: p, branch });
      }
    }
  }

  // ---- (B) HIDDEN FROM STORE ----------------------------------------------
  const hiddenFromStore = activeProducts.filter(p => p.isPublished !== true);

  // ---- Report -------------------------------------------------------------
  const stamp = new Date().toISOString();
  console.log('==========================================================');
  console.log(' Origin POS — Stranded-Product Detector');
  console.log(' ' + stamp);
  console.log('==========================================================');
  console.log(`Active catalogue products: ${activeProducts.length}`);
  console.log(`  with catalogue stock (>0): ${stockedCatalogue.length}`);
  console.log(`Physical trading branches scanned: ${tradingBranches.length} `
    + `(${tradingBranches.map(b => b.branchCode).join(', ') || 'none'})`);
  console.log(`Online channel(s) excluded from (A): `
    + `${allBranches.filter(b => !isPhysicalTradingBranch(b)).map(b => b.branchCode).join(', ') || 'none'}`);
  console.log('');

  console.log('--- (A) HIDDEN FROM TILL  [serious — lost sales] ---');
  console.log(`Count: ${hiddenFromTill.length}`);
  for (const { product, branch } of hiddenFromTill) {
    console.log(`  - ${product.name} | ${product.category || 'uncategorised'} `
      + `| catalogue qty ${product.inventory.quantity} | branch ${branch.branchCode} `
      + `| 0 branch stock`);
  }
  if (hiddenFromTill.length === 0) console.log('  (none — every stocked product is visible on every trading till)');
  console.log('');

  console.log('--- (B) HIDDEN FROM STORE  [isPublished != true] ---');
  console.log(`Count: ${hiddenFromStore.length}`);
  for (const p of hiddenFromStore.slice(0, 60)) {
    console.log(`  - ${p.name} | ${p.category || 'uncategorised'} `
      + `| catalogue qty ${(p.inventory && p.inventory.quantity) || 0} | not published`);
  }
  if (hiddenFromStore.length > 60) console.log(`  ... and ${hiddenFromStore.length - 60} more`);
  if (hiddenFromStore.length === 0) console.log('  (none — every active product is published to the store)');
  console.log('');

  // ---- Email the owner ONLY when (A) found --------------------------------
  if (hiddenFromTill.length > 0) {
    await alertOwner(hiddenFromTill, hiddenFromStore.length, stamp);
  } else {
    console.log('[stranded-check] No till-hidden products — no email sent.');
  }

  await mongoose.disconnect();
  return hiddenFromTill.length;
}

async function alertOwner(hiddenFromTill, storeCount, stamp) {
  if (!emailService || typeof emailService.sendEmail !== 'function') {
    console.warn('[stranded-check] emailService unavailable — skipping owner alert (non-fatal).');
    return;
  }

  const rows = hiddenFromTill.map(({ product, branch }) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(product.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(product.category || 'uncategorised')}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center;">${product.inventory.quantity}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(branch.branchCode)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;color:#b00;">0 branch stock</td>
      </tr>`).join('');

  const logo = (emailService.getLogoDataUri && emailService.getLogoDataUri()) || '';
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:640px;margin:0 auto;color:#1a1a1a;">
    ${logo ? `<div style="text-align:center;padding:24px 0;"><img src="${logo}" alt="Origin" style="height:48px;"></div>` : ''}
    <h2 style="margin:0 0 4px;">Stranded-product alert</h2>
    <p style="margin:0 0 16px;color:#555;">
      ${hiddenFromTill.length} product${hiddenFromTill.length === 1 ? ' has' : 's have'} catalogue
      stock but <strong>0 branch stock</strong>, so ${hiddenFromTill.length === 1 ? 'it is' : 'they are'}
      silently hidden from the till. Add a branch-inventory quantity to put ${hiddenFromTill.length === 1 ? 'it' : 'them'} back on sale.
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <thead>
        <tr style="background:#f4f4f4;text-align:left;">
          <th style="padding:8px 12px;">Product</th>
          <th style="padding:8px 12px;">Category</th>
          <th style="padding:8px 12px;text-align:center;">Catalogue qty</th>
          <th style="padding:8px 12px;">Branch</th>
          <th style="padding:8px 12px;">Branch stock</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="margin:16px 0 0;color:#777;font-size:12px;">
      Also hidden from the online store (isPublished != true): ${storeCount} active product${storeCount === 1 ? '' : 's'}.<br>
      Automated daily POS health check &middot; ${stamp}
    </p>
    <p style="margin:24px 0 0;color:#999;font-size:12px;text-align:center;">ORIGIN &middot; by ILCO Farming</p>
  </div>`;

  try {
    const result = await emailService.sendEmail({
      to: OWNER_RECIPIENTS.join(','),
      subject: `Origin POS: ${hiddenFromTill.length} product(s) stranded off the till`,
      html
    });
    console.log(`[stranded-check] Owner alert emailed to ${OWNER_RECIPIENTS.join(', ')} `
      + `(messageId ${result && result.messageId ? result.messageId : 'n/a'}).`);
  } catch (err) {
    console.error('[stranded-check] Owner alert email FAILED (non-fatal):', err.message);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

run()
  .then(count => {
    process.exit(count > 0 ? 0 : 0); // read-only check: 0 even when items found
  })
  .catch(err => {
    console.error('[stranded-check] FATAL:', err);
    process.exit(1);
  });
