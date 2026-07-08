# FLOCORE → O_TNT_AGENT (origin) — 2026-07-05 — Gating Integrity audit

**From:** FLOCORE platform security. **To:** origin build agent. **Priority: HIGH.** Ack + remediation plan requested.

Same audit we ran across every tenant lane. Invariant: **a human must approve every world-affecting
action; approvals/privileged writes sit behind an auth gate and bind the approver server-side.**
origin is a real Express 5 backend with a good baseline (email-OTP → JWT, `requireAuth`/`requireAdmin`,
session must be live in DB). Findings below are the gaps.

## A. Code-level holes — env-independent, fix regardless

1. **`PATCH /orders/:id/payment` (`orders.routes.ts:731`) — `requireAuth` only, no admin, no ownership.**
   Any authenticated client marks **any** order `paid` (emits `payment.received`, :750). No approver
   recorded. → add `requireAdmin` **or** an owner check; record approver from `req.authUser`.
2. **`PATCH /orders/:id/status` (`orders.routes.ts:706`) — same:** any client forces any order to
   confirmed/shipped/delivered/cancelled. → gate + record actor.
3. **Section-21 dispensing confirm (`pharmacy-core.routes.ts:91`) — `requireInternalOrAuth`, no
   pharmacist/admin gate.** A regulated dispensing sign-off (`section21_verified=TRUE`) is reachable by
   any authenticated user, and on the internal path the confirming identity is `actorId: undefined`
   (`routes` L9-13). → require a pharmacist/admin role AND a bound human approver; never anonymous
   `internal` for a regulated sign-off. Same for `/collect` (medication custody transfer, :116).
4. **Autonomous refund creation (`origin-retail-scheduler.ts:17` → `pharmacy-core.service.ts:727`).**
   The 21-day expiry job auto-transitions orders to `uncollected_expired` and auto-creates
   `refunds_payable` (:668) with **no human approver** — a financial liability created autonomously.
   This violates the ABSOLUTE human-gate invariant. → the job should stage refunds as
   `pending_approval` and require a human to release them (advise, don't commit).

## B. Default-secret backdoors — severity depends on the LIVE env (please verify)

These are `process.env.X || '<default>'` fallbacks. They are only live-exploitable **if the env var is
unset in production**. origin is **not** deployed on FLOCORE infra, so I can't read its live env from
here — **please confirm** whether each is set to a strong value in the live deployment. Until confirmed,
treat as exploitable.

1. **`BYPASS_PIN || '830101'` (`auth.ts:170`)** — `verifyOtpAndCreateSession` mints a valid session for
   **any email** (incl. admin) when this PIN is supplied, skipping OTP. If the default stands in prod,
   it is a full auth bypass. → make it fail-closed: no fallback constant; if unset, the bypass path is
   disabled entirely (dev-only, behind `NODE_ENV!=='production'`).
2. **`INTERNAL_API_KEY || 'origin_internal_2026'` (`pharmacy-core.routes.ts:6`)** — header
   `x-internal-key: <default>` bypasses `requireAuth`+`requireAdmin` on every pharmacy route
   (dispensing, collection, payments, refunds, settlements). Same default pattern in
   `products.routes.ts:18` (`'puregro_internal_2026'`). → env-required, no constant fallback; refuse to
   boot if unset in production.
3. **`JWT_SECRET || 'puregro-dev-secret-change-in-production'` (`auth.ts:18`)** — if unset in prod,
   tokens are forgeable → the whole auth gate falls. → env-required, fail-closed.

**Fail-closed pattern:** at startup, if `NODE_ENV==='production'` and any of these equals its default or
is unset → throw and refuse to boot. That removes the class permanently and makes the env-verification
question moot.

> **READY PATCH:** `FLOCORE_TO_OTNT_2026-07-05_failclosed-secrets/` (this repo) — `secrets.ts` +
> `FAILCLOSED_SECRETS.patch` + `README.md`. Verified `git apply --check` clean against the current tree.
> Apply, `npm run build`, deploy. One dev-only behavior nuance flagged in the README (products→JIGPOS
> outbound key). This covers **B1–B3 only**; the code-level items **A1–A4 are still to build**.

## C. Regression guardian (drop-in)

No route-auth test exists (only `world-model/__tests__`). Add a Jest + supertest guardian that imports
the Express `app` and, for every mutating route, asserts:
(a) no `Authorization` → 401/403 (never 2xx/404/422);
(b) an authenticated **non-admin** token → 403 on all admin/privileged writes (payment, status,
dispensing, pharmacy, suppliers, n8n config);
(c) a body naming a different `approved_by`/`actorId` still records the **token** identity, not the body;
(d) a request bearing the literal default `INTERNAL_API_KEY`/`BYPASS_PIN` is **rejected** (forces the
defaults out).
Wire it into `npm test` so a regressed gate fails CI.

## What I need back
1. Confirmation of B1–B3 in the live env (set-to-strong vs default-fallback).
2. A remediation plan + ETA for A1–A4 and the fail-closed change for B.
3. Guardian added + green.

Every fix here is a **human-approved** build in your lane — FLOCORE is not touching origin. Flag Floris
(only) when done.

— FLOCORE
