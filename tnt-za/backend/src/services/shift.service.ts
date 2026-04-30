import { prisma } from '../config/db';

// Get today's shift for a user
export async function getMyShift(userId: string, tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return prisma.shiftAllocation.findFirst({
    where: { userId, tenantId, date: { gte: today, lt: tomorrow } },
  });
}

// Get all allocations for a date
export async function getShiftsForDate(date: string, tenantId: string) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);

  return prisma.shiftAllocation.findMany({
    where: { tenantId, date: { gte: d, lt: next } },
    orderBy: { userName: 'asc' },
  });
}

// Allocate staff for a day (FM/Head creates)
export async function allocateShift(data: {
  date: string; userId: string; userName: string; role: string;
  tasks: { title: string; description?: string; bayId?: string; greenhouseId?: string }[];
  tenantId: string; allocatedById: string;
}) {
  const d = new Date(data.date);
  d.setHours(0, 0, 0, 0);

  // Upsert — update if exists, create if not
  const existing = await prisma.shiftAllocation.findFirst({
    where: { userId: data.userId, date: d },
  });

  if (existing) {
    return prisma.shiftAllocation.update({
      where: { id: existing.id },
      data: { role: data.role, tasks: data.tasks, userName: data.userName, allocatedById: data.allocatedById },
    });
  }

  return prisma.shiftAllocation.create({
    data: {
      date: d, userId: data.userId, userName: data.userName, role: data.role,
      tasks: data.tasks, allocatedById: data.allocatedById, tenantId: data.tenantId,
    },
  });
}

// Bulk allocate from calendar day
export async function bulkAllocate(data: {
  date: string;
  allocations: { userId: string; userName: string; role: string; tasks: any[] }[];
  tenantId: string; allocatedById: string;
}) {
  const results = [];
  for (const alloc of data.allocations) {
    const result = await allocateShift({
      date: data.date, ...alloc, tenantId: data.tenantId, allocatedById: data.allocatedById,
    });
    results.push(result);
  }
  return results;
}

// Staff starts shift
export async function startShift(id: string) {
  return prisma.shiftAllocation.update({
    where: { id },
    data: { status: 'STARTED', startedAt: new Date() },
  });
}

// Staff completes shift (with optional deviation notes)
export async function completeShift(id: string, deviationNotes?: string) {
  return prisma.shiftAllocation.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date(), deviationNotes },
  });
}
