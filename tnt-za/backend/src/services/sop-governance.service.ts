import { prisma } from '../config/db';
import { eventBus } from './eventBus';

const CATEGORY_ROLES: Record<string, string[]> = {
  SAHPRA: ['FACILITY_MANAGER', 'FACILITY_SUPERVISOR', 'HEAD_OF_CULTIVATION', 'PROCESSING_MANAGER', 'QA_INSPECTOR', 'RESPONSIBLE_PHARMACIST'],
  CULTIVATION: ['HEAD_OF_CULTIVATION', 'CULTIVATOR', 'NURSERY_MANAGER', 'IRRIGATION_TECH'],
  PROCESSING: ['PROCESSING_MANAGER', 'PROCESSING_SUPERVISOR', 'TRIMMER'],
  QA: ['QA_INSPECTOR', 'LAB_TECH', 'RESPONSIBLE_PHARMACIST'],
  CLEANING: ['HOUSEKEEPING', 'FACILITY_SUPERVISOR'],
  MAINTENANCE: ['MAINTENANCE_MANAGER'],
  QUARANTINE: ['FACILITY_MANAGER', 'QA_INSPECTOR', 'HEAD_OF_CULTIVATION', 'PROCESSING_MANAGER', 'RESPONSIBLE_PHARMACIST'],
  GENERAL: ['FACILITY_MANAGER'],
};

const CATEGORY_CONTROLS: Record<string, string[]> = {
  SAHPRA: ['DIGITAL_SMF_INSPECTION_PACK', 'ELECTRONIC_SIGNATURE_AUDIT_TRAIL'],
  CULTIVATION: ['BATCH_CULTIVATION_RECORD', 'PROCESS_VALIDATION_SMART_FLAGS'],
  PROCESSING: ['BATCH_CULTIVATION_RECORD', 'PROCESS_VALIDATION_SMART_FLAGS'],
  QA: ['ELECTRONIC_SIGNATURE_AUDIT_TRAIL', 'PROCESS_VALIDATION_SMART_FLAGS'],
  CLEANING: ['PROCESS_VALIDATION_SMART_FLAGS'],
  MAINTENANCE: ['PROCESS_VALIDATION_SMART_FLAGS'],
  QUARANTINE: ['BATCH_CULTIVATION_RECORD', 'ELECTRONIC_SIGNATURE_AUDIT_TRAIL'],
  GENERAL: ['DIGITAL_SMF_INSPECTION_PACK'],
};

function normalizeRoles(rolesRequired: any, category: string) {
  const explicit = Array.isArray(rolesRequired) ? rolesRequired.filter(Boolean) : [];
  const mapped = CATEGORY_ROLES[category] || CATEGORY_ROLES.GENERAL;
  return [...new Set(explicit.length ? explicit : mapped)];
}

function ticketCategoryForSop(category: string) {
  if (category === 'MAINTENANCE') return 'MAINTENANCE';
  if (category === 'QA' || category === 'SAHPRA' || category === 'QUARANTINE') return 'COMPLIANCE_APPROVAL';
  return 'SOP_TRAINING';
}

function workflowStageForSop(category: string) {
  if (category === 'CULTIVATION') return 'PROPAGATION';
  if (category === 'PROCESSING') return 'TRIM';
  if (category === 'QA' || category === 'QUARANTINE') return 'STORE_QA';
  return 'FACILITY';
}

export async function syncSopGovernance(sopId: string, tenantId: string, userId: string) {
  const sop = await prisma.sOP.findFirst({ where: { id: sopId, tenantId } });
  if (!sop) throw Object.assign(new Error('SOP not found'), { status: 404 });

  const category = sop.category || 'GENERAL';
  const rolesRequired = normalizeRoles(sop.rolesRequired, category);
  const controlIds = CATEGORY_CONTROLS[category] || CATEGORY_CONTROLS.GENERAL;

  await prisma.sOP.update({
    where: { id: sop.id },
    data: { rolesRequired },
  });

  const staff = await prisma.user.findMany({
    where: { tenantId, active: true, role: { in: rolesRequired as any } },
    select: { id: true, name: true, role: true },
  });

  let trainingCreated = 0;
  for (const user of staff) {
    const existing = await prisma.trainingRecord.findFirst({
      where: {
        tenantId,
        userId: user.id,
        sopId: sop.id,
        status: { in: ['PENDING', 'COMPLETED'] },
      },
    });
    if (existing) continue;

    await prisma.trainingRecord.create({
      data: {
        userId: user.id,
        userName: user.name,
        trainingType: 'SOP_TRAINING',
        title: `SOP Training: ${sop.title} (v${sop.version})`,
        description: `Required by role ${user.role.replace(/_/g, ' ')}. EU GMP mapped controls: ${controlIds.join(', ')}`,
        sopId: sop.id,
        tenantId,
      },
    });
    trainingCreated++;
  }

  let templatesCreated = 0;
  for (const role of rolesRequired) {
    const existing = await prisma.taskTemplate.findFirst({
      where: { tenantId, sopId: sop.id, roleRequired: role, active: true },
    });
    if (existing) continue;

    await prisma.taskTemplate.create({
      data: {
        title: `${sop.title} - ${role.replace(/_/g, ' ')}`,
        description: `Role-linked SOP checklist. EU GMP mapped controls: ${controlIds.join(', ')}`,
        sopId: sop.id,
        roleRequired: role,
        frequency: 'ONE_TIME',
        category,
        checklist: [
          { item: 'Read current SOP version', required: true },
          { item: 'Confirm role responsibilities understood', required: true },
          { item: 'Complete required evidence or practical assessment', required: true },
          { item: 'Acknowledge SOP in QMS', required: true },
        ],
        tenantId,
      },
    });
    templatesCreated++;
  }

  const openGovernanceTicket = await prisma.ticket.findFirst({
    where: {
      tenantId,
      ticketType: 'QMS_GOVERNANCE',
      category: ticketCategoryForSop(category),
      status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] },
      description: { contains: `SOP:${sop.id}` },
    },
  });

  let ticketCreated = false;
  if (!openGovernanceTicket && (trainingCreated > 0 || templatesCreated > 0)) {
    await prisma.ticket.create({
      data: {
        title: `SOP governance sync: ${sop.title}`,
        description: [
          `SOP:${sop.id}`,
          `Version: v${sop.version}`,
          `Category: ${category}`,
          `Roles: ${rolesRequired.join(', ')}`,
          `EU GMP controls: ${controlIds.join(', ')}`,
          `Training records created: ${trainingCreated}`,
          `Role task templates created: ${templatesCreated}`,
        ].join('\n'),
        priority: 'HIGH',
        ticketType: 'QMS_GOVERNANCE',
        category: ticketCategoryForSop(category),
        workflowStage: workflowStageForSop(category),
        reportedById: userId,
        assignedToRole: category === 'QA' || category === 'SAHPRA' ? 'RESPONSIBLE_PHARMACIST' : 'FACILITY_MANAGER',
        tenantId,
      },
    });
    ticketCreated = true;
  }

  const managers = await prisma.user.findMany({
    where: {
      tenantId,
      active: true,
      role: { in: ['SUPER_ADMIN', 'TENANT_ADMIN', 'RESPONSIBLE_PHARMACIST', 'FACILITY_MANAGER', 'QA_INSPECTOR'] as any },
    },
    select: { id: true },
  });

  if (trainingCreated > 0 || templatesCreated > 0) {
    await prisma.notification.createMany({
      data: managers.map(user => ({
        userId: user.id,
        title: `SOP mapped: ${sop.title}`,
        message: `${rolesRequired.length} role group(s), ${trainingCreated} training record(s), ${templatesCreated} task template(s). EU GMP: ${controlIds.join(', ')}`,
        link: '/sop-library',
      })),
    });
  }

  eventBus.emit('SOP_GOVERNANCE_SYNCED', {
    userId,
    tenantId,
    entityType: 'SOP',
    entityId: sop.id,
    rolesRequired,
    controlIds,
    trainingCreated,
    templatesCreated,
    ticketCreated,
  });

  return { sopId: sop.id, category, rolesRequired, controlIds, trainingCreated, templatesCreated, ticketCreated };
}

export { CATEGORY_ROLES };
