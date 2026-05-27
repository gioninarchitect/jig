import { Link } from 'react-router-dom';
import { useWorldState } from '../../../hooks/useWorldModel';
import {
  ShieldCheck, AlertTriangle, FileText, Scale, ScrollText, Wrench, BookOpen, FileSignature, BadgeCheck,
} from 'lucide-react';

// =====================================================================
// FM Compliance — 9-card SAHPRA readiness panel
//
// Three logical bands, top to bottom:
//   1. Regulator-facing  · Licence · Quota · Open Anomalies · Critical
//   2. Process integrity  · Calibration · Deviations · SOPs Due Review · Destructions
//   3. Output             · COAs Issued
//
// Every card is a deep-link to its drill-down page so an FM walking
// into a meeting can click through to the underlying record in one tap.
// =====================================================================

type Tone = 'ok' | 'info' | 'warn' | 'danger';

interface Card {
  label: string;
  value: string | number;
  sub?: string;
  icon: any;
  tone: Tone;
  to: string;
}

const TONE_STYLES: Record<Tone, { box: string; icon: string; value: string }> = {
  ok:     { box: 'bg-white/[0.03] border-white/5',    icon: 'text-white/30',  value: 'text-white' },
  info:   { box: 'bg-blue-500/5 border-blue-500/15',  icon: 'text-blue-300',  value: 'text-blue-200' },
  warn:   { box: 'bg-amber-500/5 border-amber-500/20', icon: 'text-amber-300', value: 'text-amber-200' },
  danger: { box: 'bg-red-500/5 border-red-500/20',    icon: 'text-red-400',   value: 'text-red-300' },
};

function CardTile({ card }: { card: Card }) {
  const t = TONE_STYLES[card.tone];
  return (
    <Link
      to={card.to}
      className={`block rounded-lg border p-3 transition hover:bg-white/[0.06] active:scale-[0.97] ${t.box}`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <card.icon size={12} className={t.icon} />
        <span className="text-[11px] text-white/40 leading-tight truncate">{card.label}</span>
      </div>
      <div className={`text-xl font-bold font-mono leading-tight ${t.value}`}>
        {card.value}
      </div>
      {card.sub && (
        <div className={`text-[10px] mt-0.5 ${card.tone === 'danger' ? 'text-red-400/70' : card.tone === 'warn' ? 'text-amber-300/70' : 'text-white/30'}`}>
          {card.sub}
        </div>
      )}
    </Link>
  );
}

function BandLabel({ label }: { label: string }) {
  return (
    <div className="text-[10px] tracking-[0.14em] uppercase text-white/30 font-semibold mt-3 mb-1.5 first:mt-0">
      {label}
    </div>
  );
}

export default function ComplianceSummaryWidget() {
  const { data: state } = useWorldState();
  if (!state) return null;

  const c = state.compliance ?? {};
  const f = state.facility ?? {};
  const lab = state.lab ?? {};

  // ── Band 1 · Regulator ─────────────────────────────────
  const licenceTone: Tone =
    c.licenceExpiringDays == null ? 'warn' :
    c.licenceExpiringDays < 30 ? 'danger' :
    c.licenceExpiringDays < 90 ? 'warn' : 'ok';

  const quotaPct = Math.round(f.quotaUsedPercent ?? 0);
  const quotaTone: Tone =
    quotaPct >= 95 ? 'danger' :
    quotaPct >= 85 ? 'warn' :
    quotaPct >= 70 ? 'info' : 'ok';

  const anomaliesTone: Tone = (c.openAnomalies ?? 0) > 0 ? 'danger' : 'ok';
  const criticalTone: Tone  = (c.criticalAlerts ?? 0) > 0 ? 'danger' : 'ok';

  const regulatorCards: Card[] = [
    {
      label: 'SAHPRA Licence',
      value: c.licenceNumber ? `${c.licenceExpiringDays}d` : 'Not registered',
      sub: c.licenceNumber ? `${c.licenceNumber} · 22C` : 'Add Section 22C licence',
      icon: ScrollText,
      tone: licenceTone,
      to: '/compliance',
    },
    {
      label: 'Quota Burn',
      value: `${quotaPct}%`,
      sub: 'Annual SAHPRA quota',
      icon: BadgeCheck,
      tone: quotaTone,
      to: '/compliance',
    },
    {
      label: 'Open Anomalies',
      value: c.openAnomalies ?? 0,
      sub: 'Unresolved',
      icon: AlertTriangle,
      tone: anomaliesTone,
      to: '/compliance',
    },
    {
      label: 'Critical Alerts',
      value: c.criticalAlerts ?? 0,
      sub: 'Need senior action',
      icon: ShieldCheck,
      tone: criticalTone,
      to: '/compliance',
    },
  ];

  // ── Band 2 · Process integrity ─────────────────────────
  const calOverdue = c.calibrationOverdue ?? 0;
  const calSoon = c.calibrationDueSoon ?? 0;
  const calTone: Tone = calOverdue > 0 ? 'danger' : calSoon > 0 ? 'warn' : 'ok';

  const openDevs = c.openDeviations ?? 0;
  const oldestDev = c.oldestDeviationDays;
  const devTone: Tone =
    openDevs === 0 ? 'ok' :
    oldestDev != null && oldestDev > 30 ? 'danger' :
    'warn';

  const sopDue = c.sopsDueForReview ?? 0;
  const sopTotal = c.sopsTotal ?? 0;
  const sopTone: Tone = sopDue > 0 ? 'warn' : 'ok';

  const destructions = c.pendingDestructions ?? 0;
  const destTone: Tone = destructions > 0 ? 'warn' : 'ok';

  const processCards: Card[] = [
    {
      label: 'Calibration',
      value: calOverdue > 0 ? `${calOverdue}` : calSoon,
      sub: calOverdue > 0
        ? `${calOverdue} overdue · ${calSoon} due ≤14d`
        : calSoon > 0 ? `Due in next 14 days` : 'All current',
      icon: Wrench,
      tone: calTone,
      to: '/assets',
    },
    {
      label: 'Open Deviations',
      value: openDevs,
      sub: openDevs > 0 && oldestDev != null
        ? `Oldest ${oldestDev}d · CAPA review`
        : 'No open CAPA',
      icon: FileSignature,
      tone: devTone,
      to: '/qms',
    },
    {
      label: 'SOPs Due Review',
      value: sopDue,
      sub: `${sopTotal} active SOPs · 12-month interval`,
      icon: BookOpen,
      tone: sopTone,
      to: '/sop-library',
    },
    {
      label: 'Pending Destructions',
      value: destructions,
      sub: destructions > 0 ? 'SAPS witness needed' : 'None awaiting',
      icon: Scale,
      tone: destTone,
      to: '/compliance',
    },
  ];

  // ── Band 3 · Output ────────────────────────────────────
  const outputCards: Card[] = [
    {
      label: 'COAs Issued',
      value: lab.issuedCOAs ?? 0,
      sub: 'Valid certificates of analysis',
      icon: FileText,
      tone: 'info',
      to: '/lab',
    },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldCheck size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-white/60">SAHPRA Compliance</h2>
      </div>
      <p className="text-[10px] text-white/30 mb-2">
        Tap any card for the underlying record · Section 22C inspection-ready
      </p>

      <BandLabel label="Regulator" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {regulatorCards.map(card => <CardTile key={card.label} card={card} />)}
      </div>

      <BandLabel label="Process Integrity" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {processCards.map(card => <CardTile key={card.label} card={card} />)}
      </div>

      <BandLabel label="Output" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {outputCards.map(card => <CardTile key={card.label} card={card} />)}
      </div>
    </div>
  );
}
