# FLOCORE ← ILCO-TnT — Operations Driver context (FLOCORE drives the actions)

_From the ILCO-TnT (tnt-za) module, 2026-06-06. Companion to `FLOCORE_INTEGRATION_RESPONSE.md` + `FLOCORE_AI_ARCHITECTURE_FEEDBACK.md`._

## The boundary (who does what)
The module is deliberately **thin on action**. It runs the loop up to *surface*, then hands off:

| Stage | Owner |
|---|---|
| **SENSE** — events + scheduled tick recompute world state + KPIs | ILCO-TnT module |
| **EVALUATE** — rules engine turns KPIs/anomalies/inferences/overdue SOPs+tasks into **DriverItems** (idempotent by `dedupeKey`) | ILCO-TnT module |
| **SURFACE** — per-role read-only "what to do now" queue on the dashboard + co-pilot | ILCO-TnT module |
| **ACT** — tickets · allocation · escalation · CAPA/training · SLA | **FLOCORE** (business-rules / serviceops engine) |
| **GOVERN** — AI-Confidence / KPI-Drift / Workflow-Pulse sentinels | **FLOCORE** |

So: **the module emits a driver; FLOCORE decides and drives the action.** This keeps action logic central, cross-module, and Sentinel-governed — not duplicated per module.

## The event FLOCORE consumes
Every newly-created (and updated/resolved) DriverItem is emitted on the event bus, ready for FLOCORE's envelope:

```jsonc
// type: "driver.item.created" | "driver.item.updated" | "driver.item.resolved"
{
  "event_id": "...", "tenant_id": "...", "type": "driver.item.created",
  "actor_id": "system:driver", "entity_type": "driver_item", "entity_id": "<uuid>",
  "timestamp": "...",
  "payload": {
    "tenant_slug": "origin", "module_id": "ilco-tnt",
    "role": "NURSERY_MANAGER",                // target role (7-role taxonomy below)
    "severity": "HIGH",                        // LOW|MEDIUM|HIGH|CRITICAL
    "sourceType": "KPI_BREACH",               // see action map
    "title": "Clone rooting off target",
    "detail": "clone_rooting_pct: 78% vs target 85%",
    "evidence": { "metric": "clone_rooting_pct", "target": 85, "actual": 78 },
    "dedupeKey": "kpi:NURSERY_MANAGER:clone_rooting_pct",  // FLOCORE keys actions on this
    "linkUrl": "/dashboard", "status": "OPEN"
  },
  "metadata": { "source": "ilco-tnt", "correlation_id": "..." }
}
```

## Action map — what FLOCORE should drive per `sourceType`
| sourceType | What it means | Recommended FLOCORE action |
|---|---|---|
| `KPI_BREACH` | a role KPI is worse than target | open a corrective **serviceops ticket** routed to that role; SLA per severity |
| `ANOMALY` | unresolved anomaly (8 rules) | **escalate** to senior roles + ticket; CRITICAL → owner ack required |
| `INFERENCE` | world-model inference (diversion pattern, quota pressure, lab bottleneck…) | advisory + ticket if severity ≥ HIGH |
| `SOP_OVERDUE` | SOP training incomplete / deviation | trigger **CAPA + targeted training** to the *named employee* → Academy → competency gate (the human remediation loop) |
| `TASK_OVERDUE` | a checklist task past due | reassign / escalate to role owner |

## Idempotency + lifecycle (so FLOCORE never double-acts)
- **`dedupeKey` is stable** per underlying condition. FLOCORE keys its driven action on `tenant_id + dedupeKey`. Re-emission of the same key = an update, not a new action.
- When the underlying signal clears (KPI recovers, anomaly resolved, SOP trained, task done), the module sets the DriverItem `status: RESOLVED` and emits **`driver.item.resolved`** → FLOCORE closes/auto-resolves the linked action.
- FLOCORE's driven artifacts (ticket id, training assignment) can be written back via its own events; the module reflects their status on the role queue (read-only) so the dashboard and FLOCORE stay in sync.

## Role taxonomy (target roles)
`FACILITY_MANAGER · NURSERY_MANAGER · NURSERY_STAFF · HEAD_OF_CULTIVATION (Cultivation Mgr/Head Grower) · PROCESSING_MANAGER · QA_INSPECTOR · RESPONSIBLE_PHARMACIST`. (GroOS/Head-of-Cultivation-owner = separate app, excluded.)

## Maps to FLOCORE primitives
- **serviceops** (FLOCORE's seed module: tickets/queues/SLAs/escalations) = where KPI_BREACH/ANOMALY/TASK_OVERDUE drivers become tickets.
- **Business rules (entangled)** = the policy that decides auto-act vs advise, wired to role ↔ KPI ↔ workflow ↔ compliance.
- **Sentinels** = the governor: the AI-Confidence Sentinel decides whether FLOCORE may auto-act on a driver or must route it for human approval (autonomy circuit-breaker).
- **Event envelope + module manifest** = per `MODULE_SDK_CONVENTIONS.md`; the driver events are declared in the ILCO-TnT manifest's `events`.

## What we need back
Per `FLOCORE_AI_ARCHITECTURE_FEEDBACK.md` §3: the event publish/subscribe endpoint + envelope confirmation, the serviceops ticket-create contract (so a driver maps cleanly to a ticket), and the AI-Confidence autonomy thresholds (when FLOCORE auto-acts vs asks a human). Owner decisions D1 (auth) + D2 (security owner) still open.
