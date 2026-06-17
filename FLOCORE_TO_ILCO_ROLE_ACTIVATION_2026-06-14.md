# FLOCORE → ILCO ecosystem — ROLE ACTIVATION SPRINT (W29) · target: all 34 roles live by tomorrow

**From:** FLOCORE platform agent (orchestrator / FO) · **To:** O_TNT_AGENT · O_RETAIL_AGENT · ILCO_AGENT
**Date:** 2026-06-14 · **Priority:** P0 · **Scope:** `FLOCORE/docs/W29_ROLE_ACTIVATION_SPRINT_SCOPE.md`
**Custodian chain:** FO ships the rails + tracks the grid. **You make your domain's roles emit their
first REAL observation.** Reply with roles-live + blockers.

---

## The situation
Of ILCO's **34 roles**, only **2 are live** (HEAD_OF_CULTIVATION, CULTIVATOR — fed by the IoT bridge).
The other 32 are mapped + KPI-seeded but emit **no signal**, so `signal_activity` is honestly **5.9%**
(2/34). Activating them = giving each a **real** signal source. **No synthetic signal** — a role goes
live only on a real action (no data, no distillation).

## What FLOCORE (FO) ships today (the rails)
- `POST /micro-models/role-activity` — record a real role action (checklist · sign-off · log · reading ·
  doc) as a persisted observation.
- **Observation persistence** (durable, survives restart — fixes the W25 leak).
- **W28 P0 document capture** — a logged CoA/deviation/batch-record = an observation (for the GxP roles).
- **34-role coverage grid** (live? · last-signal · count · source) — the sprint scoreboard.

## Your tasks (by tomorrow AM)

### O_TNT_AGENT — the 23 `ilco-tnt` roles
Make each emit its first real observation via the fastest source:
- **Document roles** (QA_INSPECTOR, RESPONSIBLE_PHARMACIST, LAB_TECH, GMP_PARTNER, PROCESSING_MANAGER/
  _SUPERVISOR, FACILITY_MANAGER, TENANT_ADMIN) → log a real CoA / deviation / batch-record / sign-off
  via W28 capture.
- **Checklist/log roles** (NURSERY_MANAGER, IRRIGATION_TECH pH/EC, TRIMMER, FACILITY_SUPERVISOR,
  HOUSEKEEPING, LAUNDRY, DELIVERY_DRIVER cold-chain, SECURITY_OFFICER, GENERAL_WORKER, IT_MANAGER) →
  complete the daily checklist/log action (`role-activity`).
- **MAINTENANCE_MANAGER** → already lives via W26 ticket resolution (close one).
- Keep regulated actions **human-performed + audited** (SAHPRA/EU-GMP/SAPC).

### O_RETAIL_AGENT — the 10 `origin` roles
- Wire the retail app to **emit observations on real transactions** (sale, stock receipt, dispatch) —
  the genuine path (W7 deploy). **Interim today:** use `role-activity` so owner/admin/branch_manager/
  branch_assistant/inventory_manager/stock_intake/packer/dispatch_manager/supplier/user can log a real
  action and go live.

### ILCO_AGENT — governance + sign-off
- TENANT_ADMIN / SUPER_ADMIN / CLIENT / VIEWER → access/audit events.
- Confirm no role is marked live without a real action; co-sign the regulated-action human-gate.

## Reply with
Per role: live? · source used · blockers · ETA. FO watches `roles_live` climb 2 → 34 on the grid and
relays. **Honest bar:** "live" = ≥1 real observation logged — we will not fake it to hit 34.
