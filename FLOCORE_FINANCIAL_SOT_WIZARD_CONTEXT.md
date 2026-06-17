# FLOCORE ← ILCO-TnT — Financial Source-of-Truth wizard (owner-private model build)

_From the ILCO-TnT (tnt-za) module + Origin POS, 2026-06-14. Companion to `FLOCORE_ORCHESTRATOR_RECOMMENDATION.md`, `tnt-za/FLOCORE_OPERATIONS_DRIVER_CONTEXT.md`, `FLOCORE_AI_ARCHITECTURE_FEEDBACK.md`. Owner context: Coenie & Ilse Venter (ILCO owners / AR-DAR)._

## TL;DR
ILCO has a 10-year three-statement forecast (Brightstar Advisory, "Business Plan 2025"). The owner's verdict: **the history in it is real, the forecast is invented** — built by an outside advisor on placeholder assumptions, frozen at 2024-12-31, never reconciled to what 2025 actually did. The fix is **not** to ask the owners to hand us their books. It's a **self-service wizard, owner-private**, that:
1. **Pre-fills every line we already hold** from live operational truth — production from ILCO-TnT, sales/COGS from Origin POS — so the owners only key in the confidential financial lines we don't have.
2. Keeps the raw financial inputs **tenant-scoped and owner-classified** — never shared up to the platform, across modules, or to the dev/agent layer.
3. Emits the rebuilt forecast as a **micro-model artifact**, Sentinel-governed for assumption-vs-actual drift.

FLOCORE orchestrates the **data flow and the sovereignty boundary** — it never sees, stores, or routes the raw figures.

## The boundary (who supplies which truth)
| Truth | Source | Visibility |
|---|---|---|
| **Operational truth** — crop size, yield by grade, clones, sales volume/price | ILCO-TnT forms + Origin POS (live) | tenant-scoped; pre-fills the wizard |
| **Financial truth** — historic AFS, opening balance sheet, cost lines, loan terms, scenario factors | **Owner enters in the wizard** | **CONFIDENTIAL_OWNER** — never leaves the tenant |
| **The model** — three-statement forecast + scenarios + covenants | generated from the two above | owner + AR only; exportable by owner |
| **Orchestration** — pre-fill read model, event routing, sovereignty enforcement, micro-model registry, drift Sentinel | **FLOCORE** | governs flow, **blind to raw financial values** |

So: **the owner enters financial truth once, privately; the platform supplies operational truth automatically; FLOCORE wires and governs — it does not read the books.**

## The wizard (steps map 1:1 to the Brightstar model inputs)
Each step shows the line, who fills it, and the live pre-fill source. Pre-filled = read-only suggestion the owner confirms/overrides.

| # | Step | Model input (Brightstar "Data Input") | Pre-fill source | Owner enters |
|---|---|---|---|---|
| 1 | **Historic financials** | FY22–24 income statements, opening balance sheet | — | ✅ confidential |
| 2 | **Production actuals** | Crop Size (#plants), Crop Yield A/B/Pops/Trim (kg) | **ILCO-TnT** Harvest Request · Cultivation Activity Log · weigh-&-grade | confirm/override |
| 3 | **Clones** | Clone production / sales / price | **ILCO-TnT** Daily Check – Clone Room · Cloning Schedule | confirm/override |
| 4 | **Sales** | Sales volume + selling price per grade | **Origin POS** sales (+ TnT↔POS bridge #25) | confirm/override |
| 5 | **Cost base** | Cost of Sales + Operating Cost lines (Grow Medium, Eskom, Solar, Fertilizer, Packaging, COA, Staff, Pest, PPE, Security, Maintenance…) | **ILCO-TnT** FM cost-capture (gap — to build) | ✅ owner tops up |
| 6 | **Funding** | Loans (I. Venter, Hardus Boerdery, New Loan), terms, covenants | — | ✅ confidential |
| 7 | **Scenarios** | Base / downside / upside factor adjustments (today all 0) | suggested from actual variance | ✅ owner sets |
| 8 | **Generate & review** | Three-statement forecast, ratios, DSCR/leverage covenants | computed | owner reviews + exports |

The wizard is the **commissioning ↔ training tie-in**: every pre-filled cell exists only because a *trained role captured a form* this week (Cultivation→production, Processing→grade/yield, QA→COA, FM→costs, Sales→POS). A role's training outcome is **measured** by whether its wizard pre-fill populates from live data — the operational truth and the financial model become the same spine.

## Event envelope (tenant-scoped, sovereignty-tagged)
```jsonc
// type: "finmodel.prefill.requested" | "finmodel.input.saved" | "finmodel.forecast.generated"
{
  "event_id": "...", "tenant_id": "...", "type": "finmodel.input.saved",
  "actor_id": "user:owner", "entity_type": "finmodel_step", "entity_id": "step-5",
  "timestamp": "...",
  "payload": {
    "tenant_slug": "ilco", "module_id": "ilco-tnt", "wizard": "financial-sot",
    "step": "cost_base", "status": "CONFIRMED",
    "classification": "CONFIDENTIAL_OWNER",   // FLOCORE routes metadata only — NEVER the values
    "valueRef": "vault://ilco/finmodel/step-5", // values stay in the tenant vault, not in the event
    "prefillUsed": true, "prefillSource": ["ilco-tnt:costs","origin-pos:cogs"]
  },
  "metadata": { "source": "ilco-tnt", "correlation_id": "..." }
}
```
**Rule:** events carry *references + classification + provenance*, **never raw financial values**. Pre-fill is a tenant-scoped read; saved inputs live in a tenant vault FLOCORE can address but not read.

## Maps to FLOCORE primitives
- **Cross-module context (read model)** — supplies the pre-fill: TnT production + POS sales, tenant-scoped, no cross-tenant access. (Orchestrator responsibility #3.)
- **Micro-model** — the rebuilt forecast is a per-tenant **micro-model artifact** (aligns with the FLOCORE MM/distillation direction); inputs are owner-private, the *structure* is shared.
- **Sentinels** — a **Forecast-Drift / Assumption-Sanity Sentinel**: flags when a forecast assumption diverges from rolling actuals (the exact failure in the JP model — R6.5m actual → R25.6m forecast). Governs credibility, not content.
- **Identity & tenancy** — an **OWNER / AR-only** access scope on the wizard + vault; not visible to staff roles, other modules, or the agent layer. (Ties to open decision D1.)
- **Business rules** — which lines auto-fill vs require owner entry; which require AR co-sign before the model is "board-ready."

## What we need back from FLOCORE
1. A **data-classification / visibility contract** — how `CONFIDENTIAL_OWNER` is enforced end-to-end (event routing carries metadata only; a tenant vault FLOCORE addresses but cannot read).
2. The **cross-module read API** shape for pre-fill (TnT production + POS sales, tenant-scoped).
3. Where a **micro-model artifact** is registered/stored per tenant, and the Sentinel hook for drift.
4. The **OWNER/AR access scope** in the identity contract.

## Open decisions (owner — Floris / Coenie)
- **D3 — Financial data sovereignty:** confirm raw financial inputs are visible to **owner + AR only**, never to dev/agent/platform-up, with a tenant-side vault. (Our recommendation; this is the whole point of the wizard.)
- **D4 — Deliverable shape:** re-based **Excel** in Brightstar's engine first (familiar to lenders/board), the **in-platform wizard/module**, or Excel-now-platform-next. (Recommendation: Excel now for Coenie, wizard/module next as the live feeds mature.)
- **D5 — Build the FM cost-capture + Processing weigh-&-grade instruments** (the two missing live feeds for steps 2 & 5) as part of this week's commissioning, so the cost and revenue-mix lines pre-fill instead of being hand-keyed.

_Secrets/financials stay server-side, tenant-scoped, never committed. No regulatory/licensing claims are asserted here — financial/architectural scope only._
