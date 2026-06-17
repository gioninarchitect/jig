# Tenant Knowledge-Distillation Pipeline (vertical → roles → grounded dashboards)

**Concept, 2026-06-06 — platform-level (FLOCORE white-label engine).** Onboard any tenant in any vertical by *distilling* its role structure + per-role SOPs/KPIs/workflows from the vertical, and feeding them straight into the role dashboards + the Operations Driver. **ILCO Farming is the reference tenant** (hand-built, compliance-grounded); the pipeline generalises that proven structure so the next tenant onboards in hours.

> **The hard part is not generation — it's grounding.** An LLM will invent a plausible-sounding regulation. So this pipeline separates **operational distillation** (safe) from **regulatory distillation** (dangerous), and never lets un-signed-off legal/compliance content go live.

> **Aligns with FLOCORE's canonical specs — extend, don't fork:** `MICRO_MODEL_DISTILLATION_AND_ENTANGLED_BUSINESS_RULES.md`, `SENTINEL_NETWORK_ARCHITECTURE.md`, `MODEL_STRATEGY_AND_WISHLIST.md`. The output of this pipeline IS a FLOCORE **micro-model** (§2.5), watched by **Sentinels** (§4.5).

---

## 1. The pipeline (4 stages)

| # | Stage | In → Out | Model |
|---|---|---|---|
| 1 | **Vertical detection** | tenant onboarding inputs (industry, licences, products) → `vertical` (e.g. `cannabis_cultivation`, `pharmacy_retail`, `food_mfg`) + confidence | Ollama (classify) |
| 2 | **Role-structure derivation** | vertical → org tree (tenant → sites → outlets → devices) + role set + RBAC levels | Ollama, **grounded on a role-template library** |
| 3 | **Per-role knowledge distillation** | (vertical, role) → SOP set · KPI set (metric/target/direction) · workflows · decision queues | Ollama batch, **RAG-grounded** |
| 4 | **Dashboard provisioning** | distilled artifacts → seed `SOP`, `kpi` definitions, `DriverRule`s, role dashboard config → the Operations Driver picks them up | deterministic writer |

Output of stage 4 feeds exactly the structures the **Operations Driver** already consumes (`kpi.service`, `sop-governance`, `DriverItem`) — so distillation *provisions* the driver; it doesn't replace it.

## 2. Model split — Ollama vs Claude (matches FLOCORE)
- **Ollama (local, open-source, async, CPU-throttled):** the **distillation factory** — classification, structured extraction, batch generation of role/SOP/KPI drafts. Cheap, runs long, **keeps regulated corpora on-prem** (data residency), no per-token cost for heavy passes.
- **Claude (cloud, interactive):** the **live layer** — the per-role co-pilot, owner brief, real-time Q&A. Keys server-side.
- Rule of thumb: *if a human is waiting → Claude; if it's a batch/overnight job → Ollama.*

## 2.5 The micro-model (MM) — FLOCORE's definition, and its two surfaces
Per FLOCORE, a **micro-model is not a separate trained model per user** — it is a **focused intelligence layer** built from: tenant context · role responsibilities · workflow history · KPI targets · dashboard surface · event patterns · **SOP/compliance context** · **entangled business rules** · prior AI recommendations + outcomes. The result is a smaller, role-aware reasoning profile that behaves differently per who's using it and in what context.

**How it's made (distillation):** the teacher LLM (**Claude**) + the grounded corpus distil a per-tenant/role **context pack** (the cheap, always-on path) and — for heavy async reasoning — a small local student model (**gemma-4-E4B** on Ollama, batch-only). Regulatory content stays compliance-gated (§3).

**The MM drives BOTH surfaces from one source of truth:**
1. **Dashboard intelligence** — KPI narratives, insights, and the **Operations-Driver Action Queue** ("what to do now").
2. **Per-role chat assistant** (the co-pilot — `general-ops`) — answers + executable actions in the role's lens.
Same MM behind both → the chat and the dashboard never contradict each other.

**Entangled business rules:** the MM's recommendation *boundary* is wired to role responsibility ↔ KPI target ↔ workflow state ↔ event history ↔ compliance/SOP ↔ dashboard narrative — not isolated config values. A rule, a KPI, a workflow and a compliance clause move together.

## 3. The compliance firewall (load-bearing)
Classify every distilled artifact as **OPERATIONAL** or **REGULATORY**:

| | OPERATIONAL | REGULATORY |
|---|---|---|
| Examples | role list, workflow steps, KPI targets, dashboard layout | anything citing law, scheduling, licensing, SAHPRA/SAPC/HPCSA/Section 21, GMP clauses |
| Generation | LLM drafts freely from role-template library | **RAG-grounded only** — retrieved from a curated **regulatory corpus** + approved SOP templates; **never free-generated** |
| Default state | `DRAFT` → light review | **`VERIFY` / quarantined** — cannot render as fact |
| Gate to go live | role owner accepts | **medicines-law / regulatory specialist sign-off** (electronic signature, audited) |

This is the [[feedback_no_unverified_regulatory_copy]] rule made into a pipeline stage. Mechanisms:
- **RAG over a real corpus** (the regulatory texts + the curated, signed-off SOP library) with **citations** — every regulatory line carries its source; no source → it's blocked.
- **Provenance + confidence** on each artifact; low-confidence or un-cited regulatory items auto-route to the specialist queue.
- **Sign-off ledger** (append-only, hash-chained like the existing `AuditLog`) — who approved which version when.
- **Eval/verification pass** — a second model (or rule check) flags any regulatory claim not backed by a retrieved citation before a human ever sees it.

## 4. Why ILCO is the reference tenant
We've already hand-built and grounded the cannabis-cultivation vertical: the role set (FM · Nursery Mgr/Staff · Cultivation Mgr/Head Grower · Processing · QA · RP), the SOP library, the KPI definitions, the world model, the anomaly rules. The pipeline's stage-2/3 **role-template + SOP-template libraries are seeded from ILCO** — a proven, signed-off baseline. So distillation for the *next* cannabis tenant is mostly **retrieval + adaptation** of a known-good structure, not generation from scratch — which is both faster and far safer.

## 4.5 Sentinels — the watch loop (what makes the MM safe to drive)
Per `SENTINEL_NETWORK_ARCHITECTURE.md`, Sentinels are FLOCORE's **pulse-measurement** observers that turn activity into scored signals (value 0–1, severity info/warning/critical, confidence, recommended_action) feeding **dashboards · rules · AI context · world model · escalation**. The hierarchy ends at `… → KPI → Micro-model → Sentinel`. Relevant observers:

- **AI Confidence Sentinel** — watches the **micro-model**, its recommendations, **human overrides**, and KPI outcomes → *accuracy · override rate · acceptance · drift risk*. **This is the safety governor:** if override rate climbs or drift appears, the MM's autonomy is dialled back (more human gating, smaller recommendation boundary). It is what makes the MM safe to drive the dashboard + chat.
- **KPI Drift Sentinel** — KPI vs target/baseline → feeds the Operations-Driver breach rules.
- **Workflow Pulse Sentinel** — state delay · blockage · SLA risk · throughput.
- **Sync + Device Health Sentinels** — offline/POS/connector + node heartbeat (covers the Origin POS + bridges).

**The closed loop:** MM → drives dashboard + chat → humans act / override / accept → Sentinels measure (acceptance, drift, did the KPI actually move) → feed back into the MM's recommendation boundary + escalation. A driving force *with* a governor — not an unsupervised autopilot.

## 4.6 The human remediation loop — SOP violation → targeted training → competency (where CAPA fits)
The system has **two mirrored feedback loops**, same triggers, same governor:
- **Machine loop (§6c):** MM recommendation → human override/outcome → re-distil. *The model learns.*
- **Human loop (this):** SOP violation → CAPA → targeted re-training of the **specific employee** → Academy → competency restored. *The person learns.*

**The flow — mostly already built:**
1. **Trigger** — a deviation / anomaly / SOP violation (`anomaly.service`, a QA deviation, or a **critical Sentinel signal**) → the Operations-Driver raises a **CAPA** ticket (#13).
2. **Targeted remediation** — CAPA + `sop-governance` create a **`TrainingRecord` for that individual** (not the whole role) on the violated SOP, auto-assigned (#13 "SOP violation → auto-training assignment").
3. **Academy** — the assignment lands in that employee's **Action Queue + Academy** learning-path; they complete it + pass the quiz.
4. **Competency gate restored** — completion writes the SOP-training flag (the **competency logbook**, #27); any task-gate that suspended them re-opens.
5. **Verify & close** — the SOP-compliance KPI / repeat-violation rate (KPI-Drift + Workflow-Pulse Sentinels) confirm; **QA signs off the CAPA closure** (firewall — a human closes it).

**It feeds the self-learning loop:** *repeat* violations of the same SOP by the same role = a signal the SOP is unclear or the training is weak → the MM recommends improving the SOP/training (operational). But the SOP **content** change still passes the compliance firewall (§3) — the system learns to *prevent* violations, never to silently rewrite the rule.

**Audit:** the whole chain — violation → CAPA → training assigned → completed → verified, **tied to the named employee** — is on the append-only ledger. That is the SAHPRA/GMP-grade evidence trail an inspector asks for.

## 5. How it connects
- **FLOCORE:** this is the white-label onboarding engine — produces the module manifest's `entities/permissions/events/dashboards` for a new tenant from its vertical. (See the FLOCORE module-integration doc.)
- **Operations Driver:** distillation *seeds* the Driver (SOPs + KPI rules); the Driver then runs the tenant day-to-day.
- **Academy:** distilled SOPs → role learning-paths (the Academy plan) — same artifacts, two consumers.

## 6. Resilient · future-proof · self-learning

### 6a. Resilient (degrade, never fail)
- **Graceful-degradation ladder:** micro-model → **deterministic rules** (the Operations-Driver rule engine) → **static SOP checklist**. The dashboard/chat never go blank; worst case is the printed checklist a human runs unaided.
- **Autonomy circuit-breaker:** when the AI-Confidence Sentinel sees override-rate/drift cross a threshold, the MM is auto-demoted to **advisory-only** (no auto-actions) until a fresh eval passes. (Extends §4.5.)
- **Promotion gate (shadow/canary):** a new MM version must pass the eval suite — golden Q&A, **citation coverage**, hallucination check, *and a lower override rate in shadow* — before it replaces the running ("champion") model. **No silent swaps.**
- **Model-agnostic contract:** consumers (dashboard, chat) call an **MM interface**, not a specific model — swap gemma ↔ Claude ↔ the next model without touching consumers.
- **Replayable state:** everything is event-sourced (the FLOCORE `event_log`), so derived state (world model, KPIs, driver items) is **rebuildable by replay** — recover from corruption deterministically.
- **Provenance on every recommendation:** inputs + MM version + citations attached, so any output is debuggable and reversible.

### 6b. Future-proof (change without rewrites)
- **Version everything, effective-dated:** MM versions · SOP versions · KPI targets · **regulatory-corpus versions** · vertical templates · the event envelope + module manifest. Enables rollback + "what did the rules say on date X".
- **Vertical-template registry:** a new vertical = a **template pack** (role library + SOP templates + KPI library + regulatory-corpus pointer) added as **data, not code**. The pipeline reads it.
- **Model registry + capability negotiation:** register any model (local/cloud) with declared capabilities + *measured* throughput; the router picks per task. The day the box gets a GPU, register it — nothing else changes.
- **Regulatory change-feed:** when a law changes, bump the corpus version → **auto-flag the regulatory artifacts that cited the changed source** → re-queue them for re-distillation + specialist **re-sign-off**. Stale law never silently persists.
- **Progressive-autonomy flags:** every autonomous behaviour sits behind a flag; autonomy **ramps per role/tenant only as trust (Sentinel acceptance) proves out**.

### 6c. Self-learning (improve from operations — within the firewall)
- **Operations → signal → learning:** the Sentinel signals already captured — **human override (+ reason), acceptance, and the KPI effectiveness-delta (did it actually move?)** — are the **training signal**. Curate them into the next distillation pass; re-distil on a cadence.
- **Active learning:** route low-confidence / high-disagreement cases to humans first — those corrections are the highest-value examples (and cut labelling waste).
- **Outcome attribution:** reward recommendations that moved the KPI, down-weight those that didn't (the KPI-Drift Sentinel measures this).
- **Champion / challenger:** a challenger MM trained on accumulated corrections runs in **shadow**; promoted only if it beats champion on the eval **and** override rate (same gate as 6a).
- **Living eval harness:** the golden set **grows from real overrides** → regression-tested each re-distillation → drift caught *before* promotion.

### 6d. Self-learning guardrails (non-negotiable in a regulated, multi-tenant world)
- **Regulatory content never self-learns un-gated** — operational behaviour learns freely; any regulatory artifact still passes RAG-grounding + specialist sign-off (§3). The model can get *better at running the SOP*; it can **never invent or drift the law**.
- **Tenant isolation / POPIA** — a tenant's data/PII never trains another tenant's model. Cross-tenant learning only on **anonymised, non-regulated operational patterns**, feeding the vertical *template*, not raw data.
- **Anti-poisoning** — human feedback is validated (reason required, role-weighted, outlier/abuse detection) so one bad actor can't skew the MM.
- **Full lineage** — every learning update is versioned + attributable (which corrections + which corpus → which MM version) on the append-only audit ledger.

## 7. Open questions to study (next)
1. **Local model choice** for the Ollama distillation (size vs quality on the box's CPU; structured-output reliability).
2. **The regulatory corpus** — what we're allowed to ingest, where it lives (on-prem), how it's kept current.
3. **Structured-extraction reliability** — JSON-schema-constrained output from a local model; eval harness for distillation quality.
4. **Human-in-the-loop UX** — the specialist sign-off queue + diff view per tenant.
5. **Generalisation boundary** — how far the ILCO baseline transfers to a *different* vertical (pharmacy vs cultivation) before it needs fresh grounding.

## 7. Non-negotiables
- No regulatory artifact renders as fact without a retrieved citation **and** specialist sign-off.
- Regulated corpora stay on-prem (Ollama), tenant-isolated.
- The pipeline *proposes*; humans *dispose*. It accelerates onboarding; it does not replace compliance judgement.
