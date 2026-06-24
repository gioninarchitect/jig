import { prisma } from '../config/db';

// Real, published regulatory documents — sourced with verifiable official URLs (June 2026).
// Seeded as DRAFT_TRACKED: they are REAL documents, but the clause-level grounding + activation
// is QA's call (human-in-the-loop). The AI stores the citation; it never authors regulatory text.
const SA_SOURCES: Array<{ sourceId: string; framework: string; part: string; title: string; officialUrl: string; chapter?: string; version?: string; notes?: string }> = [
  // ── SAHPRA (SA Health Products Regulatory Authority) ──
  {
    sourceId: 'SAHPRA_CANNABIS_CULTIVATION_GUIDE', framework: 'SAHPRA', part: 'SAHPRA Guideline',
    title: 'General Guide to Medicinal Cannabis Cultivation or Manufacturing',
    officialUrl: 'https://www.sahpra.org.za/wp-content/uploads/2021/02/General-guide-to-Medicinal-Cannabis_Cultivation-or-Manufacturing.pdf',
  },
  {
    sourceId: 'SAHPRA_CANNABIS_CULTIVATION_244', framework: 'SAHPRA', part: 'SAHPRA Guideline', version: 'v2 (Nov 2019)',
    title: '2.44 Cultivation of Cannabis & Manufacture of Cannabis-related Pharmaceutical Products',
    officialUrl: 'https://www.sahpra.org.za/wp-content/uploads/2020/01/93b0b4262.44_Cannabiscultivation_v2_Nov2019.pdf',
  },
  {
    sourceId: 'SA_GMP_GUIDE_PICS', framework: 'SAHPRA', part: 'SA Guide to GMP',
    title: 'South African Guide to Good Manufacturing Practice (PIC/S-aligned)',
    officialUrl: 'https://www.sahpra.org.za/document-categories/good-manufacturing-practice/',
    notes: 'SA GMP guide is PIC/S-based and aligns to EudraLex Volume 4 — cross-reference the EU-GMP sources already grounded.',
  },
  // ── SAPC (South African Pharmacy Council) ──
  {
    sourceId: 'SAPC_GPP_RULES', framework: 'SAPC', part: 'Pharmacy Act s35A',
    title: 'Rules Relating to Good Pharmacy Practice (GPP)',
    officialUrl: 'https://www.pharmcouncil.co.za/Media/Default/Documents/Rules%20published%20in%20terms%20of%20section%2035A%20of%20the%20Pharmacy%20Act%2053%20of%201974.pdf',
  },
  {
    sourceId: 'SA_PHARMACY_ACT_53_1974', framework: 'SAPC', part: 'Act',
    title: 'Pharmacy Act 53 of 1974',
    officialUrl: 'https://www.saflii.org/za/legis/consol_reg/rrtgpp362/',
  },
  // ── SA Law (Medicines & Related Substances Act) ──
  {
    sourceId: 'SA_MEDICINES_ACT_101_1965', framework: 'SA_LAW', part: 'Act',
    title: 'Medicines and Related Substances Act 101 of 1965 (consolidated)',
    officialUrl: 'https://www.saflii.org/za/legis/consol_act/marsa1965280/',
  },
  {
    sourceId: 'SA_MEDICINES_ACT_S22C', framework: 'SA_LAW', part: 'Act', chapter: 'Section 22C(1)(b)',
    title: 'Medicines Act s22C(1)(b) — Licence to cultivate / manufacture',
    officialUrl: 'https://www.sahpra.org.za/wp-content/uploads/2019/09/Medicines-and-Related-Substances-Act_101-of-1965_Act_GG-40869_2017-05-26.pdf',
  },
  {
    sourceId: 'SA_MEDICINES_ACT_S21', framework: 'SA_LAW', part: 'Act', chapter: 'Section 21',
    title: 'Medicines Act s21 — Access to unregistered medicines (Section 21 authorisation)',
    officialUrl: 'https://www.sahpra.org.za/wp-content/uploads/2019/09/Medicines-and-Related-Substances-Act_101-of-1965_Act_GG-40869_2017-05-26.pdf',
  },
];

async function main() {
  let created = 0, updated = 0;
  for (const s of SA_SOURCES) {
    const data = {
      framework: s.framework, title: s.title, part: s.part, chapter: s.chapter ?? null,
      version: s.version ?? null, officialUrl: s.officialUrl, status: 'DRAFT_TRACKED',
      notes: s.notes ?? 'Real published document — pending QA sign-off before ACTIVE.',
    };
    const existing = await prisma.complianceSource.findUnique({ where: { sourceId: s.sourceId } });
    if (existing) { await prisma.complianceSource.update({ where: { sourceId: s.sourceId }, data }); updated++; }
    else { await prisma.complianceSource.create({ data: { sourceId: s.sourceId, ...data } }); created++; }
  }
  const byFw = await prisma.complianceSource.groupBy({ by: ['framework'], _count: true } as any).catch(() => null);
  console.log(`SA regulatory sources: ${created} created, ${updated} updated.`);
  if (byFw) console.log('By framework:', JSON.stringify(byFw));
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
