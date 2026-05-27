# TnT-ZA Facility Manager Full UAT Pack

Version: 1.0  
Date: 17 May 2026  
Environment: UAT  
Live app: https://tntilco.cleva-ai.co.za  
Role under test: `FACILITY_MANAGER`

## Purpose

This full UAT pack validates that the Facility Manager can run day-to-day site operations in TnT-ZA with all critical actions persisted to the database, audited, and connected to the EU GMP grounded QMS workflow.

The Facility Manager test is not only an assistant demo or dashboard review. It must prove that operational CTAs work end to end across access control, dashboard, assets, labels, batches, environmental checks, tickets, deviations, SOP-linked tasks, training, mortality, assistant context actions, and audit evidence.

## Grounding Rule

EU GMP is the regulatory source of truth for this UAT. System behaviour must be checked against the active EU GMP source and control registry in the platform.

Expected source registry:

- EU GMP sources: `13/13`
- EU GMP controls: `7/7`
- SMF sections: `58/58`
- Active task templates: `38`
- Pending training records: `0`

## Test Identity

Use the active Facility Manager account from the live role baseline.

Primary FM accounts in the baseline:

- `fmilco@cleva-ai.co.za`
- `ray@ilcofarms.co.za`
- `ray@ilcofarming.co.za`

Important UAT note: outbound PIN emails are currently suppressed until explicitly enabled. Do not treat email delivery as passing until `EMAIL_DELIVERY_ENABLED=true` is set and tested.

## FM Responsibilities Under Test

- View operational dashboard and risk signals.
- Maintain oversight across all departments, department queues, workflow stages, and outstanding checklist/task load.
- Open and action role-specific tickets.
- Review batches and BCR-linked tasks.
- Manage asset and equipment issues.
- Confirm label accountability and QR identity flow.
- Monitor environmental checks and facility readiness.
- Raise and review deviations.
- Verify SOP, checklist, training, and task linkage.
- Use the AI assistant with FM-specific context actions.
- Confirm all actions create audit evidence.

## Main Demo Story: FM Assistant As The Operational Command Layer

The strongest FM demo is not to show the assistant as a generic chatbot. Show it as the Facility Manager's daily control point.

Talk track:

“As Facility Manager, I do not need to hunt through every module first. I can ask the assistant what needs my attention in my role. It reads my role context, points me to the correct operational areas, and gives me action buttons that take me directly into tickets, QMS, batches, labels, daily checks, assets, and audit evidence. The assistant does not replace the controlled workflow. It helps the FM get to the right controlled workflow faster.”

What to prove:

- The assistant knows the user is `FACILITY_MANAGER`.
- The assistant does not answer like a Super Admin, Tenant Admin, QA, or Lab role.
- The assistant returns FM-specific CTAs.
- The assistant routes the FM to persisted workflows, not disconnected advice.
- The assistant connects operational issues back to EU GMP/QMS expectations.
- The assistant helps triage risk into tickets, deviations, checks, labels, assets, and audit evidence.

## Assistant Demo Prompts For FM

Use these prompts live during the FM UAT demo.

| Prompt | Expected Assistant Behaviour | CTA Buttons To Showcase |
|---|---|---|
| `Start my FM oversight wizard for all departments.` | Opens a guided FM sequence with department ticket queues, workflow-stage pressure, outstanding tasks/checklists, and next action buttons. | Tickets, Tasks, QMS, Labels |
| `What needs my attention as Facility Manager today?` | Summarises FM-relevant work: tickets, batches, labels, daily checks, deviations, maintenance, mortality, audit signals. | Dashboard, Tickets, Batches, QMS |
| `Show me my EU GMP risks for facility operations.` | Frames risks around controlled operations, records, deviations, environmental checks, equipment, label control, and audit readiness. | QMS, SOP Library, Audit, Daily Checks |
| `What labels or QR records need control review?` | Points to label accountability, QR identity, asset/container name, misprint/destroyed status, and chain of custody. | Scan, Assets, Containers |
| `What batch records need FM review?` | Directs the FM to BCR status, missing checks, daily/environmental records, and batch-linked tasks. | Batches, Daily Checks, Audit |
| `Create a ticket for an out-of-range humidity reading and assign it to Facility Manager.` | Creates a persisted ticket with environment category, priority inferred from the issue, FM assignment, ticket ID, and workflow CTAs. | Tickets, Audit |
| `Create a SOP checklist reminder for facility readiness today.` | Creates a persisted task/reminder assigned to the FM user with due date, priority, task ID, and task/SOP CTAs. | Tasks, SOP Library |
| `Assign ticket <ticket-id-prefix> to Maintenance Manager.` | Updates the matching persisted ticket to assigned status and sets the department/role owner. | Tickets, Audit |
| `What evidence would an auditor ask me for on this issue?` | Lists audit trail, ticket, deviation, SOP, checklist, BCR, label record, and user/time evidence. | Audit, QMS, SMF |
| `Help me investigate a label accountability issue.` | Guides FM through asset/container ID, label status, reason code, user accountability, and deviation/ticket trigger. | Labels/Scan, Assets, Tickets, QMS |
| `What should I check before signing off facility readiness?` | Gives an FM readiness checklist: open critical tickets, daily checks, equipment calibration, labels, BCR exceptions, mortality, deviations. | Dashboard, Tickets, Assets, Audit |

## Assistant Showcase Script

1. Log in as Facility Manager.
2. Open the dashboard and point out that the FM sees operational responsibilities, not Super Admin configuration.
3. Open the assistant chat bubble.
4. Ask: `Start my FM oversight wizard for all departments.`
5. Confirm the assistant shows department ticket queues, workflow-stage pressure, and outstanding task/checklist load.
6. Click a wizard action such as `Create Issue Ticket` or `Create SOP Reminder`.
7. Copy the returned record ID and open `Tickets` or `Tasks` to prove the record persisted.
8. Return to the assistant and ask: `Show me my EU GMP risks for facility operations.`
9. Click `QMS` or `SOP Library` and show that the answer is grounded in controlled workflows.
10. Ask: `What evidence would an auditor ask me for on this issue?`
11. Click `Audit` and show that the system preserves action evidence.

Demo close:

“This is the value of the assistant for the Facility Manager. It is not just answering questions. It is reducing role drift, guiding the user into the correct controlled workflow, and keeping the work tied back to EU GMP, QMS, labels, batch records, tickets, deviations, and audit evidence.”

## Entry Routes

| Area | Route | Expected FM Result |
|---|---|---|
| Dashboard | `/dashboard` | FM dashboard loads with operational widgets |
| Tickets | `/tickets` | FM can see/action facility and operations tickets |
| QMS | `/qms` | FM can review deviations, SOP links, controls |
| Batches | `/batches` | FM can review BCR-linked operational status |
| SMF | `/site-master-file` | FM can view site master file sections |
| SOP Library | `/sop-library` | FM can view relevant SOPs and responsibilities |
| Audit | `/audit` | FM can review permitted audit evidence |
| Labels | `/scan`, `/assets`, `/containers` | FM can test QR and asset identity workflows |
| Mortality | `/mortality` | FM can review mortality events and escalation |
| Daily Checks | `/daily-check`, `/env-log` | FM can review environment and daily checks |

## UAT Test Cases

### FM-001 Login And Session

Steps:

1. Open `https://tntilco.cleva-ai.co.za`.
2. Request PIN for an active FM account.
3. Complete login using the current approved UAT login method.
4. Confirm the FM dashboard loads.

Expected:

- User is authenticated as `FACILITY_MANAGER`.
- User cannot see Super Admin-only controls.
- Session is persisted.
- `/api/auth/me` returns the FM role.

Evidence:

- Screenshot of dashboard.
- Audit/auth log entry if available.

### FM-002 Dashboard Readiness

Steps:

1. Open `/dashboard`.
2. Review operational widgets.
3. Confirm visible signals for tickets, batches, tasks, risk, compliance, and operational activity.

Expected:

- Dashboard is not blank.
- No broken CTAs.
- Counts match live data.
- FM sees operational work, not Super Admin-only setup.

Pass condition:

- All dashboard CTA buttons open valid pages.

### FM-003 AI Assistant Context Actions

Steps:

1. Open the AI assistant chat bubble as FM.
2. Ask: `Start my FM oversight wizard for all departments.`
3. Ask: `Show me my EU GMP risks for facility operations.`
4. Ask: `Create a ticket for an out-of-range humidity reading and assign it to Facility Manager.`
5. Ask: `Create a SOP checklist reminder for facility readiness today.`
6. Ask: `Assign ticket <ticket-id-prefix> to Maintenance Manager.`
7. Ask: `What evidence would an auditor ask me for on this issue?`
8. Click each returned context action.

Expected:

- Assistant recognises the FM role.
- Assistant treats FM as an oversight role across departments, not as a single-department user.
- Context actions point to valid app routes.
- Returned actions include FM-relevant areas such as tickets, batches, QMS, audit, daily checks, labels, containers, or assets.
- No actions point to routes the FM cannot access.
- Assistant guidance keeps the user inside controlled workflows and does not suggest informal/off-system resolution.
- Ticket creation commands persist to the Ticket table and return a ticket ID.
- SOP/checklist reminder commands persist to the Task table and return a task ID.
- Assignment commands update the persisted ticket owner/status when a valid ticket ID or prefix is supplied.

Pass condition:

- Every assistant CTA opens, is role-appropriate, and create/assignment/reminder commands persist to the database.

### FM-004 Ticket Creation And Persistence

Steps:

1. Open `/tickets`.
2. Create a facility issue ticket.
3. Assign category, severity, due date, owner, and notes.
4. Save.
5. Refresh the page.

Expected:

- Ticket remains after refresh.
- Ticket has status, creator, tenant, role/category, timestamp, and audit entry.
- Smart notification logic can reference the ticket.

Pass condition:

- Ticket is persisted in the database and visible in the correct FM view.

### FM-005 EU GMP Linked Deviation

Steps:

1. Open `/qms`.
2. Raise a deviation from an FM-relevant operational issue.
3. Link it to an SOP/control where available.
4. Add severity, root cause placeholder, CAPA action, owner, and due date.
5. Save and refresh.

Expected:

- Deviation persists.
- Deviation is linked to QMS context.
- Ticket or notification workflow is triggered where configured.
- Audit trail records the action.

Pass condition:

- Deviation can be reopened after refresh with the same data.

### FM-006 Label Accountability

Steps:

1. Open `/scan`, `/assets`, or `/containers`.
2. Validate a QR or label-linked asset/container.
3. Confirm the visible label contains the asset or container name plus unique ID.
4. Record a label exception if a label is misprinted, destroyed, or unused.

Expected:

- Asset name appears on QR label.
- Label state is accountable.
- Misprinted/destroyed label states require reason and user accountability.
- Label cannot silently disappear from the chain of custody.

Pass condition:

- Label action persists and audit evidence is created.

### FM-007 Batch Cultivation Record Trigger

Steps:

1. Open `/batches`.
2. Review an existing batch.
3. Confirm a Batch Cultivation Record exists for the batch.
4. Review linked checklist items.
5. Confirm daily/environmental records are connected or visibly pending.

Expected:

- Batch has a digital BCR.
- BCR is linked to checklists, SOP context, and required tasks.
- Missing required checks are visible.

Pass condition:

- Batch record is not just a display card. It has persisted operational evidence.

### FM-008 Daily Checks And Environment Logs

Steps:

1. Open `/daily-check` or `/env-log`.
2. Record or review temperature and humidity checks.
3. Check whether out-of-range values create ticket/deviation workflow.
4. Refresh and reopen the record.

Expected:

- Daily check persists.
- Out-of-range readings are escalated.
- Digital signature or user accountability is attached where configured.

Pass condition:

- Reading data survives refresh and creates traceable operational evidence.

### FM-009 Asset And Maintenance Workflow

Steps:

1. Open `/assets`.
2. Register or review a facility asset.
3. Confirm asset ID, asset name, category, status, and maintenance/calibration data.
4. Trigger or review maintenance ticket creation.

Expected:

- Asset has unique ID.
- Asset name appears in the record and label context.
- Maintenance action persists.
- Calibration or maintenance due logic is visible.

Pass condition:

- Asset workflow links to tickets and audit.

### FM-010 Mortality Escalation

Steps:

1. Open `/mortality`.
2. Record or review a mortality event.
3. Confirm affected batch, location, reason, count, and user are captured.
4. Confirm whether mortality above threshold triggers ticket/deviation workflow.

Expected:

- Mortality is not a free-text note only.
- Event links to batch/location and compliance review.
- Escalation is traceable.

Pass condition:

- Mortality event persists and can be audited.

### FM-011 SOP, Checklist, Training And Role Linkage

Steps:

1. Open `/sop-library`.
2. Confirm FM-relevant SOPs are visible.
3. Open `/tasks`.
4. Confirm FM task templates and checklist tasks exist.
5. Open HR/training area if available.

Expected:

- SOPs are connected to role responsibilities.
- Checklist tasks are connected to SOP/control context.
- Training records map to responsibility, task category, and assessment evidence.

Pass condition:

- FM role has no orphan SOP/checklist/training requirements.

### FM-012 Audit Evidence

Steps:

1. Open `/audit`.
2. Search or filter for recent FM actions.
3. Confirm created/updated records appear in the audit log.
4. Run audit verify if available to the role.

Expected:

- Audit trail shows who, what, when, tenant, entity type, and entity ID.
- Audit hash chain remains valid.

Pass condition:

- FM UAT actions are traceable after refresh.

## Exit Criteria

FM UAT passes only when:

- All FM CTAs open valid pages.
- All create/update actions persist to the database.
- All regulated actions create audit evidence.
- EU GMP source/control context is visible in QMS workflows.
- Labels include asset/container name and unique ID.
- Ticket/deviation workflow is triggered for operational exceptions.
- FM AI assistant actions are role-appropriate.
- No Super Admin-only controls are exposed to FM.

## Known Operational Note

Email delivery is intentionally disabled until approved. This is not a failed UAT item unless the test case is specifically email delivery.

## Sign-Off

| Item | Pass/Fail | Evidence | Notes |
|---|---|---|---|
| Login and role access | | | |
| Dashboard CTAs | | | |
| AI assistant actions | | | |
| Tickets | | | |
| Deviations | | | |
| Labels and QR | | | |
| BCR and batches | | | |
| Daily checks | | | |
| Assets and maintenance | | | |
| Mortality | | | |
| SOP/checklist/training links | | | |
| Audit trail | | | |
