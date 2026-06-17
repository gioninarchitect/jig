import { eventBus } from './eventBus';
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

// ── LEAVE ──
export async function requestLeave(data: { userId: string; userName: string; leaveType: string; startDate: string; endDate: string; reason?: string; tenantId: string }) {
  const s = new Date(data.startDate), e = new Date(data.endDate);
  const days = Math.max(1, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
  const lr = await prisma.leaveRequest.create({
    data: { userId: data.userId, userName: data.userName, leaveType: data.leaveType || 'ANNUAL', startDate: s, endDate: e, days, reason: data.reason || null, tenantId: data.tenantId },
  });
  eventBus.emit('LEAVE_REQUESTED', { userId: data.userId, tenantId: data.tenantId, entityType: 'LeaveRequest', entityId: lr.id });
  return lr;
}
export async function listLeave(tenantId: string, opts: { userId?: string; status?: string } = {}) {
  return prisma.leaveRequest.findMany({ where: { tenantId, ...(opts.userId ? { userId: opts.userId } : {}), ...(opts.status ? { status: opts.status } : {}) }, orderBy: { createdAt: 'desc' } });
}
export async function decideLeave(id: string, data: { status: 'APPROVED' | 'REJECTED'; approvedById: string; approverNote?: string; tenantId: string }) {
  const lr = await prisma.leaveRequest.update({ where: { id }, data: { status: data.status, approvedById: data.approvedById, approverNote: data.approverNote || null } });
  eventBus.emit(data.status === 'APPROVED' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED', { userId: lr.userId, tenantId: data.tenantId, entityType: 'LeaveRequest', entityId: id });
  return lr;
}

// ── COMPETENCY MATRIX (staff × training/SOP) ──
export async function getCompetencyMatrix(tenantId: string) {
  const users = await prisma.user.findMany({ where: { tenantId }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } });
  const records = await prisma.trainingRecord.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
  const titles = Array.from(new Set(records.map(r => r.title)));
  const now = new Date();
  const staff = users.map(u => {
    const competencies: Record<string, any> = {};
    for (const t of titles) {
      const rec = records.find(r => r.userId === u.id && r.title === t); // latest (records desc)
      if (rec) {
        const expired = rec.expiresAt && new Date(rec.expiresAt) < now;
        competencies[t] = { status: expired ? 'EXPIRED' : rec.status, expiresAt: rec.expiresAt };
      }
    }
    return { id: u.id, name: u.name, role: u.role, competencies };
  });
  return { titles, staff };
}
