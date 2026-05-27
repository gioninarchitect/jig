import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Radar, ArrowRight, Stamp, FileSignature, Wrench, FlaskConical, Truck } from 'lucide-react';
import api from '../../../services/api';

// =====================================================================
// BottleneckRadarWidget — surfaces ageing queues for decision-makers
//
// For each queue, shows:
//   • how many items have been waiting > the role's SLA
//   • the oldest item's age
//   • click-through to clear it
//
// Self-suppresses queues with zero ageing items so the widget stays
// signal-only. If every queue is healthy, shows a single "All clear" line.
// =====================================================================

interface Queue {
  id: string;
  label: string;
  icon: any;
  to: string;
  filter: (t: any) => boolean;
  ageGate: number; // hours past which an item is "ageing"
}

const QUEUES: Queue[] = [
  {
    id: 'rp',
    label: 'RP Sign-off',
    icon: Stamp,
    to: '/responsible-pharmacist',
    filter: (t) => t.ticketType === 'RP_SIGNOFF' && !t.rpSignedAt && t.status !== 'COMPLETED' && t.status !== 'CLOSED',
    ageGate: 24,
  },
  {
    id: 'approval',
    label: 'Owner Approval',
    icon: FileSignature,
    to: '/tickets',
    filter: (t) => (t.ticketType === 'APPROVAL' || t.ticketType === 'REQUISITION') && !t.approvedAt && t.status !== 'COMPLETED' && t.status !== 'CLOSED',
    ageGate: 48,
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    to: '/tickets',
    filter: (t) => (t.category === 'MAINTENANCE' || t.category === 'EQUIPMENT' || t.category === 'IRRIGATION') && t.status !== 'COMPLETED' && t.status !== 'CLOSED',
    ageGate: 24,
  },
  {
    id: 'lab',
    label: 'Lab Backlog',
    icon: FlaskConical,
    to: '/lab',
    filter: (t) => t.workflowStage === 'STORE_QA' && t.status !== 'COMPLETED' && t.status !== 'CLOSED',
    ageGate: 48,
  },
  {
    id: 'dispatch',
    label: 'Dispatch',
    icon: Truck,
    to: '/dispatch',
    filter: (t) => t.workflowStage === 'DISPATCH' && t.status !== 'COMPLETED' && t.status !== 'CLOSED',
    ageGate: 24,
  },
];

function ageHours(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / 3600000;
}

function ageLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function BottleneckRadarWidget() {
  const { data: tickets } = useQuery({
    queryKey: ['tickets', ''],
    queryFn: () => api.get('/baygrid/tickets').then(r => r.data.tickets),
  });

  if (!tickets) return null;

  const rows = QUEUES.map(q => {
    const items = tickets.filter(q.filter);
    const ageing = items.filter((t: any) => ageHours(t.createdAt) > q.ageGate);
    const oldestHrs = items.length > 0
      ? Math.max(...items.map((t: any) => ageHours(t.createdAt)))
      : 0;
    return {
      ...q,
      total: items.length,
      ageing: ageing.length,
      oldestHrs,
    };
  });

  const anyAgeing = rows.some(r => r.ageing > 0);

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${anyAgeing ? 'bg-amber-500/[0.03] border-amber-500/15' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Radar size={16} className={anyAgeing ? 'text-amber-400' : 'text-primary'} />
        <h2 className="text-sm font-semibold text-white/60">Bottleneck Radar</h2>
        {anyAgeing && (
          <span className="text-[10px] tracking-wide uppercase text-amber-300 ml-auto">queues ageing</span>
        )}
      </div>

      {!anyAgeing ? (
        <div className="text-sm text-white/40 py-2">
          All queues clear · no items past SLA
        </div>
      ) : (
        <div className="space-y-1">
          {rows.filter(r => r.ageing > 0).map(r => (
            <Link
              key={r.id}
              to={r.to}
              className="flex items-center gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white/5 transition group"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <r.icon size={14} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white/80 font-medium">{r.label}</div>
                <div className="text-[11px] text-white/40">
                  {r.ageing} ageing · oldest {ageLabel(r.oldestHrs)} · SLA {r.ageGate}h
                </div>
              </div>
              <span className="text-lg font-bold font-mono text-amber-300 flex-shrink-0">{r.ageing}</span>
              <ArrowRight size={14} className="text-white/20 group-hover:text-white/60 transition flex-shrink-0" />
            </Link>
          ))}

          {/* Healthy queues — single muted line */}
          {rows.filter(r => r.ageing === 0 && r.total > 0).length > 0 && (
            <div className="text-[11px] text-white/30 pt-2 border-t border-white/[0.04] mt-2">
              Healthy: {rows.filter(r => r.ageing === 0 && r.total > 0).map(r => r.label).join(' · ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
