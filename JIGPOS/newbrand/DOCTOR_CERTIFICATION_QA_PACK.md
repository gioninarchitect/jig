# Origin by ILCO Farming Doctor Certification and QA Pack

Version: 2026-05-10  
Owner: Chief Medical Officer  
Audience: doctors, regional medical practitioners, clinical governance, compliance operations

## Current Position

Origin already has the operational foundation for a Section 21 medical network:

- A medical service provider model exists at `backend/modules/database/models/MedicalServiceProvider.js`.
- The model supports prescribers, telehealth providers, pharmacies, suppliers, testing labs, and combined providers.
- Provider records already include HPCSA/company registration fields, licence fields, patient-portal visibility, branch linkage, audit status, certification flags, and activation/suspension states.
- Patient-facing Section 21 education already exists at `section21-info.html`.
- The missing layer is clinical governance: a formal doctor onboarding standard, assessment content, QA checklist, pass criteria, and regional practitioner sign-off pathway.

This pack fills that gap. It is not a substitute for independent legal, regulatory, or clinical advice. It is an internal training and QA framework to help ensure doctors understand the Section 21 workflow, patient consent, documentation, prescribing boundaries, escalation duties, and Origin operational interfaces.

## Source Basis

This content is aligned to the following current public guidance checked on 2026-05-10:

- SAHPRA, `SAHPGL-CEM-S21-02`, Guideline for Section 21 Access to Unregistered Medicines, Version 6, date updated 2025-10-30.
- SAHPRA Engagement Portal Applicant Training Manual, Section 21 overview.
- HPCSA guidance on informed consent, confidentiality, patient communication, recordkeeping, and practitioner duties.

## Certification Pathway

### Roles

Chief Medical Officer:
Owns policy, clinical governance, final credentialing, adverse event review, and suspension decisions.

Regional Medical Practitioner:
Leads local doctor onboarding, performs first-line QA review, handles branch-level escalations, and conducts periodic audits.

Certified Medical Practitioner:
Conducts patient consultations, determines clinical appropriateness, obtains informed consent, submits or supports Section 21 applications, records outcomes, and follows pharmacovigilance duties.

### Entry Requirements

Doctors must provide:

- Valid HPCSA registration and practice details.
- Proof of identity and professional indemnity cover.
- Declaration of no relevant restriction, suspension, or unresolved professional conduct matter.
- Confirmation that all patient consultations remain independent clinical encounters.
- Acceptance of Origin clinical governance, privacy, conflict-of-interest, and escalation policies.

### Certification Levels

Level 1: Certified Medical Practitioner

- May consult patients and support named-patient Section 21 workflows.
- Must complete curriculum, pass written assessment, pass case review, and sign governance declaration.

Level 2: Regional Medical Practitioner

- Must hold Level 1 certification.
- Must pass advanced QA review and demonstrate competence in escalation, audit, peer review, and branch governance.

Level 3: CMO Delegate

- Appointed by the CMO only.
- May approve regional practitioner sign-off, lead adverse event panels, and recommend network suspension.

## Section 21 Doctors Course Curriculum

### Module 1: Regulatory Framework

Learning outcomes:

- Explain that Section 21 is a regulated access pathway for unregistered medicines or uses outside registered particulars.
- Distinguish named-patient and multiple-patient applications.
- Identify applicant, co-applicant, importer, product, patient, and supporting-document requirements.
- Explain that SAHPRA may request more information and may authorise or deny access.
- Explain that authorisation conditions must be followed exactly.

Core content:

- Medicines and Related Substances Act Section 21 and Regulation 29 context.
- SAHPRA application workflow.
- Named-patient versus multiple-patient pathways.
- Required applicant details, patient clinical information, product details, importer/manufacturer details, supporting rationale, consent, and payment proof.
- Limits of Origin staff involvement: staff may support workflow and documentation logistics but may not make medical decisions.

### Module 2: Clinical Independence and Patient Selection

Learning outcomes:

- Conduct an independent consultation without commercial pressure.
- Identify clinical red flags and contraindication concerns requiring referral or non-approval.
- Record rationale for recommending or declining a Section 21 pathway.
- Avoid guaranteed-outcome language and therapeutic overclaiming.

Core content:

- Patient history, diagnosis, current medication, substance-use risk, mental-health risk, pregnancy/lactation screening, occupational risk, driving/safety-sensitive work considerations, and previous treatment response.
- Requirement to consider registered alternatives and standard care.
- Requirement to document why the unregistered medicine pathway is clinically justified for the individual patient.
- Duty to decline or defer if evidence, safety, consent, or documentation is inadequate.

### Module 3: Informed Consent and Communication

Learning outcomes:

- Explain diagnosis, options, risks, benefits, costs, uncertainty, alternatives, and patient responsibilities in language the patient understands.
- Treat consent as an ongoing process.
- Confirm patient capacity and voluntary participation.
- Document consent clearly.

Core content:

- Consent must be specific, informed, voluntary, and documented.
- Patients must understand that Section 21 approval is not automatic.
- Patients must understand medicine risks, impairment risk, storage, lawful access limits, and follow-up duties.
- Fees, timelines, and third-party roles must be disclosed before services are rendered.

### Module 4: Documentation Standard

Learning outcomes:

- Complete a consultation record that can withstand internal audit.
- Capture source documents and decision rationale.
- Separate patient clinical records from retail or operational records where appropriate.
- Ensure data minimisation and access control.

Minimum consultation record:

- Patient identity and contact details.
- Date, consultation type, doctor identity, HPCSA registration number.
- Presenting complaint, diagnosis, relevant ICD-10 where applicable.
- Medical history, current medicines, allergies, risk screen, and prior therapies.
- Clinical rationale for Section 21 or reason for non-recommendation.
- Consent confirmation and patient questions answered.
- Product or medicine details, if clinically determined.
- Follow-up plan, monitoring plan, adverse event instructions.
- Section 21 submission reference and outcome when available.

### Module 5: SAHPRA Submission Workflow

Learning outcomes:

- Understand SAHPRA application fields and submission evidence.
- Distinguish submission, request for information, authorisation, refusal, and renewal.
- Track outcome communication and authorisation conditions.
- Avoid presenting payment or submission as approval.

Core content:

- Applications must include applicant/practitioner details, patient clinical information, product details, supporting rationale, importer/manufacturer information where applicable, consent, and payment proof.
- SAHPRA may request additional information to establish safety, quality, and efficacy.
- Authorisation is patient- and condition-specific and must be followed according to its stated period, quantity, product, and conditions.
- Any request for more information, refusal, authorisation, amendment, renewal, or cancellation must be documented in the patient file and operational record.

### Module 6: Product, Quality, and Supply Boundaries

Learning outcomes:

- Understand the difference between clinical recommendation and product fulfilment.
- Require product traceability, quality documentation, and approved access conditions.
- Avoid informal substitution without clinical review.
- Know when to pause fulfilment.
- Explain that advertising and marketing of unregistered medicines accessed through Section 21 authorisation is prohibited.

Core content:

- Batch, COA, product identity, strength, route, and quantity must match the authorised clinical pathway.
- Substitution requires clinical review and documentation.
- Expired, untraceable, recalled, or nonconforming product must not be supplied.
- Patient access must be linked to valid authorisation and branch controls.
- Public communications may explain the course, governance pathway, consultation process, and compliance requirements, but must not advertise or promote unregistered medicines, therapeutic outcomes, strain/product claims, discounts, or lifestyle use under a medical pathway.

### Module 7: Patient Monitoring and Follow-Up

Learning outcomes:

- Define a follow-up plan before medicine access is supported.
- Identify expected monitoring points for effect, tolerability, adherence, impairment risk, and adverse events.
- Document clinical response and non-response without exaggerating benefit.
- Know when to adjust, pause, refer, or discontinue the pathway.

Core content:

- Follow-up intervals should match patient risk, medicine profile, and clinical uncertainty.
- Patients must receive clear instructions on adverse events, impairment, storage, and escalation contact points.
- Any change in clinical status, medication profile, pregnancy status, psychiatric risk, or safety-sensitive work should trigger reassessment.
- Re-authorisation or renewal should not be treated as automatic.

### Module 8: Pharmacovigilance and Escalation

Learning outcomes:

- Identify adverse drug reactions, medication errors, misuse risk, diversion risk, and safeguarding concerns.
- Escalate serious or unexpected events rapidly.
- Maintain auditable follow-up records.
- Apply SAHPRA adverse medicine reaction reporting timelines.

Core content:

- Serious adverse event, hospitalisation, severe psychiatric symptom, suspected dependence or diversion, pregnancy exposure, medication interaction concern, paediatric/minor request, impaired driving or safety-sensitive work issue, suspected forged document, expired or conflicting authorisation, data breach, complaint about doctor conduct.
- Unexpected adverse medicine reactions must be reported within 15 days after becoming aware of the information when neither fatal nor life-threatening.
- Fatal or life-threatening unexpected adverse medicine reactions must be reported within seven days after becoming aware of the information.
- The doctor or regional practitioner must document event details, patient advice, product/batch information where available, action taken, reporting status, and follow-up.

### Module 9: Ethics, Privacy, and Data Protection

Learning outcomes:

- Protect patient confidentiality across clinical, branch, and platform workflows.
- Apply data minimisation to medical records and operational records.
- Identify conflicts of interest and commercial pressure risks.
- Communicate with patients without coercive or misleading claims.
- Apply professional boundaries for telehealth, identity verification, recordkeeping, and patient communication.

Core content:

- Medical information must be accessed only by authorised personnel with a legitimate need.
- Patient consent must be specific to the clinical and operational use of information.
- Doctors must avoid volume incentives, product-push behaviour, guaranteed-outcome language, and lifestyle marketing of medical access.
- Complaints, confidentiality concerns, and suspected data breaches require formal escalation.
- Telehealth consultations must include patient identity confirmation, location, practitioner identity, consent to remote care, limitations of remote examination, privacy safeguards, emergency escalation instructions, and a documented reason if in-person review is required.
- Records must be accurate, contemporaneous, attributable to the practitioner, securely stored, and retrievable for clinical, audit, and regulatory review.

### Module 10: Origin Operating Model, Regional Governance, and Certification

Learning outcomes:

- Use Origin systems without compromising clinical independence.
- Understand provider status, patient portal visibility, branch linkage, and audit status.
- Perform first-line QA file reviews for doctors in a region.
- Identify unsafe patterns, template-driven decision-making, repeated consent gaps, and branch pressure.
- Apply remediation, suspension, and escalation criteria consistently.
- Support doctors without replacing their independent clinical judgement.
- Know when a doctor can be activated, suspended, or removed.

Core content:

- Provider status: pending, active, suspended, inactive.
- Compliance flags: SAHPRA approved, Section 21 certified, last audit date, audit status.
- Patient portal display is a business setting, not a clinical endorsement.
- Regional practitioners review early doctor files, quarterly samples, and triggered-risk files.
- Regional sign-off requires audit evidence, escalation competence, and CMO or delegate approval.
- Branch operational needs must never override authorisation status, clinical judgement, or patient safety.
- Regional practitioners must maintain a clear audit trail of decisions, feedback, and remediation.
- Course completion certificates confirm completion and assessment score only until CMO or delegate sign-off is recorded.
- Final certification requires evidence, assessment, no unresolved critical safety failure, and CMO or delegate sign-off.

### Module 11: Advanced Clinical Case Practicum

Learning outcomes:

- Apply the Section 21 pathway to complex chronic pain, psychiatric-risk, polypharmacy, oncology/palliative, and safety-sensitive work scenarios.
- Identify when to decline, defer, refer, or request additional evidence.
- Write a defensible clinical rationale that includes alternatives, risk controls, consent, and follow-up.
- Separate patient-centred clinical reasoning from product availability or commercial pressure.

Core content:

- One-hour case practicum using complex patient scenarios.
- Chronic pain with sedating medicines and driving duties.
- Severe anxiety or prior psychosis with high-THC request.
- Oncology or palliative-care scenario requiring careful expectation setting and follow-up.
- Polypharmacy and interaction-risk scenario requiring medication review and documentation.
- Practitioners must document why they approved, declined, deferred, or referred the patient.

### Module 12: CPD Portfolio, Audit, and Quality Improvement Practicum

Learning outcomes:

- Prepare a CPD-ready completion record with learner identity, HPCSA number, completion date, module progress, assessment score, and certificate ID.
- Perform a structured QA review of consultation files using pass, conditional pass, fail, and critical-failure categories.
- Design a remediation plan for repeated consent, documentation, adverse-event, or branch-pressure failures.
- Complete a reflective practice note and course evaluation suitable for CPD evidence and CMO review.

Core content:

- One-hour practicum on audit readiness and CPD-quality evidence.
- Completion registers, certificate IDs, assessment evidence, and course evaluations.
- QA sampling method for new doctor files and regional practitioner reviews.
- Remediation plan template for documentation gaps, consent failures, adverse-event failures, and expired-authorisation failures.
- Reflective practice prompt: what will change in the doctor's own Section 21 workflow after the course.

## Assessment Blueprint

Pass rules:

- Written multiple-choice assessment: minimum 75%.
- Critical safety questions: 100% required.
- Case-based assessment: minimum 75%.
- QA file review: no critical failures.
- Regional practitioner candidates: must also pass a peer-review simulation and escalation interview.

Critical failures:

- Recommending access without an independent consultation.
- Treating SAHPRA approval as guaranteed.
- Ignoring informed consent or cost disclosure.
- Discounting or promoting medical cannabis as a lifestyle product.
- Advertising or marketing an unregistered medicine accessed through Section 21 authorisation.
- Supplying against expired, forged, mismatched, or absent authorisation.
- Failing to escalate a serious adverse event.
- Sharing patient medical information without lawful basis or consent.

## Written Assessment

Use a closed-book format unless the CMO approves supervised open-book testing. Randomise questions where possible.

1. What is the core purpose of a Section 21 application?
   - A. To bypass medical consultation
   - B. To request regulated access to an unregistered medicine or use under specific circumstances
   - C. To allow retail staff to approve medical access
   - D. To replace clinical records
   - Correct: B

2. Who must make the clinical decision that a patient is appropriate for the pathway?
   - A. Retail manager
   - B. Marketing team
   - C. Treating practitioner
   - D. Patient portal
   - Correct: C

3. Which statement is correct?
   - A. Section 21 approval is automatic once payment is made
   - B. SAHPRA may authorise or deny an application
   - C. Origin can override SAHPRA if the doctor agrees
   - D. Consent is only needed after product collection
   - Correct: B

4. A named-patient application generally requires:
   - A. Patient clinical details and a rationale
   - B. Only branch address
   - C. Only product marketing material
   - D. No practitioner details
   - Correct: A

5. Critical safety question: A patient requests medical cannabis but refuses to disclose current medication. The doctor should:
   - A. Approve anyway
   - B. Defer or decline until adequate clinical information is available
   - C. Ask retail staff to decide
   - D. Use the highest available strength
   - Correct: B

6. Critical safety question: A patient has an expired authorisation letter. The correct action is:
   - A. Supply if the patient is known to the branch
   - B. Supply if stock is available
   - C. Do not supply until valid access is confirmed
   - D. Apply a discount to compensate for the delay
   - Correct: C

7. Consent must include:
   - A. Benefits only
   - B. Diagnosis, options, risks, costs, alternatives, uncertainty, and patient responsibilities
   - C. Brand preference only
   - D. A signature without explanation
   - Correct: B

8. Which is a conflict-of-interest risk?
   - A. Documenting clinical rationale
   - B. Disclosing fees
   - C. Paying a doctor based on product volume prescribed
   - D. Referring a high-risk patient for specialist care
   - Correct: C

9. Which record is required for a defensible consultation?
   - A. Only WhatsApp confirmation
   - B. Clinical history, diagnosis, risk screen, rationale, consent, and follow-up plan
   - C. Only product SKU
   - D. Only payment proof
   - Correct: B

10. Critical safety question: A serious adverse event after product use must be:
    - A. Ignored if the patient signed consent
    - B. Escalated and documented according to pharmacovigilance procedures
    - C. Handled by marketing
    - D. Deleted from the system
    - Correct: B

11. Patient portal visibility means:
    - A. The provider has passed all clinical audits forever
    - B. The provider is shown to patients according to business settings
    - C. The provider can ignore licensing fields
    - D. The provider can supply without authorisation
    - Correct: B

12. A doctor may not:
    - A. Decline a clinically inappropriate request
    - B. Document reasons for approval
    - C. Guarantee SAHPRA approval to a patient
    - D. Explain costs before consultation
    - Correct: C

13. Which scenario requires escalation?
    - A. Routine renewal reminder
    - B. Suspected forged authorisation
    - C. Patient asks for appointment time
    - D. Patient updates phone number
    - Correct: B

14. Substitution of product should occur:
    - A. Whenever branch stock is low
    - B. Only after appropriate clinical and authorisation review
    - C. At cashier discretion
    - D. To clear expiring inventory
    - Correct: B

15. Regional Medical Practitioners must be able to:
    - A. Run branch promotions
    - B. Conduct QA file reviews and escalate unsafe practice
    - C. Override all patient consent requirements
    - D. Replace SAHPRA
    - Correct: B

16. Data minimisation means:
    - A. Store all patient details in every branch file
    - B. Collect and share only what is necessary for lawful care and operations
    - C. Publish patient status for staff convenience
    - D. Avoid records completely
    - Correct: B

17. A patient in safety-sensitive work should trigger:
    - A. No discussion
    - B. Clear counselling and risk documentation
    - C. Automatic approval
    - D. Retail upsell
    - Correct: B

18. Which should be disclosed before service?
    - A. Fees and likely process steps
    - B. Only product photographs
    - C. Nothing until after payment
    - D. Branch stock margin
    - Correct: A

19. If documentation is incomplete, the QA outcome should be:
    - A. Pass by default
    - B. Conditional pass or fail depending on severity, with remediation
    - C. Hidden from audit
    - D. Converted to marketing lead
    - Correct: B

20. Critical safety question: Retail staff may make medical eligibility decisions.
    - A. True
    - B. False
    - Correct: B

21. Advertising or marketing an unregistered medicine accessed through Section 21 authorisation is:
    - A. Allowed if the patient has consented
    - B. Allowed if no price is shown
    - C. Strictly prohibited
    - D. A branch manager decision
    - Correct: C

22. Unexpected adverse medicine reactions that are not fatal or life-threatening must be reported within:
    - A. 24 hours
    - B. Seven days
    - C. 15 days after becoming aware of the information
    - D. Only at renewal
    - Correct: C

23. Fatal or life-threatening unexpected adverse medicine reactions must be reported within:
    - A. Seven days after becoming aware of the information
    - B. 15 days
    - C. 30 days
    - D. Only if SAHPRA asks
    - Correct: A

24. A telehealth consultation should include:
    - A. No identity check
    - B. Patient identity, location, privacy, consent to remote care, and emergency escalation route
    - C. Only a product preference
    - D. A branch stock check only
    - Correct: B

25. A course completion certificate means:
    - A. The doctor is automatically activated
    - B. SAHPRA approval has been granted
    - C. Course completion is recorded for CMO/delegate review
    - D. The doctor may ignore QA review
    - Correct: C

## Case Assessment

### Case 1: Chronic Pain With Polypharmacy

Patient has chronic neuropathic pain, uses sedating medication, drives for work, and asks for immediate approval.

Expected answer:

- Take full history and medication list.
- Assess impairment, interaction, occupational, and driving risk.
- Explain uncertainty, alternatives, and costs.
- Do not guarantee approval.
- Document rationale and follow-up plan.
- Defer if risk cannot be managed.

### Case 2: Anxiety With Psychiatric Risk

Patient has severe anxiety, previous psychosis, and asks for high-THC flower.

Expected answer:

- Treat as high-risk.
- Consider specialist psychiatric input.
- Avoid simplistic approval.
- Document risk screen, informed consent, alternatives, and rationale.
- Escalate if patient safety concern exists.

### Case 3: Expired Authorisation at Branch

Branch asks doctor to approve fulfilment because the patient is a long-standing customer.

Expected answer:

- Decline fulfilment against expired access.
- Require renewal or valid authorisation.
- Document decision.
- Remind branch that familiarity does not replace authorisation.

### Case 4: Regional QA Review

A doctor has five files with missing consent notes and repeated same-day approvals with identical rationale.

Expected answer:

- Mark as QA concern.
- Require remediation and supervised review.
- Audit additional files.
- Escalate to CMO if pattern suggests unsafe or template-driven decision-making.
- Consider suspension from new consultations until corrected.

## QA File Review Checklist

For each doctor file, score each item as pass, minor gap, major gap, or critical fail.

- Doctor identity and HPCSA number recorded.
- Consultation date and modality recorded.
- Patient identity verified.
- Diagnosis and clinical history documented.
- Current medication and allergy review documented.
- Risk screen documented.
- Alternatives and registered treatment considerations documented.
- Clinical rationale for Section 21 pathway documented.
- Consent documented with risks, benefits, alternatives, costs, and uncertainty.
- Product/medicine details align with application and authorisation.
- Follow-up and monitoring plan documented.
- Adverse event instructions given.
- Patient data stored with appropriate access control.
- No evidence of retail pressure, product-volume incentive, or guaranteed claims.
- SAHPRA outcome and authorisation conditions captured where available.

QA outcome:

- Pass: no critical fails, no more than two minor gaps.
- Conditional pass: no critical fails, one major gap or three to five minor gaps, remediation within 10 business days.
- Fail: any critical fail, two or more major gaps, or repeated pattern after remediation.

## Regional Practitioner Sign-Off

Regional candidates must complete:

- Ten audited consultation-file reviews.
- One adverse-event escalation simulation.
- One branch-pressure scenario interview.
- One provider activation/suspension scenario.
- One patient confidentiality breach response exercise.

Approval requires written sign-off by the CMO or delegate.

## Remediation

Minor gap:
Targeted feedback and correction.

Major gap:
Supervised remediation, repeat assessment, and limited practice until corrected.

Critical fail:
Immediate suspension from Origin medical pathway work pending CMO review.

## Governance Cadence

- New doctor QA: first 10 files or first 30 days, whichever comes first.
- Routine QA: quarterly sample review.
- Regional practitioner QA: monthly first quarter, then quarterly.
- Triggered QA: any complaint, adverse event, suspected document issue, unusual approval pattern, or branch escalation.

## CMO Sign-Off Template

Doctor name:  
HPCSA number:  
Certification level:  
Assessment date:  
Written score:  
Case score:  
QA outcome:  
Restrictions or conditions:  
Approved / Conditional / Not approved:  
CMO or delegate name:  
Signature:  
Date:
