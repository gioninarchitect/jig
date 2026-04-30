import { prisma } from '../config/db';

// Map SOP categories to roles that must be trained
const CATEGORY_ROLES: Record<string, string[]> = {
  SAHPRA: ['FACILITY_MANAGER', 'FACILITY_SUPERVISOR', 'HEAD_OF_CULTIVATION', 'PROCESSING_MANAGER', 'QA_INSPECTOR'],
  CULTIVATION: ['HEAD_OF_CULTIVATION', 'CULTIVATOR', 'NURSERY_MANAGER', 'IRRIGATION_TECH'],
  PROCESSING: ['PROCESSING_MANAGER', 'PROCESSING_SUPERVISOR', 'TRIMMER'],
  QA: ['QA_INSPECTOR', 'LAB_TECH', 'RESPONSIBLE_PHARMACIST'],
  CLEANING: ['HOUSEKEEPING', 'FACILITY_SUPERVISOR'],
  MAINTENANCE: ['MAINTENANCE_MANAGER'],
  QUARANTINE: ['FACILITY_MANAGER', 'QA_INSPECTOR', 'HEAD_OF_CULTIVATION', 'PROCESSING_MANAGER'],
  GENERAL: [],
};

// Get training status for an SOP — who's trained, who's not
export async function getSOPTrainingStatus(sopId: string, tenantId: string) {
  const sop = await prisma.sOP.findUnique({ where: { id: sopId } });
  if (!sop) return null;

  // Determine which roles need training
  const rolesRequired = (sop.rolesRequired as string[]) || CATEGORY_ROLES[sop.category || 'GENERAL'] || [];

  // Find all users in those roles
  const staffNeeding = await prisma.user.findMany({
    where: { tenantId, active: true, role: { in: rolesRequired as any } },
    select: { id: true, name: true, role: true },
  });

  // Find who's acknowledged
  const acks = await prisma.sOPAcknowledgement.findMany({
    where: { sopId, sopVersion: sop.version },
    select: { userId: true, acknowledgedAt: true },
  });

  const ackedUserIds = new Set(acks.map(a => a.userId));

  const trained = staffNeeding.filter(u => ackedUserIds.has(u.id));
  const untrained = staffNeeding.filter(u => !ackedUserIds.has(u.id));

  return {
    sopId, sopTitle: sop.title, version: sop.version, category: sop.category,
    rolesRequired,
    totalRequired: staffNeeding.length,
    trained: trained.length,
    untrained: untrained.length,
    compliance: staffNeeding.length > 0 ? Math.round((trained.length / staffNeeding.length) * 100) : 100,
    trainedStaff: trained.map(u => ({ id: u.id, name: u.name, role: u.role })),
    untrainedStaff: untrained.map(u => ({ id: u.id, name: u.name, role: u.role })),
  };
}

// Get overall SOP training compliance
export async function getSOPTrainingOverview(tenantId: string) {
  const sops = await prisma.sOP.findMany({ where: { tenantId, active: true } });
  const results = [];

  for (const sop of sops) {
    const status = await getSOPTrainingStatus(sop.id, tenantId);
    if (status) results.push(status);
  }

  const totalRequired = results.reduce((s, r) => s + r.totalRequired, 0);
  const totalTrained = results.reduce((s, r) => s + r.trained, 0);
  const overallCompliance = totalRequired > 0 ? Math.round((totalTrained / totalRequired) * 100) : 100;

  return {
    totalSOPs: sops.length,
    overallCompliance,
    totalTrainingRequired: totalRequired,
    totalTrained,
    totalUntrained: totalRequired - totalTrained,
    sopStatus: results,
  };
}

// Auto-create training records for staff when SOP is created/updated
export async function createTrainingForSOP(sopId: string, tenantId: string) {
  const sop = await prisma.sOP.findUnique({ where: { id: sopId } });
  if (!sop) return;

  const rolesRequired = (sop.rolesRequired as string[]) || CATEGORY_ROLES[sop.category || 'GENERAL'] || [];

  const staff = await prisma.user.findMany({
    where: { tenantId, active: true, role: { in: rolesRequired as any } },
  });

  let created = 0;
  for (const user of staff) {
    // Check if training record already exists
    const existing = await prisma.trainingRecord.findFirst({
      where: { userId: user.id, sopId, status: { in: ['PENDING', 'COMPLETED'] } },
    });
    if (existing) continue;

    await prisma.trainingRecord.create({
      data: {
        userId: user.id, userName: user.name,
        trainingType: 'SOP_TRAINING',
        title: `SOP Training: ${sop.title} (v${sop.version})`,
        description: `Read and acknowledge SOP: ${sop.title}`,
        sopId,
        tenantId,
      },
    });
    created++;
  }

  return { created, totalStaff: staff.length };
}
