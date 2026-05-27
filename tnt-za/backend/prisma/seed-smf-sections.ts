// =====================================================================
// Seed SMF v4.6 canonical chapter map → SMFSection rows
//
// Mirrors the Table of Contents from the actual ILCO SMF v4.6 PDF
// (more4/The Site Master file-1 (1).pdf). Body text comes from the
// PDF where extracted, otherwise left blank for RP to draft.
//
// Idempotent: upserts by (tenantId, sectionId, unit).
//
// Run: cd tnt-za/backend && pnpm tsx prisma/seed-smf-sections.ts
// =====================================================================

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface SectionSpec {
  sectionId: string;
  chapter: string;
  title: string;
  bodyText?: string;
}

const SECTIONS: SectionSpec[] = [
  // ── C.1 General Information ──────────────────────────────
  { sectionId: 'C.1.1', chapter: 'C.1', title: 'Brief information on the firm',
    bodyText: 'The licence number 0000000043MC-V2. The physical address of our cultivation and processing facilities is at Hardus Farm, Viljoenskroon, Free State. The Greenhouses function on a GACP basis in conjunction with ancillary support areas. The facility is designed to support post-harvesting activities in a GMP environment, compliant with all SAHPRA guidelines related to medicinal cannabis processing.' },
  { sectionId: 'C.1.2', chapter: 'C.1', title: 'Pharmaceutical manufacturing or wholesaling activities as licensed by Competent Authorities',
    bodyText: 'ILCO Farming currently holds a medicinal cannabis cultivation and manufacturing licence, number: 0000000043MC-V2.' },
  { sectionId: 'C.1.3', chapter: 'C.1', title: 'Any other manufacturing or wholesaling activities carried out on the site',
    bodyText: 'No other manufacturing activities are performed on this site.' },
  { sectionId: 'C.1.4', chapter: 'C.1', title: 'Name and address of site' },
  { sectionId: 'C.1.4.2', chapter: 'C.1', title: 'Telephone number of contact person' },
  { sectionId: 'C.1.5', chapter: 'C.1', title: 'Type of actual products manufactured on site' },
  { sectionId: 'C.1.6', chapter: 'C.1', title: 'Short description of the site' },
  { sectionId: 'C.1.6.1', chapter: 'C.1', title: 'Location and immediate environment' },
  { sectionId: 'C.1.6.2', chapter: 'C.1', title: 'Size of site, types of buildings and their ages' },
  { sectionId: 'C.1.6.3', chapter: 'C.1', title: 'Other manufacturing activities on the site' },
  { sectionId: 'C.1.7', chapter: 'C.1', title: 'Number of employees engaged in QA, Production, QC, storage and distribution' },
  { sectionId: 'C.1.8', chapter: 'C.1', title: 'Use of external scientific, analytical or technical assistance',
    bodyText: 'External providers: Averda Waste Management (transport + incineration), Ecogreen Analytics (analytical and stability testing), Rentokil Pest Control, Hydro Wellness (Reverse Osmosis), Envirocare Laboratory (water and substrate testing).' },
  { sectionId: 'C.1.9', chapter: 'C.1', title: 'Short description of the QMS for manufacture' },
  { sectionId: 'C.1.9.2', chapter: 'C.1', title: 'Responsibility of the Quality Assurance function' },
  { sectionId: 'C.1.9.3', chapter: 'C.1', title: 'Elements of the QA system (org structure, responsibilities, procedures, processes)' },
  { sectionId: 'C.1.9.4', chapter: 'C.1', title: 'Audit programmes (Self-inspection / external audits)',
    bodyText: 'Self-inspection by RP per SOP 7-QMS-027. External inspections from SAHPRA, international customers, ISO 9001 compliance bodies. Annual minimum self-inspection audit.' },
  { sectionId: 'C.1.9.5', chapter: 'C.1', title: 'Process to review results to ensure quality, safety and efficacy of the product' },
  { sectionId: 'C.1.9.6', chapter: 'C.1', title: 'Record of ISO 9001 or other standards used to assess suppliers' },
  { sectionId: 'C.1.9.8', chapter: 'C.1', title: 'Release for sale procedure of finished products' },

  // ── C.2 Personnel ──────────────────────────────
  { sectionId: 'C.2.1', chapter: 'C.2', title: 'Organisational chart' },
  { sectionId: 'C.2.2', chapter: 'C.2', title: 'Qualifications, experience and responsibilities of key personnel' },
  { sectionId: 'C.2.2.1', chapter: 'C.2', title: 'Academic and work qualifications and years of experience',
    bodyText: 'Responsible Pharmacist: Berne Swart (B.Pharm NWU Potchefstroom). CEO & AR: Ilse Venter. CEO & DAR: Coenie Venter. Cultivation Manager: Lourens Eksteen (B.Agric UFS 2016). Co-Cultivation Manager: Renae Christen Purdon. IT Manager: Calvin Green. Processing Manager + QAM: Jeanette Ferreira (HACCP & GMP — Swift Lab).' },
  { sectionId: 'C.2.3', chapter: 'C.2', title: 'Training' },
  { sectionId: 'C.2.3.3', chapter: 'C.2', title: 'Form of training' },
  { sectionId: 'C.2.3.4', chapter: 'C.2', title: 'Assessment of training (≥80% pass mark required)' },
  { sectionId: 'C.2.3.5', chapter: 'C.2', title: 'Retraining needs identification' },
  { sectionId: 'C.2.3.6', chapter: 'C.2', title: 'Recordkeeping' },
  { sectionId: 'C.2.4', chapter: 'C.2', title: 'Personnel medical' },
  { sectionId: 'C.2.4.6', chapter: 'C.2', title: 'Additional monitoring for personnel in Grade A-D areas' },
  { sectionId: 'C.2.5', chapter: 'C.2', title: 'Personnel hygiene requirements including clothing (PPE)' },
  { sectionId: 'C.2.5.1', chapter: 'C.2', title: 'Washing, changing and rest areas' },

  // ── C.3 Premises and Equipment ──────────────────────────────
  { sectionId: 'C.3.1', chapter: 'C.3', title: 'Simple plan of site and processing areas (floor plan)' },
  { sectionId: 'C.3.2', chapter: 'C.3', title: 'Nature of construction and finishes' },
  { sectionId: 'C.3.3', chapter: 'C.3', title: 'Brief description of ventilation systems' },
  { sectionId: 'C.3.3.1', chapter: 'C.3', title: 'Filter design and efficiency',
    bodyText: 'Air-conditioners maintain temperature 15-25°C and RH 40-62%. AC inventory: 2 trim room, 3 dry room 1, 2 dry room 2, 1 weighing/packaging, 1 bulk storage, 1 final product store. Dehumidifiers: 2 trim room, 2 dry room 2, 4 dry room 1, 1 weigh/pack, 1 bulk, 1 final.' },
  { sectionId: 'C.3.4', chapter: 'C.3', title: 'Handling of highly toxic, hazardous and sensitising materials' },
  { sectionId: 'C.3.5', chapter: 'C.3', title: 'Water systems and sanitation' },
  { sectionId: 'C.3.5.1', chapter: 'C.3', title: 'Schematic of the water supply' },
  { sectionId: 'C.3.5.2', chapter: 'C.3', title: 'Capacity of the system' },
  { sectionId: 'C.3.5.3', chapter: 'C.3', title: 'Construction materials of vessel' },
  { sectionId: 'C.3.5.4', chapter: 'C.3', title: "Filter's specification" },
  { sectionId: 'C.3.5.5', chapter: 'C.3', title: 'Water temperature at point of return' },
  { sectionId: 'C.3.5.6', chapter: 'C.3', title: 'Specification reference for water (Ph. Eur Purified water 01/2009:0008)',
    bodyText: 'Chemical: TOC NMT 0.5mg/L · Nitrates NMT 0.2 ppm · Aluminium NMT 10 ppb · Heavy metals NMT 0.1 ppm. Conductivity: 4.3 µS·cm⁻¹ @20°C. Microbiological: TVAC NMT 100 CFU/ml. Sampled 6-monthly via contract lab.' },
  { sectionId: 'C.3.6', chapter: 'C.3', title: 'Maintenance' },
  { sectionId: 'C.3.6.1', chapter: 'C.3', title: 'Planned preventative maintenance programme' },
  { sectionId: 'C.3.6.2', chapter: 'C.3', title: 'Planned preventative maintenance reporting' },
  { sectionId: 'C.3.7', chapter: 'C.3', title: 'Major production and control laboratory equipment' },
  { sectionId: 'C.3.9', chapter: 'C.3', title: 'Qualification, validation and calibration' },
  { sectionId: 'C.3.10', chapter: 'C.3', title: 'Sanitation' },

  // ── C.4 Documentation ──────────────────────────────
  { sectionId: 'C.4.1', chapter: 'C.4', title: 'Arrangements for preparation, revision and distribution of documentation' },
  { sectionId: 'C.4.2', chapter: 'C.4', title: 'Other documentation related to product quality' },

  // ── C.5 Production ──────────────────────────────
  { sectionId: 'C.5.1', chapter: 'C.5', title: 'Production overview' },
  { sectionId: 'C.5.2', chapter: 'C.5', title: 'Handling of materials and products' },
  { sectionId: 'C.5.2.4', chapter: 'C.5', title: 'Role of the Authorised Representative' },
  { sectionId: 'C.5.3', chapter: 'C.5', title: 'Arrangements for Reprocessing or Rework' },
  { sectionId: 'C.5.4', chapter: 'C.5', title: 'Arrangements for Handling Reject Materials and Products' },
  { sectionId: 'C.5.5', chapter: 'C.5', title: 'Brief description of the General Policy for Process Validation' },

  // ── C.6 Quality Control ──────────────────────────────
  { sectionId: 'C.6.1', chapter: 'C.6', title: 'Activities of the Quality Control Department' },
];

async function main() {
  const tenant =
    await prisma.tenant.findFirst({ where: { slug: 'ilco' } }) ||
    await prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!tenant) throw new Error('No tenant found for SMF section seeding.');
  console.log(`Seeding ${SECTIONS.length} SMF sections into tenant ${tenant.name}\n`);

  let created = 0, updated = 0;
  for (const s of SECTIONS) {
    const existing = await prisma.sMFSection.findFirst({
      where: { tenantId: tenant.id, sectionId: s.sectionId, unit: 'cannabis' },
    });
    if (existing) {
      await prisma.sMFSection.update({
        where: { id: existing.id },
        data: { title: s.title, chapter: s.chapter, bodyText: s.bodyText ?? existing.bodyText },
      });
      updated++;
    } else {
      await prisma.sMFSection.create({
        data: {
          tenantId: tenant.id,
          sectionId: s.sectionId,
          chapter: s.chapter,
          title: s.title,
          bodyText: s.bodyText ?? null,
          unit: 'cannabis',
        },
      });
      created++;
    }
  }

  console.log(`Created: ${created}  ·  Updated: ${updated}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
