# TnT-ZA — In-Dashboard Bug & Idea Assistant (per role) → Owner Backlog + Kanban

**Goal:** every role can report a bug or suggest an enhancement in **plain language, from any screen, in one tap**. A small AI assistant captures it, auto-fills the context (who/where/what), classifies it, and files it to an **owner-only working backlog + draggable kanban**. Turns every person on the farm + every network pharmacy into a live feedback channel — the owner sees exactly what's breaking and what people want, in one board.

**Principle:** the reporter does ~10 seconds of work (type a sentence); the **AI does the structuring**. Build native, reuse TnT-ZA's existing `tickets` + `kanban` pages and `baygrid.service.createTicket` rather than a new system.

---

## 1. Entry point (same on every dashboard)

- A persistent **"Feedback"** affordance in the dashboard chrome (bottom-right floating button, Origin icon — no emoji), present on every role layout via `DashboardLayout.tsx`.
- One tap opens a compact assistant panel: *"Found a bug or have an idea? Tell me in your own words."*
- Works on mobile (nursery/processing staff are on phones) and desktop (FM/QA/RP).

## 2. What the assistant auto-captures (no typing)

Pulled from the session + router the moment it opens — the reporter never fills these:

| Field | Source |
|---|---|
| `reporterId`, `reporterRole`, `reporterName` | auth/session |
| `facilityId` / facility name | session `primaryFacility` |
| `page` + `route` | current React route (e.g. `/daily-check`, `DailyCheckPage`) |
| `lastAction` | last few user events (optional ring buffer) |
| `appVersion`, `userAgent`, `timestamp` | client |
| `screenshot` (optional) | one-tap capture of current view |

## 3. The AI flow (Claude)

1. Reporter types one sentence (or dictates).
2. Assistant calls the LLM to:
   - **Classify** `type` = BUG · ENHANCEMENT · QUESTION, and `severity` = LOW · MED · HIGH · CRITICAL (a Cultivator's "scanner won't load" on `/scan` = HIGH; "would be nice to sort plants by age" = LOW enhancement).
   - **Generate** a clean `title` (≤ 8 words) + a 1-line `aiSummary`.
   - Ask **at most 1–2 clarifying questions** only if essential ("which plant ID?", "did it error or just hang?"). Never interrogate.
   - Flag a likely **duplicate** if it matches an open item (semantic match on title/page).
3. Reporter confirms → item is filed. Done in seconds.

The role + page are fed to the model as context so it asks role-appropriate clarifiers and writes the title in the right domain language.

## 4. Per-role behaviour

The assistant is the same component everywhere; the **context + clarifiers adapt to the role's pages**.

| Role | Typical pages | Example report → what it becomes |
|---|---|---|
| **Facility Manager** | dashboard, facility360, qms, dispatch | "The anomaly count looks wrong" → BUG/MED · title "Anomaly count mismatch on FM dashboard" · page `/dashboard` |
| **Nursery Manager** | baygrid, plants, feeding, daily-check | "Can't assign staff to the clone room" → ENHANCEMENT/MED · `/baygrid` (ties to shift-allocation gap) |
| **Nursery Staff** | scan, daily-check, feeding, mortality | "Scanner won't open the plant" → BUG/HIGH · `/scan` · screenshot attached |
| **Cultivation Mgr / Head Grower** | plants, ipm-scouting, harvest-request, env-log | "IPM photo won't upload" → BUG/HIGH · `/ipm-scouting` |
| **Processing (Mgr + Trimmer)** | trim, containers, lab, dispatch | "Trim weight-out won't save" → BUG/CRITICAL · `/trim` |
| **QA / Compliance** | qa-sign-off, qms, gmp-audit, audit | "Need a reject-with-reason button" → ENHANCEMENT/HIGH · `/qa-sign-off` (matches QA-decision gap) |
| **Responsible Pharmacist** | responsible-pharmacist, batches | "Schedule-6 register won't let me sign" → BUG/CRITICAL · `/responsible-pharmacist` |

(Head-of-Cultivation = **GroOS**, separate app — its own feedback channel, not here.)

## 5. Data model (Prisma — extends ticketing)

```prisma
model FeedbackItem {
  id           String   @id @default(uuid())
  type         String   // BUG | ENHANCEMENT | QUESTION
  severity     String   @default("MED") // LOW|MED|HIGH|CRITICAL
  title        String
  body         String          // reporter's words
  aiSummary    String?
  context      Json            // {page, route, facility, lastAction, userAgent, appVersion}
  screenshotUrl String?
  status       String   @default("NEW") // NEW | TRIAGED | IN_PROGRESS | DONE
  boardOrder   Float    @default(0)     // for drag ordering
  duplicateOf  String?
  resolution   String?
  reporterId   String
  reporterRole String
  tenantId     String
  facilityId   String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  @@index([tenantId]) @@index([status]) @@index([reporterRole]) @@index([type])
}
```

## 6. Owner backlog + kanban (owner-only)

- New page `/feedback-board` — gated to owner / SUPER_ADMIN / TENANT_ADMIN.
- **Columns:** New → Triaged → In Progress → Done. **Drag-and-drop** to move + reorder (`boardOrder`).
- **Card:** title, type chip (bug/enhancement), severity dot, role + facility + page, reporter, age. Click → full body, AI summary, screenshot, context.
- **Filters:** role · facility · type · severity · search. Counts per column.
- **Actions:** set severity, mark duplicate, **convert to dev task** (creates a `tickets`/Kanban task linked back), add resolution, archive.
- Optional: notify reporter on status → DONE ("the thing you flagged is fixed").

## 7. Backend API (Express + Prisma)

- `POST /api/feedback` — reporter files (any authenticated role); server attaches reporterRole/tenant/facility, stores body + context; calls the AI classify/summarize step (server-side, so the API key isn't on the client).
- `POST /api/feedback/classify` — LLM step (type/severity/title/summary/dup-check); can be folded into POST.
- `POST /api/feedback/:id/screenshot` — multer/S3 upload.
- `GET /api/feedback` — **owner board**, filters + pagination (RBAC: level 4+).
- `PATCH /api/feedback/:id` — status/severity/order/resolution (owner).
- `POST /api/feedback/:id/to-task` — convert to a dev ticket (reuse `createTicket`).

## 8. Frontend

- `<FeedbackAssistant/>` — floating button + panel, mounted once in `DashboardLayout`; reads route + session for auto-context; conversational capture; optimistic "Sent — thanks".
- `FeedbackBoardPage` — the owner kanban (reuse the existing `KanbanPage` drag mechanics + board styling).

## 9. Reuse / non-goals

Reuse: auth, RBAC, tenants, S3, `tickets`/`kanban` pages + `baygrid.service.createTicket`, notification.service, the Claude integration used elsewhere. **Non-goals:** public feedback, voting/roadmap portal, SLA automation — this is an internal owner backlog.

## 10. Phasing

1. Schema + `POST /api/feedback` (with auto-context) + the floating assistant (no AI yet — manual type/severity).
2. AI classify/summarize/clarify step.
3. Owner `/feedback-board` kanban (list → drag → filters).
4. Screenshot capture, convert-to-task, duplicate detection, reporter notify.
