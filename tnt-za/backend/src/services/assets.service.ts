import { prisma } from '../config/db';
import { eventBus } from './eventBus';

// ── ASSET TAG GENERATION ──

async function generateAssetTag(tenantId: string): Promise<string> {
  const count = await prisma.asset.count({ where: { tenantId } });
  return `AST-${String(count + 1).padStart(6, '0')}`;
}

// ── CREATE ASSET ──

export async function createAsset(data: {
  tier: string; category: string; subcategory?: string; name: string;
  description?: string; manufacturer?: string; model?: string; serialNumber?: string;
  facilityId: string; zoneId?: string; greenhouseId?: string; bayId?: string;
  workflowStage?: string;
  purchaseDate?: string; purchaseCost?: number; supplier?: string; warrantyExpiry?: string;
  requiresCalibration?: boolean; calibrationInterval?: number;
  isSensor?: boolean; sensorType?: string; readingUnit?: string; readingInterval?: number;
  isConsumable?: boolean; currentStock?: number; minStockLevel?: number; reorderQuantity?: number; unitOfMeasure?: string;
  assignedToId?: string; assignedToName?: string;
  tenantId: string; userId: string;
}) {
  const assetTag = await generateAssetTag(data.tenantId);

  const asset = await prisma.asset.create({
    data: {
      assetTag,
      tier: data.tier,
      category: data.category,
      subcategory: data.subcategory,
      name: data.name,
      description: data.description,
      manufacturer: data.manufacturer,
      model: data.model,
      serialNumber: data.serialNumber,
      facilityId: data.facilityId,
      zoneId: data.zoneId,
      greenhouseId: data.greenhouseId,
      bayId: data.bayId,
      workflowStage: data.workflowStage,
      purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : undefined,
      purchaseCost: data.purchaseCost,
      supplier: data.supplier,
      warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : undefined,
      requiresCalibration: data.requiresCalibration || false,
      calibrationInterval: data.calibrationInterval,
      isSensor: data.isSensor || false,
      sensorType: data.sensorType,
      readingUnit: data.readingUnit,
      readingInterval: data.readingInterval,
      isConsumable: data.isConsumable || false,
      currentStock: data.currentStock,
      minStockLevel: data.minStockLevel,
      reorderQuantity: data.reorderQuantity,
      unitOfMeasure: data.unitOfMeasure,
      assignedToId: data.assignedToId,
      assignedToName: data.assignedToName,
      tenantId: data.tenantId,
    },
  });

  eventBus.emit('ASSET_CREATED', { userId: data.userId, tenantId: data.tenantId, entityType: 'Asset', entityId: asset.id });
  return asset;
}

// ── LIST ASSETS ──

export async function listAssets(query: {
  tenantId: string; tier?: string; category?: string; status?: string;
  workflowStage?: string; isSensor?: boolean; isConsumable?: boolean;
  lowStock?: boolean; calibrationDue?: boolean;
}) {
  const where: any = { tenantId: query.tenantId };
  if (query.tier) where.tier = query.tier;
  if (query.category) where.category = query.category;
  if (query.status) where.status = query.status;
  if (query.workflowStage) where.workflowStage = query.workflowStage;
  if (query.isSensor) where.isSensor = true;
  if (query.isConsumable) where.isConsumable = true;

  // Low stock filter — consumables below min threshold
  if (query.lowStock) {
    where.isConsumable = true;
    where.currentStock = { lt: prisma.asset.fields.minStockLevel };
    // Prisma doesn't support field comparison directly, so we'll filter in code
  }

  // Calibration due within 7 days
  if (query.calibrationDue) {
    where.requiresCalibration = true;
    where.nextCalibrationDue = { lte: new Date(Date.now() + 7 * 86400000) };
  }

  const assets = await prisma.asset.findMany({
    where,
    include: { _count: { select: { maintenanceLogs: true, sensorReadings: true } } },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });

  // Post-filter for low stock (since Prisma can't compare two fields)
  if (query.lowStock) {
    return assets.filter(a => a.currentStock !== null && a.minStockLevel !== null && a.currentStock <= a.minStockLevel);
  }

  return assets;
}

// ── GET ASSET (360 VIEW) ──

export async function getAsset(id: string, tenantId: string) {
  return prisma.asset.findFirst({
    where: { id, tenantId },
    include: {
      maintenanceLogs: { orderBy: { performedAt: 'desc' }, take: 20 },
      sensorReadings: { orderBy: { timestamp: 'desc' }, take: 50 },
    },
  });
}

// ── GET ASSET BY TAG (QR scan) ──

export async function getAssetByTag(assetTag: string) {
  return prisma.asset.findUnique({
    where: { assetTag },
    include: {
      maintenanceLogs: { orderBy: { performedAt: 'desc' }, take: 10 },
      sensorReadings: { orderBy: { timestamp: 'desc' }, take: 10 },
    },
  });
}

// ── UPDATE ASSET ──

export async function updateAsset(id: string, data: any) {
  const updates: any = { ...data };
  // Clean up non-model fields
  delete updates.userId;
  delete updates.tenantId;
  if (updates.purchaseDate) updates.purchaseDate = new Date(updates.purchaseDate);
  if (updates.warrantyExpiry) updates.warrantyExpiry = new Date(updates.warrantyExpiry);
  return prisma.asset.update({ where: { id }, data: updates });
}

// ── LOG MAINTENANCE ──

export async function logMaintenance(data: {
  assetId: string; type: string; description: string; cost?: number;
  nextDueAt?: string; notes?: string; userId: string;
}) {
  const log = await prisma.assetMaintenanceLog.create({
    data: {
      assetId: data.assetId,
      type: data.type,
      description: data.description,
      cost: data.cost,
      performedBy: data.userId,
      nextDueAt: data.nextDueAt ? new Date(data.nextDueAt) : undefined,
      notes: data.notes,
    },
  });

  // Update asset calibration dates if this was a calibration
  if (data.type === 'CALIBRATION') {
    const asset = await prisma.asset.findUnique({ where: { id: data.assetId } });
    if (asset?.calibrationInterval) {
      await prisma.asset.update({
        where: { id: data.assetId },
        data: {
          lastCalibratedAt: new Date(),
          nextCalibrationDue: new Date(Date.now() + asset.calibrationInterval * 86400000),
        },
      });
    }
  }

  return log;
}

// ── LOG SENSOR READING ──

export async function logSensorReading(assetId: string, value: number, unit: string) {
  const reading = await prisma.sensorReading.create({
    data: { assetId, value, unit },
  });

  // Update last reading on asset
  await prisma.asset.update({
    where: { id: assetId },
    data: { lastReading: value, lastReadingAt: new Date() },
  });

  return reading;
}

// ── UPDATE CONSUMABLE STOCK ──

export async function updateStock(id: string, change: number, userId: string) {
  const asset = await prisma.asset.findUnique({ where: { id } });
  if (!asset?.isConsumable) throw Object.assign(new Error('Not a consumable'), { status: 400 });

  const newStock = Math.max(0, (asset.currentStock || 0) + change);
  const updated = await prisma.asset.update({
    where: { id },
    data: { currentStock: newStock },
  });

  // Auto-create requisition ticket if below threshold
  if (updated.minStockLevel && newStock <= updated.minStockLevel) {
    eventBus.emit('LOW_STOCK', { assetId: id, assetName: updated.name, currentStock: newStock, minLevel: updated.minStockLevel, tenantId: updated.tenantId });
  }

  return updated;
}

// ── DASHBOARD STATS ──

export async function getAssetStats(tenantId: string) {
  const [total, faulty, calibrationDue, lowStock, sensors] = await Promise.all([
    prisma.asset.count({ where: { tenantId, status: { not: 'DECOMMISSIONED' } } }),
    prisma.asset.count({ where: { tenantId, status: 'FAULTY' } }),
    prisma.asset.count({ where: { tenantId, requiresCalibration: true, nextCalibrationDue: { lte: new Date(Date.now() + 7 * 86400000) } } }),
    prisma.asset.findMany({ where: { tenantId, isConsumable: true } }).then(
      assets => assets.filter(a => a.currentStock !== null && a.minStockLevel !== null && a.currentStock <= a.minStockLevel).length
    ),
    prisma.asset.count({ where: { tenantId, isSensor: true, status: 'ACTIVE' } }),
  ]);

  return { total, faulty, calibrationDue, lowStock, sensors };
}
