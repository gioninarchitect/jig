import { Router, Response } from 'express';
import { requireAuth, requireLevel, requireRole, AuthRequest } from '../middleware/auth';
import { p } from '../utils/params';
import { prisma } from '../config/db';
import { verifyHashChain } from '../services/audit.service';

const router = Router();
router.use(requireAuth);

router.get('/', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(p(req.query.page as string)) || 1;
    const limit = Math.min(parseInt(p(req.query.limit as string)) || 25, 100);
    const where: any = { tenantId: req.user!.tenantId };

    if (p(req.query.userId as string)) where.userId = p(req.query.userId as string);
    if (p(req.query.action as string)) where.action = { contains: p(req.query.action as string), mode: 'insensitive' };
    if (p(req.query.entityType as string)) where.entityType = p(req.query.entityType as string);

    const [entries, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { timestamp: 'desc' },
        include: { user: { select: { name: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({ success: true, entries, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/verify', requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
  try {
    const result = await verifyHashChain(req.user!.tenantId);
    res.json({ success: true, ...result });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

router.get('/export', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const entries = await prisma.auditLog.findMany({
      where: { tenantId: req.user!.tenantId },
      orderBy: { timestamp: 'asc' },
      include: { user: { select: { name: true } } },
    });

    const csv = [
      'timestamp,user,action,entityType,entityId,hash',
      ...entries.map(e => `${e.timestamp.toISOString()},${e.user.name},${e.action},${e.entityType},${e.entityId},${e.hashChain}`),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=audit-log.csv');
    res.send(csv);
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// Audit package PDF export with date range
router.get('/package', requireLevel(3), async (req: AuthRequest, res: Response) => {
  try {
    const from = p(req.query.from as string);
    const to = p(req.query.to as string);
    const where: any = { tenantId: req.user!.tenantId };
    if (from) where.timestamp = { ...(where.timestamp || {}), gte: new Date(from) };
    if (to) where.timestamp = { ...(where.timestamp || {}), lte: new Date(to) };

    const [entries, anomalies, destructions, permits] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { timestamp: 'asc' }, include: { user: { select: { name: true } } } }),
      prisma.anomaly.findMany({ where: { tenantId: req.user!.tenantId }, orderBy: { detectedAt: 'desc' } }),
      prisma.destructionEvent.findMany({ where: { facility: { tenantId: req.user!.tenantId } }, include: { facility: { select: { name: true } } } }),
      prisma.permit.findMany({ where: { facility: { tenantId: req.user!.tenantId } } }),
    ]);

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=audit-package-${new Date().toISOString().slice(0,10)}.pdf`);
    doc.pipe(res);

    // Title
    doc.fontSize(20).fillColor('#0D6B3D').text('ILCO Farms — Compliance Audit Package', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#666').text(`Generated: ${new Date().toLocaleString('en-ZA')}${from ? ` | From: ${from}` : ''}${to ? ` | To: ${to}` : ''}`, { align: 'center' });
    doc.moveDown(1);

    // Permits
    doc.fontSize(14).fillColor('#0D6B3D').text('Permits & Licenses');
    doc.moveDown(0.3);
    permits.forEach((pm: any) => {
      doc.fontSize(9).fillColor('#333').text(`${pm.type}: ${pm.permitNumber} | Issued: ${pm.issuedDate.toLocaleDateString('en-ZA')} | Expires: ${pm.expiryDate.toLocaleDateString('en-ZA')}`);
    });
    doc.moveDown(1);

    // Anomalies
    doc.fontSize(14).fillColor('#0D6B3D').text(`Anomalies (${anomalies.length})`);
    doc.moveDown(0.3);
    anomalies.forEach((a: any) => {
      doc.fontSize(9).fillColor(a.resolvedAt ? '#333' : '#DC3545');
      doc.text(`[${a.severity}] ${a.type}: ${a.description} | ${a.resolvedAt ? 'Resolved: ' + a.investigationNotes : 'OPEN'}`);
    });
    doc.moveDown(1);

    // Destructions
    doc.fontSize(14).fillColor('#0D6B3D').text(`Destruction Events (${destructions.length})`);
    doc.moveDown(0.3);
    destructions.forEach((d: any) => {
      doc.fontSize(9).fillColor('#333').text(`${d.weight}g | ${d.reason} | SAPS: ${d.sapsOfficerName} (${d.sapsOfficerBadge}) | ${d.confirmed ? 'Confirmed' : 'PENDING'}`);
    });
    doc.moveDown(1);

    // Audit trail summary
    doc.fontSize(14).fillColor('#0D6B3D').text(`Audit Trail (${entries.length} entries)`);
    doc.moveDown(0.3);
    entries.slice(0, 100).forEach((e: any) => {
      doc.fontSize(8).fillColor('#555').text(`${e.timestamp.toISOString()} | ${e.user.name} | ${e.action} | ${e.entityType}:${e.entityId.slice(0,8)}`);
    });
    if (entries.length > 100) doc.fontSize(8).fillColor('#999').text(`... and ${entries.length - 100} more entries (see CSV export for full trail)`);

    doc.end();
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

export default router;
