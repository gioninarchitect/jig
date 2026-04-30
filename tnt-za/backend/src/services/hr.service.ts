import { prisma } from '../config/db';

// ── ATTENDANCE ──

export async function clockIn(userId: string, userName: string, tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.attendance.findFirst({ where: { userId, date: today } });
  if (existing) {
    return prisma.attendance.update({ where: { id: existing.id }, data: { clockIn: new Date(), status: 'PRESENT' } });
  }
  return prisma.attendance.create({
    data: { date: today, userId, userName, clockIn: new Date(), status: 'PRESENT', tenantId },
  });
}

export async function clockOut(userId: string, tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const record = await prisma.attendance.findFirst({ where: { userId, date: today } });
  if (!record) throw Object.assign(new Error('No clock-in record for today'), { status: 400 });

  const hours = record.clockIn ? (Date.now() - record.clockIn.getTime()) / 3600000 : 0;
  return prisma.attendance.update({
    where: { id: record.id },
    data: { clockOut: new Date(), hoursWorked: Math.round(hours * 10) / 10 },
  });
}

export async function getAttendanceForDate(date: string, tenantId: string) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const next = new Date(d);
  next.setDate(next.getDate() + 1);
  return prisma.attendance.findMany({ where: { tenantId, date: { gte: d, lt: next } }, orderBy: { userName: 'asc' } });
}

export async function markAbsent(userId: string, userName: string, date: string, reason: string, tenantId: string) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return prisma.attendance.upsert({
    where: { date_userId: { date: d, userId } },
    create: { date: d, userId, userName, status: reason, tenantId },
    update: { status: reason, notes: reason },
  });
}

// ── TRAINING ──

export async function listTraining(query: { tenantId: string; userId?: string; status?: string }) {
  const where: any = { tenantId: query.tenantId };
  if (query.userId) where.userId = query.userId;
  if (query.status) where.status = query.status;
  return prisma.trainingRecord.findMany({ where, orderBy: { createdAt: 'desc' } });
}

export async function createTraining(data: {
  userId: string; userName: string; trainingType: string; title: string;
  description?: string; sopId?: string; expiresAt?: string;
  tenantId: string;
}) {
  return prisma.trainingRecord.create({
    data: {
      userId: data.userId, userName: data.userName, trainingType: data.trainingType,
      title: data.title, description: data.description, sopId: data.sopId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      tenantId: data.tenantId,
    },
  });
}

export async function completeTraining(id: string, data: { score?: number; assessedById?: string; certificate?: string }) {
  return prisma.trainingRecord.update({
    where: { id },
    data: { status: 'COMPLETED', completedAt: new Date(), score: data.score, assessedById: data.assessedById, certificate: data.certificate },
  });
}

export async function getHRStats(tenantId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [presentToday, totalStaff, pendingTraining, expiredTraining] = await Promise.all([
    prisma.attendance.count({ where: { tenantId, date: { gte: today, lt: tomorrow }, status: 'PRESENT' } }),
    prisma.user.count({ where: { tenantId, active: true } }),
    prisma.trainingRecord.count({ where: { tenantId, status: 'PENDING' } }),
    prisma.trainingRecord.count({ where: { tenantId, expiresAt: { lte: new Date() }, status: 'COMPLETED' } }),
  ]);

  return { presentToday, totalStaff, pendingTraining, expiredTraining };
}
