# ILCO / Origin — Scoped Wave List & Tasks (refresh 2026-06-14)

Living scope after the 14 Jun threads: owner dashboard presentation, Coenie's financial model, Ilse's chicken module, the POS variance-close model, and the site commissioning → "source of truth" story. Status key: ✅ shipped · 🟡 ready/in-progress · ⬜ pending · 🔵 needs-owner-input.

---

## A. CLARITY — Coenie's financial solution (what actually gets "rebuilt")

Coenie asked "what gets rebuilt in the spreadsheet — I'm not sure." Plain answer:

**1. What we do NOT touch (stays as-is):** Brightstar's *calculation engine* — the profit / cash-flow / balance-sheet maths, the loan & covenant logic, the scenario machinery. It's professionally built. We keep it. Think: **same calculator.**

**2. What we replace (the "rebuild"):** ONLY the **input numbers** — the invented forecast (crop size, yield, selling prices, sales volumes, costs, the flat R28m growth line) swapped for ILCO's **real figures + honest base/downside/upside scenarios.** Think: **real numbers into the same calculator.** That alone turns the fairy-tale forecast (R6.5m break-even → assumed R25.6m at 54% margin) into something a bank or board will believe.

**3. What's new (the upgrade):** instead of a once-off spreadsheet that goes stale on a shelf, the real operational numbers **flow in from the live farm + till systems**, and Coenie loads the confidential financial lines **himself, privately** (the wizard) — so nobody ever has to hand over the books.

**The choice (Coenie / Floris pick the delivery):**
| Option | What it is | Best when | 
|---|---|---|
| **1 · Re-based Excel** | put the real numbers into the existing Brightstar Excel | a bank/board needs a credible pack **now** — fastest |
| **2 · Live in-platform model** | built into the owner dashboard, fed by live data, never stale | long-term truth; bigger build |
| **3 · Excel now → platform next** ⭐ | do Option 1 this week, evolve to Option 2 | **recommended** — credible immediately, self-updating later |

🔵 **Decision needed (D4):** which option. Recommendation: **Option 3.**
🔵 **Decision needed (D3):** confirm financial inputs are owner+AR-only, never shared to dev/platform (the whole point of the private wizard).
🔵 **Decision needed (D5):** build the FM cost-capture + Processing weigh-&-grade feeds during commissioning so the cost & revenue-mix lines self-fill.

Artefacts already produced: `FLOCORE_FINANCIAL_SOT_WIZARD_CONTEXT.md`, `ilco-financial-model-review-coenie.pdf` (EN), `ilco-finansiele-model-oorsig-coenie-AF.pdf` (AF).

---

## B. WAVE 11 — Owner Dashboard presentation (Coenie & Ilse · THIS WEEK)

Existing dashboard is smart (live AI concierge), responsive, mostly connected. Demo-blockers + polish, ranked:

**Tier 1 — must-fix before the demo (½ day, no commissioning data needed)**
- ⬜ **W11.1 · Owner identity** — rename `Ilze`→**Ilse Venter**, add a real **Coenie Venter** owner login (TENANT_ADMIN). Kills "Good morning, Ilze"; makes Coenie's first login personal. *(highest leverage)*
- ⬜ **W11.2 · Kill the lone "0"** — hide the Assets card unless `total>0`.
- ⬜ **W11.3 · "Inspection / SMF ready" headline tile** — GMP ACTIVE + SMF 58/58 current + 0 stale (already computed, just surface).
- ⬜ **W11.4 · Retail-tab zero-state** — demo after a morning sale OR ring a live sale; ensure stock numbers (74 SKUs) carry the panel when today's sales are R0.

**Tier 2 — make "smart" visible (1 day)**
- ⬜ **W11.5 · Render world-model risk gauges** (diversion / compliance / weight-integrity already computed, unused).
- ⬜ **W11.6 · Bottleneck Radar never blank** — summary line "X open, oldest Yh" so it's not an empty green "all clear".

**Tier 3 — connected production story (needs commissioning data)**
- ⬜ **W11.7 · Harvest/yield panel** — kg harvested + yield vs strain target *(blocked on real weights — W8.3 / container events)*.
- ⬜ **W11.8 · Revenue trend 7/30-day** from Origin bridge *(needs bridge history — coord O_RETAIL_AGENT)*.

**Tier 4 — framing**
- ⬜ **W11.9 · Farm-unit tabs** — Cannabis live; Retail live; **Chickens = Ilse's real module (see Wave 13)**; Mielies/Cattle → clear "Roadmap Q3" lock.
- ⬜ **W11.10 · Pre-warm the AI concierge brief** before the meeting (~15s on-demand) so it appears instantly.
- ⬜ **W11.11 · Staff-name consistency** — align staff table to canonical SMF surnames (Renae Purdon / Lourens Eksteen / Berne Swart / Ilse Venter) so it matches the concierge.

_Deploy: any change needs a fresh `frontend/dist` build → `tr-api:/var/www/tnt-za/frontend/dist`. No infra blockers (Opus key + Origin bridge live)._

---

## C. WAVE 12 — Coenie financial model (per Section A)
- 🔵 **W12.0 · Pick delivery option** (D4) + sovereignty (D3) + feeds (D5).
- ⬜ **W12.1 · Re-base Excel** — real 2024 ops (in-sheet) + real 2025/YTD-2026 actuals + honest scenarios + real loans/opening balance. *(needs Coenie's confidential inputs — via wizard or direct)*
- ⬜ **W12.2 · Owner-private financial wizard** — steps map 1:1 to model inputs; pre-fill from TnT + POS; confidential lines owner-entered, tenant-vaulted.
- ⬜ **W12.3 · FM cost-capture feed** + **Processing weigh-&-grade feed** (the two missing live instruments for cost & revenue-mix).
- ⬜ **W12.4 · Forecast-drift Sentinel** — flag assumption vs rolling actual (the exact JP failure).

---

## D. WAVE 13 — Ilse's chicken farm module (NEW)
Ilse (co-owner) runs a real chicken farm — the dashboard "Chickens" tab must become a real unit, not a placeholder.
- 🔵 **W13.0 · Discovery** — what exists today (any system/sheets?), what Ilse tracks (flock size, feed, eggs/broilers, mortality, sales), and what's needed for the demo vs later.
- ⬜ **W13.1 · Minimum real Chickens tab** — wire at least a few real Ilse metrics so her unit isn't "coming soon" in front of her.
- ⬜ **W13.2 · Chicken module proper** — production + costs + sales feeding the owner view (and, later, Ilse's slice of the financial model).

---

## E. Carry-over (re-confirmed scope)
- 🟡 **POS variance-close model** (own-login close + mandatory note on any variance + owner review + email ray@ilcofarming.co.za) — **specced, build PENDING** your go. Till is unblocked + trading. (folds into #50)
- ⬜ **Site commissioning + role training → source of truth** (this week) — each trained role's form feeds an owner-dashboard + financial-model input. (#51)
- ⬜ Existing pending waves unchanged: W7.3, W8.2-done/8.3/8.4, W9.2, W10.3/10.4/10.6.

---

## Owner decisions outstanding
- **D3** financial data sovereignty (owner+AR only) · **D4** model delivery option (rec: Excel-now-platform-next) · **D5** build FM-cost + Processing feeds this week · **Coenie login email** · **POS variance model — ship?** · **Ilse chicken farm — discovery inputs**
