# PRD - EU GMP QMS Production Readiness

## 1. Product Goal

Build TnT-ZA into a production-ready EU GMP-grounded QMS, QR/label, batch-record, and Digital Site Master File platform.

The system must use official EU GMP / EudraLex Volume 4 resources as the sole source of truth for compliance requirements. The Digital Site Master File is the governed internal evidence record that maps operational evidence back to EU GMP.

Official source:
https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en

## 2. Product Hierarchy

1. EU GMP / EudraLex Volume 4 defines requirements.
2. TnT-ZA stores a requirement/source registry.
3. QMS workflows generate controlled evidence.
4. Digital SMF assembles evidence into inspection-ready records.
5. Audit log proves who did what, when, why, and against which EU GMP-mapped requirement.

## 3. Primary Users

- Super Admin
- Owner / Tenant Admin
- Responsible Pharmacist / QA
- Facility Manager
- Head of Cultivation
- Processing Manager
- Cultivator / General Worker
- Lab / QC
- Auditor / Inspector

## 4. Production-Ready Feature Scope

### 4.1 EU GMP Requirement Registry

Purpose:
Create a controlled source registry for EU GMP references used by the system.

Features:
- Store source IDs such as `EU_GMP_VOL4_CH1_PQS`, `EU_GMP_VOL4_CH4_DOCUMENTATION`, `EU_GMP_VOL4_ANNEX11`, `EU_GMP_VOL4_ANNEX15`.
- Link every QMS control, label rule, validation rule, training requirement, medical requirement, and SMF section to one or more source IDs.
- Show source mapping in UI.
- Include source mapping in audit and inspection exports.

Acceptance:
- No compliance control can be created without at least one EU GMP source reference.

### 4.2 Smart QR / Label Lifecycle Management

Purpose:
Make labels controlled compliance inventory.

Features:
- Label batch creation: quantity, purpose, range, created by.
- Label statuses: available, issued, printed, applied, void, damaged, destroyed, missing, reprinted.
- Label issue workflow: issued by, issued to, team, quantity, signature.
- Label application workflow: must bind label to asset, clone, plant, batch, container, sample, or destruction record.
- Label reconciliation: created vs issued vs applied vs voided vs destroyed vs missing.
- 50/50 and 45/50 scenarios must be automatically visible.
- Missing/unaccounted labels generate deviations.
- Reprints require reason, approval, and link to original label.
- Asset QR labels must visibly print asset name and asset tag.

Acceptance:
- The system can prove where every label is or why it is not in use.
- Missing labels cannot be ignored.

### 4.3 Batch Cultivation Record

Purpose:
Create a complete digital Batch Cultivation Record when a batch number is generated.

Features:
- Auto-create BCR on batch number allocation.
- Link BCR to mother/source, clones, plants, zone, greenhouse, bay, strain, responsible staff.
- Pull in temp/humidity records, daily checks, IPM records, activity logs, feeding, cleaning, harvest requests, weighing, and deviations.
- Show BCR completeness score.
- Prevent batch progression if required evidence is missing.
- Generate BCR PDF/inspection view.

Acceptance:
- Every batch has a complete auditable BCR linked to source records.

### 4.4 QMS Core Upgrade

Purpose:
Turn QMS from simple SOP/deviation/calibration tracking into a production QMS.

Features:
- SOP lifecycle: draft, review, approved, effective, retired.
- Deviation lifecycle: open, investigation, root cause, CAPA, effectiveness check, closed.
- CAPA as first-class records.
- Change control.
- Document approval.
- Equipment calibration and qualification.
- Training and medical readiness.
- Label discrepancy integration.
- Process validation integration.
- Quality Manual / inspection pack generated from EU GMP-mapped records.

Acceptance:
- QMS dashboard shows open risks, overdue actions, source mappings, and inspection readiness.

### 4.5 Process Validation

Purpose:
Make validation rigorous and smart.

Features:
- Validation protocol records.
- Validation runs and evidence checklist.
- Link validation to SOPs, batches, equipment, training, environmental data, deviations, CAPA, and labels.
- Smart flags:
  - missing evidence
  - weak evidence
  - repeated failures
  - out-of-trend results
  - untrained staff involved
  - uncalibrated equipment used
- Validation report output.
- Approval/signature workflow.

Acceptance:
- A validation cannot be approved while critical evidence gaps are open.

### 4.6 Training Management

Purpose:
Make training SOP-based and team-owned.

Features:
- Training types: induction, on-the-job, written/classroom, SOP training, equipment, safety, compliance.
- Link training to SOP version.
- Track trainer, trainee, team/department, assessment, score, evidence, signature.
- Each team can train its own staff.
- Training expiry and retraining reminders.
- Training gaps feed QMS and Digital SMF evidence.

Acceptance:
- The system can show who was trained, by whom, on which SOP version, and with what evidence.

### 4.7 Annual Medicals

Purpose:
Integrate yearly medical requirements into QMS.

Features:
- Medical requirement register by role/team.
- Annual status, expiry, evidence, restrictions, follow-up actions.
- Alerts before expiry.
- Overdue medicals block relevant role-sensitive tasks if configured.
- Feed into QMS readiness and Digital SMF.

Acceptance:
- Annual medical status is visible per staff member and in QMS readiness.

### 4.8 Digital Signatures / Annex 11 Controls

Purpose:
Support authenticated electronic signatures and audit-ready records.

Features:
- Signature events require authenticated user, timestamp, meaning of signature, and record hash.
- Signature meaning examples: prepared, checked, approved, released, reconciled, witnessed.
- Apply signatures to daily checks, BCR approvals, deviations, CAPA, validation, label reconciliation, destruction, release, SMF sign-off.
- Prevent silent edits after signature; require revision/change control.

Acceptance:
- Signed records show who signed, when, why, and what exact record state was signed.

### 4.9 Auditor / Inspector Mode

Purpose:
Provide controlled read-only inspection access.

Features:
- Auditor role with read-only access.
- Inspection pack view.
- Filter by EU GMP source, batch, label batch, deviation, validation, training, asset, date.
- Immutable audit logs, signatures, timestamps.
- Export evidence bundle.

Acceptance:
- Auditor can review evidence without write permissions.

### 4.10 Digital SMF / Inspection Pack Output

Purpose:
Use Digital SMF as governed output mapped to EU GMP.

Features:
- SMF sections mapped to EU GMP source IDs.
- Pull evidence from QMS, labels, BCR, training, medicals, validation, assets, deviations, CAPA.
- Drift detection when source evidence changes.
- Quality Manual / inspection pack output generated from controlled records.
- Versioned export.

Acceptance:
- Inspection pack can be regenerated from current controlled records and source mappings.

## 5. Non-Functional Requirements

- Role-based access control.
- Append-only audit trail.
- Hash-chained audit records.
- No uncontrolled deletion of compliance records.
- Offline-capable capture for farm operations where needed.
- Server-side validation for all critical workflows.
- Evidence attachments for critical records.
- Exportable inspection packs.
- Database migrations and seed data for UAT.
- Automated tests for label reconciliation, BCR creation, deviation generation, validation blocking, and signature immutability.

## 6. Production Readiness Checklist

### Must Have

- EU GMP source registry.
- Label lifecycle and reconciliation.
- BCR auto-creation and evidence linking.
- QMS deviation/CAPA lifecycle.
- Process validation module.
- Training upgrade.
- Annual medical tracking.
- Digital signature/audit controls.
- Auditor read-only mode.
- Inspection pack export.

### Should Have

- Smart QMS dashboard.
- Drift detection from QMS events to Digital SMF.
- Label dashboard.
- Validation intelligence.
- Staff/team training matrix.
- Mobile scanner UX polish.

### Later

- External ERP/QMS integrations.
- GS1 identifier support.
- Scanner hardware integration.
- Advanced trend analytics.
- AI-assisted QMS drafting with human approval.

## 7. Suggested Build Order

1. EU GMP source registry.
2. Label lifecycle and reconciliation.
3. Batch Cultivation Record auto-create.
4. QMS CAPA/deviation upgrade.
5. Training and annual medicals.
6. Process validation.
7. Digital signatures.
8. Auditor mode and inspection pack.
9. Digital SMF source mapping and generated Quality Manual.

## 8. Definition Of Done

The system is production-ready when a user can:

1. Create and reconcile label batches with no unaccounted labels.
2. Generate a batch number and automatically create a complete BCR.
3. Link daily checks, temp/humidity, training, equipment, deviations, labels, and validation evidence to the BCR.
4. Raise and close deviations with CAPA and effectiveness checks.
5. Prove training and medical readiness by role/team.
6. Sign critical records electronically.
7. Give an auditor read-only access to immutable records.
8. Export an inspection pack mapped to EU GMP sources.
