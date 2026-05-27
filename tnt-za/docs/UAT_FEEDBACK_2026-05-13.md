# UAT Feedback - 2026-05-13

## Compliance-Critical

0. EU GMP source-of-truth governance.
   - EU GMP resources, specifically the official European Commission EudraLex Volume 4 GMP guidance, must be the sole source of truth for compliance requirements.
   - The Digital Site Master File is the governed internal evidence record and output mapped to EU GMP requirements; it is not the source of the requirements.
   - QMS, QR labels, batch cultivation records, training, annual medicals, deviations, CAPA, process validation, signatures, and audit trails must map back to specific EU GMP source requirements.
   - No duplicate uncontrolled "quality manual" should compete with EU GMP-controlled requirements; the Quality Manual/inspection pack must be generated from records mapped to EU GMP.

1. QR code must be bound to asset ID.
   - Label identity must resolve to the asset/container/batch record.
   - Asset QR labels must visibly print the asset name and asset tag.
   - Scans must show the current record and audit history.

2. Label management must be a core compliance control.
   - Label stock, issue, print, void, reprint, and attach events need audit records.
   - Label accountability must show who issued labels, who applied them, and which record they were applied to.
   - Support reconciliation such as 50 labels issued, 45 used, 5 remaining/void/missing.

3. Label discrepancy handling.
   - Missing labels must create an accountable deviation or investigation record.
   - Example: 50/50 labels issued vs 45/50 applied must be visible and explainable.

4. Batch cultivation record creation.
   - Allocating a batch number must automatically create the batch cultivation record.
   - Batch cultivation record should link back to clones, mother/source, grow zone, environmental records, daily checks, and responsible staff.

5. Clone environmental documentation.
   - Clone records must include temperature and humidity history.
   - System should generate a document/report for clone environmental history.

6. Daily checks.
   - Daily checks need to be part of the auditable compliance workflow.
   - Missing daily checks should create tasks, alerts, or deviations.

7. Auditor role.
   - Controlled read-only role is required.
   - Auditor must be able to view labels, batch cultivation records, deviations, QMS records, signatures, and audit history.

8. Digital signature.
   - Review whether digital signature is required for approvals/sign-offs.
   - Define which actions need signature: batch record approval, deviations, QMS approvals, SMF approvals, label reconciliation, destruction, release.

9. Deviations.
   - Deviations must be reviewed as a core workflow.
   - Label discrepancies, missed checks, environmental excursions, and batch-record gaps should create deviations where required.

10. QMS.
    - QMS needs a dedicated review.
    - Confirm SOPs, deviations, CAPA, change control, document approval, training acknowledgement, and audit readiness.
    - Quality Manual / inspection pack must be generated from records mapped to EU GMP, not maintained as a separate source of truth.

11. Training requirements.
    - Training must support induction training, on-the-job training, and written/classroom training.
    - Training must be based on the relevant SOP.
    - Training responsibility does not sit with one person only; each team trains its own staff.
    - The system must track which team/person trained which staff member on which SOP.
    - Training evidence must feed QMS and audit readiness.

12. Yearly medical requirements.
    - Annual medical checks must be integrated into QMS.
    - QMS must show full requirements, status, expiry/renewal, evidence, and follow-up actions.

13. Process validation.
    - Process validation must be rigorous and smart.
    - Validation must be risk-based, evidence-driven, and tied to SOPs, batch records, deviations, CAPA, equipment, training, and environmental data.
    - The system must flag weak validation evidence, missing checks, repeated failures, and out-of-trend results.
    - Validation outputs must feed QMS and the Digital SMF, with each validation requirement mapped to EU GMP.

## Demo Follow-Up

- Review label lifecycle screens and API coverage.
- Review batch cultivation record workflow from clone allocation through batch creation.
- Review auditor permissions and read-only inspection pack.
- Define digital-signature rules and legal/compliance expectations.
- Review QMS module against partner expectations.
- Map training types, training ownership, annual medicals, and Digital SMF outputs to EU GMP requirements.
- Define process validation rules, evidence requirements, smart flags, and QMS/Digital SMF outputs against EU GMP.
