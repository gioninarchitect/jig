import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { TicketCheck, ArrowRight, Flame } from 'lucide-react';
import api from '../../../services/api';

// =====================================================================
// TicketsWidget — dashboard preview with SLA timers + queue tabs
//
// SLA thresholds (priority → max age before breach):
//   CRITICAL = 4h, HIGH = 24h, MEDIUM = 72h, LOW = 168h
//
// Tabs: All | Mine (assigned) | Reported (by me)
// Each tab shows count badge.
// Breached tickets get a 🔥 + red age stamp.
// =====================================================================

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-amber-500', MEDIUM: 'bg-blue-500', LOW: 'bg-white/30',
};

const SLA_HOURS: Record<string, number> = {
  CRITICAL: 4, HIGH: 24, MEDIUM: 72, LOW: 168,
};

type Tab = 'all' | 'mine' | 'reported';

function ageHours(createdAt: string): number {
  return (Date.now() - new Date(createdAt).getTime()) / 3600000;
}

function ageLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

export default function TicketsWidget() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('all');

  const { data: tickets } = useQuery({
    queryKey: ['tickets', ''],
    queryFn: () => api.get('/baygrid/tickets').then(r => r.data.tickets),
  });

  const allOpen = (tickets ?? []).filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED');
  const mine     = allOpen.filter((t: any) => t.assignedToId === user?.id);
  const reported = allOpen.filter((t: any) => t.reportedById === user?.id);

  const list = tab === 'mine' ? mine : tab === 'reported' ? reported : allOpen;
  const critical = list.filter((t: any) => t.priority === 'CRITICAL');

  // Compute SLA breach across the visible list
  const breached = list.filter((t: any) => {
    const sla = SLA_HOURS[t.priority] ?? 168;
    return ageHours(t.createdAt) > sla;
  });

  const dangerBorder = critical.length > 0 || breached.length > 0;

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${dangerBorder ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <TicketCheck size={16} className={dangerBorder ? 'text-red-400' : 'text-primary'} />
          <h2 className="text-sm font-semibold text-white/60 truncate">Open Tickets</h2>
          {breached.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-500 text-white flex items-center gap-1">
              <Flame size={10} /> {breached.length} SLA
            </span>
          )}
        </div>
        <Link to="/tickets" className="text-xs text-primary flex items-center gap-1 hover:text-primary-light flex-shrink-0">
          View All <ArrowRight size={12} />
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-white/[0.06]">
        <TabButton active={tab === 'all'} onClick={() => setTab('all')} label="All" count={allOpen.length} />
        <TabButton active={tab === 'mine'} onClick={() => setTab('mine')} label="Mine" count={mine.length} highlight />
        <TabButton active={tab === 'reported'} onClick={() => setTab('reported')} label="Reported" count={reported.length} />
      </div>

      {!list.length ? (
        <p className="text-white/30 text-sm py-2">
          {tab === 'mine' ? 'No tickets assigned to you' :
           tab === 'reported' ? 'You have no open reports' :
           'No open tickets'}
        </p>
      ) : (
        <div className="space-y-1.5">
          {list.slice(0, 5).map((t: any) => {
            const hrs = ageHours(t.createdAt);
            const sla = SLA_HOURS[t.priority] ?? 168;
            const overdue = hrs > sla;
            const overdueHours = hrs - sla;
            return (
              <Link
                key={t.id}
                to="/tickets"
                className={`flex items-center gap-2.5 py-1.5 text-sm hover:bg-white/5 -mx-2 px-2 rounded-lg transition ${overdue ? 'bg-red-500/[0.03]' : ''}`}
              >
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                <span className="text-white/80 truncate flex-1">{t.title}</span>
                {overdue ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-semibold flex items-center gap-1 flex-shrink-0">
                    <Flame size={9} /> +{ageLabel(overdueHours)}
                  </span>
                ) : (
                  <span className="text-[10px] text-white/30 font-mono flex-shrink-0">{ageLabel(hrs)}</span>
                )}
                <span className="text-xs text-white/20 flex-shrink-0 hidden sm:inline">{t.category}</span>
              </Link>
            );
          })}
          {list.length > 5 && (
            <p className="text-xs text-white/30 pt-1">+{list.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  );
}

function TabButton({
  active, onClick, label, count, highlight,
}: { active: boolean; onClick: () => void; label: string; count: number; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium transition border-b-2 -mb-px flex items-center gap-1.5 ${
        active
          ? 'text-white border-primary'
          : 'text-white/40 border-transparent hover:text-white/70'
      }`}
    >
      {label}
      {count > 0 && (
        <span className={`text-[10px] px-1.5 rounded-full font-bold ${
          active
            ? (highlight ? 'bg-primary text-white' : 'bg-white/20 text-white')
            : 'bg-white/10 text-white/40'
        }`}>
          {count}
        </span>
      )}
    </button>
  );
}
