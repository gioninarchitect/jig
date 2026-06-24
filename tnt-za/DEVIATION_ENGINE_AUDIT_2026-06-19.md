# TnT-ZA Deviation Engine — Accuracy & Workflow Audit
**19 June 2026 · read-only static analysis (subagent) · file:line cited**

## Headline
The engine works, but there are **8 findings, several GMP-critical**. The single biggest structural issue: there are **two parallel registers** — the formal `Deviation` table (CAPA-tracked) and the `Anomaly` table (threshold detections) — and **they never cross over**. Weight-variance / yield / destruction signals become *Anomalies*, never *Deviations*, so an inspector reading the Deviation register sees zero weight-integrity events.

## Where deviations are raised
**Deviation table:** manual (`qms.service.ts:80`), mother cull (`baygrid.service.ts:432`), subrow re-strain (`:1096`), bulk spot action (`:1179`), harvest pulled-earlier (`:960`), processing/QA form FAIL (`tasks.service.ts:121`).
**Anomaly table (separate):** container weight variance, zone mismatch, plant weight-loss >15%, yield deviation >20%, destruction rate >30%, container stale, transport time, inventory discrepancy, trim variance >2%.

## Findings, ranked (with fixes)
1. **🔴 Close NOT gated on QA approval** — `qms.service.ts:135` `closeDeviation` sets `closedAt` with no check that `qaApprovedById` is set; both approve+close are only `requireLevel(3)` and RP is level 4 → **an RP can close a deviation QA never reviewed.** Segregation-of-duties failure. *Fix: throw if `qaApprovedById == null`.*
2. **🔴 Cascade deviations swallowed by `.catch(() => {})`** — `baygrid.service.ts:432,1096,1179`; `tasks.service.ts:98`. If the helper throws (e.g. no SOP found), the floor action still succeeds but **the compliance record silently vanishes.** *Fix: log + persist a fallback, never drop silently.*
3. **🔴 DESTRUCTION_RATE notifies nobody** (`batch.service.ts:117`, no notify block) and **trim-variance evaporates** (`trim.service.ts:92` emits an event with no listener/row). Both are textbook diversion signals firing into the void. *Fix: add FM+TENANT_ADMIN+SUPER_ADMIN notify; persist trim variance.*
4. **🟠 Auto-raised deviations have no `level`** — every direct `prisma.deviation.create` in baygrid/tasks bypasses `createDeviation`'s 1/2/3 derivation (`qms.service.ts:79`), so the ILCO Critical/Serious/Minor classification is **blank for all auto-events.** *Fix: route cascades through `createDeviation`.*
5. **🟠 No dedup on formal deviations** — `baygrid.service.ts:1110`, `tasks.service.ts:121`. Re-saving a failed form or culling the same row twice raises duplicates. (The Anomaly side *does* dedup; the CAPA register doesn't.) *Fix: check for an open deviation on same referenceId first.*
6. **🟠 QA routing comment ≠ code + hard-coded Flo email** — comments at `baygrid.service.ts:901,1101` claim "routed to … QA," but recipient queries (`:968,:1114`) contain **no QA_INSPECTOR** — only `florisolivier7@gmail.com` hard-coded. *Fix: add QA_INSPECTOR (now that Keke is QA), replace literal email with role/config lookup.*
7. **🟠 Anomaly ≠ Deviation** (see headline). *Fix: on a critical Anomaly, also raise a linked Deviation — or document that Anomalies are the inspectable record.*
8. **🟡 No deviation SLA/escalation** — `driver.scheduler.ts` ages *tickets* only, not deviations; an open Critical can sit forever. `updateDeviation` (`qms.service.ts:110`) emits no event so **CAPA edits aren't audit-logged.** *Fix: add `escalateStaleDeviations`; emit an event on updateDeviation.*

## Thresholds
All hard-coded magic numbers scattered across files (weight 0.15/0.30, yield 0.20/0.40, destruction 0.3/0.5, trim 2/5, plant-change count 50/10, schedule days 14/7). No central policy table.

## Good news
Raise/approve/close **are** hash-chain audit-logged via the wildcard event listener (`audit.service.ts:76`). Anomaly side has dedup. Proportional severity by pot count works.

## Not run
Live `/qms/deviations?open=true` data check was blocked (sandbox) — re-run to confirm whether UAT culling/re-strain left duplicate noise (likely, given finding #5).
