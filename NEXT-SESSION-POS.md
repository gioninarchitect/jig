# Origin Retail POS — Next Session Handover

**Updated:** 2026-06-06 PM (reports+email, branch-inventory fix, float fix, takings cleanup, outlet onboarding+activation, FLOCORE integration, brand kit, role gap analysis, Academy/bug-assistant specs)
**Branch:** `v1.4`
**POS live:** https://origin.cleva-ai.co.za/pos.html
**Service-worker cache:** `origin-pos-v58` (bump on every frontend deploy)
**Module agents:** dispatch `O_RETAIL_AGENT` (this POS) / `O_TNT_AGENT` (tnt-za) — defs in `.claude/agents/`.
**Local demo:** `cd JIGPOS/newbrand && PORT=3005 node backend/server.js` → http://localhost:3005 (uses local mongo = copy of prod; `mongorestore` from a prod `mongodump` to refresh). Logins: admin@cleva-ai.co.za/123456, originbyilcofarming@gmail.com/480627.

---

## 0. STATUS — Potchefstroom is LIVE and trading ✅
First real sales went through. Printer + drawer working, day-end + reporting working.
Everything below is built, deployed, and in use.

---

## 0.6 SESSION 2026-06-06 PM

**POS (LIVE, SW v58):**
- **Reports button** on the till (managers/owner gate) → `reports.html`. **Email Takings Report to stakeholders**: recipient modal on reports.html + backend `emailRange`/`recipientsGet/Set` (persist per branch in `reportRecipients`); HTML + CSV attach via `emailService` (which **throws** on SMTP fail — not swallowed; SMTP working, old 535s were May).
- **Branch-inventory fix (the big one):** the till is **branch-scoped** — products only show if they have a `branchinventories` row. `stockmanage.createProduct` now auto-creates that row for every non-online branch (was the cause of "added products don't show"). Backfilled 4 orphans. Owner account `originbyilcofarming` is role **`branch_assistant`** (not owner) — onboarding/admin endpoints correctly deny it.
- **Float fix:** `pos-shifts.js` open-till + expected-cash defaulted to **R500** (`|| 500`) → fixed to **R0**; corrected the live session.
- **Takings cleanup:** report excludes `isTest:true`; flagged 9 pre-launch test sales (3 on Jun 1 + 6 pre-June). Card reconciled to **Capitec batch settlements** — 3 Jun (R802) + 4–5 Jun (R740) tie to the cent; **1–2 Jun pending Ray's terminal list** (bank R332/R20 vs POS).
- **Day-end incident:** Ray's close succeeded but showed no confirmation → she rang a R10 card sale after close → no open shift to "close". Re-opened + closed clean (R40, by-date report correct). Real gaps logged **#50** (clear confirmation, block sale-after-close, "no open shift" message).

**Network / platform:**
- **Outlet onboarding + activation (LIVE):** `origin-onboarding.html` (admin-gated wizard, doc gate: SAPC premises+RP, CIPC, banking, premises; cannabis 22A/S21 = **ILCO's**, not the outlet's) + `origin-outlets.html` (Pending-Outlets review → **Verify & activate** = flips branch+RP active, seeds the network catalogue @ 0 stock). Backend `onboarding.controller` (submit/pending/approve/reject), uploads → `/var/www/origin/uploads/onboarding/`. First outlet: **Röscher Pharmacy, Kroonstad** (pending). Pending RP can't log in (`verify-pin` rejects `isActive:false`).
- **FLOCORE** = parent platform; new tenant **Origin / ILCO Farming** (sibling of KCS) holds 2 modules: **Origin (newbrand, Mongo)** + **ILCO-TnT (tnt-za, Postgres)**, each its own agent. Wrote `FLOCORE_INTEGRATION_RESPONSE.md` (both repos) + `FLOCORE_ORCHESTRATOR_RECOMMENDATION.md` (orchestrator = core layer). Module agents `O_RETAIL_AGENT`/`O_TNT_AGENT` in `.claude/agents/`. **Open owner decisions: D1 auth model, D2 security sign-off owner.**

**TnT-ZA / strategy (docs):** `tnt-za/role-activation-gap-analysis.html` (per-role readiness; HoC=**GroOS** separate app; blockers: daily-check backend, QA-decision endpoint, S21 dispensing) · `tnt-za/docs/academy-build-plan.md` (native LMS — don't fork udemy-clones, study Lattice MVP) #52 · `tnt-za/docs/bug-assistant-spec.md` + reusable skill `in-app-feedback-assistant` #53.

**Brand:** Design System, Origin+TnT icon series (no emoji), Botanica range proposal — all HTML+PDF. Lockup = **ORIGIN / by ILCO Farming**. Weekly owner status report (`origin-status-2026-06-06.html`).

**New standing rules (memory):** branded-not-native-dialogs · no-overengineering(=overscoping) · always-full-urls · exhaustive-scenario-coverage. Project memories added: pos_branch_inventory, origin_nginx_pos_paths, roles_groos_academy, flocore_platform.

**Scenario sweep:** `SCENARIO-SWEEP-2026-06-06.md` — latent gaps: (A) `/online/` branch regex in createProduct/approve, (B) reject→resubmit dup branch, (C) report split-payment divergence, (D) onboarding doc-gate hardening, (E)=#50 day-end.

**Top of next session:** Röscher live onboard · gap-A one-line fix (pre-Röscher) · #50 day-end · Capitec upload (#43) · FLOCORE D1/D2 · farm-team training (#51) · Academy build (#52) · Botanica costing.

---

## 0.5 SESSION 2026-06-04 → 06 (all LIVE unless noted)

**⚠️ DEPLOY VIGILANCE (user feedback "be more vigilant"):** the live till is production with customers mid-sale.
For ANY live change: `diff` local vs the live file BEFORE `scp` (local has drifted behind — strip `\r`), deploy
**minimal verified sets** not batches, prove risky/UX changes on the **local demo first**, and after every
restart do a **real-request** check (login + affected endpoint + pos.html/products/sales-today), not just `pm2 online`.
See memory `feedback_live_pos_deploy_vigilance` + `feedback_never_clobber_live_controllers`.

**Stock sheet (`stock-sheet.html`) — per-role approval codes + audit:** every edit/add/delete needs an override
code → resolves to a role → writes `stockAudit` (operator + approver + note + before/after + time). Codes
(`approvalCodes` coll): SuperAdmin 990011 · Owner 880022 · Admin 770033 · **Branch Manager 660044** · Inventory 550055 · QA 440066.
Cashier (originbyilcofarming, PIN **480627**, branch_assistant) can VIEW; the code approves writes. "Change log" button.
**Delete + multi-select** (archives → `status:'archived'`). **Brand now REQUIRED** on Add Product (datalist of brands).
New products get a unique `slug` (unique index — `stockmanage.createProduct`).

**VAT — now INCLUSIVE** via one helper `vatBreakdown()` in `frontend/config.js` (mode `localStorage.posVatMode`,
default inclusive). Fixed 4 checkout sites doing `× (1+VAT)` (payment showed R908 not R790). Stock-sheet has a
VAT-mode toggle + "price excludes VAT" add-product helper.

**Inventory deduction (`pos.controller.createSale`):** was deducting `BranchInventory` only, never
`Product.inventory.quantity` (the field the grid shows) → sold stock didn't move + new stock-sheet products
(no BranchInventory) never deducted. Now also `Product.updateOne($inc -qty)`. Ran `reconcile-today-stock.js` once.

**POS auto-refresh (`pos-products.js`):** ↻ button (`refreshProducts`) + refresh on focus/visibility/pageshow +
**30s background poll**. Edits ALWAYS persisted; the screen just wasn't repainting.

**Brand-first Wellness nav (Ray):** Wellness/Pharmacy group is now **brand-only** — category sub-tabs hidden;
classified **by brand** (`WELLNESS_BRANDS` + `isWellnessBrand` in `pos-products.js`) so Lamelle `face` / CannaMed
`topicals` land in Wellness (were wrongly in Cannabis). **Cannabis group untouched.** Brand casing normalised
(`BIO SCULPTURE`→`Bio Sculpture`). Customer search **hidden** on the till (kept for future cannabis flow).

**Day-end (`day-end.js` + `pos.controller` closeTill):** float default now **0** (was 500 → phantom −R500
variance); close recomputes expected from `openingFloat+totalCash-refunds` (not a stale stored value);
variance >R50 manager override is now an **in-page modal** (`varianceOverride`) — `window.prompt` is suppressed
in kiosk mode so Ray couldn't type. To adopt a real float later: open the till with `openingFloat=250`.

**Date-range Takings Report (NEW):** `reports.html` (manager login) + `GET /pos/report/range[/csv]`
(`salesreport.controller`, mounted in `pos.js`). Any date range / presets → takings, VAT, net, tx, cash-vs-card,
daily breakdown, top products, CSV + print-PDF. Aggregates the `sales` coll (NOT the online-order `reports/sales`).

**#20 Patient portal + Section 21 gate (Origin medical retail):**
- `patient-portal.html` (public, email-OTP) — upload Section 21 + Rx, see status, medical locked until approved.
- Gate in `order.controller.section21Block` — online order with any `track:'medical'` item → 403 `SECTION21_REQUIRED`
  unless `user.section21Status==='approved'`. **Wellness orders unaffected; the in-store till is NOT gated.**
- `section21.controller` syncs `User.section21Status` on upload(pending)/approve/reject. **Admin endpoints now
  auth-gated** (pharmacist/admin roles) — were open.
- `section21-review.html` — pharmacist reviews pending uploads → approve/reject (kiosk login).
- `order.html` shows a **branded** "Section 21 required" modal on the 403 (not raw JSON).
- `patient-access-map.html` — the dispensing-side legal foundation map (everything legal flagged **VERIFY**).
- Consult fee corrected to **R700 (R300 doctor + R400 SAHPRA Section 21 application fee)** across patient pages.
- TODO: real consult booking + in-system Rx generation = **#41**. The Patient Portal IS the medical CRM (link it,
  don't rebuild) when the CRM/loyalty layer (#35) is built.

**TnT-ZA bridge (Wave 3):** `#19` Owner Dashboard Retail tab = LIVE (reads Origin via `GET /bridge/retail-summary`,
`x-bridge-key`, env `BRIDGE_KEY` on Origin / `ORIGIN_BRIDGE_KEY`+`ORIGIN_API_URL` on TnT).
`#25` Origin write side DONE + tested (`POST /bridge/retail-receipt` idempotent per batchNumber, `GET /bridge/products`,
`stockReceipts` coll). **TnT side of #25 unfinished** — Batch schema fields (`retailSyncedAt/retailSku/retailQty`)
added to `schema.prisma` but NOT migrated; `origin.service.pushBatchToRetail` + a batch `release-to-till` route/UI
still to build. Decisions locked: **manual "Release to till"** (not auto) + **pick existing SKU**. Bridge key:
`or1g1n-tnt-br1dg3-7f3a9c2e5b8140d6`.

---

## 1. DEPLOY WORKFLOW (unchanged — read first)
- Live server is **NOT a git repo**. Deploy = `scp <file> root@154.66.197.199:/var/www/origin/pos/...`
- Server: `root@154.66.197.199`, app dir `/var/www/origin/pos/`, PM2 process **`origin-pos`** (port 3008).
- After ANY frontend change: **bump the SW cache** in `/var/www/origin/pos/sw.js`
  (`origin-pos-vN` → vN+1).
- After ANY backend change: `pm2 restart origin-pos --update-env`.
- **API base in production is `/pos/api/v1`** (nginx `/pos/api/` → 3008). `/api/` → 3009 = the b2b
  service (different app — do NOT point the POS at it). Frontend uses `Origin_CONFIG.API_URL`.
- DB: MongoDB on the live server. Run seed/fix scripts ON the server (`scp` script + `node`).
- **Products API reads product-level `inventory.quantity`** (NOT BranchInventory) — set it when seeding.
- **Payment method is stored in `sale.payments[0].method`**, NOT `sale.paymentMethod` (that's undefined).
  Always read `payments[0].method || paymentMethod`.

### Service-worker cache (FIXED 2026-06-03)
The SW previously served **all** HTML/JS cache-first → redeploys stayed stale forever (caused the
"toast says code needed but no modal appears" snag — till was running the old stock-sheet).
**Now `sw.js` is network-first for `.html`/`.js`/navigations** (cache only as offline fallback), so a
single reload picks up any new deploy. Still bump `CACHE_VERSION` (`origin-pos-vN`) on each frontend
deploy to wipe old caches on activate. `pos-update.sh` (clears SW cache + relaunch) remains the
nuclear option for the POSBANK.

---

## 2. POSBANK (in-store Ubuntu terminal) — setup one-liners
All served from the live server, run on the POSBANK terminal:
| Script | Purpose | sudo? |
|---|---|---|
| `kiosk-setup.sh` | Auto-start POS full-screen on boot + **watchdog** (Alt+F4 → reopens in 1s) | no |
| `pos-update.sh` | Force latest version (clears SW cache, relaunch) | no |
| `printer-setup.sh` | Install CUPS, add S300H as `OriginReceipt`, test print | yes |
| `print-agent-setup.sh` | Local print service on 127.0.0.1:9999 (silent slip + drawer) | yes |
| `test-print.sh` | ESC/POS test slip | no |
| `pos-icon.sh` | Desktop icon with Origin logo | no |
| `fix-caret.sh` | Disable F7 caret-browsing popup (xmodmap) | no |
| `fix-screenshot.sh` | Disable PrtScn screenshot popup | no |

Pattern: `curl -s https://origin.cleva-ai.co.za/<script> | bash` (add `| sudo bash` where noted).

### Remote access
**AnyDesk** installed. Desk ID **`1589698747`**, unattended password **`OriginPOS2026!`**.
(If AnyDesk acts up, `rustdesk-setup.sh` is deployed as a fallback.)

### Printer + drawer
- S300H, **USB**, drawer into the printer's RJ11. `OriginReceipt` CUPS raw queue.
- Print agent (`/opt/origin-print-agent.py`, systemd `origin-print`) listens on 127.0.0.1:9999;
  the POS POSTs each completed sale → silent ESC/POS slip. **Drawer pops on CASH sales only.**
- Test drawer alone: `curl -s -X POST http://127.0.0.1:9999/drawer`

---

## 3. LOGIN / ACCOUNTS
- `florisolivier7@gmail.com` — super_admin · `florisolivier72@gmail.com` — owner · `admin@cleva-ai.co.za` — admin.
  All PIN **123456**.
- **Cashier:** `originbyilcofarming@gmail.com` · PIN **480627** · role `branch_assistant` · Potchefstroom.
- **OTP master code 123456** works for ANY email (auth-otp.controller.js, ungated).
  ⚠️ **Gate this before real customer scale.**
- Login persists token to BOTH sessionStorage + localStorage → navigating to day-end & back keeps session.

---

## 4. WHAT WAS BUILT TODAY (all live)
**Selling**
- Teas sold **by the gram** (tap → grams numpad). Rates: most R2/g, Ginger & Rooibos R1/g, Blue Lotus R6/g.
- Cart **quick-add** buttons +1 / +2 / +5 / +10 per line; line totals shown.
- ID-based product card taps (fixes apostrophe-name crash, e.g. "Lion's mane").
- On-screen keyboard: full **number row** + numpad on amount fields + wide space bar.

**Payments / receipts**
- Auto-print slip + cash-drawer kick (cash only) via local print agent. Email-invoice button works.

**Corrections (all admin-PIN gated, logged)**
- **Price edit**: gold pencil on each card → price only (teas = per-gram). Owner/admin PIN.
- **Void / Refund**: 🧾 **Sales** button (header) → Today's Transactions → tap a sale → Void or Refund
  (full or per-item), reason note + manager PIN. **Void now reverses the till totals** (cash/card/eft +
  count) — voided sales no longer inflate takings. Status badges COMPLETED/VOIDED/REFUNDED.
- Transactions header shows **net** total + "X voided/refunded" separately.

**Day end / reporting**
- Close Shift shows **Cash · Card (Speedpoint) · Manual EFT** split + expected/variance (modal now fits screen).
- Shift Summary shows **Net Sales (excl. voids)** + a **Voided/Refunded** line.
- **Variance over R50** → requires note + manager/admin PIN to close (within ±R50 closes free).
- **Day-End Z-Report**: pdfkit PDF + CSV, auto-emailed on close to
  `originbyilcofarming@gmail.com` + `florisolivier7@gmail.com`, with Download PDF/CSV buttons.
  Backend: `zreport.js` + routes `/pos/till/:id/zreport.pdf|.csv|email-report`.
- "Close today's session?" confirm dialog. **Logout / reload / reboot never close the till** — only Day End does.

**Robustness**
- Crash-hardening guards (cart/product/checkout never crash on missing price/name/total).
- Kiosk watchdog (auto-reopen). F7 + PrtScn popups disabled.

**Training**
- Branded printable manual: **https://origin.cleva-ai.co.za/training-manual.html**
  (Cashier + Manager, "Print / Save as PDF", includes sign-off page).

---

## 5. PRODUCTS — current state
162 active products at supplier suggested retail. 10 demo `BMH-*` products deactivated.
- Lamelle 18 · Bio Sculpture ~82 (gels R130 + spa) · Harmonic Mycology 30 (mushrooms) ·
  Origin Teas 15 (per-gram) · CannaMed 12 · CBD Full Spectrum 6.
- Public catalogue (storefront `potchefstroom.html`) wired to `/pos/api/v1/products` — shows the
  158 wellness/lifestyle items (cannabis gated). `PUBLIC_SAFE_CATEGORIES` widened in
  products.controller.js.

**Outstanding product data**
- ⚠️ **CannaMed** prices are a ×1.5 guess — need supplier suggested retail (waiting on Sacred Roots).
- Product images (cards are icon-only).
- Confirm shelf price labels match till (VAT-exclusive prices + 15% at till — see §6).

---

## 6. VAT — model is now INCLUSIVE (fixed 2026-06-05)
Prices are **VAT-inclusive** (the shelf price IS what the customer pays). VAT shown as the portion within:
`VAT = total × 15/115`. All maths goes through `vatBreakdown()` in `frontend/config.js` (mode
`localStorage.posVatMode`, default `inclusive`; `exclusive` adds 15% — only for a pure-wholesale store).
Earlier the till added 15% on top (R790→R908) — that's fixed. (Two very early manual sales pre-fix missed VAT —
declare output VAT as 15/115 of what was taken.)

---

## 7. OPEN / NEXT
1. **Finish #25 TnT side** — Batch schema migrate + `pushBatchToRetail` + `release-to-till` route/UI (manual push, pick existing SKU). Origin write endpoint already done/tested.
2. **CRM / loyalty (#35)** — capture optional customer at sale → loyalty points/history; **link the Patient Portal as the medical-customer record** (don't rebuild). `User.loyalty.points` exists, unused.
3. **#41 Section 21 Digital Clinical Portal** — real consult booking + in-system Rx generation (patient-onboarding is still a brochure). Medicines-law copy on patient pages flagged **VERIFY** — needs specialist sign-off.
4. Bio Sculpture product **images** — only ~7 mapped (DB colour names ≠ live site slugs); shop grid is JS-rendered → needs a working **scrape.do** token (the documented one is inactive). HM (30) + Lamelle (16) done.
5. **CannaMed** real supplier prices (currently ×1.5 guess). Gate the **master OTP 123456** before scale.
6. Owner live-feed labels every sale "cash" (cosmetic — reads wrong payment field).
7. Wave 3 remaining: #21 delivery/waybills, #22 photo-proof, #23 SOP workflow, #24 inspector viewer, #26 calendar allocation.

---

## 8. KEY GOTCHAS (so the next session doesn't relearn them)
- **Verify BEFORE deploying to the live till** (diff vs live, minimal sets, demo-first, real-request after restart). Local backend has drifted behind server — never blind-overwrite.
- `payments[0].method` not `paymentMethod`. Production API = `/pos/api/v1` (not `/api`).
- POS grid shows only `inventory.quantity > 0` (client-side filter) AND `status:'active', isActive:{$ne:false}` (server query). New products with 0 stock won't appear on the till (they do show in the stock sheet).
- Sale deduction must hit **`Product.inventory.quantity`** (the grid's source), not just BranchInventory.
- Wellness group is classified **by brand** (`isWellnessBrand`), not category — new wellness products must have a recognised brand or they fall to Cannabis.
- **No `window.prompt`/`alert`/`confirm`** on the POSBANK — kiosk mode suppresses them. Use an in-page modal.
- Till **float default is 0**; day-end recomputes expected (don't trust stored `expectedCash`). Variance >R50 → in-page manager-PIN modal.
- New products need a unique `slug` (unique index) or create throws E11000.
- Voiding must reverse till totals (`quickVoid`) or takings inflate.
- Never inline `JSON.stringify(product)` into onclick — use the product `_id`.
</content>
