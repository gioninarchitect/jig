// =====================================================================
// ILCO — Daily Cultivation Status Report (email)
//
// Self-contained: pulls the REAL live cultivation numbers (mothers,
// clones, plant population, mortality, open deviations) and emails a
// branded Origin/ILCO gold-on-black report to the Head of Cultivation
// + owner. Zero fake data — every figure comes from the DB.
//
// Run once:   cd backend && node dist/scripts/cultivation-daily-report.js
// Daily cron: 30 6 * * *  (06:30 SAST)
// Recipients: REPORT_RECIPIENTS env (comma-sep) or the defaults below.
// =====================================================================

import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

dotenv.config();
const prisma = new PrismaClient();

const DEFAULT_RECIPIENTS = ['lou@ilcofarming.co.za', 'florisolivier7@gmail.com'];
const GOLD = '#C9A84C';
const BLACK = '#0A0A0A';

function pct(n: number, d: number) { return d > 0 ? Math.round((n / d) * 100) : 0; }
function fmtDate(d: Date) {
  return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Johannesburg' });
}

async function gather(tenantId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const soon = new Date(now.getTime() + 14 * 24 * 3600_000);

  // ── Mother Room ──
  const mothers = await prisma.motherPlant.findMany({ where: { tenantId, status: 'ACTIVE' } });
  const motherPlants = mothers.reduce((s, m) => s + (m.quantity || 1), 0);
  const motherLines = mothers.length;
  const byStrain: Record<string, number> = {};
  for (const m of mothers) byStrain[m.strain] = (byStrain[m.strain] || 0) + (m.quantity || 1);
  const healthDue = mothers.filter(m => m.nextHealthCheck && m.nextHealthCheck <= now).length;
  const cullSoon = mothers.filter(m => m.cullDate && m.cullDate <= soon).length;

  // ── Propagation / Cloning (this month) ──
  const traysMonth = await prisma.cloneTray.findMany({ where: { tenantId, cloneDate: { gte: monthStart } } });
  const cuttings = traysMonth.reduce((s, t) => s + t.totalCuttings, 0);
  const rooted = traysMonth.reduce((s, t) => s + t.rooted, 0);
  const trayDeaths = traysMonth.reduce((s, t) => s + t.mortality, 0);
  const activeTrays = await prisma.cloneTray.count({ where: { tenantId, status: { in: ['ROOTING', 'ROOTED'] } } });

  // ── Plant population ──
  const activePlants = await prisma.plant.count({ where: { tenantId, status: 'ACTIVE' } });
  const phaseGroups = await prisma.plant.groupBy({ by: ['phase'], where: { tenantId, status: 'ACTIVE' }, _count: { _all: true } });
  const byPhase = phaseGroups.map(g => ({ phase: g.phase, n: g._count._all })).sort((a, b) => b.n - a.n);

  // ── Mortality (this month) ──
  const deaths = await prisma.mortalityRecord.aggregate({ where: { tenantId, date: { gte: monthStart } }, _sum: { quantity: true } });
  const monthDeaths = deaths._sum.quantity || 0;
  const causeGroups = await prisma.mortalityRecord.groupBy({ by: ['causeCategory'], where: { tenantId, date: { gte: monthStart } }, _sum: { quantity: true } });
  const topCauses = causeGroups.map(c => ({ cause: c.causeCategory, n: c._sum.quantity || 0 })).sort((a, b) => b.n - a.n).slice(0, 3);

  // ── Open deviations (cultivation-relevant view: all open) ──
  const openDevs = await prisma.deviation.count({ where: { closedAt: null, facility: { tenantId } } });
  const critDevs = await prisma.deviation.count({ where: { closedAt: null, level: 1, facility: { tenantId } } });

  return {
    rootingRate: pct(rooted, cuttings),
    trayMortality: pct(trayDeaths, cuttings),
    plantMortality: pct(monthDeaths, activePlants + monthDeaths),
    motherPlants, motherLines, byStrain, healthDue, cullSoon,
    cuttings, rooted, activeTrays,
    activePlants, byPhase,
    monthDeaths, topCauses,
    openDevs, critDevs,
  };
}

// Metric row: label, value, optional target + on-track flag.
function metric(label: string, value: string, sub = '', alert = false) {
  const vColor = alert ? '#DC2626' : BLACK;
  return `<tr>
    <td style="padding:9px 0;border-bottom:1px solid #E4DCC9;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#5C5648;">${label}</td>
    <td align="right" style="padding:9px 0;border-bottom:1px solid #E4DCC9;font-family:'Courier New',monospace;font-size:15px;font-weight:bold;color:${vColor};">${value}${sub ? `<span style="font-family:Arial;font-size:11px;font-weight:normal;color:#A89F8C;"> ${sub}</span>` : ''}</td>
  </tr>`;
}
function sectionTitle(t: string) {
  return `<tr><td colspan="2" style="padding:22px 0 6px 0;font-family:Georgia,'Times New Roman',serif;font-size:15px;color:${BLACK};border-bottom:2px solid ${GOLD};">${t}</td></tr>`;
}

function buildHtml(d: Awaited<ReturnType<typeof gather>>, dateStr: string) {
  const strainRows = Object.entries(d.byStrain).sort((a, b) => b[1] - a[1])
    .map(([s, n]) => `<span style="display:inline-block;background:#0A0A0A;color:${GOLD};font-family:Arial;font-size:11px;padding:3px 9px;border-radius:10px;margin:2px 3px 2px 0;">${s} · ${n}</span>`).join('');
  const phaseRows = d.byPhase.length
    ? d.byPhase.map(p => metric(p.phase.charAt(0) + p.phase.slice(1).toLowerCase(), String(p.n))).join('')
    : metric('No active plants logged', '—');
  const causeRows = d.topCauses.length
    ? d.topCauses.map(c => metric(c.cause.replace(/_/g, ' ').toLowerCase(), String(c.n))).join('')
    : '';

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ILCO Daily Cultivation Status</title></head>
<body style="margin:0;padding:0;background:${BLACK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BLACK};padding:24px 0;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#F5F0E8;border-radius:12px;overflow:hidden;border:1px solid ${GOLD};">
  <tr><td align="center" style="background:${BLACK};padding:26px 24px;">
    <div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;letter-spacing:2px;color:${GOLD};">ILCO FARMS</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#A89F8C;text-transform:uppercase;margin-top:6px;">Daily Cultivation Status</div>
    <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8B6914;margin-top:10px;">${dateStr}</div>
  </td></tr>
  <tr><td style="padding:8px 32px 28px 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${sectionTitle('🌱 Mother Room')}
      ${metric('Mother plants (active)', String(d.motherPlants), `across ${d.motherLines} lines`)}
      ${metric('Health checks due', String(d.healthDue), d.healthDue ? 'action needed' : 'all current', d.healthDue > 0)}
      ${metric('Culls due (next 14 days)', String(d.cullSoon), '', false)}
      ${strainRows ? `<tr><td colspan="2" style="padding:10px 0 2px 0;">${strainRows}</td></tr>` : ''}

      ${sectionTitle('✂️ Propagation / Cloning (this month)')}
      ${metric('Active clone trays', String(d.activeTrays))}
      ${metric('Cuttings taken', String(d.cuttings))}
      ${metric('Rooting rate', `${d.rootingRate}%`, 'target 85%', d.cuttings > 0 && d.rootingRate < 85)}
      ${metric('Tray mortality', `${d.trayMortality}%`, 'target <15%', d.trayMortality > 15)}

      ${sectionTitle('🪴 Plant Population')}
      ${metric('Active plants', String(d.activePlants))}
      ${phaseRows}

      ${sectionTitle('⚠️ Needs Attention')}
      ${metric('Open deviations', String(d.openDevs), d.critDevs ? `${d.critDevs} critical` : '', d.openDevs > 0)}
      ${metric('Plant mortality (this month)', `${d.plantMortality}%`, `${d.monthDeaths} deaths · target <5%`, d.plantMortality > 5)}
      ${causeRows}
    </table>
    <p style="margin:24px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#A89F8C;line-height:1.6;">
      Auto-generated from the live ILCO Track &amp; Trace database. Open the dashboard for detail:
      <a href="https://tntilco.cleva-ai.co.za/login" style="color:#8B6914;">tntilco.cleva-ai.co.za</a>
    </p>
  </td></tr>
</table>
</td></tr></table></body></html>`;
}

async function main() {
  const tenant = (await prisma.tenant.findFirst({ where: { slug: 'ilco' } })) || (await prisma.tenant.findFirst());
  if (!tenant) throw new Error('No tenant found');

  const data = await gather(tenant.id);
  const dateStr = fmtDate(new Date());
  const html = buildHtml(data, dateStr);

  const recipients = (process.env.REPORT_RECIPIENTS?.split(',').map(s => s.trim()).filter(Boolean)) || DEFAULT_RECIPIENTS;
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpHost = process.env.SMTP_HOST || 'mail.cleva-ai.co.za';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');

  if (!smtpUser || !smtpPass) {
    console.log('[Report] SMTP not configured — HTML built but not sent. Recipients would be:', recipients.join(', '));
    console.log(html.slice(0, 200) + '…');
    return;
  }

  const transporter = nodemailer.createTransport({ host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: smtpUser, pass: smtpPass } });
  const info = await transporter.sendMail({
    from: `"ILCO Cultivation" <${smtpUser}>`,
    to: recipients.join(', '),
    subject: `🌱 ILCO Daily Cultivation Status — ${dateStr}`,
    html,
    text: `ILCO Daily Cultivation Status — ${dateStr}\nMothers: ${data.motherPlants} (${data.motherLines} lines), ${data.healthDue} health checks due.\nClones: ${data.activeTrays} active trays, ${data.rootingRate}% rooting.\nPlants: ${data.activePlants} active.\nOpen deviations: ${data.openDevs}. Plant mortality (month): ${data.plantMortality}%.`,
  });
  console.log(`[Report] Sent cultivation status to ${recipients.join(', ')} — ${info.messageId}`);
}

main()
  .catch(e => { console.error('[Report] FAILED:', e.message); process.exitCode = 1; })
  .finally(async () => { await prisma.$disconnect(); });
