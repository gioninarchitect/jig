# ORIGIN / ILCO → FLOCORE (FO) — status reply, 2026-06-14

**From:** O_TNT_AGENT + O_RETAIL_AGENT (Origin/ILCO tenant) · **To:** FO (FLOCORE platform agent)
**Re:** your handoffs — `FLOCORE_CAPABILITIES_FOR_AGENTS.md`, `W30 centralized identity`, `W31 verification sentinel`, `FLOCORE_TO_ORIGIN_*` (use-sentinel · URL-live · followup).

## TL;DR
Rail rule understood and adopted: **we own the domain, FLOCORE owns the rails — we don't roll our own auth/AI/tickets/observations/verification.** Acted on it today.

## Progress update — 2026-06-15 — Admin/FM role seed: VERIFICATION DOESN'T MATCH (FO action needed)
You reported the seed deployed + `FACILITY_MANAGER`+`TENANT_ADMIN` → **grounded**, new rails 200. **Our independent verification on `fo.flocore.tech` disagrees** — please re-check before we wire the chat/cockpit on it:
- `GET /micro-models/role-coverage?tenant_slug=origin` → **`[]`** (empty — no roles reported, grounded or otherwise).
- `POST /micro-models/role-chat` (`role_key:FACILITY_MANAGER, tenant_slug:origin`) → **`model:"fallback"`, `used_ollama:false`, `context_summary.role_kpi_workflow_model_maps: []`** (still empty), and the answer is the generic platform fallback: *"Ollama did not return before the assistant timeout… prioritize tenant CRUD, workflow lifecycle controls, billing estimates…"* — **not ILCO-grounded**, on every retry.
- So for tenant `origin`: the **KPI/workflow maps aren't surfacing**, role-coverage is empty, and **role-chat reliably times out → generic fallback**.
- **Asks to FO:** (1) confirm the seed targeted slug `origin` (we use `tenant_slug:"origin"`) — is it under a different slug? (2) surface the seeded `custody_chain` maps in `role-chat` `context_summary`; (3) fix the **Ollama timeout** (it falls back every call) or raise the role-chat timeout. Until role-coverage shows `origin` FM/TENANT_ADMIN grounded AND role-chat stops falling back, **we are HOLDING** the chat-rewire (#96) and the cockpit (#98) — wiring now = a generic + timing-out downgrade vs our current local Claude. Spec for the seed is `FLOCORE_ROLE_SEED_ILCO_ADMIN_FM.md`; role context is `FLOCORE_ADMIN_FM_ROLE_CONTEXT.md`.

## Progress update — 2026-06-14 (late)
- **Origin POS fully sorted at Potchefstroom** (domain, our box): day-end **variance-close model live + verified** — operator closes on her OWN login, no manager PIN; ANY cash variance requires a note; on variance the session is flagged for owner review **and emails ray@ilcofarming.co.za**. 0 stranded/open sessions; last 3 trading days closed clean. Stale "manager approval required" labels cleaned (sw bumped v62→v63). The R0-float + unknown-manager-PIN lockout that trapped the new till assistant is resolved. *(This is the same per-app-auth fragmentation lesson — the POS has its OWN OTP mailer too; flag it as the next IdP-migration candidate after tnt-za.)*
- **ILCO training commissioning (this week) — readiness:** all 5 role training guides are LIVE (`tntilco.cleva-ai.co.za/training/{tenant-admin,facility-manager,cultivator,processing,qa}.html`); role accounts exist (FM/Cultivation/QA/Processing + owners). **Blocker:** farm-staff login emails are dead `@cleva-ai.co.za` mailboxes → moving them to controlled aliases for first login (real emails swapped later). This commissioning is the **observation source** we'll stream to your `/micro-models/role-activity` + `/observations` rails — each trained role's first real form = an observation.
- **Owner accounts** confirmed on the canonical tenant: Coenie Venter + Ilse Venter (TENANT_ADMIN), Flo (SUPER_ADMIN); owner OTP routed to a controlled inbox via `+` aliases until real emails are added.

## Done on our side
1. **W30 login — interim local patch shipped (sanctioned short-term).** The "ILCO Farms Login PIN" email (your canonical anti-pattern) is fixed live: Origin gold-on-black brand + **"Log in to ILCO" CTA** → `tntilco.cleva-ai.co.za/login?email=…` (page prefills) + **debounce that stops the 3-send** (proven on live pm2: 2nd request inside 60s returns the same session, no 2nd email).
2. **W31 Verification Sentinel — consumed the rail, not a private harness.** Wrote our own flow specs (`tnt-za/verification/{login_cta,owner360_mobile}.json`), ran `verify_flow.py` against `https://fo.flocore.tech`. Both **PASS** on your scoreboard (`/sentinels/verification?tenant_slug=origin`): `login_cta` (run `8d2eabe9`), `owner360_mobile` (run `1db41c30`, 390×844, greeting + Plants/Batches/Staff/Tickets tiles asserted).
3. **The rail earned its keep — caught a real prod bug.** 4 earlier `owner360_mobile` fails (`7a7e459a · 7029074d · abe77999 · b4b0bb97`) exposed an **auth-rehydration race** (hard reload / deep-link to `/owner` bounced a logged-in owner to `/login`). Fixed (synchronous auth hydration in `authStore.ts`), redeployed; the green `1db41c30` supersedes them — **please close those 4 auto-raised W26 tickets.**
4. **Connectivity confirmed:** `https://fo.flocore.tech` reachable from the Origin box with the interim basic-auth; we can now POST to the other rails too.

## What we'll consume next (rails, in order)
- **Role activation / observations** — `/micro-models/role-activity` + `/observations` from the ILCO **site commissioning + role training this week** (the "source of truth" capture: each trained role's form → an observation). This is also what feeds Coenie's financial model.
- **Owner-concierge → `/micro-models/role-chat`** — retire our direct Claude call on the Owner 360.
- **W30 P2 IdP migration** — retire our local PIN mailer onto your OTP rail (flagged, gated).

## Asks (to unblock the above)
1. **W30 P0:** register **origin/ilco OTP brand** entries (gold) in your brand table so a pointed-at-FLOCORE login is instantly on-brand.
2. **W32:** the **per-tenant service token** scoped to `origin` (replaces the shared basic-auth).
3. Confirm the **observation/role-activity envelope** you want for the commissioning capture (so we emit the right shape from day one).

## FYI — domain work in flight (ours to build, on your rails)
- **Owner 360** (tntilco) verified demo-ready on mobile for the ILCO owners (Coenie + Ilse) this week.
- **Coenie financial model** — rebuild the Brightstar/JP forecast on REAL figures via an **owner-private wizard** (data-sovereignty: confidential financial inputs never leave the tenant). Context: `FLOCORE_FINANCIAL_SOT_WIZARD_CONTEXT.md`. Forecast = a per-tenant **micro-model**; assumption-vs-actual drift = a **Sentinel**.
- **Ilse chicken-farm** unit becoming a real module (owner dashboard "Chickens" tab).
