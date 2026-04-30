import { prisma } from '../config/db';
import { BatchStatus } from '@prisma/client';
import { eventBus } from './eventBus';

const REQUIRED_TESTS = ['POTENCY', 'PESTICIDE', 'HEAVY_METALS', 'MICROBIAL', 'MYCOTOXIN', 'RESIDUAL_SOLVENTS', 'MOISTURE', 'FOREIGN_MATTER'];

export async function submitResult(data: {
  batchId: string;
  testType: string;
  resultData: any;
  passed: boolean;
  tenantId: string;
  userId: string;
}) {
  if (!REQUIRED_TESTS.includes(data.testType)) {
    throw Object.assign(new Error(`Invalid test type. Must be one of: ${REQUIRED_TESTS.join(', ')}`), { status: 400 });
  }

  const batch = await prisma.batch.findFirst({ where: { id: data.batchId, tenantId: data.tenantId } });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

  const result = await prisma.labResult.create({
    data: {
      testType: data.testType,
      resultData: data.resultData,
      passed: data.passed,
      batchId: data.batchId,
      testedById: data.userId,
    },
  });

  // If failed → auto-quarantine batch
  if (!data.passed) {
    await prisma.batch.update({
      where: { id: data.batchId },
      data: { status: BatchStatus.QUARANTINED },
    });

    eventBus.emit('BATCH_QUARANTINED', {
      userId: data.userId, tenantId: data.tenantId,
      entityType: 'Batch', entityId: data.batchId,
      reason: `Failed ${data.testType} test`,
    });
  }

  eventBus.emit('LAB_RESULT_SUBMITTED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Batch', entityId: data.batchId,
    testType: data.testType, passed: data.passed,
  });

  return result;
}

export async function getResults(batchId: string, tenantId: string) {
  const batch = await prisma.batch.findFirst({ where: { id: batchId, tenantId } });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

  const results = await prisma.labResult.findMany({
    where: { batchId },
    include: { testedBy: { select: { id: true, name: true } } },
    orderBy: { testedAt: 'desc' },
  });

  const completedTests = [...new Set(results.filter(r => r.passed).map(r => r.testType))];
  const missingTests = REQUIRED_TESTS.filter(t => !completedTests.includes(t));
  const allPassed = missingTests.length === 0;

  return { results, completedTests, missingTests, allPassed, requiredTests: REQUIRED_TESTS };
}

export async function flagForRetest(resultId: string, data: { tenantId: string; userId: string }) {
  const result = await prisma.labResult.findUnique({
    where: { id: resultId },
    include: { batch: true },
  });
  if (!result) throw Object.assign(new Error('Lab result not found'), { status: 404 });

  // Auto-quarantine
  await prisma.batch.update({
    where: { id: result.batchId },
    data: { status: BatchStatus.QUARANTINED },
  });

  eventBus.emit('LAB_RETEST_FLAGGED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'LabResult', entityId: resultId,
    batchId: result.batchId,
  });

  return { flagged: true, batchQuarantined: true };
}

export { REQUIRED_TESTS };
