import { prisma } from '../config/db';

// Log an event on a mother plant timeline
export async function logMotherEvent(data: {
  motherPlantId: string; eventType: string; description: string;
  notes?: string; photo?: string; userId: string; tenantId: string;
}) {
  const event = await prisma.motherEvent.create({
    data: {
      motherPlantId: data.motherPlantId, eventType: data.eventType,
      description: data.description, notes: data.notes, photo: data.photo,
      performedById: data.userId, tenantId: data.tenantId,
    },
  });

  // Update mother health check dates if applicable
  if (data.eventType === 'HEALTH_CHECK') {
    const mother = await prisma.motherPlant.findUnique({ where: { id: data.motherPlantId } });
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + (mother?.healthCheckInterval || 7));
    await prisma.motherPlant.update({
      where: { id: data.motherPlantId },
      data: { lastHealthCheck: new Date(), nextHealthCheck: nextCheck },
    });
  }

  if (data.eventType === 'FEEDING') {
    await prisma.motherPlant.update({
      where: { id: data.motherPlantId },
      data: { lastFeedDate: new Date(), feedingNotes: data.notes },
    });
  }

  return event;
}

// Get mother timeline
export async function getMotherTimeline(motherPlantId: string) {
  return prisma.motherEvent.findMany({
    where: { motherPlantId },
    orderBy: { timestamp: 'desc' },
    take: 50,
  });
}

// Assign mother to bay position
export async function assignMotherToBay(data: {
  motherPlantId: string; bayId: string; greenhouseId: string; bayPosition: number;
}) {
  return prisma.motherPlant.update({
    where: { id: data.motherPlantId },
    data: { bayId: data.bayId, greenhouseId: data.greenhouseId, bayPosition: data.bayPosition },
  });
}

// Get mothers due for health check
export async function getMothersNeedingCheck(tenantId: string) {
  return prisma.motherPlant.findMany({
    where: {
      tenantId, status: 'ACTIVE',
      OR: [
        { nextHealthCheck: { lte: new Date() } },
        { nextHealthCheck: null },
      ],
    },
    orderBy: { nextHealthCheck: 'asc' },
  });
}
