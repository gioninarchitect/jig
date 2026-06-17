# FLOCORE (FO) → ILCO agents — TASK: stand up Loraine's chicken-farm (poultry) dashboard

**Date:** 2026-06-16 · **From:** FO (super admin: Floris) · **To:** O_TNT_AGENT (lead) · GROWOS_AGENT · cc Loraine
**Process:** scope → approve (**Floris, super admin**) → build. **Boundary:** FO provides the rails; you do the tenant activation.
**Do NOT brief or contact the owners (Coenie & Ilse) about this — approvals route through Floris until he says otherwise.**

---

## 1. Context (governance — confirmed)
- **Owners:** Coenie & Ilse (only owners; top sign-off). **Super admin:** Floris. **Loraine:** a **manager, not an owner**.
- Loraine manages the **chicken farm** — a **poultry** operation that is a **customer/site UNDER the ILCO
  tenant** (its own customer silo, separate from the cannabis cultivation customer). She needs **her own
  dashboard** for it. This is a different domain from cannabis (no SAHPRA seed-to-sale here).

## 2. The task
Activate Loraine's poultry role end-to-end on the **existing FLOCORE role-activation rails** (same engine as
the cannabis roles — role → KPIs → workflows → SOPs → dashboard), isolated in the chicken-farm customer silo.

1. **Create the customer** — the chicken farm as a customer/site under tenant `ilco` (own `customer_id`).
2. **Seed Loraine's role** — `FACILITY_MANAGER` (poultry) scoped to that `customer_id`, as a **manager**
   (owners Coenie/Ilse sit above; she never signs as business owner).
3. **Seed her KPIs** — RoleKpiWorkflowModelMap entries for the poultry type (see §4). These drive her dashboard
   + the CFS/benefit/observation loop.
4. **Ground her SOPs** — draft → review → author:
   - `POST /sops/draft` (role_key=FACILITY_MANAGER, customer = chicken farm) → grounded first-cut.
   - Tag `applies_to` with poultry vocab; cite poultry compliance (**DALRRD, biosecurity/avian-influenza,
     animal welfare, feed safety** — NOT SAHPRA/EU-GMP). Flag FO to add a role-grounding alias if needed.
   - `POST /sops/author` with **dual sign-off: Loraine (manager) + QA** → live, grounds to her dashboard.
5. **Her dashboard** surfaces via `GET /micro-models/role-insights?tenant_slug=ilco&role_key=FACILITY_MANAGER&customer_id=<chicken-farm>`
   + role-chat (role-grounded). CFS indicator, tickets (W26 auto-raise), training loop all apply unchanged.

## 3. DECISIONS to confirm on-site (with Loraine; route up to Floris — NOT the owners) before building
- **Poultry type** (drives the KPI set):
  - **Broilers (meat):** FCR, daily weight gain, mortality %, stocking density, days-to-target-weight.
  - **Layers (eggs):** hen-day lay rate %, egg weight/grade, feed per dozen, mortality %.
  - **Breeders/hatchery:** fertility %, hatchability %, chick quality.
  - or **mixed** (per house/flock).
- **Loraine's scope:** does she ALSO keep cannabis FM custody (CFS register + mother sign-off), or move
  **fully to poultry**? If both — name who runs cannabis custody day-to-day.

## 4. KPI starter set (pick per §3 poultry type)
Broiler example to seed (baseline → target):
`mortality_pct` (5→2), `fcr` (1.8→1.5), `avg_daily_gain_g` (50→62), `stocking_density_ok_pct` (80→100),
`biosecurity_compliance_pct` (70→100), `vaccination_adherence_pct` (80→100), `water_feed_ratio_ok_pct` (75→95).
(Layers/breeders: swap in lay rate / hatchability etc.)

## 5. Boundary + process
- **FO (rails):** the role-activation engine, SOP draft/author, custody/audit, CFS, tickets, training loop —
  all live and generic. If you need a new role-grounding **alias** or a poultry **compliance pack** registered,
  ask FO (that's a control-plane change).
- **You (ILCO agents):** the tenant activation — create the customer, seed Loraine's role + poultry KPIs +
  SOPs, run the on-site decisions in §3.
- **Sign-off:** Loraine (manager) + QA on SOPs (operational dual sign-off). **Role/scope approval = Floris
  (super admin)** — the owners are NOT briefed on this until Floris says so.
- **Track** in `docs/SCOPE_BUILD_STATUS.md`. Scope it back to **FO/Floris** → approve → build.

— FO
