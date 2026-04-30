import { prisma } from '../config/db';

// Auto-generate tickets from grow calendar for upcoming days
export async function forecastAndCreateTickets(tenantId: string, userId: string, daysAhead: number = 3) {
  const schedules = await prisma.growSchedule.findMany({ where: { tenantId, status: 'ACTIVE' } });
  const created: any[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const schedule of schedules) {
    const phases = schedule.phases as any[];
    if (!phases || !Array.isArray(phases)) continue;

    for (const phase of phases) {
      if (!phase.date || (!phase.task && !phase.additionalTask && !phase.ipmApplication)) continue;

      const phaseDate = new Date(phase.date);
      phaseDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((phaseDate.getTime() - today.getTime()) / 86400000);

      // Only create for today + next N days
      if (diffDays < 0 || diffDays > daysAhead) continue;

      // Check if ticket already exists for this day + task
      const taskTitle = phase.task || phase.additionalTask || phase.ipmApplication;
      const dateStr = phase.date.split('T')[0] || phase.date;

      const existing = await prisma.ticket.findFirst({
        where: {
          tenantId,
          title: { contains: taskTitle },
          createdAt: { gte: phaseDate, lt: new Date(phaseDate.getTime() + 86400000) },
        },
      });

      if (existing) continue; // don't duplicate

      // Build ticket description
      const parts = [];
      if (phase.task) parts.push(`Task: ${phase.task}`);
      if (phase.additionalTask) parts.push(`Instructions: ${phase.additionalTask}`);
      if (phase.ipmApplication) parts.push(`IPM: ${phase.ipmApplication} ${phase.dosage || ''}`);
      parts.push(`Day ${phase.dayNum} — ${phase.phase}`);
      parts.push(`Schedule: ${schedule.title}`);

      const ticket = await prisma.ticket.create({
        data: {
          title: `[${schedule.title}] Day ${phase.dayNum}: ${taskTitle}`,
          description: parts.join('\n'),
          priority: phase.task?.includes('HARVEST') || phase.task?.includes('FLIP') ? 'HIGH' : phase.ipmApplication ? 'MEDIUM' : 'LOW',
          ticketType: 'ISSUE',
          category: phase.ipmApplication ? 'FEEDING' : 'GENERAL',
          workflowStage: phase.phase === 'VEG' ? 'VEGETATIVE' : phase.phase === 'FLOWER' ? 'FLOWERING' : phase.phase === 'HARVEST' ? 'HARVEST' : 'FACILITY',
          reportedById: userId,
          tenantId,
        },
      });

      created.push({ date: dateStr, title: ticket.title, priority: ticket.priority });
    }
  }

  return { created: created.length, tickets: created };
}

// Get forecast — what's coming in the next N days
export async function getForecast(tenantId: string, daysAhead: number = 7) {
  const schedules = await prisma.growSchedule.findMany({ where: { tenantId, status: 'ACTIVE' } });
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const forecast: any[] = [];

  for (const schedule of schedules) {
    const phases = schedule.phases as any[];
    if (!phases || !Array.isArray(phases)) continue;

    for (const phase of phases) {
      if (!phase.date) continue;
      const phaseDate = new Date(phase.date);
      phaseDate.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((phaseDate.getTime() - today.getTime()) / 86400000);

      if (diffDays >= 0 && diffDays <= daysAhead && (phase.task || phase.additionalTask || phase.ipmApplication)) {
        forecast.push({
          date: phase.date,
          daysFromNow: diffDays,
          dayNum: phase.dayNum,
          phase: phase.phase,
          task: phase.task,
          additionalTask: phase.additionalTask,
          ipmApplication: phase.ipmApplication,
          dosage: phase.dosage,
          schedule: schedule.title,
          strain: schedule.strain,
          isToday: diffDays === 0,
          isTomorrow: diffDays === 1,
          isCritical: phase.task?.includes('HARVEST') || phase.task?.includes('FLIP') || phase.task?.includes('CLONE'),
        });
      }
    }
  }

  forecast.sort((a, b) => a.daysFromNow - b.daysFromNow);
  return forecast;
}

// Generate daily reminders — tasks due today that don't have tickets yet
export async function generateDailyReminders(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Overdue tasks
  const overdueTasks = await prisma.task.findMany({
    where: { tenantId, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: today } },
    select: { id: true, title: true, dueDate: true, assignedToId: true, priority: true },
  });

  // Tasks due today
  const dueTodayTasks = await prisma.task.findMany({
    where: { tenantId, status: 'PENDING', dueDate: { gte: today, lt: tomorrow } },
    select: { id: true, title: true, assignedToId: true, priority: true },
  });

  // Open critical tickets
  const criticalTickets = await prisma.ticket.findMany({
    where: { tenantId, priority: 'CRITICAL', status: { in: ['OPEN', 'ASSIGNED'] } },
    select: { id: true, title: true, createdAt: true },
  });

  // Equipment calibration due
  const calibrationDue = await prisma.equipmentCalibration.findMany({
    where: { nextDue: { lte: new Date(today.getTime() + 7 * 86400000) } },
    select: { id: true, equipmentName: true, nextDue: true },
  });

  // Mothers needing health check
  const mothersOverdue = await prisma.motherPlant.findMany({
    where: { tenantId, status: 'ACTIVE', nextHealthCheck: { lte: today } },
    select: { id: true, identifier: true, strain: true, nextHealthCheck: true },
  });

  return {
    overdueTasks: overdueTasks.length,
    dueTodayTasks: dueTodayTasks.length,
    criticalTickets: criticalTickets.length,
    calibrationDue: calibrationDue.length,
    mothersOverdue: mothersOverdue.length,
    items: {
      overdue: overdueTasks,
      today: dueTodayTasks,
      critical: criticalTickets,
      calibration: calibrationDue,
      mothers: mothersOverdue,
    },
  };
}
