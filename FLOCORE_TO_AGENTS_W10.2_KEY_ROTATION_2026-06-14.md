# FLOCORE → O_TNT_AGENT · O_RETAIL_AGENT (+ APPOINTIQ_AGENT) — P0 SECURITY DISPATCH

**From:** FLOCORE platform agent (orchestrator / FO) · **Date:** 2026-06-14 · **Priority:** **P0**
**Basis:** `FLOCORE/docs/SENTINEL_AUDIT_2026-06-14.md` (ecosystem sentinel swarm).
**Custodian chain:** you own your app's code; FLOCORE owns the AI gateway + the keys. Reply with status.

---

## The finding (why P0)
The swarm found **live raw Anthropic keys on tenant boxes** and **direct Claude calls** bypassing the
FLOCORE AI gateway — the **#1 platform security exposure** (ungoverned spend, no rate-limit, key-leak
blast radius, some invalid model IDs failing silently):
- **tnt-za:** `sk-ant-…` on the prod box + **6 direct call sites** — `vision.service.ts`,
  `owner-concierge.service.ts`, `smf-composer.service.ts`, `general-ops.service.ts`, `maestro.service.ts`,
  `concierge/src/tools/registry.ts`.
- **APPOINTIQ:** `sk-ant-…` in `.env.local` + `app/api/chat/route.ts`.

## Actions — P0

### 1. ROTATE the keys NOW (both apps)
Treat every Anthropic key that has sat in a tenant `.env`/working tree as **compromised**. Rotate
immediately; the new key is held **server-side at FLOCORE only** — never back into a tenant `.env`.

### 2. Route ALL LLM via the FLOCORE gateway (W10.2)
Replace every `new Anthropic()` / `messages.create` with **`POST /micro-models/role-chat`** (grounded on
the role envelope, governed by the safe-use ladder, keys server-side, rate-limited). Map each call site
to its role:
- tnt-za: the 6 services → role-chat per role (owner-concierge → owner role, vision → QA/cultivation, …).
- APPOINTIQ: `/api/chat` → role-chat.
Behind a feature flag; flip when verified. **Then delete `ANTHROPIC_API_KEY` from all tenant `.env`.**
Invalid model IDs (`claude-opus-4-7`, etc.) disappear — the gateway picks the approved server-side model.

### 3. APPOINTIQ — re-gate the open data API (P0)
`middleware.ts` is disabled → `/api/*` is unauthenticated and live. Add per-view 401 handling (so
logged-out views don't crash — the original outage cause), then re-enable auth. Don't run UAT on an open
API beyond the evaluator window.

## ✅ Origin "ILCO Farms Login PIN" email — GO (stopgap)
O_TNT/origin: **cleared to ship the email fix now** — Origin-gold brand + a **"Log in to ILCO" CTA
button** (links to login, email pre-filled) + **reuse the still-valid PIN within its 5-min window** to
stop the duplicate sends. **Stopgap only** — identity migrates to FLOCORE (**W30**) next; do **not**
gold-plate a tenant-side auth stack we're retiring. Then: owner logins (Coenie/Ilse) → mobile-verify the
Owner 360 (real 390px screenshot, not just classes).

## What FLOCORE provides
`/micro-models/role-chat` (live, W10) — keys server-side, grounded, governed. Per-tenant response brand +
rate-limiting following. See `FLOCORE_CAPABILITIES_FOR_AGENTS.md` + `FLOCORE_SEPARATION_OF_CONCERNS_SECURITY.md`.

## Reply with
keys rotated (y/n) · call sites rewired (n/total) · APPOINTIQ API re-gated (y/n) · email stopgap shipped
(y/n) · ETA · blockers. FO tracks and relays.
