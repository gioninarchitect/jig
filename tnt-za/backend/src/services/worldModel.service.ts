import { prisma } from '../config/db';
import { AnomalyType } from '@prisma/client';

interface TnTWorldState {
  facility: { totalPlants: number; plantsByPhase: Record<string, number>; activeBatches: number; quotaUsedPercent: number; gmpStatus: string };
  compliance: { openAnomalies: number; criticalAlerts: number; pendingDestructions: number; permitExpiringDays: number | null };
  containers: { activeContainers: number; containersWithVariance: number; staleContainers: number };
  lab: { pendingTests: number; failedBatches: number; issuedCOAs: number; quarantinedBatches: number };
  risk: { diversionRiskScore: number; complianceScore: number; weightIntegrityScore: number };
}

export async function computeState(tenantId: string): Promise<TnTWorldState> {
  const [
    totalPlants, plantsByPhaseRaw, activeBatches, quarantinedBatches,
    facility, openAnomalies, criticalAlerts, pendingDestructions,
    activeContainers, varianceAnomalies, staleAnomalies,
    issuedCOAs, failedBatches,
  ] = await Promise.all([
    prisma.plant.count({ where: { tenantId } }),
    prisma.plant.groupBy({ by: ['phase'], where: { tenantId }, _count: true }),
    prisma.batch.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.batch.count({ where: { tenantId, status: 'QUARANTINED' } }),
    prisma.facility.findFirst({ where: { tenantId } }),
    prisma.anomaly.count({ where: { tenantId, resolvedAt: null } }),
    prisma.anomaly.count({ where: { tenantId, resolvedAt: null, severity: 'CRITICAL' } }),
    prisma.destructionEvent.count({ where: { facility: { tenantId }, confirmed: false } }),
    prisma.container.count({ where: { tenantId, status: { in: ['LOADED', 'IN_TRANSIT'] } } }),
    prisma.anomaly.count({ where: { tenantId, type: AnomalyType.CONTAINER_WEIGHT_VARIANCE, resolvedAt: null } }),
    prisma.anomaly.count({ where: { tenantId, type: AnomalyType.CONTAINER_STALE, resolvedAt: null } }),
    prisma.cOA.count({ where: { batch: { tenantId }, valid: true } }),
    prisma.batch.count({ where: { tenantId, status: 'QUARANTINED' } }),
  ]);

  const plantsByPhase: Record<string, number> = {};
  plantsByPhaseRaw.forEach(r => { plantsByPhase[r.phase] = r._count; });

  const quotaUsedPercent = facility && facility.quotaAllocated > 0
    ? (facility.quotaUsed / facility.quotaAllocated) * 100 : 0;

  // Nearest expiring permit
  const nearestPermit = await prisma.permit.findFirst({
    where: { facility: { tenantId }, expiryDate: { gt: new Date() } },
    orderBy: { expiryDate: 'asc' },
  });
  const permitExpiringDays = nearestPermit
    ? Math.floor((nearestPermit.expiryDate.getTime() - Date.now()) / 86400000)
    : null;

  // Count batches missing tests
  const allBatches = await prisma.batch.findMany({
    where: { tenantId, status: { in: ['ACTIVE', 'IN_TESTING'] } },
    include: { _count: { select: { labResults: true } } },
  });
  const pendingTests = allBatches.filter(b => b._count.labResults < 8).length;

  const risk = computeRiskScores({
    openAnomalies, criticalAlerts, varianceAnomalies, staleAnomalies,
    totalPlants, activeBatches, quarantinedBatches, pendingDestructions,
  });

  return {
    facility: { totalPlants, plantsByPhase, activeBatches, quotaUsedPercent, gmpStatus: facility?.gmpStatus || 'UNKNOWN' },
    compliance: { openAnomalies, criticalAlerts, pendingDestructions, permitExpiringDays },
    containers: { activeContainers, containersWithVariance: varianceAnomalies, staleContainers: staleAnomalies },
    lab: { pendingTests, failedBatches, issuedCOAs, quarantinedBatches },
    risk,
  };
}

function computeRiskScores(data: {
  openAnomalies: number; criticalAlerts: number; varianceAnomalies: number;
  staleAnomalies: number; totalPlants: number; activeBatches: number;
  quarantinedBatches: number; pendingDestructions: number;
}) {
  // Diversion risk: higher with more weight variances and open anomalies
  const diversionRiskScore = Math.min(100, Math.max(0,
    data.varianceAnomalies * 25 + data.criticalAlerts * 20 + data.staleAnomalies * 5
  ));

  // Compliance: starts at 100, deducts for open issues
  const complianceScore = Math.max(0, 100
    - data.openAnomalies * 8
    - data.pendingDestructions * 10
    - data.quarantinedBatches * 5
  );

  // Weight integrity: inverse of variance anomalies
  const weightIntegrityScore = Math.max(0, 100 - data.varianceAnomalies * 20 - data.staleAnomalies * 5);

  return { diversionRiskScore, complianceScore, weightIntegrityScore };
}

export async function getRiskScores(tenantId: string) {
  const state = await computeState(tenantId);
  return {
    ...state.risk,
    explanations: {
      diversionRisk: state.risk.diversionRiskScore > 50 ? 'Elevated: multiple weight variances detected' : 'Normal',
      compliance: state.risk.complianceScore < 70 ? 'Degraded: open anomalies and pending destructions' : 'Good',
      weightIntegrity: state.risk.weightIntegrityScore < 70 ? 'Declining: container variances need investigation' : 'Stable',
    },
  };
}

export async function getInferences(tenantId: string) {
  const state = await computeState(tenantId);
  const alerts: { id: string; name: string; severity: string; message: string }[] = [];

  if (state.containers.containersWithVariance > 3 && state.compliance.openAnomalies > 2) {
    alerts.push({ id: 'diversion_pattern', name: 'Potential Diversion Pattern', severity: 'critical',
      message: 'Multiple weight variances + open anomalies suggest possible diversion. Alert all senior roles.' });
  }

  if (state.risk.weightIntegrityScore < 70) {
    alerts.push({ id: 'declining_weight_integrity', name: 'Declining Weight Integrity', severity: 'warning',
      message: 'Weight integrity score below 70. Recommend increased spot-checks.' });
  }

  if (state.facility.quotaUsedPercent > 85) {
    alerts.push({ id: 'quota_pressure', name: 'Approaching Quota Limit', severity: 'warning',
      message: `Quota at ${state.facility.quotaUsedPercent.toFixed(0)}%. Review harvest planning.` });
  }

  if (state.lab.pendingTests > 5 && state.lab.quarantinedBatches > 0) {
    alerts.push({ id: 'lab_bottleneck', name: 'Lab Testing Bottleneck', severity: 'info',
      message: `${state.lab.pendingTests} batches awaiting tests, ${state.lab.quarantinedBatches} quarantined. Prioritize retests.` });
  }

  if (state.containers.staleContainers > 0) {
    alerts.push({ id: 'stale_inventory', name: 'Stale Container Alert', severity: 'warning',
      message: `${state.containers.staleContainers} containers with no activity. Check curing schedule or flag for review.` });
  }

  return alerts;
}
