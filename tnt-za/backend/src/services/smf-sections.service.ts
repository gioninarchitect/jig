import { prisma } from '../config/db';

// =====================================================================
// SMF Sections — canonical artefact CRUD + sign-off chain
//
// Sign-off order: DRAFT → RP_SIGNED → DAR_SIGNED → AR_APPROVED
// On AR_APPROVED, a SMFSectionVersion frozen snapshot is recorded.
// =====================================================================

export async function listSections(tenantId: string, unit = 'cannabis') {
  return prisma.sMFSection.findMany({
    where: { tenantId, unit },
    orderBy: [{ chapter: 'asc' }, { sectionId: 'asc' }],
  });
}

export async function getSection(id: string, tenantId: string) {
  return prisma.sMFSection.findFirst({
    where: { id, tenantId },
    include: {
      versions: { orderBy: { versionNumber: 'desc' }, take: 5 },
    },
  });
}

export async function updateBody(
  id: string,
  tenantId: string,
  bodyText: string,
) {
  // Editing the body resets the chain — any prior signatures no longer apply
  return prisma.sMFSection.update({
    where: { id },
    data: {
      bodyText,
      status: 'DRAFT',
      rpSignedById: null, rpSignedAt: null, rpNotes: null,
      darSignedById: null, darSignedAt: null, darNotes: null,
      arApprovedById: null, arApprovedAt: null, arNotes: null,
      staleSince: null,
      staleReason: null,
    },
  });
}

type SignStep = 'RP' | 'DAR' | 'AR';

export async function signSection(
  id: string,
  tenantId: string,
  step: SignStep,
  userId: string,
  notes?: string,
) {
  const section = await prisma.sMFSection.findFirst({ where: { id, tenantId } });
  if (!section) throw Object.assign(new Error('Section not found'), { status: 404 });

  // Enforce strict order
  if (step === 'RP' && section.status !== 'DRAFT') {
    throw Object.assign(new Error(`RP can only sign a DRAFT (current: ${section.status})`), { status: 409 });
  }
  if (step === 'DAR' && section.status !== 'RP_SIGNED') {
    throw Object.assign(new Error(`DAR can only sign after RP (current: ${section.status})`), { status: 409 });
  }
  if (step === 'AR' && section.status !== 'DAR_SIGNED') {
    throw Object.assign(new Error(`AR can only approve after DAR (current: ${section.status})`), { status: 409 });
  }

  const now = new Date();
  const updates: any = {};
  if (step === 'RP')  { updates.rpSignedById = userId;    updates.rpSignedAt = now;    updates.rpNotes = notes;   updates.status = 'RP_SIGNED'; }
  if (step === 'DAR') { updates.darSignedById = userId;   updates.darSignedAt = now;   updates.darNotes = notes;  updates.status = 'DAR_SIGNED'; }
  if (step === 'AR')  { updates.arApprovedById = userId;  updates.arApprovedAt = now;  updates.arNotes = notes;   updates.status = 'AR_APPROVED'; }

  const updated = await prisma.sMFSection.update({ where: { id }, data: updates });

  // On AR approval, freeze a snapshot
  if (step === 'AR') {
    const lastVersion = await prisma.sMFSectionVersion.findFirst({
      where: { sectionFkId: id },
      orderBy: { versionNumber: 'desc' },
    });
    const nextVersion = (lastVersion?.versionNumber ?? 0) + 1;
    await prisma.sMFSectionVersion.create({
      data: {
        sectionFkId: id,
        versionNumber: nextVersion,
        bodyText: updated.bodyText,
        signedAt: now,
        rpSignedById: updated.rpSignedById,
        darSignedById: updated.darSignedById,
        arApprovedById: updated.arApprovedById,
      },
    });
  }

  return updated;
}

export async function summary(tenantId: string, unit = 'cannabis') {
  const sections = await prisma.sMFSection.findMany({
    where: { tenantId, unit },
    select: { status: true, staleSince: true, chapter: true },
  });
  const byStatus = sections.reduce((acc, s) => {
    acc[s.status] = (acc[s.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return {
    total: sections.length,
    byStatus,
    stale: sections.filter(s => s.staleSince).length,
    byChapter: Array.from(new Set(sections.map(s => s.chapter))).sort(),
  };
}
