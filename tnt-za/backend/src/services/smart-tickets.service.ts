import { prisma } from '../config/db';
import { ROLE_LEVELS } from '../config/constants';

// ── AUTO-ROUTE: Find the right person to assign a ticket to ──
export async function autoRouteTicket(ticketId: string, tenantId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket || ticket.assignedToId) return; // already assigned

  // Map workflow stage + category to the best role
  const stageRoleMap: Record<string, string[]> = {
    PROPAGATION: ['HEAD_OF_CULTIVATION', 'NURSERY_MANAGER', 'CULTIVATOR'],
    VEGETATIVE: ['HEAD_OF_CULTIVATION', 'CULTIVATOR'],
    FLOWERING: ['HEAD_OF_CULTIVATION', 'CULTIVATOR'],
    HARVEST: ['HEAD_OF_CULTIVATION', 'FACILITY_MANAGER'],
    WET_RECEIVING: ['PROCESSING_MANAGER'],
    DRYING: ['PROCESSING_MANAGER'],
    DEBUC: ['PROCESSING_MANAGER'],
    TRIM: ['PROCESSING_MANAGER', 'PROCESSING_SUPERVISOR'],
    CURE: ['PROCESSING_MANAGER'],
    STORE_QA: ['QA_INSPECTOR', 'LAB_TECH'],
    SALE: ['TENANT_ADMIN'],
    DISPATCH: ['SECURITY_OFFICER', 'DELIVERY_DRIVER'],
    FACILITY: ['MAINTENANCE_MANAGER', 'FACILITY_SUPERVISOR'],
  };

  const categoryRoleMap: Record<string, string[]> = {
    PEST: ['HEAD_OF_CULTIVATION', 'CULTIVATOR'],
    MOULD: ['HEAD_OF_CULTIVATION', 'QA_INSPECTOR'],
    EQUIPMENT: ['MAINTENANCE_MANAGER'],
    FEEDING: ['IRRIGATION_TECH', 'CULTIVATOR'],
    MAINTENANCE: ['MAINTENANCE_MANAGER'],
    REQUISITION_SUPPLIES: ['FACILITY_SUPERVISOR'],
    REQUISITION_EQUIPMENT: ['MAINTENANCE_MANAGER'],
    REQUISITION_PPE: ['FACILITY_SUPERVISOR'],
    COMPLIANCE_APPROVAL: ['QA_INSPECTOR'],
    RP_SIGNOFF: ['RESPONSIBLE_PHARMACIST'],
  };

  // Try stage first, then category
  const roles = stageRoleMap[ticket.workflowStage || ''] || categoryRoleMap[ticket.category] || ['FACILITY_MANAGER'];

  // Find first available user with matching role
  for (const role of roles) {
    const user = await prisma.user.findFirst({
      where: { tenantId, role: role as any, active: true },
      select: { id: true, name: true },
    });
    if (user) {
      await prisma.ticket.update({
        where: { id: ticketId },
        data: { assignedToId: user.id, status: 'ASSIGNED' },
      });
      return { assignedTo: user.name, role };
    }
  }
}

// ── AUTO-ESCALATE: Check for stale tickets and bump priority ──
export async function escalateStaleTickets(tenantId: string) {
  const now = new Date();
  const fourHoursAgo = new Date(now.getTime() - 4 * 3600000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600000);
  const escalated: any[] = [];

  // Tickets open > 4 hours with LOW/MEDIUM priority → bump to HIGH
  const stale4hr = await prisma.ticket.findMany({
    where: {
      tenantId,
      status: { in: ['OPEN', 'ASSIGNED'] },
      priority: { in: ['LOW', 'MEDIUM'] },
      createdAt: { lt: fourHoursAgo },
    },
  });

  for (const t of stale4hr) {
    await prisma.ticket.update({
      where: { id: t.id },
      data: { priority: 'HIGH' },
    });
    escalated.push({ id: t.id, title: t.title, from: t.priority, to: 'HIGH', reason: '4hrs no response' });
  }

  // Tickets open > 24 hours with HIGH priority → bump to CRITICAL + assign to FM
  const stale24hr = await prisma.ticket.findMany({
    where: {
      tenantId,
      status: { in: ['OPEN', 'ASSIGNED'] },
      priority: 'HIGH',
      createdAt: { lt: twentyFourHoursAgo },
    },
  });

  for (const t of stale24hr) {
    const fm = await prisma.user.findFirst({ where: { tenantId, role: 'FACILITY_MANAGER', active: true } });
    await prisma.ticket.update({
      where: { id: t.id },
      data: {
        priority: 'CRITICAL',
        assignedToId: fm?.id || t.assignedToId,
      },
    });

    // Add auto-comment
    await prisma.ticketComment.create({
      data: {
        ticketId: t.id,
        content: `⚠ AUTO-ESCALATED: This ticket has been open for 24+ hours without resolution. Priority bumped to CRITICAL and escalated to Facility Manager.`,
        authorId: 'SYSTEM',
      },
    });

    escalated.push({ id: t.id, title: t.title, from: 'HIGH', to: 'CRITICAL', reason: '24hrs no response — escalated to FM' });
  }

  return { escalated: escalated.length, tickets: escalated };
}

// ── AUTO-LINK: Find related tickets for same bay/batch/plant ──
export async function findRelatedTickets(ticketId: string, tenantId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return [];

  const where: any = {
    tenantId,
    id: { not: ticketId },
    status: { not: 'CLOSED' },
  };

  const orConditions: any[] = [];
  if (ticket.bayId) orConditions.push({ bayId: ticket.bayId });
  if (ticket.batchId) orConditions.push({ batchId: ticket.batchId });
  if (ticket.plantId) orConditions.push({ plantId: ticket.plantId });
  if (ticket.greenhouseId) orConditions.push({ greenhouseId: ticket.greenhouseId });

  if (orConditions.length === 0) return [];
  where.OR = orConditions;

  return prisma.ticket.findMany({ where, take: 10, orderBy: { createdAt: 'desc' } });
}

// ── SMART CONTEXT: Add context info to a ticket ──
export async function getTicketContext(ticketId: string, tenantId: string) {
  const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
  if (!ticket) return null;

  const context: any = {};

  // Bay context
  if (ticket.bayId) {
    const bay = await prisma.bay.findUnique({ where: { id: ticket.bayId }, include: { greenhouse: true } });
    if (bay) {
      context.bay = { name: bay.name, greenhouse: bay.greenhouse?.name, strain: bay.currentStrain, phase: bay.currentPhase, daysInPhase: bay.daysInPhase };
    }
  }

  // Batch context
  if (ticket.batchId) {
    const batch = await prisma.batch.findUnique({ where: { id: ticket.batchId } });
    if (batch) {
      context.batch = { number: batch.batchNumber, strain: batch.strain, status: batch.status, weight: batch.totalWeight };
    }
  }

  // Related tickets
  context.relatedTickets = await findRelatedTickets(ticketId, tenantId);

  // SLA — how long has this been open
  const ageHours = Math.round((Date.now() - ticket.createdAt.getTime()) / 3600000);
  context.sla = {
    ageHours,
    ageDisplay: ageHours < 1 ? 'Just now' : ageHours < 24 ? `${ageHours}h ago` : `${Math.round(ageHours / 24)}d ago`,
    isOverdue: ageHours > 24 && ticket.status !== 'COMPLETED',
    isStale: ageHours > 4 && ticket.status === 'OPEN',
  };

  return context;
}

// ── SMART NOTIFICATIONS: Generate contextual messages ──
export async function generateSmartNotifications(userId: string, tenantId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const notifications: { type: string; priority: number; title: string; message: string; link: string }[] = [];
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Overdue tasks with context
  const overdueTasks = await prisma.task.findMany({
    where: { assignedToId: userId, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: today } },
  });
  if (overdueTasks.length > 0) {
    const oldest = overdueTasks.sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))[0];
    const daysOverdue = Math.ceil((now.getTime() - (oldest.dueDate?.getTime() || now.getTime())) / 86400000);
    notifications.push({
      type: 'overdue_task', priority: 1,
      title: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`,
      message: `Oldest: "${oldest.title}" — ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue`,
      link: '/kanban',
    });
  }

  // 2. Tickets assigned to me
  const myTickets = await prisma.ticket.findMany({
    where: { assignedToId: userId, status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
  });
  const criticalTickets = myTickets.filter(t => t.priority === 'CRITICAL');
  if (criticalTickets.length > 0) {
    notifications.push({
      type: 'critical_ticket', priority: 1,
      title: `${criticalTickets.length} CRITICAL ticket${criticalTickets.length > 1 ? 's' : ''} assigned to you`,
      message: criticalTickets[0].title,
      link: '/tickets',
    });
  }

  // 3. Mother health checks overdue
  if (['HEAD_OF_CULTIVATION', 'CULTIVATOR', 'NURSERY_MANAGER'].includes(user.role)) {
    const mothersOverdue = await prisma.motherPlant.findMany({
      where: { tenantId, status: 'ACTIVE', nextHealthCheck: { lte: now } },
    });
    if (mothersOverdue.length > 0) {
      notifications.push({
        type: 'mother_health', priority: 2,
        title: `${mothersOverdue.length} mother${mothersOverdue.length > 1 ? 's' : ''} need health check`,
        message: mothersOverdue.map(m => m.identifier).join(', '),
        link: '/mothers',
      });
    }
  }

  // 4. Stale tickets (management only)
  if ((ROLE_LEVELS[user.role] || 0) >= 3) {
    const staleTickets = await prisma.ticket.count({
      where: { tenantId, status: 'OPEN', createdAt: { lt: new Date(now.getTime() - 4 * 3600000) } },
    });
    if (staleTickets > 0) {
      notifications.push({
        type: 'stale_tickets', priority: 2,
        title: `${staleTickets} ticket${staleTickets > 1 ? 's' : ''} with no response`,
        message: 'Open for 4+ hours — consider escalating',
        link: '/tickets',
      });
    }
  }

  // 5. Shift not started
  const todayEnd = new Date(today.getTime() + 86400000);
  const shift = await prisma.shiftAllocation.findFirst({
    where: { userId, date: { gte: today, lt: todayEnd } },
  });
  if (shift && shift.status === 'PENDING') {
    notifications.push({
      type: 'shift_pending', priority: 2,
      title: 'Shift not started',
      message: `Your shift as ${shift.role.replace(/_/g, ' ')} is waiting — tap to start`,
      link: '/my-shift',
    });
  }

  // 6. Pending approvals (admin only)
  if (['TENANT_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
    const pendingApprovals = await prisma.ticket.count({
      where: { tenantId, ticketType: { in: ['REQUISITION', 'APPROVAL'] }, status: { not: 'COMPLETED' }, approvedAt: null },
    });
    if (pendingApprovals > 0) {
      notifications.push({
        type: 'pending_approvals', priority: 2,
        title: `${pendingApprovals} approval${pendingApprovals > 1 ? 's' : ''} waiting`,
        message: 'Requisitions and compliance docs need your sign-off',
        link: '/tickets',
      });
    }
  }

  // 7. RP sign-offs pending
  if (user.role === 'RESPONSIBLE_PHARMACIST') {
    const rpPending = await prisma.ticket.count({
      where: { tenantId, ticketType: 'RP_SIGNOFF', rpSignedAt: null, status: { not: 'COMPLETED' } },
    });
    if (rpPending > 0) {
      notifications.push({
        type: 'rp_pending', priority: 1,
        title: `${rpPending} product${rpPending > 1 ? 's' : ''} awaiting your sign-off`,
        message: 'Processing cannot proceed without RP approval',
        link: '/tickets',
      });
    }
  }

  // 8. Maintenance Manager — equipment + calibration + facility tickets
  if (user.role === 'MAINTENANCE_MANAGER') {
    // Calibration due
    const calDue = await prisma.equipmentCalibration.count({
      where: { nextDue: { lte: new Date(now.getTime() + 7 * 86400000) } },
    });
    if (calDue > 0) {
      notifications.push({
        type: 'calibration_due', priority: 1,
        title: `${calDue} equipment calibration${calDue > 1 ? 's' : ''} due this week`,
        message: 'Scales, pH meters, EC meters — check calibration log',
        link: '/assets',
      });
    }

    // Faulty assets
    const faultyAssets = await prisma.asset.count({ where: { tenantId, status: 'FAULTY' } });
    if (faultyAssets > 0) {
      notifications.push({
        type: 'faulty_assets', priority: 1,
        title: `${faultyAssets} faulty asset${faultyAssets > 1 ? 's' : ''}`,
        message: 'Equipment marked as faulty — needs repair or replacement',
        link: '/assets',
      });
    }

    // Low stock consumables
    const allConsumables = await prisma.asset.findMany({ where: { tenantId, isConsumable: true } });
    const lowStock = allConsumables.filter(a => a.currentStock !== null && a.minStockLevel !== null && a.currentStock <= a.minStockLevel);
    if (lowStock.length > 0) {
      notifications.push({
        type: 'low_stock', priority: 2,
        title: `${lowStock.length} consumable${lowStock.length > 1 ? 's' : ''} low stock`,
        message: lowStock.slice(0, 3).map(a => a.name).join(', '),
        link: '/assets',
      });
    }

    // Maintenance tickets assigned to me
    const maintTickets = await prisma.ticket.count({
      where: { tenantId, assignedToId: userId, category: { in: ['EQUIPMENT', 'MAINTENANCE'] }, status: { in: ['OPEN', 'ASSIGNED'] } },
    });
    if (maintTickets > 0) {
      notifications.push({
        type: 'maint_tickets', priority: 2,
        title: `${maintTickets} maintenance ticket${maintTickets > 1 ? 's' : ''} assigned to you`,
        message: 'Equipment issues waiting for action',
        link: '/tickets',
      });
    }
  }

  // 9. Processing Manager — trim sessions + weight alerts
  if (user.role === 'PROCESSING_MANAGER' || user.role === 'PROCESSING_SUPERVISOR') {
    const activeTrimSessions = await prisma.trimSession.count({ where: { tenantId, status: 'IN_PROGRESS' } });
    if (activeTrimSessions > 0) {
      notifications.push({
        type: 'active_trim', priority: 2,
        title: `${activeTrimSessions} trim session${activeTrimSessions > 1 ? 's' : ''} in progress`,
        message: 'Monitor trimmer weight reconciliation',
        link: '/trim',
      });
    }
  }

  // 10. Facility Supervisor — cleaning + spray schedule
  if (user.role === 'FACILITY_SUPERVISOR') {
    const facilityTickets = await prisma.ticket.count({
      where: { tenantId, workflowStage: 'FACILITY', status: { in: ['OPEN', 'ASSIGNED'] } },
    });
    if (facilityTickets > 0) {
      notifications.push({
        type: 'facility_tickets', priority: 2,
        title: `${facilityTickets} facility ticket${facilityTickets > 1 ? 's' : ''}`,
        message: 'Cleaning, maintenance, or facility issues',
        link: '/tickets',
      });
    }
  }

  return notifications.sort((a, b) => a.priority - b.priority);
}
