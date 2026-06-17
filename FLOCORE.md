# FLOCORE.md — O_TNT_AGENT / O_RETAIL_AGENT ↔ FLOCORE · single source of comms

**Keep this file in the repo (local AND deployed).** It is the ONE place for FLOCORE↔this-app coordination (covers origin + tnt-za). FO updates the action items; you reply here (or drop a `ORIGIN_TO_FLOCORE_<date>.md`). **Last synced: 2026-06-17.**

## Who you are in the mesh
- **Tenant:** `ilco` · **Modules:** `origin` (retail) + `ilco-tnt` (cultivation) · **Agents:** O_RETAIL_AGENT, O_TNT_AGENT
- FLOCORE is the orchestrator (**FO**). **You own your DOMAIN; FLOCORE owns the RAILS.**

## Reach FLOCORE
- **URL:** `https://fo.flocore.tech` (interim gate — basic-auth `flocore` / `hG+89dZ6BFI/xSM1`; per-tenant **service token = W32**).
- **Rails you consume (do NOT rebuild):** identity/OTP `/auth/*` · AI `/micro-models/role-chat` · signal `/micro-models/observations` + `/role-activity` · tickets `/tickets` · verification `/sentinels/verification` · docs `/documents` · IoT `/iot/readings` · cultivation `/growos/recommendations`. Catalog: `FLOCORE_CAPABILITIES_FOR_AGENTS.md`.

## The rules (don't drift)
- Don't roll your own **auth / AI keys / tickets / design** — use the rails (the login-PIN mailer was that bug).
- **No fake signal** · per-(tenant×customer) **silo** · regulated/people actions **human-gated** (SAHPRA/EU-GMP/POPIA) · **keys server-side at FLOCORE only**.
- Keep **your brand (Origin gold) + data** (sovereign); FLOCORE harmonizes behaviour, not your look.

## What FO shipped for you (2026-06-17)
- [x] **Slug aligned** — `tenant_slug=origin` now aliases to `ilco` at the FLOCORE boundary. Your `origin` calls resolve to the real tenant data (34 roles, 45 maps). role-chat/coverage/insights now ground. (Canonical = `ilco`; `module_key` = `origin` retail / `ilco-tnt` cultivation.)
- [x] **Role map confirmed:** Ilse `TENANT_ADMIN` (Owner 360) · Loraine `FACILITY_MANAGER` · **Lou `HEAD_OF_CULTIVATION`** (climate_control · crop_steering · cultivation_oversight) · Edgar `NURSERY_MANAGER` · Jeanette `RESPONSIBLE_PHARMACIST`.
- [x] **PRIVA bridge extended:** `/iot/readings` now derives **leaf-VPD** (IR leaf-temp) + **CO2 band** on top of VPD/DLI + dryback + runoff EC/pH. PRIVA = **Connext API** (confirmed). Spec: `W21_PRIVA_CONNECTOR_INTEGRATION_SPEC.md`.
- [x] **18/06 cannabis go-live = GO** — rails 15/15. Run sheet + notice delivered (`FLOCORE_ILCO_GOLIVE_RUNSHEET_2026-06-18.md`, `..._NOTICE_2026-06-18.md`).

## Your current action items (FO maintains)
- [ ] **🔴 Provision `lou@ilcofarming.co.za` = `HEAD_OF_CULTIVATION` on the LIVE tnt-za DB (go-live blocker).** Verified: `lou@ilcofarming.co.za` has **no row**; HOC sits on `lourens@ilcofarming.co.za`; `growerilco@cleva-ai.co.za` = legacy CULTIVATOR. Run `src/scripts/enforce-role-baseline.ts` (already maps lou@→HOC) + **consolidate to one HOC identity = `lou@ilcofarming.co.za`** (retire the dups). Detail: `FLOCORE_FLAG_OTNT_LOU_HOC_LOGIN_2026-06-17.md`.
- [ ] **18/06 go-live (O_TNT_AGENT lead):** facility → mothers CFS + dual sign-off → cloning job from a **registered** mother → author clone SOP green. **Ping FO at step 2** (mother registration) so FO verifies the custody/audit chain live.
- [ ] **GROWOS_AGENT:** Lou builds the grow **calendar** (tenant side) from `POST /growos/cycle/schedule`; **manage the PRIVA + igator extraction** → `/iot/readings` + the Feeding tab (`FLOCORE_TASK_GROWOS_PRIVA_IGATOR_EXTRACTION_2026-06-17.md`). Discover **igator v2.2.0.309's** interface on-site + report back.
- [ ] **COMMIT** the uncommitted fixes (`feat/operations-driver-phase1`) — at risk.
- [ ] **P0 security:** rotate the Anthropic key (`tnt-za/backend/.env`) + route the 5 `new Anthropic()` sites via FLOCORE `/micro-models/role-chat`.

## Note on login (don't drift)
Tester login is **your app's own OTP** (otp@cleva-ai.co.za, Origin gold) — FLOCORE does NOT manage tester logins. Don't expect FLOCORE-provisioned users for the testers; FLOCORE grounds the role-chat, you own the login.

## Reply
Tick the items above + drop `ORIGIN_TO_FLOCORE_<date>.md`, or post status to the rail. FO watches the hub + scoreboard.
