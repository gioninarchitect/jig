import { prisma } from '../config/db';
import { COAStatus, BatchStatus } from '@prisma/client';
import { eventBus } from './eventBus';
import { REQUIRED_TESTS } from './lab.service';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const COA_DIR = join(process.cwd(), 'uploads', 'coa');

export async function generateCOA(batchId: string, data: { tenantId: string; userId: string }) {
  const batch = await prisma.batch.findFirst({
    where: { id: batchId, tenantId: data.tenantId },
    include: { facility: true },
  });
  if (!batch) throw Object.assign(new Error('Batch not found'), { status: 404 });

  // Check all 8 tests exist and passed
  const results = await prisma.labResult.findMany({ where: { batchId } });
  const passedTypes = new Set(results.filter(r => r.passed).map(r => r.testType));
  const missing = REQUIRED_TESTS.filter(t => !passedTypes.has(t));

  if (missing.length > 0) {
    throw Object.assign(new Error(`Cannot generate COA. Missing/failed tests: ${missing.join(', ')}`), { status: 400 });
  }

  // Generate QR
  const provenanceUrl = `/provenance/${batchId}`;
  const qrDataUrl = await QRCode.toDataURL(provenanceUrl);

  // Ensure directory
  if (!existsSync(COA_DIR)) mkdirSync(COA_DIR, { recursive: true });

  // Generate PDF
  const pdfPath = join(COA_DIR, `${batch.batchNumber}.pdf`);
  const pdfUrl = `/uploads/coa/${batch.batchNumber}.pdf`;

  await new Promise<void>((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = createWriteStream(pdfPath);
    doc.pipe(stream);

    // Header
    doc.fontSize(24).fillColor('#0D6B3D').text('Certificate of Analysis', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text('TnT-ZA Cannabis Track & Trace', { align: 'center' });
    if (batch.validationRun) {
      doc.moveDown(0.3);
      doc.fontSize(11).fillColor('#B91C1C')
        .text('VALIDATION / PROOF RUN — NOT FOR RELEASE — lab values are sample data pending an accredited result', { align: 'center' });
    }
    doc.moveDown(1);

    // Batch info
    doc.fontSize(12).fillColor('#333');
    doc.text(`Batch: ${batch.batchNumber}`, { continued: true }).text(`    Strain: ${batch.strain}`);
    doc.text(`Facility: ${batch.facility.name}`);
    doc.text(`Total Weight: ${batch.totalWeight.toFixed(1)}g`);
    doc.text(`Issued: ${new Date().toLocaleDateString('en-ZA')}`);
    doc.moveDown(1);

    // Test results table
    doc.fontSize(14).fillColor('#0D6B3D').text('Test Results');
    doc.moveDown(0.5);

    for (const test of REQUIRED_TESTS) {
      const result = results.find(r => r.testType === test && r.passed);
      const rd = result?.resultData as any;
      doc.fontSize(10).fillColor('#333');
      doc.text(`${test}`, { continued: true, width: 200 });
      doc.fillColor('#198754').text(`  PASS  `, { continued: true });
      doc.fillColor('#666').text(`  ${rd?.value || '-'} ${rd?.unit || ''}`);
    }

    doc.moveDown(2);

    // QR code
    const qrImageData = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    doc.image(Buffer.from(qrImageData, 'base64'), doc.page.width / 2 - 50, doc.y, { width: 100 });
    doc.moveDown(8);
    doc.fontSize(8).fillColor('#999').text('Scan QR to verify provenance', { align: 'center' });

    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  // Create COA record
  const coa = await prisma.cOA.create({
    data: {
      batchId,
      issuedById: data.userId,
      pdfUrl,
      qrCode: provenanceUrl,
      valid: true,
    },
  });

  // Update batch COA status
  await prisma.batch.update({
    where: { id: batchId },
    data: { coaStatus: COAStatus.ISSUED, status: BatchStatus.RELEASED },
  });

  eventBus.emit('COA_ISSUED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'Batch', entityId: batchId,
    coaId: coa.id,
  });

  return coa;
}

export async function getCOA(id: string) {
  const coa = await prisma.cOA.findUnique({
    where: { id },
    include: { batch: true, issuedBy: { select: { name: true } } },
  });
  if (!coa) throw Object.assign(new Error('COA not found'), { status: 404 });
  return coa;
}

export async function revokeCOA(id: string, data: { reason: string; tenantId: string; userId: string }) {
  const coa = await prisma.cOA.findUnique({ where: { id }, include: { batch: true } });
  if (!coa) throw Object.assign(new Error('COA not found'), { status: 404 });

  const updated = await prisma.cOA.update({
    where: { id },
    data: { valid: false, revokeReason: data.reason, revokedAt: new Date() },
  });

  await prisma.batch.update({
    where: { id: coa.batchId },
    data: { coaStatus: COAStatus.REVOKED },
  });

  eventBus.emit('COA_REVOKED', {
    userId: data.userId, tenantId: data.tenantId,
    entityType: 'COA', entityId: id, reason: data.reason,
  });

  return updated;
}
