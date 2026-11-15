# NEXT_SESSION.md · ILCO / Origin (FLOCORE tenant) · cold-resume doc
**Overwrite-in-place. A cold session should resume from THIS FILE ALONE.**
Last updated: 2026-09-23 · Branch `feat/flocore-sso-events` · HEAD `e15d70a`

## Promo voucher build (Ilse), 2026-09-23
Old Khaki style loyalty is phase 2. Phase 1 = product promo voucher + shareable link. Spec: `JIGPOS/newbrand/docs/PROMO-VOUCHER-PHASE1-SPEC-2026-09-22.md`. Grounded finding: a Voucher model + `/api/v1/vouchers` CRUD already existed but had NO till reader, no owner UI, no product targeting, no link/QR.
- **2026-10-02 per-product CTA LIVE:** shared `promo-widget.js` (branded discount modal, posts to /vouchers, shows code+QR+link+WhatsApp). "Create promo" button now sits next to every product on BOTH `promos.html` (searchable product list, replaced the dropdown) and `stock-sheet.html` (per-row Promo button, 243 products). Both verified headless (login, click, generate). Static-file deploys (scp) work; test vouchers cleaned.
- **Stages 1 + 2 LIVE and verified:** owner screen `https://origin.cleva-ai.co.za/promos.html` (Ilse picks a product, sets discount, generates code + QR + shareable link `promo.html?v=<slug>` + WhatsApp share; list with issued/redeemed + deactivate). Customer landing `promo.html` on-brand + mobile-clean. Product-scoped discount + Section-21 block proven with real API calls. Files LIVE: `backend/modules/database/models/Voucher.js`, `backend/controllers/vouchers.controller.js`, `backend/routes/vouchers.js`, `promo.html`, `promos.html` (all deployed with `.bak-20260922-151547`). Test vouchers cleaned from DB.
- **Stage 3 (till redemption) BUILT + unit-proven, DEPLOY PENDING (after trading close, Flo's call):** wires voucher into checkout money path. Files ready in scratchpad `voucher-audit/`: `pos.controller.js` (createSale: server-authoritative validate + `distributeVoucherDiscount` onto matching lines + redeem after save), new `backend/services/voucherDiscount.js` (pure, 9/9 tests), `frontend/pos-checkout.js` (voucher field injected into payment modal at runtime, effective total on cash/split, `voucherCode` in both saleData). Deploy with `voucher-audit/deploy-stage3.sh` AFTER close, then prove a real sale + void. NOT yet on live. Mirrored into repo as record only.
- Owner gate broadened to admin/super_admin/owner. Voucher class field separates promo (short expiry OK) from future paid gift cards (CPA 3yr).


---

## Project
Tenant **`ilco`** on the FLOCORE mesh. One repo (`~/origin`), two live modules:
| Module | What | Stack | Live URL | Backend |
|---|---|---|---|---|
| **tnt-za** (`ilco-tnt`) | cannabis cultivation Track & Trace | React+TS+Vite / Express+TS / **Prisma+Postgres** | `tntilco.cleva-ai.co.za` | :6000 |
| **origin** (`JIGPOS/newbrand`) | Potchefstroom retail POS | Express / **Mongo** (`origin` db) | `origin.cleva-ai.co.za` | POS **:3008** via `/pos/api/v1`, b2b **:3009** via `/api` |

Server = ssh alias **`tr-api`** (root@154.66.197.199), hosts both plus others. pm2: `tnt-za`, `origin-pos`, `origin-b2b`.

## Deploy (server runs from shipped files, NOT git)
- **tnt-za backend:** `cd tnt-za && ./deploy-safe.sh` (build, backup, additive `prisma db push`, pm2 restart, health-check plus auto-rollback). Never `--accept-data-loss`.
- **tnt-za frontend:** `npm run build` → tar `dist` → scp → extract to `/var/www/tnt-za/frontend/dist`.
- **origin POS:** live is **NOT git** and has **drifted AHEAD** of `JIGPOS/newbrand`. Edit live files directly (with `.bak` backup), `pm2 restart origin-pos`. Git = **record only**: mirror live→local for changed files (safe direction); never scp local→live blindly.
- **POS `.env` lives at `/var/www/origin/pos/.env`** (NOT backend/.env). SMTP = mail.cleva-ai.co.za:465; POS now authenticates as the working `superilco@cleva-ai.co.za` account (origin@ creds went stale, broke sends Aug 12; superilco verified sending).
- **PWA cache:** after any tnt-za frontend ship, bump `tnt-za/frontend/public/sw.js` `CACHE_NAME` (now `origin-tnt-v4`). POS: `login.html`/`stock-sheet.html`/`day-end.html` have NO service worker (only field apps do), so a browser hard-refresh is enough.
- **ALWAYS verify live after deploy:** health/200 plus a real login plus the exact thing you changed. For POS UI, verify headless with puppeteer (see `~/…/scratchpad/*.cjs`): a POS JS bug will not surface in tsc.

## What just happened (session 2026-09-21, all shipped and verified live)
**Origin POS: Ray off every email path (client-relationship P0).**
- Ray (ray@ilcofarming.co.za / ray@ilcofarms.co.za / alias fm@ilcofarming.co.za) kept getting a "stock on hand" email. Root cause = the 07:30 `stranded-products-check.js` cron mailing the shared shop Gmail `originbyilcofarming@gmail.com`, plus report defaults on that mailbox.
- Fixed: `stranded-products-check.js` default recipients → `['ilse@ilcofarming.co.za','florisolivier7@gmail.com']` (honors STRANDED_REPORT_TO); `pos.controller.js` z-report default recipients → Ilse; variance alert → Ilse (commit 0f1ef8a). Order confirmations go to customer.email only; OTP to the requester only.
- Guard added: `scripts/check-email-recipients.sh` fails if any ray@ address or the shop Gmail appears as a recipient in `JIGPOS/newbrand/backend`. Passes now; proven to fail on an injected ray@ recipient. (commit e15d70a)
- Live log truth: last sends to the shop Gmail were the 20 Sep + 21 Sep 07:30 stranded reports, BOTH before the 17:18 fix. Cashier account logs in 973 times by PIN vs 2 OTP emails, so no meaningful mail flows there day-to-day.
- **OPEN, not urgent:** shop Gmail `originbyilcofarming@gmail.com` is the till login account and NOBODY at the business holds its password (only signed in on the shop POS machine). Our code no longer mails it. To kill the last theoretical OTP path, migrate the Potch cashier POS account onto a business-owned mailbox (cannot use ilse@ due to owner-account collision). Awaiting Flo's go.
- **Ilse is now the POS main contact.** Brief only Flo on this matter (not Ray/Ilse/client).

**Origin POS: other live fixes.**
- CLOSE SHIFT 500: `calculateDenominationTotal` NaN on a missing denomination key, fixed with `const n=(v)=>Number(v)||0`. (commit 6629ce0)
- `getActiveTill` no-store cache header: stale "shift left open" banner could persist after a fix. (commit 653ce69)
- Verified Ilse can cash up (drove day-end headless end-to-end).

**Deliverables (local PDF, full branded cover page, on Desktop + in repo docs):**
- `JIGPOS/newbrand/docs/ORIGIN-QA-PROCESSING-AUTOMATION-2026-09-11.pdf` (client, Coenie Venter): automate the QA + Processing Manager roles on ILCO-TnT.
- `JIGPOS/newbrand/docs/ORIGIN-FLOCORE-QA-PM-AUTOMATION-BRIEF-2026-09-11.pdf` (FLOCORE-facing: rails we consume + asks).
- `JIGPOS/newbrand/docs/ORIGIN-VOUCHER-LOYALTY-QUOTE-2026-08-24.pdf` (R5000 voucher/loyalty CRM quote).
- Standing deliverable rules reinforced this session: PDF not markdown; full branded cover page 1; no em-dashes.

**Demo:** Potch POS demoed to a new client. Super-admin demo login = florisolivier7@gmail.com + permanentPin 000006. Open demo session cleared afterward.

## FLOCORE integration state
- **Token:** scoped `tenant:ilco` W32 JWT in `FLOCORE_TOKEN` (+ `FLOCORE_URL=https://fo.flocore.tech`), env-only, gitignored, `.env` 600. Valid to 2027-07-04.
- **Event rail LIVE:** `POST /events/emit` (Bearer, 200). tnt-za emits 7 cultivation events; origin emits `pos.sale` (amount = NET goods, per 2026-07-01 contract).
- **BLOCKED ON FO, gate collision:** `/ai/gateway` AND `/documents` require nginx `Authorization: Basic` AND app `Authorization: Bearer` in the one header, so no tenant can call them. FO must exempt them (as `/events/emit` is). Blocks the P0 AI reroute (5 services still call Anthropic direct; key NOT in git; .env 600).
- **SSO:** built, deployed **dormant** (`FLOCORE_SSO_ENABLED` default OFF, PIN fallback). Flip blocked on FO provisioning staff FLOCORE identities plus Flo's go.
- Comms hub = **`FLOCORE.md`** (repo root); reply in `## Reply`, commit+push.

## Live logins (reference. NEVER put PINs in other tracked docs)
- **tnt-za:** loraine@ilcofarming.co.za/228855 · lou@/113399 · nm@ (Edgar)/700700 · jen@/300300 · keke@/224466 · fm@ (Ray). Aliases: edgar@→nm@, ray@→fm@, lourens@→lou@, ilse@/coenie@→gmail (see [[project_tntza_live_logins]]).
- **origin POS:** ilse@ilcofarming.co.za/884422 (owner, now the POS main email contact) · originbyilcofarming@gmail.com (cashier, branch_assistant; till login, no business-held password) · admin@cleva-ai.co.za · florisolivier7@gmail.com/000006 (super-admin demo). Stock approval codes: owner 880022 / admin 770033 / branch_mgr 660044 (approver login now bypasses).

## Standing rules / decisions (don't re-litigate)
- **Deliverables:** local PDF only (never markdown, never external artifacts), full Origin-branded cover page 1, no em/en dashes. See [[feedback_never_deliver_markdown]], [[feedback_deliverables_branded_cover]].
- **Ray gets NO POS email.** Reports → Ilse, orders → customer, cashier → PIN. Guard enforces it in code. Brief only Flo on it.
- Edits requiring change → **mandatory reason + full audit** (who/when/before→after). Conservative about what's editable.
- **Inventory = domain data** (stays tnt-za); **regulated records (CoA/SOP/GMP/SAHPRA) stay in tnt-za, never duplicated to the rail** (FO endorsed).
- **No fake/demo data.** Real 4-month system.
- **Edgar: PARKED, leave him** (Loraine asked to remove; Flo said leave).
- **POS `123456` OTP bypass** (`auth-otp.controller.js:288`, ungated, prod) authenticates ANY email: flagged, NOT fixed (Flo: leave POS). 2-min gated fix ready.
- **No Co-Authored-By** trailer. **Live POS = extreme vigilance** (verify BEFORE deploy vs live, minimal diffs, prove on demo, real-request check after every restart). Never handle/expose passwords in plaintext; I deploy via SSH key, only passwords are blocked.

## Next actions
1. **Promo voucher Stage 3 deploy (till redemption), Flo-gated, AFTER trading close.** Built + unit-proven (9/9 + 12/12), NOT on live. Run `voucher-audit/deploy-stage3.sh` (in session scratchpad; also mirrored to repo), then prove one real sale carrying a voucher and VOID it, and verify a normal no-voucher sale still totals correctly. Files: `pos.controller.js`, new `backend/services/voucherDiscount.js`, `frontend/pos-checkout.js`. Then: phase 2 = Old Khaki cashback-as-voucher loyalty. See [[project_origin_promo_vouchers]].
2. **Cashier-account email migration** off the shop Gmail (see OPEN above): pick a business-owned mailbox that can receive OTP, move the Potch cashier POS account onto it. Flo-gated.
3. **TRADE-READY pipeline** (Lane E): E0 proof run done both sides (farm + pharmacy, verified live). Next = **E0c**: wire batch/COA/section21DocumentId onto the dispensed Order. Plan `tnt-za/docs/ILCO-TRADE-READY-PLAN-2026-07-28.pdf`.
4. **QA/PM automation build** if the client re-engages (proposal + FLOCORE brief already delivered). Optionally vendor the anti-pattern guard into a pre-commit hook (flocore-12 asked; core.hooksPath not set in origin repo).

## Env names
`FLOCORE_TOKEN` · `FLOCORE_URL` · `FLOCORE_SSO_ENABLED`(off) · `FLOCORE_BASIC_AUTH`(SSO only) · `ANTHROPIC_API_KEY`(still direct, pending reroute) · `DATABASE_URL` · `PORT`(6000) · POS `MONGODB_URI` · POS `STRANDED_REPORT_TO` (recipient override for the 07:30 cron).

See `WAVES.md` for the wave→ticket board.
