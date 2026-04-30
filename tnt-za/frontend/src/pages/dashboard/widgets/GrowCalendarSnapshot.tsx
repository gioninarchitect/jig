import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronRight, Leaf, Sun, Sparkles, Droplets, Scissors } from 'lucide-react';
import api from '../../../services/api';

const PHASE_STYLE: Record<string, { color: string; label: string }> = {
  VEG: { color: 'bg-green-500/15 text-green-300 border-green-500/25', label: 'Veg' },
  FLIP: { color: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/25', label: 'Flip' },
  FLOWER: { color: 'bg-purple-500/15 text-purple-300 border-purple-500/25', label: 'Flower' },
  HARVEST: { color: 'bg-red-500/15 text-red-300 border-red-500/25', label: 'Harvest' },
  POST: { color: 'bg-white/5 text-white/40 border-white/10', label: 'Post' },
};

function iconFor(task: string) {
  const t = (task || '').toLowerCase();
  if (t.includes('harvest')) return Sparkles;
  if (t.includes('flip')) return Sun;
  if (t.includes('spray') || t.includes('run off') || t.includes('foliar')) return Droplets;
  if (t.includes('scout')) return Leaf;
  if (t.includes('top') || t.includes('defoliat') || t.includes('trim')) return Scissors;
  return CalendarDays;
}

function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export default function GrowCalendarSnapshot() {
  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.get('/baygrid/schedules').then(r => r.data.schedules).catch(() => []),
  });

  const active = schedules?.[0];
  const today = new Date();
  const todayKey = ymd(today);

  const phases: any[] = active?.phases ?? [];

  const currentEntry = phases.find((e: any) => e.date === todayKey) ?? null;
  const currentPhase = currentEntry?.phase ?? phases[0]?.phase ?? 'VEG';
  const currentDayNum = currentEntry?.dayNum ?? 0;
  const ps = PHASE_STYLE[currentPhase] ?? PHASE_STYLE.VEG;

  const upcoming = phases
    .filter((e: any) => e.date >= todayKey && (e.task || e.additionalTask))
    .slice(0, 5)
    .map((e: any) => {
      const entryDate = new Date(e.date);
      const diffDays = Math.round((entryDate.getTime() - today.getTime()) / 86_400_000);
      const label = diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `+${diffDays}d`;
      return { ...e, label };
    });

  return (
    <Link to="/calendar" className="block bg-white/5 border border-white/10 rounded-xl p-4 hover:border-primary/30 hover:bg-white/[0.07] transition group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
            <CalendarDays size={17} className="text-amber-300" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Grow Calendar</h3>
            <p className="text-[11px] text-white/40 truncate max-w-[240px]">
              {active ? `${active.title}${active.strain ? ' · ' + active.strain : ''}` : 'No active schedule'}
            </p>
          </div>
        </div>
        <ChevronRight size={16} className="text-white/30 group-hover:text-primary transition" />
      </div>

      {!active ? (
        <div className="text-xs text-white/30 py-4 text-center">Open the Grow Calendar to create a schedule.</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
              <div className="text-[10px] text-white/40">Day</div>
              <div className="text-base font-bold text-white font-mono">{currentDayNum + 1}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
              <div className="text-[10px] text-white/40">Phase</div>
              <div className={`text-[11px] font-bold px-1.5 py-0.5 mt-0.5 rounded border inline-block ${ps.color}`}>{ps.label}</div>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-lg p-2">
              <div className="text-[10px] text-white/40">Upcoming</div>
              <div className="text-base font-bold text-white font-mono">{upcoming.length}</div>
            </div>
          </div>

          {upcoming.length > 0 ? (
            <div className="space-y-1.5">
              {upcoming.map((e: any, i: number) => {
                const Icon = iconFor(e.task || e.additionalTask);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs py-1 border-t border-white/5 first:border-t-0">
                    <Icon size={12} className="text-amber-300 flex-shrink-0" />
                    <span className="text-white/70 truncate flex-1">{e.task || e.additionalTask}</span>
                    {e.dosage && <span className="text-[10px] text-white/30 font-mono hidden sm:inline">{e.dosage}</span>}
                    <span className="text-[10px] text-white/40 font-mono flex-shrink-0">{e.label}</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-white/30 py-2 text-center">No upcoming tasks this cycle.</p>
          )}
        </>
      )}
    </Link>
  );
}
