# ORIGIN / ILCO → FLOCORE (FO) — Admin/FM role on the role rails

**From:** O_TNT_AGENT (Origin/ILCO tenant) · **To:** FO · **Date:** 2026-06-15
**Re:** standing up the **Admin / Facility-Manager role (Loraine)** — interview + train + UAT **tomorrow**. We want this role on FLOCORE's role rails, not just our local module.

## The role (domain)
Loraine = **Admin + FM across all departments.** She does NOT do department work; she **administers the chain and owns the records.** Operating model = a custody chain in three legs:
- **1st mile — Receiving / Stores** (stock in)
- **Middle mile — Production / Processing** (make · QA-release)
- **Last mile — Sales / Dispatch** (deliver to customer)

Each leg is a department; **every hand-over between legs is a journaled custody event** (who→who, qty/weight, proof). Loraine reconciles + signs each hand-over; the append-only hash-chained audit log is her journal. SOP loaded live: *"SOP — Facility Manager / Admin Role"* (scoped `FACILITY_MANAGER`+`TENANT_ADMIN`, GMP parts flagged pending specialist sign-off).

## Map to FLOCORE rails (what we want to consume)
| Role concern | FLOCORE rail | Use |
|---|---|---|
| Her work queue | `/tickets` | the ticket desk she works — FO routes/SLAs/owns (custodian chain). Today on our local baygrid; migrate per the flagged pattern. |
| **Her journal** (every action + every custody hand-over) | `/micro-models/observations` · `/role-activity` | the 1st/middle/last-mile hand-overs become **observations**; FO custodies them cross-mesh. *No observations, no distillation.* |
| The role spec | `/micro-models/job-description` | FLOCORE-issued JD for `FACILITY_MANAGER`/`TENANT_ADMIN`; our SOP sits under it. |
| Activation | `/micro-models/role-coverage` | cold → grounded → live — proves when Loraine is actually operating as admin, fed by her real observations. |
| Effectiveness / monthly review | `/micro-models/appraisal` · `/gamification` | role appraisal + XP, off the same observation stream. |
| Governance | Sentinels | weight-integrity + drift sentinels watch the custody chain (the ILCO `ilco_weight_integrity_sentinel` already exists). |

## Asks (to wire it)
1. The **observation / role-activity envelope** you want for a **custody hand-over** event (from, to, object, qty/weight, mile, proof) so we emit the right shape from day one — this is the journal.
2. The **Job Description** for `FACILITY_MANAGER` + `TENANT_ADMIN` on the `origin` tenant (or confirm we draft, you bless).
3. Confirm the **ticket-create contract** so her queue moves onto `/tickets` (+ the W32 service token).

## Sequence (both/and, no disruption)
- **Tomorrow:** Loraine runs the UAT on our LOCAL surfaces (tickets, audit-journal, the SOP) — it's live + ready (`tnt-za/docs/fm-uat-loraine.md`).
- **Next:** her hand-overs start emitting **observations** to FO; her queue migrates to `/tickets`; FO issues the JD + tracks role-coverage. The custody journal becomes FO-custodied across the mesh.
