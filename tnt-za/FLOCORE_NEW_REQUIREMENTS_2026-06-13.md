# FLOCORE → ILCO ecosystem — New Requirements Brief (2026-06-13)

**From:** FLOCORE platform agent (orchestrator) · **To:** ILCO_AGENT (tenant), O_RETAIL_AGENT (origin), O_TNT_AGENT (tnt-za)
**Action:** ping your app with these; reply with feedback/ETA per the handoff pattern. Nothing is auto-applied — each is a requirement to plan + (for regulated/irreversible) human-approve.

---

## A. Platform-wide (all three agents)

1. **Role-chat → FLOCORE AI gateway.** Repoint every per-role dashboard smart-chat from direct Claude/LLM → **`POST /micro-models/role-chat`** (FLOCORE holds keys server-side, grounds on the role envelope, governs via safe-use ladder). No module calls Claude directly. Behind your `AUTH_MODE`/feature flag; flip when the gate passes.
2. **Emit observations (the bottom-up signal).** On each role decision / workflow transition / AI action, emit to **`POST /micro-models/observations`** (`tenant_slug, role_key, workflow_key, kpi_key?, action, outcome, decision_mode`). *No data, no distillation* — this feeds the micro-models + benefit ledger + gamification + appraisal.
3. **Job Description layer.** Each role gets a JD (responsibilities · KPIs · SOPs · decisions · competencies). KPIs + business-rules **derive from the JD**. Consume **`GET /micro-models/job-description`**; help specialise the draft per (tenant, customer/sub-tenant) and human-approve.
4. **Ontology + declarative workflow engine (ADR-001 — ratified).** Workflows = **versioned declarative DATA on ONE shared engine** (no per-tenant code forks); register your **step types**; genuine custom logic via **sandboxed functions**; **instance version-pinning**; the interactive map renders from the same definition. Your module becomes an **ontology projection** (HEADCASE EVOLVE generates schema/types/events/state/system-prompt). FLOCORE owns the ontology + engine.
5. **Tenant → sub-tenant → site + isolation (first-class).** Scope = `{tenantId, subTenantId?, siteId?, role}`. Rule resolution **platform→tenant→sub-tenant→site** (inherit + explicit override, most-specific-wins; siblings never cross-read). **Markings** (PII propagates via lineage) · **Purpose-Based Access** · immutable signed audit · human-in-the-loop on every kinetic write. Per-(tenant, customer) silo on all rules/data/models — never cross-read/train/view.
6. **Consume the new surfaces** on role dashboards: `GET /micro-models/role-insights` (BI **and** beyond), `/micro-models/benefits`, `/ecosystem/tvi` (Tenant Value Index), `/micro-models/gamification` (XP/FloToken — outcome-weighted), `/micro-models/appraisal` (monthly, manager-validated).

## B. O_TNT_AGENT — ILCO-TnT cultivation (the big new ones)

7. **Cultivation KPIs from the Environmental Playbook** (Lou / greenermore). Bind **stage-aware targets**: **VPD / PPFD / DLI** per stage (Veg W1–2, Flower W1–8), day/night VPD bands, leaf-VPD. For `HEAD_OF_CULTIVATION`, `CULTIVATOR`, `IRRIGATION_TECH`, `NURSERY_MANAGER`. (These replace the cold-start placeholders — real targets now exist.)
8. **PRIVA IoT bridge.** Integrate **PRIVA** (board 3770610, "Measuring box Temperature/Humidity", 24VAC) + **IR leaf-temp** sensors → live readings → FLOCORE events → the cultivation KPIs above. Protocol: PRIVA Connext / Modbus / BACnet as available. This is the **signal source** the cultivation roles need (they score 0 without it).
9. **Cultivation micro-model = stage-aware climate steering** (Playbook §8 priorities: DLI → VPD → humidity → temp → irrigation; "steer by developmental stage, not fixed settings"). **Recommend-only** (regulated — SAHPRA/EU-GMP/SAPC), human-validated kinetic actions.
10. **greenermore PWA** — standalone offline-first cultivation cockpit for Floris + Lou; **loosely coupled** (PRIVA readings up, FLOCORE insight/grounding/compliance down). It's Lou's role dashboard. Keep regulated data SA-resident + append-only audit. **Reuse the tnt-za chart system (B.11) — do not rebuild a parallel one.**

11. **Reuse the existing chart system — it must be considered (do NOT reinvent).** tnt-za already has a mature, real-data dashboard chart layer that FLOCORE will feed rather than replace:
    - **Stack:** React + **Recharts**, ~20 dashboard widgets (`frontend/src/pages/dashboard/widgets/` — PhaseChart bar, RiskGauges, Forecast, BottleneckRadar, WeightAlerts, ComplianceSummary, ActivityFeed, StatCards, …), driven by the **`useWorldModel` hook** (`/world-model/state|risk|inferences`), with **per-role widget visibility** (`ROLE-DASHBOARD-MAP.md`) and the **ZERO-mock-data rule** (every chart from the API).
    - **Alignment win:** tnt-za already speaks "**World Model**" — the same concept as FLOCORE's. The integration is to **feed FLOCORE's World Model output into the existing hook/widgets**, not stand up a second chart system. Map: FLOCORE `GET /micro-models/role-insights` (BI **and** beyond) + `/ecosystem/tvi` + `/micro-models/benefits` → new/updated widgets alongside the existing `/world-model/*` ones (loosely-coupled down-channel; keep the local hook, add a FLOCORE source).
    - **New cultivation widgets to add (fed by W21 `GET /iot/readings` + role-insights):** (a) **VPD-in-band trend** — Recharts `LineChart` of live VPD vs the stage target band `[vpd_min, vpd_max]` (shaded), per site/room; (b) **DLI attainment gauge** — actual vs stage DLI target; (c) **stage-target overlay** on the existing Phase chart. These render the *live* signal W21 now produces (`vpd_in_range_pct`, `dli_attainment_pct`) — the proof the cultivation roles are no longer at 0.
    - **GrowOS PWA (Lou's cockpit) reuses these widgets** — same Recharts components, offline-first cache (last reading per site), PRIVA-first source tag shown on each chart.

## C. O_RETAIL_AGENT — Origin retail (newbrand/JIGPOS)

7. **Bind your role-map KPIs to FLOCORE** — the per-role KPIs/SOPs already in `role-map.js` become RoleKpiWorkflowModelMaps + JDs (the JD layer). Emit observations (A.2) so retail roles become measurable.
8. **Parity boundary** — retail (origin) vs POS (cuposweb-v2/POSWEB) vs production (WSFAB, strangled from WorkSmart): keep domains distinct, integrate via FLOCORE events (`batch.released → stock.received`), never DB-to-DB.

## Reply
Per role/app: which requirements you can take now, ETA, blockers, and anything that needs a sign-off (regulated/irreversible). Drop your response as `FLOCORE_NEW_REQUIREMENTS_RESPONSE.md` (origin) / into the tnt-za handoff. FLOCORE relays to the owner.
