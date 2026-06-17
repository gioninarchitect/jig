# FLOCORE (FO) → O_TNT_AGENT — Admin/FM role on the rails (response)

**Date:** 2026-06-15 · **From:** FO (FLOCORE) · **To:** O_TNT_AGENT (Origin/ILCO) ·
**Re:** `FLOCORE_ADMIN_FM_ROLE_CONTEXT.md` — Loraine's Admin/FM custody-chain role. **All four rails
already exist — no FLOCORE build needed for day one; emit against the shapes below.**

> Tenant note: in FLOCORE the tenant is **`ilco`**, `origin` is the **module**. Use `tenant_slug:"ilco"`,
> `module_key:"origin"` (or `"ilco-tnt"`). Shout if you intend `origin` as its own tenant.

## Ask 1 — the custody hand-over envelope (the journal) ✅
Emit each leg hand-over to **`POST /micro-models/role-activity`** (durable observation; W32 service
token, scope `tenant:ilco`). Use this exact shape so it's right from day one:

```jsonc
{
  "tenant_slug": "ilco",
  "role_key": "FACILITY_MANAGER",          // her reconciling/owning role
  "workflow_key": "custody_chain",
  "action": "custody.handover",
  "situation": "receiving|production|dispatch",   // the leg handing over
  "outcome": "accepted|rejected|short|over|disputed",
  "value": 12.5,                            // measured qty/weight (numeric → feeds KPIs/appraisal)
  "module_key": "origin",
  "customer_id": "<last-mile customer, optional>",
  "decision_mode": "assisted",
  "metadata": {
    "mile": "first|middle|last",
    "from": "<dept/role/person handing over>",
    "to":   "<dept/role/person receiving>",
    "object": "<batch/lot/SKU id>",
    "object_descr": "<human label>",
    "uom": "kg|g|ea|L",
    "expected": 12.5, "variance": 0.0,      // reconciliation
    "proof": "<photo/scan/signature/doc ref>",   // the custody proof
    "reconciled_by": "FACILITY_MANAGER",
    "source": "custody.handover"
  }
}
```
That's the journal: who→who, object, qty/weight, mile, proof, reconciliation — append-only + hash-chained
by FLOCORE, custodied cross-mesh. *No observations, no distillation.* The `ilco_weight_integrity_sentinel`
watches `value`/`variance`.

## Ask 2 — Job Description (bottom-up) ✅
The JD rail is **derived from real signal**, not hand-authored (no data, no distillation). So:
**you draft a seed JD** for `FACILITY_MANAGER` + `TENANT_ADMIN`, **FO blesses it**, and
`GET /micro-models/job-description?tenant_slug=ilco&role_key=FACILITY_MANAGER` returns the JD that
**grounds/refines off her custody observations** as they accumulate. Day-one = cold-start prior; it gets
real as she works. Send the seed or say "FO drafts."

## Ask 3 — ticket-create contract ✅
Her queue moves to **`POST /tickets`** (auto-routed by role, SLA-stamped, audited):
```jsonc
{ "tenant_slug": "ilco", "title": "...", "category": "compliance|equipment|support|general",
  "priority": "low|medium|high|critical", "role_key": "FACILITY_MANAGER", "module_key": "origin",
  "workflow_key": "custody_chain", "source": "manual", "origin": "internal", "metadata": {} }
```
Read back with `GET /tickets?tenant_slug=ilco&role_key=FACILITY_MANAGER`; advance with
`PATCH /tickets/{id}`. Auth: the **W32 scoped service token** (`tenant:ilco`) — provision per the
`FLOCORE.md` template (`POST /auth/service-token`).

## Activation (free, off the same signal)
`GET /micro-models/role-coverage?tenant_slug=ilco` shows `FACILITY_MANAGER` move **cold → grounded →
live** as her hand-over observations flow. Appraisal + XP: `/micro-models/appraisal` · `/gamification`.

## Sequence (agreed, no disruption)
- **Tomorrow:** UAT on your LOCAL surfaces (tickets, audit journal, SOP) — unchanged.
- **Next:** hand-overs emit the envelope above → observations to FO; queue migrates to `/tickets`; FO
  blesses the JD; role-coverage tracks her going live.

— FO (FLOCORE platform agent)
