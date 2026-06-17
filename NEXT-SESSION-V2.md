# Next Session — Ecosystem Handover (v2)

**Updated:** 2026-06-14 · **Scope:** the full Origin / ILCO ecosystem (not just the POS).
**Start here**, then drill into the doc you need. Live wave status: `tnt-za/docs/WAVE-WORKSHEET.md`. Scope refresh: `SCOPE-2026-06-14-ILCO.md`.

---

## ⭐ SESSION UPDATE — 2026-06-14 (read this first)

**FLOCORE is the orchestrator/IdP for ALL projects — we own the DOMAIN, FLOCORE owns the RAILS.** Don't roll our own auth/AI/tickets/observations/verification. Brief: `~/FLOCORE/docs/FLOCORE_CAPABILITIES_FOR_AGENTS.md`; our reply: `ORIGIN_TO_FLOCORE_STATUS_2026-06-14.md`; standing rule in memory `feedback_flocore_owns_rails`.
- **Live FLOCORE URL (reachable from Origin box):** `https://fo.flocore.tech` — interim basic-auth (creds in `FLOCORE_TO_ORIGIN_FLOCORE_URL_LIVE_2026-06-14.md`; use `FLOCORE_BASIC_AUTH` env; W32 per-tenant tokens will replace it). All rails at root.
- **W31 Verification Sentinel (live):** WE write flow specs (`tnt-za/verification/*.json`), FLOCORE runs `verify_flow.py` + records to `/sentinels/verification` + auto-raises a W26 ticket on fail. Origin `login_cta` + `owner360_mobile` **PASS**. Use this for "beyond-200" rendered/CRUD verification, not a private harness.

**🌿 Owner 360 dashboard — demo-ready for Coenie & Ilse this week** (`https://tntilco.cleva-ai.co.za`; login `florisolivier7+coenie@gmail.com` / `+ilse@`, OTP → Flo's inbox via aliases; real emails swapped in later):
- Verified at 390px: "Good evening, Coenie" + live tiles (Plants 50 · Batches 1 · Staff 12 · Open Tickets 17) + concierge + radar. On-brand, responsive.
- **Real bug caught+fixed by W31:** auth-rehydration race bounced a logged-in owner to /login on reload/deep-link → fixed (`authStore.ts` synchronous hydrate), redeployed.
- Owner accounts: Coenie Venter + Ilse Venter = TENANT_ADMIN; Flo = SUPER_ADMIN. Remaining demo polish: **#87** (hide lone "Assets 0", add GMP/SMF-ready tile).

**🔑 Login email (W30 P0) — patched live:** Origin-branded + "Log in to ILCO" CTA + debounce stops the 3-send. Strategic migration to FLOCORE IdP = **#94** (needs FLOCORE P0 origin/ilco OTP brand reg + W32 token).

**🟢 Origin POS:** Email-Takings-Report recipient bug fixed (#85, live). **Day-end variance lockout** root cause = till opened with R0 float + manager-PIN nobody had (123456) → stranded shift cleared, threshold raised then **superseded**. Agreed model = **operator closes on own login + mandatory note on ANY variance + owner review + email ray@ilcofarming.co.za** — **BUILD PENDING (#92)**. Memory `project_pos_variance_close`.

**📊 Coenie financial model (#90):** Brightstar/JP forecast built on FAKE forecast inputs (real history FY24 R6.5m break-even → assumed R25.6m @ 54% margin). Plan: keep the engine, **rebuild on REAL figures via an owner-PRIVATE wizard** (pre-fill from TnT+POS; confidential lines owner-entered, tenant-vaulted; never shared to dev). Context `FLOCORE_FINANCIAL_SOT_WIZARD_CONTEXT.md`; Coenie explainer PDFs EN+AF. **Decisions D3 (sovereignty)/D4 (Excel-first, rec)/D5 (build FM-cost + Processing weigh feeds).**

**🐔 Ilse chicken-farm module (#91):** Ilse (co-owner) runs a real chicken farm — Owner-360 "Chickens" tab must become a real unit (needs discovery: flock/feed/eggs/mortality/sales).

**🔗 W8.2 shipped:** calendar connector now fires the ACTUAL due form (instantiates a Task from the matching TaskTemplate + links the ticket) with conservative keyword match + generic fallback.

**The thread:** the site commissioning + FM/Cultivation/Processing/QA training THIS WEEK is how real data starts flowing → each trained role's form feeds an owner-dashboard tile AND a Coenie-model input (→ FLOCORE observations). New tasks **#86–#94**.

---

## ⭐ SESSION UPDATE — 2026-06-10/11 (read this first)

**Deploy reality (critical):** live boxes are **NOT git**; they run from compiled `dist/` (tnt-za) / `scp`'d static (POS). Never `git push`-to-deploy. tnt-za now has a **safe deploy** path: `tnt-za/deploy-safe.sh` (build → backup → additive `db push` *no data-loss* → restart → health check → auto-rollback; **never** the old `deploy.sh`, which does `--accept-data-loss` + user reseed). POS = `scp` static + bump `sw.js` vNN + verify; see [[memory]] `project_active_folders_deploy`. Live tnt-za canonical tenant = `94460d80…` (a 191-row ghost-tenant split was found + consolidated — `project_tntza_canonical_tenant`).

**🌿 TnT-ZA — shipped live this session (via deploy-safe.sh, verified):**
- **Training:** Processing + QA guides live (`tntilco.cleva-ai.co.za/training/…`); farm email delivery enabled (set each staff member's REAL email on activation — `@cleva-ai.co.za` mailboxes are dead).
- **Operating system live:** calendar→ticket connector · Operations Driver heartbeat · failed-SOP→remedial-training loop.
- **Wave 7 (compliance spine):** 7.1 sign-off rail-guard (compliance ticket can't close w/o RP/AR sign-off+evidence) · 7.2 SLA escalation on heartbeat · 7.4 hash-chained audit on every close/sign-off/reopen. *(7.3 competency gate pending — cleaner after W8 wires work→SOP.)*
- **Wave 8:** 8.1 — 19 **real ILCO cultivation forms** loaded as recurring TaskTemplates (real paper columns as checklist items, EU-GMP cited); 36 "EU GMP …" placeholders deactivated.
- **Wave 9:** 9.1 — `ComplianceControl` evidence graph 0→19 (24 form→EudraLex links; 3 mortality flagged `NEEDS_SPECIALIST_SIGNOFF`).
- **Wave 10 (resilience):** 10.1 data-integrity self-check (orphan-tenant detector, boot+heartbeat) · 10.2 tenant-resilient automation (derive tenants from data).
- Docs: `tnt-za/docs/cultivation-forms-digitization.md` (17-form catalogue + EU-GMP tie-back) · `tnt-za/docs/WAVE-WORKSHEET.md` (deploy-ready status).
- **Pending waves:** 7.3 · 8.2 (connector fires the actual form) · 8.3 (mortality weight/batch/tag — needs a **frontend** deploy path, not yet set up) · 8.4 (cloning screen) · 9.2 (inspection-pack readout) · 10.3–10.6.

**🛒 Origin POS — shipped live this session:**
- **Day-close bug fixed** — sales now blocked without an open shift for *today* (was rolling trade onto yesterday's session, sessions bleeding across days). Frontend guard, sw v59.
- **Tab-jump fixed** — product tab no longer resets to "All" on the 30s auto-refresh, sw v60.
- **Ray's report** — `JIGPOS/newbrand/ray-pos-report.{html,pdf}` (plain-English: the fixes + her daily rhythm).
- **Missing tea fixed** — Red Hibiscus had 0 *branch* stock at Potch (catalogue stock 12) → hidden by the branch-scoped till. Gave it branch stock + published it.
- **Stranded-product detector** — daily 07:30 cron (`backend/scripts/stranded-products-check.js`) emails the owner if any active product is hidden from the till (0 branch stock) or store (unpublished). Found **37 active-but-unpublished** products (a decision for you — publish online or not).

**Open owner decisions:** (1) POS variance-lockout — Ray's `480627` can't self-approve a >R50 close (only manager `123456`); policy call. (2) The 37 store-hidden POS products — publish or leave. (3) tnt-za server-side EOD auto-close (structural, deferred). (4) FLOCORE D1/D2 (auth + security owner) still open.

---

## 0. The ecosystem in one picture

```
FLOCORE (parent platform · /Users/florisolivier/FLOCORE)
  └─ Tenant: "Origin / ILCO Farming"  (sibling of KCS)
       ├─ Module: Origin (newbrand)      → POS & Retail / Patient sales   [O_RETAIL_AGENT]
       │     Node/Express · MongoDB · PM2 (origin-pos:3008, origin-b2b:3009) · origin.cleva-ai.co.za
       ├─ Module: ILCO-TnT (tnt-za)       → Cannabis Track & Trace          [O_TNT_AGENT]
       │     Express+TS+Prisma · Postgres · Vite/React · tntilco.cleva-ai.co.za
       └─ GroOS (separate app, owner+Lourens — Head-of-Cultivation; NOT a TnT dashboard)

AI operating system (designed; Phase-1 of the runtime shipped):
  distil (Claude) → MICRO-MODEL (intelligence layer) → drives DASHBOARD + CHAT
       → two feedback loops (machine self-learn + human CAPA→training) → SENTINELS govern
```

**Dispatch the right agent:** `.claude/agents/O_RETAIL_AGENT.md` (POS/retail) · `O_TNT_AGENT.md` (farm/track-&-trace). Each carries its module's stack + hard rules.

---

## 1. Module: Origin Retail (newbrand) — LIVE, trading
Potchefstroom till live; SW cache **v58**; owner PIN **480627** (role `branch_assistant`). Deploy = `scp` to `/var/www/origin/pos/…` + `pm2 restart origin-pos` (verify with a real request after). More POS detail in `NEXT-SESSION-POS.md` §0.5/§0.6.

**🟢 Origin Retail POS updates shipped today (all LIVE on origin.cleva-ai.co.za):**
1. **Branch-inventory fix (the big one)** — the till is **branch-scoped**; products only show with a `branchinventories` row. `stockmanage.createProduct` now auto-creates that row for non-online branches; **backfilled 4 orphan products** (Healing Salve, Bio Sculpture x2). This was the cause of Ray's "added products don't appear."
2. **Reports button** added to the till header (managers/owner) → `reports.html` (was built but unlinked).
3. **Email Takings Report to stakeholders** — recipient modal on `reports.html` + backend `emailRange`/`recipientsGet/Set` (persist per branch in `reportRecipients`); branded HTML + CSV attachment. (emailService throws on SMTP fail — not swallowed; SMTP working.)
4. **Float fix** — `pos-shifts.js` open-till + expected-cash defaulted to **R500** (`|| 500`) → fixed to **R0**; corrected the live open session.
5. **Takings report cleaned** — now excludes `isTest:true` sales; **flagged 9 pre-launch test sales** (3 on Jun-1 + 6 pre-June) → report dropped from inflated R6,645 to true **R2,176**.
6. **Card reconciliation vs Capitec batch settlements** — 3 Jun (R802) + 4–5 Jun (R740) tie to the cent; **1–2 Jun pending Ray's terminal list** (bank R332/R20 vs POS).
7. **Day-end incident resolved** — Ray's close succeeded but showed no confirmation → she rang a R10 *card* sale after close → no open shift to close. Re-opened + closed clean (R40, by-date report correct). Real gaps logged **#50** (clear close confirmation · block sale-after-close · "no open shift" message).
8. **SW cache bumped v55 → v58** across the session so every till pulled fresh assets (brand-first wellness + images + the above).
9. **nginx `/pos/` trap documented** — `/pos/<static>` silently serves the marketing index; the real POS is at ROOT paths (`/pos.html`, `/frontend/…`, `/reports.html`). Keep links relative; deploy to `/var/www/origin/pos/…`.

**Hard gotchas (carry forward):** branch-scoped till (`branchinventories` row required) · `/pos/` ROOT-path trap · `payments[0].method` · VAT **inclusive** · no `window.prompt` on the kiosk (use branded modals) · **verify-before-deploy on the live till** (diff vs live, minimal sets, real request after restart).

**Network onboarding (LIVE):** `origin-onboarding.html` (admin-gated wizard + doc gate) + `origin-outlets.html` (review → Verify & activate, seeds catalogue) + `onboarding.controller`. **Röscher Pharmacy, Kroonstad** queued (pending). ⚠ Do the **gap-A fix** (`/online/` branch regex, #59) BEFORE activating Röscher.

**POS open/next:** #50 day-end hardening · #59 gap-A (before Röscher) · #43 Capitec upload (awaiting CSV) · #44 void/refund reason picker · #9 product images · Ray's 1–2 Jun terminal list.

## 2. Module: ILCO-TnT (tnt-za) — Operations Driver Phase 1 SHIPPED
- **⚙️ BUILT today, backend-verified, NOT committed:** the Operations Driver close-the-loop.
  - `DriverItem` model (via `prisma db push` — repo uses db push, not migrations) · `driver.service.ts` (rules engine: 18 drivers from real seed data, idempotent) · `driver.scheduler.ts` (boot + 15m tick + event listeners) · `/api/driver/queue(/me)` (auth-gated) · `ActionQueueWidget.tsx` on the dashboard · emits `driver.item.created` for FLOCORE.
  - **Resume:** eyeball the dashboard card live (`cd tnt-za/frontend && npm run dev` + login) → then **commit** the 8 files. Backend on PORT **3002** (`.env`).
  - Plan: `tnt-za/docs/superpowers/plans/2026-06-06-operations-driver-phase1.md`.
- **Already-built engine to reuse (don't rebuild):** general-ops (per-role chat, 15+ roles) · maestro (intent) · owner-concierge · kpi.service · smart-tickets · sop-governance · worldModel · anomaly · eventBus · shift.
- **Role gap analysis:** `tnt-za/role-activation-gap-analysis.html` — blockers: daily-check backend, QA-decision endpoint, S21 dispensing. Roles: FM · Nursery Mgr/Staff · Cultivation Mgr/Head Grower · Processing · QA · RP.

## 3. The AI operating system (designed — the big arc)
Read in this order:
1. `tnt-za/docs/operations-driver-design.md` — the runtime (Sense→Evaluate→Act→Surface). Phase 1 shipped; Phase 2 = ACT (FLOCORE drives it).
2. `tnt-za/docs/tenant-distillation-pipeline-design.md` — vertical→roles→**micro-model**→dashboard+chat→**Sentinel governor**; **compliance firewall** (regulatory = RAG-grounded + specialist sign-off, never free-gen); §6 resilient/future-proof/**self-learning**; §4.6 **human remediation loop** (SOP violation → CAPA → targeted training → competency). #58 to build.
3. `tnt-za/docs/academy-build-plan.md` (#52) · `tnt-za/docs/bug-assistant-spec.md` (#53) · the `in-app-feedback-assistant` skill.
- **Aligned to FLOCORE's canonical docs** (MICRO_MODEL_DISTILLATION, SENTINEL_NETWORK_ARCHITECTURE, MODEL_STRATEGY): micro-model = intelligence layer (not a model-file/user); Ollama **batch-only** (gemma-4-E4B, no GPU), Claude interactive.

## 4. FLOCORE integration
- **Done:** `FLOCORE_INTEGRATION_RESPONSE.md` (both repos) · `FLOCORE_ORCHESTRATOR_RECOMMENDATION.md` · `FLOCORE_AI_ARCHITECTURE_FEEDBACK.md` · `tnt-za/FLOCORE_OPERATIONS_DRIVER_CONTEXT.md`.
- **Model:** our modules sense/evaluate/surface; **FLOCORE drives the actions** (serviceops/business-rules) from our `driver.item.created` events; Sentinels govern.
- **⏳ OPEN (owner — Floris):** **D1** auth model (recommend: keep own + FLOCORE service-token) · **D2** name the security sign-off owner. Then: formal module-manifest doc (#55) + FLOCORE returns the deploy brief (ports, event envelope, MM registry, sentinel ingestion).

## 5. Standing rules (memory — honour them)
Branded in-page dialogs only (never native) · **no over-engineering = no over-scoping** · always full URLs · **exhaustive scenario coverage** (surface every edge case; build only confirmed) · use `shipping-verified-frontend` / `verified-delivery` / `html-to-pdf` · no unverified regulatory copy · verify-before-deploy on the live POS. Memory index: `~/.claude/projects/-Users-florisolivier-origin/memory/MEMORY.md`.

## 6. Top of next session (prioritised)
1. **Commit + visually verify** Operations Driver Phase 1 (tnt-za).
2. **gap-A fix** (#59) → then **onboard Röscher live**.
3. **#50** day-end hardening (POS).
4. **FLOCORE D1/D2** decisions → module-manifest doc (#55).
5. Then choose: Operations Driver **Phase 2** (FLOCORE-driven ACT) · Academy build (#52) · Capitec upload (#43) · farm-team training (#51).

_Tasks #1–#59 hold the full backlog. Brand: gold-on-dark, lockup **ORIGIN / by ILCO Farming**, no emoji._
