# NEXT_SESSION.md — ILCO / Origin (FLOCORE tenant) · cold-resume doc
**Overwrite-in-place. A cold session should resume from THIS FILE ALONE.**
Last updated: 2026-07-26 · Branch `feat/flocore-sso-events` · HEAD `fe8737a`

---

## Project
Tenant **`ilco`** on the FLOCORE mesh. One repo (`~/origin`), two live modules:
| Module | What | Stack | Live URL | Backend |
|---|---|---|---|---|
| **tnt-za** (`ilco-tnt`) | cannabis cultivation Track & Trace | React+TS+Vite / Express+TS / **Prisma+Postgres** | `tntilco.cleva-ai.co.za` | :6000 |
| **origin** (`JIGPOS/newbrand`) | Potchefstroom retail POS | Express / **Mongo** (`origin` db) | `origin.cleva-ai.co.za` | POS **:3008** via `/pos/api/v1`, b2b **:3009** via `/api` |

Server = ssh alias **`tr-api`** (root@154.66.197.199), hosts both + others. pm2: `tnt-za`, `origin-pos`, `origin-b2b`.

## Deploy (server runs from shipped files — NOT git)
- **tnt-za backend:** `cd tnt-za && ./deploy-safe.sh` (build → backup → additive `prisma db push` → pm2 restart → health-check + auto-rollback). Never `--accept-data-loss`.
- **tnt-za frontend:** `npm run build` → tar `dist` → scp → extract to `/var/www/tnt-za/frontend/dist`.
- **origin POS:** live is **NOT git** and has **drifted AHEAD** of `JIGPOS/newbrand`. Edit live files directly (with `.bak` backup), `pm2 restart origin-pos`. Git = **record only** — mirror live→local for changed files (safe direction); never scp local→live blindly.
- **PWA cache:** after any tnt-za frontend ship, bump `tnt-za/frontend/public/sw.js` `CACHE_NAME` (now `origin-tnt-v4`). POS: `login.html`/`stock-sheet.html`/`day-end.html` have NO service worker (only field apps do) → a browser hard-refresh is enough.
- **ALWAYS verify live after deploy:** health/200 + a real login + the exact thing you changed. For POS UI, verify headless with puppeteer (see `~/…/scratchpad/*.cjs`) — a POS JS bug won't surface in tsc.

## What just happened (this session — all pushed)
**Loraine (tnt-za cultivation):**
- Phase 1 — T&H task flood killed (995 per-tray/day tasks → 6 per-room; backlog SKIPPED+audited; "Checklists" nav removed).
- Phase 2 — **inventory module LIVE** (`/inventory`): InventoryItem+InventoryMovement, balance = running sum, 21 real items seeded, stock IN/OUT, chemical batch+expiry register, low-stock/expiry alerts, edits reason+audit.
- Chicken fixes: live count = placed − deaths − **catches** (catches were being ignored); card shows caught.

**Origin POS (owner Ilse onboarding + requests):**
- Created **`ilse@ilcofarming.co.za`** — role `owner`, **Potchefstroom** branch, PIN **884422** (POS login = email+OTP, but OTP email delivery to @ilcofarming.co.za is flaky → gave her a permanent PIN via `verify-pin`). Verified login live.
- Owner/approver roles **no longer need the stock override code** (`approvalCode.js` + `stock-sheet.html`) — login is the authorisation; audit records the person. Cashiers still need a code.
- BRAND field on Add-Product is a free text datalist — you can just TYPE a new brand.
- **Card reconciliation on cash-up** (day-end): optional Speedpoint-batch input → card variance vs system card sales → flags owner review + emails ray@ on mismatch (mirrors cash). Additive/non-blocking.
- Branded **install (A2HS) modal** on `login.html`.
- `.env` chmod 644→**600** on all 3 apps.
- Mirrored these 7 POS files into git (`fe8737a`).

**FLOCORE:** event emit live (both modules); SSO built+dormant; feeding contract answered; gate-collision blocker reported.

## FLOCORE integration state
- **Token:** scoped `tenant:ilco` W32 JWT in `FLOCORE_TOKEN` (+ `FLOCORE_URL=https://fo.flocore.tech`), env-only, gitignored, `.env` 600. Valid to 2027-07-04.
- **Event rail LIVE:** `POST /events/emit` (Bearer, 200). tnt-za → 7 cultivation events; origin → `pos.sale` (amount = NET goods, per 2026-07-01 contract).
- **🔴 BLOCKED ON FO — gate collision:** `/ai/gateway` AND `/documents` require nginx `Authorization: Basic` AND app `Authorization: Bearer` in the one header → no tenant can call them. FO must exempt them (as `/events/emit` is). Blocks the **P0 AI reroute** (5 services still call Anthropic direct; key NOT in git; .env now 600).
- **SSO:** built, deployed **dormant** (`FLOCORE_SSO_ENABLED` default OFF, PIN fallback). Flip blocked on FO provisioning staff FLOCORE identities + Flo's go.
- Comms hub = **`FLOCORE.md`** (repo root); reply in `## Reply`, commit+push.

## Live logins (reference — NEVER put PINs in other tracked docs)
- **tnt-za:** loraine@ilcofarming.co.za/228855 · lou@/113399 · nm@ (Edgar)/700700 · jen@/300300 · keke@/224466 · fm@ (Ray). Aliases: edgar@→nm@, ray@→fm@, lourens@→lou@, ilse@/coenie@→gmail (see [[project_tntza_live_logins]]).
- **origin POS:** ilse@ilcofarming.co.za/884422 (owner) · originbyilcofarming@gmail.com (cashier, branch_assistant) · admin@cleva-ai.co.za. Stock approval codes: owner 880022 / admin 770033 / branch_mgr 660044 (but approver login now bypasses).

## Standing rules / decisions (don't re-litigate)
- Edits requiring change → **mandatory reason + full audit** (who/when/before→after). Conservative about what's editable.
- **Inventory = domain data** (stays tnt-za); **regulated records (CoA/SOP/GMP/SAHPRA) stay in tnt-za, never duplicated to the rail** (FO endorsed).
- **No fake/demo data.** Real 4-month system.
- **Edgar: PARKED — leave him** (Loraine asked to remove; Flo said leave).
- **POS `123456` OTP bypass** (`auth-otp.controller.js:288`, ungated, prod) authenticates ANY email — **flagged, NOT fixed** (Flo: leave POS). 2-min gated fix ready.
- **No Co-Authored-By** trailer. **Live POS = extreme vigilance** (broke the cash-up once this session via a JS ordering bug — caught in headless verify before handoff; fixed).

## Next 3 actions
1. **🔴 TRADE-READY (~2 weeks, top priority)** — prove the farm→pharmacy pipeline to SAHPRA + SAPC (Lane E in WAVES.md; plan `tnt-za/docs/ILCO-TRADE-READY-PLAN-2026-07-28.pdf`). **Start with the PROOF RUN (E0):** live DB has 0 batches / 0 COAs — walk one pilot batch harvest→batch→lab→COA→dispatch→pharmacy→Section-21 dispense. Blocked on pilot-batch source + a real lab result + specialist sign-off on all regulator copy.
2. **Loraine Phase 3** (rooms + batch golden thread) — needs her Scouting/Defoliation fields + auto-deduct OK. NOTE: the batch golden thread directly supports the trade-ready pipeline demo.
3. **Cheap FLOCORE wins / hardening (Flo-gated):** nursery emit; watch hub for gate-collision fix; POS `123456` bypass; strip creds from POS docs.

## Env names
`FLOCORE_TOKEN` · `FLOCORE_URL` · `FLOCORE_SSO_ENABLED`(off) · `FLOCORE_BASIC_AUTH`(SSO only) · `ANTHROPIC_API_KEY`(still direct, pending reroute) · `DATABASE_URL` · `PORT`(6000) · POS `MONGODB_URI`.

See `WAVES.md` for the wave→ticket board.
