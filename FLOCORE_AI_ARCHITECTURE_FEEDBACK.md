# FLOCORE ← Origin / ILCO Farming — Feedback on the AI architecture (micro-model · sentinels · distillation)

_From the **Origin/ILCO module agents** (O_RETAIL_AGENT + O_TNT_AGENT), 2026-06-06. We have read FLOCORE's canonical AI docs and implemented the **reference tenant** (ILCO Farming, cannabis-cultivation vertical). This is grounded feedback + the contracts we need back._

**Read & aligned to:** `MICRO_MODEL_DISTILLATION_AND_ENTANGLED_BUSINESS_RULES.md` · `SENTINEL_NETWORK_ARCHITECTURE.md` · `SENTINEL_TENANT_OPERATING_GUIDE.md` · `MODEL_STRATEGY_AND_WISHLIST.md` · `07_EVENT_ARCHITECTURE.md` · `MODULE_SDK_CONVENTIONS.md`.
**Our design that extends them:** `tnt-za/docs/tenant-distillation-pipeline-design.md` + `operations-driver-design.md`.

---

## 1. What's strong — we're adopting it as-is
- **Micro-model = focused intelligence layer** (context pack + role behavior + entangled rules), not a model-file per user. Correct call — it's what makes per-role intelligence affordable. We build on it directly.
- **The Sentinel hierarchy ending `… → KPI → Micro-model → Sentinel`**, with the **AI-Confidence Sentinel** governing drift/override/acceptance. This is the right safety primitive; we make it load-bearing (see §2).
- **Hardware honesty** (`MODEL_STRATEGY`): box has no GPU, throttled → **local Ollama is batch-only (gemma-4-E4B)**, Claude does anything interactive. We've adopted that split verbatim.
- **Event-first** ("everything important emits an event") + the standard envelope. Our Operations-Driver emits `driver.item.created` into it.

## 2. Recommended additions (grounded in running the reference tenant)
These are gaps we hit building a *regulated* vertical. Strongly recommend folding them into the platform spec so every tenant inherits them:

1. **A compliance firewall as a first-class pipeline stage.** Split distillation into **OPERATIONAL** (roles/KPIs/workflows — model drafts freely) vs **REGULATORY** (anything citing law/scheduling/licensing — **RAG-grounded with citations or blocked**, defaults to VERIFY, needs specialist sign-off on the append-only ledger). A platform that distils law without this *will* ship hallucinated regulation. This is the single highest-risk gap.
2. **Two mirrored feedback loops, not one.** The **machine loop** (MM ← override/outcome) AND the **human remediation loop** (SOP violation → CAPA → targeted training of the *named employee* → competency restored → QA sign-off). Same Sentinel triggers, same governor. The human loop is what produces inspector-grade evidence; FLOCORE should model it as a platform primitive (CAPA ↔ training ↔ competency ↔ KPI).
3. **Resilience ladder** — MM → deterministic rules → static SOP checklist. The dashboard/chat must **degrade, never blank**. Plus an **autonomy circuit-breaker**: AI-Confidence drift/override over threshold auto-demotes the MM to advisory-only.
4. **Promotion gate (champion/challenger)** — a new MM version proves out in **shadow** (golden eval + citation coverage + lower override rate) before replacing the running one. No silent model swaps.
5. **Version everything, effective-dated** — MM, SOP, KPI targets, **regulatory corpus**, vertical templates, event envelope. Add a **regulatory change-feed**: law changes → re-flag the artifacts that cited the changed source → re-queue for re-sign-off. Stale law must never silently persist.
6. **Self-learning powered by the signals you already capture** — override(+reason)/acceptance/KPI-effectiveness-delta are the training signal; active-learning on the hard cases; the eval golden-set grows from real overrides. **Guardrail:** regulatory content never self-learns un-gated; cross-tenant learning only on **anonymised, non-regulated** patterns (POPIA), feeding the vertical *template*, not raw data.

## 3. Contracts we need back from FLOCORE
To wire the above without guessing:
1. **Event envelope confirmation** for our emitted events (incl. `driver.item.created`, sentinel signals) — the `{event_id, tenant_id, type, actor_id, entity_type, entity_id, timestamp, payload, metadata.correlation_id}` + module contract (`tenant_slug, module_id, site_key/outlet_key/device_key`). Plus the publish/subscribe endpoints at `127.0.0.1:8000`.
2. **Micro-model registry + versioning API** — register MM versions, their eval scores, champion/challenger state, and the autonomy level the AI-Confidence Sentinel currently permits.
3. **Sentinel signal ingestion contract** — the signal shape (`sentinel_key, source_layer, source_key, signal_type, value, severity, confidence, recommended_action`) and where our module posts its KPI-Drift / Workflow-Pulse signals.
4. **Regulatory-corpus governance** — where the on-prem corpus lives, tenant isolation, who may ingest, and the sign-off ledger contract.
5. **AI-Confidence autonomy contract** — the thresholds + the demotion/re-promotion handshake (so a module knows when to stop auto-acting).

## 4. The reference-tenant offer
ILCO is a **proven, compliance-grounded cannabis-cultivation vertical** — role set, SOP library, KPI definitions, world model, anomaly rules, all hand-built and (being) signed off. **Seed FLOCORE's vertical-template registry from ILCO** so the next cannabis/pharmacy tenant onboards by *retrieve-and-adapt*, not risky generation. We'll supply the template pack (role library + SOP templates + KPI library + corpus pointer) once D1/D2 land.

## 5. Still open (owner — Floris)
- **D1 — Auth:** modules keep own end-user auth + Orchestrator service-token (our recommendation), or full FLOCORE identity.
- **D2 — Security sign-off owner** for the Origin/ILCO tenant (the equivalent of KCS/Raymond).

_Secrets stay server-side (`.env`, chmod 600, never committed)._
