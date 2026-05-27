# EU GMP Source Of Truth

## Principle

The sole source of truth for compliance requirements is the official European Commission EudraLex Volume 4 GMP guidance.

The Digital Site Master File is not the source of the requirements. It is the governed internal evidence record that maps site procedures, QMS controls, QR/label controls, batch cultivation records, training, medicals, deviations, CAPA, process validation, signatures, and audit trails back to EU GMP.

## Official Source

- European Commission: EudraLex Volume 4 - Good Manufacturing Practice (GMP) guidelines
- URL: https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en

## Baseline Sections For This Build

| Source ID | Official EU GMP Resource | Use In System |
|---|---|---|
| EU_GMP_VOL4_CH1_PQS | Part I, Chapter 1 - Pharmaceutical Quality System | QMS, deviations, CAPA, process validation governance |
| EU_GMP_VOL4_CH2_PERSONNEL | Part I, Chapter 2 - Personnel | roles, responsibilities, induction, SOP training, annual medicals |
| EU_GMP_VOL4_CH3_PREMISES_EQUIPMENT | Part I, Chapter 3 - Premises and Equipment | assets, equipment, calibration, facility controls |
| EU_GMP_VOL4_CH4_DOCUMENTATION | Part I, Chapter 4 - Documentation | Digital SMF, batch cultivation records, QR label records, controlled documents |
| EU_GMP_VOL4_CH5_PRODUCTION | Part I, Chapter 5 - Production | batch lifecycle, cultivation workflow, label usage in production |
| EU_GMP_VOL4_CH6_QC | Part I, Chapter 6 - Quality Control | QC checks, lab controls, release evidence |
| EU_GMP_VOL4_CH8_COMPLAINTS_RECALL | Part I, Chapter 8 - Complaints and Product Recall | recall readiness, traceability, label/batch investigations |
| EU_GMP_VOL4_CH9_SELF_INSPECTION | Part I, Chapter 9 - Self Inspection | audit role, self-inspection, inspection readiness |
| EU_GMP_VOL4_PARTIII_SMF | Part III - Site Master File | Digital SMF structure and inspection pack output |
| EU_GMP_VOL4_PARTIII_Q9 | Part III - ICH Q9 Quality Risk Management | risk-based validation, smart flags, label discrepancy severity |
| EU_GMP_VOL4_ANNEX11 | Annex 11 - Computerised Systems, revision January 2011 | electronic records, audit trails, access control, electronic signatures |
| EU_GMP_VOL4_ANNEX15 | Annex 15 - Qualification and Validation, in operation since 1 October 2015 | process validation, equipment qualification, validation evidence |
| EU_GMP_VOL4_ANNEX16 | Annex 16 - Certification by a Qualified Person and Batch Release, in operation since 15 April 2016 | batch release evidence, final release controls |

## Implementation Rule

Every compliance control added to TnT-ZA must reference one or more `Source ID` values above.

Examples:

- Label lifecycle control: `EU_GMP_VOL4_CH4_DOCUMENTATION`, `EU_GMP_VOL4_CH5_PRODUCTION`, `EU_GMP_VOL4_ANNEX11`
- 50/50 vs 45/50 label reconciliation: `EU_GMP_VOL4_CH4_DOCUMENTATION`, `EU_GMP_VOL4_PARTIII_Q9`, `EU_GMP_VOL4_CH1_PQS`
- Batch Cultivation Record: `EU_GMP_VOL4_CH4_DOCUMENTATION`, `EU_GMP_VOL4_CH5_PRODUCTION`, `EU_GMP_VOL4_ANNEX15`
- Electronic signatures: `EU_GMP_VOL4_ANNEX11`
- Process validation: `EU_GMP_VOL4_ANNEX15`, `EU_GMP_VOL4_PARTIII_Q9`, `EU_GMP_VOL4_CH1_PQS`
- Training: `EU_GMP_VOL4_CH2_PERSONNEL`, `EU_GMP_VOL4_CH4_DOCUMENTATION`
- Annual medical requirements: `EU_GMP_VOL4_CH2_PERSONNEL`, `EU_GMP_VOL4_CH1_PQS`
- Digital SMF output: `EU_GMP_VOL4_PARTIII_SMF`, `EU_GMP_VOL4_CH4_DOCUMENTATION`

## Product Hierarchy

1. EU GMP / EudraLex Volume 4 resources define the requirement.
2. TnT-ZA source registry stores the requirement mapping.
3. QMS workflows generate evidence against those requirements.
4. Digital SMF assembles governed evidence and outputs inspection-ready records.
5. Audit log proves who did what, when, and against which controlled requirement.
