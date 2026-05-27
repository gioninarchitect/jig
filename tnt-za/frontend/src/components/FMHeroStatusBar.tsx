import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useWorldState } from '../hooks/useWorldModel';
import { Flame, AlertTriangle, ShieldCheck, ArrowRight, Clock } from 'lucide-react';
import api from '../services/api';

// =====================================================================
// FMHeroStatusBar — the 5-second view at the top of the FM dashboard
//
// Three signals, then three action cards:
//   1. Greeting + named user + time
//   2. Status line — "ALL CLEAR" or "N CRITICAL · M SLA"
//   3. Top 3 actions — most urgent open tickets (CRITICAL first, then SLA-breached)
// =====================================================================

const SLA_HOURS: Record<string, number> = { CRITICAL: 4, HIGH: 24, MEDIUM: 72, LOW: 168 };

function ageHours(createdAt: string) {
  return (Date.now() - new Date(createdAt).getTime()) / 3600000;
}

function timeOfDay() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function clockHHmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function FMHeroStatusBar() {
  const { user } = useAuth();
  const { data: state } = useWorldState();

  const { data: tickets } = useQuery({
    queryKey: ['tickets', ''],
    queryFn: () => api.get('/baygrid/tickets').then(r => r.data.tickets),
  });

  const open = (tickets ?? []).filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED');
  const critical = open.filter((t: any) => t.priority === 'CRITICAL');
  const breached = open.filter((t: any) => ageHours(t.createdAt) > (SLA_HOURS[t.priority] ?? 168));

  // Top 3 actions = critical first, then SLA-breached, then by age
  const top3: any[] = [
    ...critical,
    ...breached.filter((t: any) => !critical.includes(t)),
    ...open.filter((t: any) => !critical.includes(t) && !breached.includes(t))
            .sort((a: any, b: any) => ageHours(b.createdAt) - ageHours(a.createdAt)),
  ].slice(0, 3);

  const allClear = critical.length === 0 && breached.length === 0;
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="space-y-3">
      {/* Greeting */}
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-white">
          {timeOfDay()}, {firstName}
        </h1>
        <div className="text-xs text-white/30 font-mono flex items-center gap-1.5">
          <Clock size={11} /> {clockHHmm()}
        </div>
      </div>

      {/* Status line — single horizontal stripe */}
      <div
        className={`rounded-2xl border px-4 py-3 flex items-center justify-between gap-3 ${
          allClear
            ? 'bg-green-500/[0.04] border-green-500/15'
            : critical.length > 0
              ? 'bg-red-500/[0.06] border-red-500/25'
              : 'bg-amber-500/[0.05] border-amber-500/20'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {allClear ? (
            <>
              <ShieldCheck size={18} className="text-green-400 flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-sm font-bold text-green-300 leading-tight">ALL CLEAR</div>
                <div className="text-[11px] text-white/40">No criticals, no SLA breaches</div>
              </div>
            </>
          ) : (
            <>
              {critical.length > 0 ? (
                <Flame size={18} className="text-red-400 flex-shrink-0" />
              ) : (
                <AlertTriangle size={18} className="text-amber-400 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <div className={`text-sm font-bold leading-tight ${critical.length > 0 ? 'text-red-300' : 'text-amber-300'}`}>
                  {critical.length > 0 && `${critical.length} CRITICAL`}
                  {critical.length > 0 && breached.length > 0 && ' · '}
                  {breached.length > 0 && `${breached.length} SLA BREACH${breached.length > 1 ? 'ES' : ''}`}
                </div>
                <div className="text-[11px] text-white/40">
                  {open.length} open ticket{open.length === 1 ? '' : 's'} ·
                  {' '}{state?.compliance?.openAnomalies ?? 0} anomal{(state?.compliance?.openAnomalies ?? 0) === 1 ? 'y' : 'ies'}
                </div>
              </div>
            </>
          )}
        </div>
        <Link
          to="/tickets"
          className="text-xs text-white/40 hover:text-white flex items-center gap-1 flex-shrink-0"
        >
          View all <ArrowRight size={11} />
        </Link>
      </div>

      {/* Top 3 action cards — only when there's something to do */}
      {top3.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {top3.map((t: any) => {
            const isCrit = t.priority === 'CRITICAL';
            const isOver = ageHours(t.createdAt) > (SLA_HOURS[t.priority] ?? 168);
            const dot = isCrit ? 'bg-red-500' : isOver ? 'bg-amber-500' : 'bg-blue-500';
            const tone = isCrit ? 'border-red-500/20 hover:bg-red-500/[0.05]'
                                : isOver ? 'border-amber-500/20 hover:bg-amber-500/[0.05]'
                                         : 'border-white/10 hover:bg-white/5';
            return (
              <Link
                key={t.id}
                to="/tickets"
                className={`block rounded-xl border bg-white/[0.02] p-3 transition active:scale-[0.97] ${tone}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                  <span className="text-[10px] uppercase tracking-wide text-white/40 font-semibold">
                    {t.priority}
                  </span>
                  {isOver && (
                    <span className="text-[10px] text-amber-300 ml-auto flex items-center gap-1">
                      <Flame size={10} /> SLA
                    </span>
                  )}
                </div>
                <div className="text-sm text-white font-medium leading-snug line-clamp-2">{t.title}</div>
                <div className="text-[10px] text-white/30 mt-1">{t.category}</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
