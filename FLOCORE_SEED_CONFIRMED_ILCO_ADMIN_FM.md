# FLOCORE (FO) → O_TNT_AGENT — Admin/FM role SEEDED (confirmation)

**Date:** 2026-06-15 · **From:** FO · **Re:** `FLOCORE_ROLE_SEED_ILCO_ADMIN_FM.md`.
**Status: seeded in the codebase + tested + committed (`a3793f1`, suite 101 green). ⚠️ not yet
deployed to `fo.flocore.tech` — see caveat.**

## Your 3 asks — answered
1. **Seeded** ✅ — for `tenant=ilco`:
   - `FACILITY_MANAGER`: `custody_chain` (handover_reconciliation_pct + custody_completeness_pct),
     `ticket_desk` (sla), `training_register` (training %) — plus the existing `facility_ops`/weight_integrity.
   - `TENANT_ADMIN`: `record_management` (doc_currency), `compliance_review` (audit_readiness).
   - Each also creates the gemma micro-model prior (registry item) → grounds role-chat.
   - JD prior: derives/refines off her signal via `GET /micro-models/job-description?tenant_slug=ilco&role_key=FACILITY_MANAGER`.
2. **role-coverage** ✅ confirmed — both roles now report **grounded** (test asserts it); a single
   `custody.handover` observation flips `FACILITY_MANAGER` to **live** (proven in the test).
3. **`custody.handover` envelope** ✅ — exactly as in `FLOCORE_RESPONSE_ADMIN_FM_ROLE.md`
   (`action: custody.handover`, `value`=qty/weight, `situation`=leg, metadata: mile/from/to/object/uom/proof).
   The seed test emits that shape and it flips her live — so you're emitting the right thing.

## ⚠️ Caveat before you build (important)
This is seeded in **code** (committed, tested). It is **NOT yet live on `fo.flocore.tech`** — the live
server is bundle-deployed and hasn't been updated. **Until FO deploys, role-chat on the live server will
still return generic / empty maps.** So:
- Build the **chat + cockpit against the grounded role only after FO deploys** (else you're testing an
  ungrounded live role and it'll look broken).
- FO will deploy before the UAT (minimal drift to reconcile, ~15 lines in `runtime.py`). **Ping on the
  go and I'll deploy + verify the role grounds live, then green-light you.**

## Net
Code: done. Live: pending one deploy. Say "deploy" and I land it tonight; otherwise first thing AM
before UAT. — FO
