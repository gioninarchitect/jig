# ORIGIN / ILCO → FLOCORE (FO) — Role-seed request: Admin/FM (custodian)

**From:** O_TNT_AGENT · **To:** FO · **Date:** 2026-06-15 · **Tenant:** `ilco` (slug `origin`)
**Why:** role-chat returns `role_kpi_workflow_model_maps: []` and role-coverage doesn't recognise the role. Seed this so **role-coverage flips cold→grounded** for the UAT tomorrow and the **gemma micro-model gets its prior** (fixes the generic chat). **No self-serve endpoint exists for the registry/JD/KPI-maps — this is FO's seed.** We supply the spec.

## Roles to register
`FACILITY_MANAGER` and `TENANT_ADMIN` (Loraine holds TENANT_ADMIN; both share this role identity at ILCO).

## Role identity (grounded prior)
**Custodian of traceability + compliance across the 3-leg chain** (Receiving → Production/QA → Dispatch). She **administers and owns the records; she does not do department work.** Standard: **ALCOA records + chain-of-custody at every hand-over.**

## Workflows → KPI → observation signal (the RoleKpiWorkflowModelMaps)
| Workflow (key) | What it is | KPI | Observation signal (we emit) |
|---|---|---|---|
| `custody_chain` | the journal — every leg hand-over reconciled + signed | **custody completeness** · **reconciliation rate** | `custody.handover` (from,to,object,qty/weight,leg,proof) |
| `record_management` | ALCOA records currency | **doc currency** | `record.updated` / `record.signed` |
| `compliance_review` | EU-GMP/SAHPRA governance areas current | **audit readiness** | `compliance.reviewed` |
| `training_register` | team training current | **training %** | `training.signed` |
| `ticket_desk` | the ops queue she works | **SLA** | `ticket.actioned` / `ticket.closed` |

## Seed JD prior (FO to bless; refines off her real signal)
- **Purpose:** custody + compliance integrity across receiving → production/QA → dispatch.
- **Responsibilities:** open/close the day; reconcile + sign every hand-over; keep records ALCOA-current; oversee the 6 EU-GMP areas; work the ticket desk.
- **Authority:** resolve/close operational tickets; **cannot** close compliance/QMS tickets without RP sign-off (system-enforced).
- **KPIs:** reconciliation rate · custody completeness · audit readiness · doc currency · training % · SLA.
- **SOP:** live in our library — *"SOP — Facility Manager / Admin Role"* (scoped FACILITY_MANAGER+TENANT_ADMIN; GMP parts flagged pending specialist sign-off).

## What WE do on our side (rails we CAN write)
- **Emit observations / `role-activity`** for each signal above — every hand-over + record + ticket action streams to you, so the model grounds off real signal (`/micro-models/observations`, `/role-activity`).
- Optionally register the **`custody_chain` workflow** via `POST /workflows/definitions` if you want it FLOCORE-defined rather than module-local — your call.

## Asks (to make her "live")
1. **Seed** the two roles + the `custody_chain` (and the four other) RoleKpiWorkflowModelMaps + the JD prior above, for tenant `ilco`.
2. Confirm **role-coverage** then reports her **cold→grounded** (and the path to `live` once observations accumulate).
3. Confirm the **observation envelope** for `custody.handover` so we emit the exact shape.

Once seeded, we: (a) finish wiring the **smart chat** to role-chat (now grounded, not generic), and (b) build the **ILCO admin/FM cockpit** (custody-chain hero → tap hand-over → reconcile+sign → emits `custody.handover` · journal · ticket queue · records · role-status) — a render of these rails, ILCO-skinned, no new rails.
