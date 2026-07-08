# FLOCORE → O_TNT_AGENT (origin) — 2026-07-05 — Access-control fixes A1–A4

Companion to `FLOCORE_TO_OTNT_2026-07-05_gating-security.md` §A. Drafted against the current source
(exact lines cited). **Human-approved build in your lane.** Apply after the fail-closed secret patch.

## Shared guard (add to `src/server/routes/pharmacy-core.routes.ts`, near the other guards)

```ts
// Bound-human privileged gate — chains requireAuth → requireAdmin so req.authUser is set and the
// approver is always a real admin. NO internal-key bypass: for regulated sign-offs and money-moving
// approvals, where a machine must never stand in for a human.
function requireAdminHuman(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  void requireAuth(req, res, () => requireAdmin(req, res, next));
}
```

Also **fix the existing `requireInternalOrAdmin`** — today it calls `requireAdmin` without running
`requireAuth`, so `req.authUser` is never set and the non-internal admin path **always 401s** (the route
is effectively internal-key-only). Chain auth first:

```ts
function requireInternalOrAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.headers['x-internal-key'] === INTERNAL_API_KEY) { next(); return; }
  void requireAuth(req, res, () => requireAdmin(req, res, next)); // was: requireAdmin(req,res,next) — authUser never set
}
```

## A1 — `PATCH /orders/:id/payment` (`orders.routes.ts:731`)
Currently `requireAuth as never` only → any authenticated B2B client can mark **any** order `paid`
(emits `payment.received`). Fix: gate to admin + record the approver.
```ts
router.patch(
  '/:id/payment',
  requireAuth as never,
  requireAdmin as never,        // ← add: only a privileged human flips payment state
  async (req, res, next) => { ...
    // in each emitEvent payload add the bound approver:
    emitEvent('payment.received', { orderId: req.params.id, clientId: order?.clientId,
      total: order?.total, poNumber: order?.poNumber, approvedBy: req.authUser?.email }); // ← add approvedBy
```

## A2 — `PATCH /orders/:id/status` (`orders.routes.ts:706`)
Same shape — `requireAuth as never` only lets any client force order state. Add `requireAdmin as never`
to the chain.

## A3 — regulated sign-offs: bound human pharmacist/admin, no internal bypass
`requireInternalOrAuth` lets **any authenticated user** (or an anonymous internal-key caller) perform a
**regulated Section-21 dispensing sign-off / medication custody release**. Change the guard to
`requireAdminHuman` for:
- `POST /orders/:id/confirm-section21-dispensing` (`pharmacy-core.routes.ts:91`)
- `POST /orders/:id/collect` (`pharmacy-core.routes.ts:116`)

`actor(req)` then always returns `{actorType:'user', actorId: <admin email>}` — the confirming identity
is bound, never anonymous `internal`.
> **If a machine currently calls these with the internal key, that IS the autonomous controlled-substance
> sign-off we're closing — route it through a human pharmacist.** If dispensing is done by non-admin
> pharmacy staff, add a `PHARMACIST_EMAILS` allowlist / role rather than widening back to any authed user.

## A4 — the refund PAYOUT needs a bound human (the job staging pending refunds is fine)
Clarified after reading the service: the 21-day expiry job only **stages** a `refunds_payable` row at
`status='pending'` (DB default) + raises a `PHARMACY_ADMIN` workflow ticket — it pays nothing. The actual
money-move is `updateRefundStatus(...,'paid')` via `PATCH /refunds-payable/:id/status`, and that route is
`requireInternalOrAdmin` — i.e. reachable by the **internal key with no working human path**. So a
machine can approve+pay a refund with no human. Fix — make the payout a bound human admin:
- `PATCH /refunds-payable/:id/status` (`pharmacy-core.routes.ts:156`) → `requireAdminHuman`
- `PATCH /pharmacy-settlements/:id/status` (`pharmacy-core.routes.ts:150`) → `requireAdminHuman`

No change to the scheduler or `runUncollectedExpiry` — detect-and-queue-for-human is correct; the gate
belongs on the payout.

## Guardian (from the main handoff §C) should now assert
- `PATCH /orders/:id/payment` & `/status`: non-admin token → 403.
- `confirm-section21-dispensing`, `collect`, `refunds-payable/:id/status`, `pharmacy-settlements/:id/status`:
  internal-key-only request (no human) → 401/403; non-admin human → 403.

## What I need back
Remediation done + guardian green. Flag Floris (only).

— FLOCORE
