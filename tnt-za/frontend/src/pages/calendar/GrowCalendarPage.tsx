import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { Calendar, Plus, ChevronLeft, ChevronRight, Leaf, Droplets, Bug, Scissors, Sun, Sparkles, AlertTriangle, Check } from 'lucide-react';
import api from '../../services/api';

// Phase colors and labels
const PHASE_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CLONE: { color: 'text-teal-300', bg: 'bg-teal-500/10 border-teal-500/20', label: 'Clone / Nursery' },
  VEG: { color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', label: 'Vegetative' },
  FLIP: { color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Flip' },
  FLOWER: { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', label: 'Flower' },
  HARVEST: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/20', label: 'Harvest' },
  POST: { color: 'text-white/30', bg: 'bg-white/5 border-white/10', label: 'Post-Harvest' },
};

// Task type icons
const TASK_ICONS: Record<string, any> = {
  scouting: Bug, runoff: Droplets, spray: Droplets, topping: Scissors,
  defoliate: Leaf, flip: Sun, cloning: Scissors, harvest: Sparkles,
  clean: Sparkles, default: Calendar,
};

function getTaskIcon(task: string) {
  const lower = task.toLowerCase();
  if (lower.includes('scout')) return Bug;
  if (lower.includes('run off') || lower.includes('runoff')) return Droplets;
  if (lower.includes('spray') || lower.includes('folia')) return Droplets;
  if (lower.includes('top plant')) return Scissors;
  if (lower.includes('defoliat') || lower.includes('bottom clean') || lower.includes('deleaf') || lower.includes('fan leaf')) return Leaf;
  if (lower.includes('flip')) return Sun;
  if (lower.includes('clon')) return Scissors;
  if (lower.includes('harvest')) return Sparkles;
  if (lower.includes('clean')) return Sparkles;
  return Calendar;
}

function getPhaseForDay(dayNum: number, isFlowerDay: boolean): string {
  if (!isFlowerDay) return 'VEG';
  if (dayNum <= 0) return 'FLIP';
  if (dayNum <= 55) return 'FLOWER';
  if (dayNum <= 57) return 'HARVEST';
  return 'POST';
}

interface CalendarDay {
  date: string;
  dayNum: number;
  task: string;
  additionalTask: string;
  ipmApplication: string;
  dosage: string;
  phase: string;
  isToday: boolean;
  hasTask: boolean;
  completed: boolean;
}

export default function GrowCalendarPage() {
  const { hasMinLevel, hasRole } = useRBAC();
  // Only the Head of Cultivation (Lou) builds/edits the grow calendar — NOT the Cultivation
  // Supervisor (Loraine, FACILITY_SUPERVISOR) or other level-3 roles. Owners/Flo retained for support.
  const canEditCalendar = hasRole('HEAD_OF_CULTIVATION', 'TENANT_ADMIN', 'SUPER_ADMIN');
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const todayRef = useRef<HTMLDivElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedGH, setSelectedGH] = useState('');
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
  const [view, setView] = useState<'day' | 'week' | 'month' | 'year'>('day');
  const [periodOffset, setPeriodOffset] = useState(0); // 0 = current week/month
  const [createForm, setCreateForm] = useState({
    title: '', strain: '', greenhouseId: '', startDate: '', vegDays: '14', flowerDays: '56',
  });

  const { data: greenhouses } = useQuery({
    queryKey: ['greenhouses'],
    queryFn: () => api.get('/baygrid/greenhouses').then(r => r.data.greenhouses),
  });

  const { data: schedules } = useQuery({
    queryKey: ['schedules'],
    queryFn: () => api.get('/baygrid/schedules').then(r => r.data.schedules),
  });
  const { data: strainList } = useQuery({ queryKey: ['strains-list'], queryFn: () => api.get('/strains').then(r => r.data.strains || r.data) });
  const { data: motherList } = useQuery({ queryKey: ['mothers-list'], queryFn: () => api.get('/baygrid/mothers').then(r => r.data.mothers) });
  const { data: staff } = useQuery({ queryKey: ['staff-list'], queryFn: () => api.get('/users').then(r => r.data.users || r.data).catch(() => []) });
  const CULT_ROLES = ['NURSERY_MANAGER', 'CULTIVATOR', 'HEAD_OF_CULTIVATION', 'GENERAL_WORKER', 'IRRIGATION_TECH', 'FACILITY_MANAGER'];
  const cultStaff = (staff || []).filter((u: any) => CULT_ROLES.includes(u.role));
  const { data: dayShifts } = useQuery({
    queryKey: ['day-shifts', selectedDay?.date],
    queryFn: () => api.get(`/shifts?date=${selectedDay!.date}`).then(r => r.data.shifts || r.data).catch(() => []),
    enabled: !!selectedDay,
  });

  // multi-strain on one schedule (cloned same day, same timeline)
  const selectedStrains = createForm.strain ? createForm.strain.split(',').map(s => s.trim()).filter(Boolean) : [];
  const toggleStrain = (name: string) => {
    const set = new Set(selectedStrains);
    set.has(name) ? set.delete(name) : set.add(name);
    setCreateForm(f => ({ ...f, strain: [...set].join(', ') }));
  };

  const createMut = useMutation({
    mutationFn: () => {
      const vegDays = parseInt(createForm.vegDays);
      const flowerDays = parseInt(createForm.flowerDays);
      const phases = buildDefaultPhases(createForm.startDate, vegDays, flowerDays);
      return api.post('/baygrid/schedules', {
        title: createForm.title, strain: createForm.strain,
        greenhouseId: createForm.greenhouseId, startDate: createForm.startDate,
        phases,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['schedules'] }); setShowCreate(false); addToast('success', 'Grow schedule created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  // Reschedule the whole cycle (unplanned scenarios — e.g. rooting delayed → push everything).
  // PATCH re-flows all phases from the new start + raises change-control if harvest moves earlier.
  const [reschedule, setReschedule] = useState<{ start: string; reason: string } | null>(null);
  const rescheduleMut = useMutation({
    mutationFn: (p: { id: string; startDate: string; reason: string }) =>
      api.patch(`/baygrid/schedules/${p.id}`, { startDate: p.startDate, reason: p.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      setReschedule(null); setSelectedDay(null);
      addToast('success', 'Cycle rescheduled — calendar + tasks shifted');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Reschedule failed'),
  });

  // Adjust phase lengths (veg / flower) — Lou tunes a cycle's durations; the backend re-flows every
  // downstream phase + derived task/ticket and raises change-control automatically (same cascade path).
  const [adjust, setAdjust] = useState<{ veg: string; flower: string; reason: string } | null>(null);
  const adjustMut = useMutation({
    mutationFn: (p: { id: string; phases: any[]; reason: string }) =>
      api.patch(`/baygrid/schedules/${p.id}`, { phases: p.phases, reason: p.reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      setAdjust(null); setSelectedDay(null);
      addToast('success', 'Phase lengths adjusted — calendar + tasks cascaded');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Adjust failed'),
  });

  // Auto-scroll to today
  useEffect(() => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [schedules, selectedGH]);

  // Build calendar from schedule
  const activeSchedule = schedules?.find((s: any) => selectedGH ? s.greenhouseId === selectedGH : true);
  const calendarDays = activeSchedule ? buildCalendarDays(activeSchedule) : [];

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Grow Calendar</h1>
          <p className="text-sm text-white/40">Day-by-day schedule per greenhouse</p>
        </div>
        {canEditCalendar && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> New Schedule
          </button>
        )}
      </div>

      {/* GH selector */}
      {greenhouses && greenhouses.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={() => setSelectedGH('')}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition min-h-[40px] ${!selectedGH ? 'bg-primary text-white' : 'bg-white/5 text-white/40'}`}>
            All
          </button>
          {greenhouses.map((gh: any) => (
            <button key={gh.id} onClick={() => setSelectedGH(gh.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition min-h-[40px] ${selectedGH === gh.id ? 'bg-primary text-white' : 'bg-white/5 text-white/40'}`}>
              {gh.name}
            </button>
          ))}
        </div>
      )}

      {/* Active schedule info */}
      {activeSchedule && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">{activeSchedule.title}</div>
            <div className="text-xs text-white/40">{activeSchedule.strain} — Started {new Date(activeSchedule.startDate).toLocaleDateString('en-ZA')}</div>
          </div>
          <div className="flex gap-2">
            {Object.entries(PHASE_CONFIG).map(([key, cfg]) => (
              <span key={key} className={`text-[10px] px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
            ))}
          </div>
        </div>
      )}

      {/* View toggle */}
      {calendarDays.length > 0 && (
        <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit">
          {(['day','week','month','year'] as const).map(v => (
            <button key={v} onClick={() => { setView(v); setPeriodOffset(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${view === v ? 'bg-primary text-white' : 'text-white/50 hover:text-white/80'}`}>{v}</button>
          ))}
        </div>
      )}

      {/* Calendar timeline — mobile-first vertical scroll */}
      {!calendarDays.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center">
          <Calendar size={40} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 mb-2">No grow schedules yet</p>
          <p className="text-xs text-white/20">Create a schedule to see the day-by-day calendar</p>
        </div>
      ) : view === 'month' || view === 'week' ? (
        (() => {
          const dayMap = new Map(calendarDays.map((d: any) => [d.date, d]));
          const base = new Date(); base.setHours(0,0,0,0);
          let gridStart: Date, gridDays: number, title: string;
          if (view === 'week') {
            gridStart = new Date(base); gridStart.setDate(base.getDate() - base.getDay() + 1 + periodOffset * 7);
            gridDays = 7; title = `Week of ${gridStart.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`;
          } else {
            const m = new Date(base.getFullYear(), base.getMonth() + periodOffset, 1);
            const firstDow = (m.getDay() + 6) % 7; // Mon=0
            gridStart = new Date(m); gridStart.setDate(1 - firstDow);
            gridDays = 42; title = m.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
          }
          const cells = Array.from({ length: gridDays }, (_, i) => { const d = new Date(gridStart); d.setDate(gridStart.getDate() + i); return d; });
          return (
            <div>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setPeriodOffset(o => o - 1)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><ChevronLeft size={16} className="text-white/60" /></button>
                <span className="text-sm font-bold text-white">{title}</span>
                <button onClick={() => setPeriodOffset(o => o + 1)} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10"><ChevronRight size={16} className="text-white/60" /></button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => <div key={d} className="text-center text-[10px] text-white/30 font-semibold pb-1">{d}</div>)}
                {cells.map((d, i) => {
                  const key = d.toISOString().split('T')[0];
                  const cd: any = dayMap.get(key);
                  const cfg = cd ? (PHASE_CONFIG[cd.phase] || PHASE_CONFIG.VEG) : null;
                  const isToday = key === today;
                  return (
                    <button key={i} onClick={() => cd?.hasTask && setSelectedDay(cd)}
                      className={`min-h-[52px] rounded-lg p-1 text-left border transition ${cfg ? cfg.bg : 'bg-white/[0.02] border-white/5'} ${isToday ? 'ring-2 ring-primary' : ''} ${cd?.hasTask ? 'cursor-pointer hover:brightness-125' : ''}`}>
                      <div className={`text-[11px] font-bold ${cfg ? cfg.color : 'text-white/30'}`}>{d.getDate()}</div>
                      {cd && <div className="text-[8px] text-white/40">D{cd.dayNum}</div>}
                      {cd?.hasTask && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : view === 'year' ? (
        <div className="space-y-2">
          <div className="text-sm font-bold text-white mb-1">Full cycle — {calendarDays.length} days</div>
          <div className="flex h-6 rounded-lg overflow-hidden border border-white/10">
            {calendarDays.map((d: any, i: number) => { const cfg = PHASE_CONFIG[d.phase] || PHASE_CONFIG.VEG; return <div key={i} title={`Day ${d.dayNum} · ${cfg.label}${d.task ? ' · ' + d.task : ''}`} onClick={() => d.hasTask && setSelectedDay(d)} className={`flex-1 ${d.phase === 'FLOWER' ? 'bg-purple-500/60' : d.phase === 'HARVEST' ? 'bg-red-500/60' : d.phase === 'FLIP' ? 'bg-yellow-500/60' : 'bg-green-500/50'} ${d.isToday ? 'ring-2 ring-white' : ''} ${d.hasTask ? 'cursor-pointer' : ''}`} style={{ minWidth: 2 }} />; })}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {Object.entries(calendarDays.reduce((acc: any, d: any) => { acc[d.phase] = (acc[d.phase] || 0) + 1; return acc; }, {})).map(([ph, n]: any) => { const cfg = PHASE_CONFIG[ph] || PHASE_CONFIG.VEG; return <div key={ph} className={`rounded-lg p-2 border ${cfg.bg}`}><div className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</div><div className="text-[11px] text-white/40">{n} days</div></div>; })}
          </div>
        </div>
      ) : (
        <div className="space-y-1">
          {calendarDays.map((day, i) => {
            const phaseCfg = PHASE_CONFIG[day.phase] || PHASE_CONFIG.VEG;
            const TaskIcon = day.hasTask ? getTaskIcon(day.task || day.additionalTask) : Calendar;
            const isPhaseStart = i === 0 || calendarDays[i - 1].phase !== day.phase;
            const hasIPM = !!day.ipmApplication;

            return (
              <div key={day.date}>
                {/* Phase divider */}
                {isPhaseStart && (
                  <div className={`flex items-center gap-2 py-2 mt-3 mb-1`}>
                    <div className={`text-xs font-bold uppercase tracking-wider ${phaseCfg.color}`}>{phaseCfg.label}</div>
                    <div className={`flex-1 h-px ${day.phase === 'FLOWER' ? 'bg-purple-500/30' : day.phase === 'HARVEST' ? 'bg-red-500/30' : 'bg-green-500/30'}`} />
                  </div>
                )}

                {/* Day row */}
                <div ref={day.isToday ? todayRef : undefined}
                  onClick={() => day.hasTask ? setSelectedDay(day) : null}
                  className={`flex items-stretch gap-0 rounded-xl overflow-hidden transition
                    ${day.isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-[#060610]' : ''}
                    ${day.hasTask ? 'cursor-pointer hover:bg-white/[0.04] active:scale-[0.99]' : ''}
                  `}>
                  {/* Date column */}
                  <div className={`w-16 sm:w-20 flex-shrink-0 py-3 px-2 text-center border-r border-white/5 ${day.isToday ? 'bg-primary/20' : 'bg-white/[0.02]'}`}>
                    <div className={`text-lg sm:text-xl font-bold font-mono ${day.isToday ? 'text-primary' : 'text-white/60'}`}>
                      {new Date(day.date).getDate()}
                    </div>
                    <div className="text-[10px] text-white/30">
                      {new Date(day.date).toLocaleDateString('en-ZA', { weekday: 'short' })}
                    </div>
                    <div className={`text-[10px] font-bold mt-0.5 ${phaseCfg.color}`}>Day {day.dayNum}</div>
                  </div>

                  {/* Content */}
                  <div className={`flex-1 py-3 px-3 sm:px-4 min-h-[60px] ${day.hasTask ? 'bg-white/[0.02]' : ''}`}>
                    {day.hasTask ? (
                      <div>
                        {/* Main task */}
                        {day.task && (
                          <div className="flex items-center gap-2 mb-0.5">
                            <TaskIcon size={14} className={phaseCfg.color} />
                            <span className={`text-sm font-medium ${day.task.includes('FLIP') || day.task.includes('Harvest') ? 'text-white font-bold' : 'text-white/80'}`}>
                              {day.task}
                            </span>
                          </div>
                        )}
                        {/* Additional task */}
                        {day.additionalTask && (
                          <div className="text-xs text-white/50 ml-5 sm:ml-6 leading-relaxed">{day.additionalTask}</div>
                        )}
                        {/* IPM */}
                        {hasIPM && (
                          <div className="flex items-center gap-2 mt-1 ml-5 sm:ml-6">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/20">
                              {day.ipmApplication} {day.dosage}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-white/10 py-1">—</div>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="w-10 flex-shrink-0 flex items-center justify-center">
                    {day.hasTask && (
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${day.completed ? 'bg-green-500/20' : 'border border-white/15'}`}>
                        {day.completed && <Check size={10} className="text-green-400" />}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Day Detail Modal */}
      <Modal open={!!selectedDay} onClose={() => setSelectedDay(null)} title={selectedDay ? `Day ${selectedDay.dayNum} — ${new Date(selectedDay.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}>
        {selectedDay && (
          <div className="space-y-4">
            <div className={`rounded-xl p-4 border ${PHASE_CONFIG[selectedDay.phase]?.bg || 'bg-white/5 border-white/10'}`}>
              <span className={`text-sm font-bold ${PHASE_CONFIG[selectedDay.phase]?.color || 'text-white'}`}>
                {PHASE_CONFIG[selectedDay.phase]?.label || selectedDay.phase} — Day {selectedDay.dayNum}
              </span>
            </div>

            {selectedDay.task && (
              <div>
                <div className="text-xs text-white/40 mb-1">Task</div>
                <div className="text-sm text-white font-medium">{selectedDay.task}</div>
              </div>
            )}

            {selectedDay.additionalTask && (
              <div>
                <div className="text-xs text-white/40 mb-1">Additional Instructions</div>
                <div className="text-sm text-white/70">{selectedDay.additionalTask}</div>
              </div>
            )}

            {selectedDay.ipmApplication && (
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="text-xs text-amber-400 font-semibold mb-1">IPM / Spray Application</div>
                <div className="text-sm text-white">{selectedDay.ipmApplication}</div>
                {selectedDay.dosage && <div className="text-xs text-white/50 mt-1">Dosage: {selectedDay.dosage} (16L)</div>}
              </div>
            )}

            {selectedDay.task?.toLowerCase().includes('flip') && (
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                <div className="text-xs text-yellow-400 font-semibold mb-1">Light Change</div>
                <div className="text-sm text-white">Switch from 18/6 → 12/12. Record flip date. Stretch measurement begins.</div>
              </div>
            )}

            {selectedDay.task?.toLowerCase().includes('harvest') && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <div className="text-xs text-red-400 font-semibold mb-1">Harvest Day</div>
                <div className="text-sm text-white">Cut plants. Record wet weight per plant. Create batch. Clear bay. Handover to Processing.</div>
              </div>
            )}

            {/* Smart row — governing SOP · relevant role · status */}
            {selectedDay.hasTask && (() => {
              const t = (selectedDay.task || selectedDay.additionalTask || '').toLowerCase();
              const sop = t.includes('clon') || t.includes('transplant') ? '3-CUL-7'
                : t.includes('spray') || t.includes('folia') || t.includes('ipm') || t.includes('scout') ? '3-CUL-9'
                : t.includes('defoliat') || t.includes('top') || t.includes('deleaf') ? '3-CUL-4'
                : t.includes('harvest') ? '3-CUL-10'
                : t.includes('run') || t.includes('feed') ? '3-CUL-5' : '3-CUL-3';
              const role = selectedDay.phase === 'VEG' ? 'Cultivator' : selectedDay.phase === 'FLOWER' ? 'Head of Cultivation' : 'Cultivator';
              const assigned = (dayShifts || []).filter((s: any) => (s.tasks || []).some((tk: any) => (tk.title || '').includes(selectedDay.task || '')) || true);
              return (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <a href="/sop-library" className="text-[11px] px-2 py-1 rounded-lg bg-amber-700/15 border border-amber-700/30 text-amber-300 font-semibold">SOP {sop} →</a>
                  <span className="text-[11px] px-2 py-1 rounded-lg bg-primary/10 border border-primary/25 text-primary font-semibold">Role: {role}</span>
                  <span className={`text-[11px] px-2 py-1 rounded-lg border font-semibold ${assigned.length ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-white/5 border-white/15 text-white/40'}`}>
                    {assigned.length ? `Assigned: ${assigned.map((s: any) => s.userName).filter(Boolean).join(', ') || assigned.length}` : 'Unassigned'}
                  </span>
                </div>
              );
            })()}

            {/* Staff allocation for this day */}
            {hasMinLevel(2) && selectedDay.hasTask && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-xs text-primary font-semibold mb-2">Assign staff for this day</div>
                {/* Currently assigned — confirms the pick persisted */}
                {(dayShifts || []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(dayShifts || []).map((s: any) => (
                      <span key={s.id} className="text-[11px] px-2 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-green-200">
                        ✓ {s.userName || 'staff'}{s.role ? ` · ${String(s.role).replace(/_/g, ' ').toLowerCase()}` : ''}
                      </span>
                    ))}
                  </div>
                )}
                <select className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none"
                  onChange={e => {
                    if (!e.target.value || !selectedDay) return;
                    const u = cultStaff.find((x: any) => x.id === e.target.value);
                    api.post('/shifts', {
                      date: selectedDay.date, userId: e.target.value,
                      userName: u?.name || '',
                      role: u?.role || 'CULTIVATOR',
                      tasks: [{ title: selectedDay.task || selectedDay.additionalTask || 'Calendar task', description: selectedDay.ipmApplication ? `IPM: ${selectedDay.ipmApplication} ${selectedDay.dosage || ''}` : '' }],
                    }).then(() => { qc.invalidateQueries({ queryKey: ['day-shifts'] }); addToast('success', `${u?.name || 'Staff'} assigned`); });
                    e.target.value = '';
                  }}>
                  <option value="">+ Assign staff…</option>
                  {cultStaff.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role.replace(/_/g, ' ').toLowerCase()})</option>)}
                </select>
                {cultStaff.length === 0 && <p className="text-[10px] text-amber-300/70 mt-1">No cultivation staff found — add staff in Users first.</p>}
                <p className="text-[10px] text-white/20 mt-1">Assigned staff see it in their "My Shift" view.</p>
              </div>
            )}

            {/* Reschedule — Lou (HoC) ONLY shifts the whole cycle (not the Cultivation Supervisor) */}
            {canEditCalendar && activeSchedule && (
              <div className="bg-white/[0.03] border border-amber-500/10 rounded-xl p-4">
                <div className="text-xs text-amber-300 font-semibold mb-2">Reschedule cycle (unplanned change)</div>
                {!reschedule ? (
                  <button onClick={() => setReschedule({ start: String(activeSchedule.startDate || '').slice(0, 10), reason: '' })}
                    className="text-xs px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 font-semibold min-h-[40px]">Shift the cycle dates…</button>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[10px] text-white/40">New cycle start (clone date)</label>
                      <input type="date" value={reschedule.start} onChange={e => setReschedule(r => r && ({ ...r, start: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none" />
                    </div>
                    <input placeholder="Reason (e.g. rooting delayed, heat event)" value={reschedule.reason} onChange={e => setReschedule(r => r && ({ ...r, reason: e.target.value }))}
                      className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none" />
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => rescheduleMut.mutate({ id: activeSchedule.id, startDate: reschedule.start, reason: reschedule.reason })}
                        disabled={!reschedule.reason.trim() || rescheduleMut.isPending}
                        className="px-3 py-2 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-semibold disabled:opacity-40 min-h-[40px]">Apply — re-flow calendar</button>
                      <button onClick={() => setReschedule(null)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white/50 text-xs min-h-[40px]">Cancel</button>
                    </div>
                    <p className="text-[10px] text-white/25">Shifts every phase together. If harvest moves earlier, a change-control deviation auto-raises to Loraine + FM.</p>
                  </div>
                )}
              </div>
            )}

            {/* Adjust phase lengths — Lou (HoC) ONLY; everything downstream cascades + change-control */}
            {canEditCalendar && activeSchedule && (() => {
              const phs = ((activeSchedule.phases as any[]) || []);
              const curVeg = phs.filter((p: any) => p.phase === 'VEG').length || 14;
              const curFlower = phs.filter((p: any) => p.phase === 'FLOWER').length || 56;
              const start = String(activeSchedule.startDate || '').slice(0, 10);
              const harvestOf = (a: any[]) => a.find((p: any) => p.task === 'HARVEST')?.date;
              const curHarvest = harvestOf(phs);
              const nv = adjust ? (parseInt(adjust.veg) || curVeg) : curVeg;
              const nf = adjust ? (parseInt(adjust.flower) || curFlower) : curFlower;
              const newHarvest = adjust ? harvestOf(buildDefaultPhases(start, nv, nf)) : null;
              const delta = curHarvest && newHarvest ? Math.round((new Date(curHarvest).getTime() - new Date(newHarvest).getTime()) / 86400000) : 0;
              return (
                <div className="bg-white/[0.03] border border-primary/10 rounded-xl p-4">
                  <div className="text-xs text-primary font-semibold mb-2">Adjust phase lengths</div>
                  {!adjust ? (
                    <button onClick={() => setAdjust({ veg: String(curVeg), flower: String(curFlower), reason: '' })}
                      className="text-xs px-3 py-2 rounded-lg bg-primary/10 border border-primary/30 text-primary font-semibold min-h-[40px]">Tune veg / flower days…</button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-white/40">Veg days</label>
                          <input type="number" min={1} value={adjust.veg} onChange={e => setAdjust(a => a && ({ ...a, veg: e.target.value }))}
                            className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-white/40">Flower days</label>
                          <input type="number" min={1} value={adjust.flower} onChange={e => setAdjust(a => a && ({ ...a, flower: e.target.value }))}
                            className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none" />
                        </div>
                      </div>
                      <input placeholder="Reason (GMP change control)" value={adjust.reason} onChange={e => setAdjust(a => a && ({ ...a, reason: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none" />
                      {newHarvest && (
                        <p className="text-[11px] text-white/50">New harvest ≈ <span className="text-white font-semibold">{new Date(newHarvest).toLocaleDateString('en-ZA')}</span>{delta !== 0 && <span className={delta > 0 ? 'text-red-300' : 'text-green-300'}> ({delta > 0 ? `${delta}d earlier` : `${-delta}d later`})</span>}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => adjustMut.mutate({ id: activeSchedule.id, phases: buildDefaultPhases(start, nv, nf), reason: adjust.reason })}
                          disabled={!adjust.reason.trim() || adjustMut.isPending}
                          className="px-3 py-2 rounded-lg bg-primary/15 border border-primary/40 text-primary text-xs font-semibold disabled:opacity-40 min-h-[40px]">Apply — cascade calendar</button>
                        <button onClick={() => setAdjust(null)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white/50 text-xs min-h-[40px]">Cancel</button>
                      </div>
                      <p className="text-[10px] text-white/25">Re-flows every downstream phase + task. If harvest moves earlier, a change-control deviation auto-raises to Loraine + FM + QA.</p>
                    </div>
                  )}
                </div>
              );
            })()}

            <button onClick={() => { setSelectedDay(null); setReschedule(null); setAdjust(null); }}
              className="w-full px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-xl text-sm font-semibold hover:bg-primary/20 transition min-h-[44px]">Done</button>
          </div>
        )}
      </Modal>

      {/* Create Schedule Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Grow Schedule">
        <ModalInput label="Schedule Name" placeholder="e.g. GH1 Batch #03 2026" value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        <div className="mb-3">
          <label className="block text-xs text-white/50 mb-1.5">Strains on this schedule <span className="text-white/30">(pick one or more cloned on the same day)</span></label>
          <div className="flex flex-wrap gap-1.5">
            {(strainList || []).map((s: any) => {
              const on = selectedStrains.includes(s.name);
              return (
                <button key={s.id || s.name} type="button" onClick={() => toggleStrain(s.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${on ? 'bg-primary/20 border-primary text-primary' : 'bg-white/5 border-white/10 text-white/50 hover:border-white/25'}`}>
                  {on ? '✓ ' : ''}{s.name}
                </button>
              );
            })}
          </div>
          {selectedStrains.length > 0 && <div className="text-[11px] text-white/40 mt-1.5">Selected: <span className="text-white/70">{createForm.strain}</span></div>}
          {motherList && motherList.length > 0 && (
            <div className="mt-2 text-[11px] text-white/30">Strains come from your mothers ({Array.from(new Set(motherList.map((m: any) => m.strain))).length} available).</div>
          )}
        </div>
        {greenhouses && (
          <ModalSelect label="Greenhouse" value={createForm.greenhouseId} onChange={e => setCreateForm(f => ({ ...f, greenhouseId: (e.target as HTMLSelectElement).value }))}>
            <option value="">Select greenhouse</option>
            {greenhouses.map((gh: any) => <option key={gh.id} value={gh.id}>{gh.name}</option>)}
          </ModalSelect>
        )}
        <ModalInput label="Cloning Date (cycle start · transplant auto = +14 days)" type="date" value={createForm.startDate} onChange={e => setCreateForm(f => ({ ...f, startDate: (e.target as HTMLInputElement).value }))} />
        <div className="grid grid-cols-2 gap-3">
          <ModalInput label="Veg Days" type="number" value={createForm.vegDays} onChange={e => setCreateForm(f => ({ ...f, vegDays: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Flower Days" type="number" value={createForm.flowerDays} onChange={e => setCreateForm(f => ({ ...f, flowerDays: (e.target as HTMLInputElement).value }))} />
        </div>
        <p className="text-xs text-white/30">Standard: 14 days veg + 56 days flower. Calendar will auto-populate with scouting, run-off, spray, topping, defoliation, cloning, and harvest tasks.</p>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!createForm.title || !createForm.strain || !createForm.greenhouseId || !createForm.startDate}>
          Create Schedule
        </ModalButton>
      </Modal>
    </div>
  );
}

// ── Build calendar days from schedule ──

function buildCalendarDays(schedule: any): CalendarDay[] {
  const start = new Date(schedule.startDate);
  const today = new Date().toISOString().split('T')[0];
  const phases: any[] = schedule.phases || [];
  const days: CalendarDay[] = [];

  // If phases are detailed (from Excel import), use them
  if (phases.length > 0 && phases[0].date) {
    return phases.map((p: any) => ({
      date: p.date,
      dayNum: p.dayNum || 0,
      task: p.task || '',
      additionalTask: p.additionalTask || '',
      ipmApplication: p.ipmApplication || '',
      dosage: p.dosage || '',
      phase: p.phase || 'VEG',
      isToday: p.date === today,
      hasTask: !!(p.task || p.additionalTask || p.ipmApplication),
      completed: p.completed || false,
    }));
  }

  // Otherwise build from veg/flower duration with standard tasks
  const vegDays = 14;
  const flowerDays = 56;
  const totalDays = vegDays + flowerDays + 7; // +7 for post-harvest

  for (let d = 0; d <= totalDays; d++) {
    const date = new Date(start);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];
    const isVeg = d < vegDays;
    const flowerDay = d - vegDays;

    let task = '';
    let additionalTask = '';
    let ipmApplication = '';
    let dosage = '';
    let phase = 'VEG';

    if (d === 0) { task = 'Transplant'; phase = 'VEG'; }
    else if (isVeg) {
      phase = 'VEG';
      const vegDay = d;
      if (vegDay % 5 === 3) { task = 'Scouting'; ipmApplication = 'Pyrol'; dosage = '180ml'; }
      if (vegDay % 5 === 4) { task = 'Run off test'; }
      if (vegDay === 7) { additionalTask = 'Top plants to 6 nodes'; ipmApplication = 'CeraSulpher'; dosage = '32ml'; }
      if (vegDay === 12) { additionalTask = 'Bottom clean & Defoliate Plants'; }
    }
    else if (flowerDay === 0) {
      task = 'FLIP INTO FLOWER'; additionalTask = 'Bottom clean & Defoliate Plants'; phase = 'FLIP';
    }
    else if (flowerDay <= 16) {
      phase = 'FLOWER';
      if (flowerDay % 7 === 3) { task = 'Scouting'; }
      if (flowerDay % 7 === 4) { task = 'Run off test'; }
      if (flowerDay % 5 === 0) { ipmApplication = 'Pyrol'; dosage = '180ml'; additionalTask = 'Spray on and under plants'; }
      if (flowerDay === 11) { additionalTask = 'Bottom clean & Defoliate Plants'; }
    }
    else if (flowerDay === 17) {
      phase = 'FLOWER'; task = 'Scouting'; additionalTask = 'NO MORE SPRAYING ON PLANTS';
    }
    else if (flowerDay > 17 && flowerDay <= 40) {
      phase = 'FLOWER';
      if (flowerDay % 7 === 3) { task = 'Scouting'; additionalTask = 'NO MORE SPRAYING ON PLANTS'; }
      if (flowerDay % 7 === 4) { task = 'Run off test'; additionalTask = 'Perimeter spray'; ipmApplication = 'Bioneem'; dosage = '80ml'; }
      if (flowerDay % 7 === 0) { additionalTask = 'Perimeter spray'; ipmApplication = 'Pyrol'; dosage = '180ml'; }
      if (flowerDay === 19) { additionalTask = 'Fan leaf removal if needed'; }
    }
    else if (flowerDay === 41) { phase = 'FLOWER'; task = 'Deepclean clone Room'; }
    else if (flowerDay === 42) { phase = 'FLOWER'; task = 'Prepare for cloning'; ipmApplication = 'Pyrol'; dosage = '180ml'; }
    else if (flowerDay >= 47 && flowerDay <= 49) { phase = 'FLOWER'; additionalTask = 'CLONING'; }
    else if (flowerDay >= 52 && flowerDay <= 54) { phase = 'FLOWER'; additionalTask = 'Preharvest Deleaf'; }
    else if (flowerDay === 55) { phase = 'HARVEST'; task = 'Prepare for Harvest'; additionalTask = 'Preharvest Deleaf'; }
    else if (flowerDay === 56) { phase = 'HARVEST'; task = 'HARVEST'; additionalTask = 'Harvest all plants. Record wet weight.'; }
    else { phase = 'POST'; if (flowerDay === 62) { additionalTask = 'Cleaning greenhouse'; } }

    days.push({
      date: dateStr,
      dayNum: isVeg ? d : flowerDay,
      task, additionalTask, ipmApplication, dosage, phase,
      isToday: dateStr === today,
      hasTask: !!(task || additionalTask || ipmApplication),
      completed: false,
    });
  }

  return days;
}

// Intelligent ILCO grow-cycle playbook generator. Given the CLONING date it projects
// the whole dated cycle: Clone/Nursery → Transplant → Veg → Flip → Flower → Harvest → Post,
// auto-filling the real GH2 cadence (scouting/IPM sprays, run-off tests, topping, defoliation,
// pre-harvest deleaf). cloneDays default 14 (transplant on day cloneDays).
function buildDefaultPhases(startDate: string, vegDays: number, flowerDays: number, cloneDays = 14, postDays = 7) {
  const start = new Date(startDate);
  const ymd = (n: number) => { const d = new Date(start); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const out: any[] = [];
  let day = 0;
  const push = (phase: string, task = '', x: any = {}) => {
    out.push({ date: ymd(day), dayNum: out.length, phase, task, additionalTask: x.additionalTask || '', ipmApplication: x.ipm || '', dosage: x.dosage || '', completed: false });
    day++;
  };
  // ── CLONE / NURSERY ──
  for (let d = 0; d < cloneDays; d++) {
    let t = '', x: any = {};
    if (d === 0) t = 'Take cuttings · set clone tray';
    else if (d === 6) t = 'Mortality Check — W1';
    else if (d === cloneDays - 1) { t = 'Harden off · prep transplant'; }
    else t = 'Clone room check · temp/humidity';
    push('CLONE', t, x);
  }
  // ── VEG (day 0 = transplant) ──
  for (let d = 0; d < vegDays; d++) {
    let t = '', x: any = {};
    if (d === 0) t = 'TRANSPLANT into greenhouse';
    if (d === 3 || d === 8 || d === 13) { t = 'Scouting'; x = { ipm: 'Pyrol', dosage: '180ml' }; }
    else if (d === 4 || d === 9) t = 'Run-off test';
    else if (d === 7) { t = 'Top plants to 6 nodes'; x = { ipm: 'CeraSulpher', dosage: '32ml' }; }
    else if (d === 12) x = { additionalTask: 'Bottom clean & defoliate' };
    push('VEG', t, x);
  }
  // ── FLIP ──
  push('FLIP', 'FLIP INTO FLOWER', { additionalTask: 'Bottom clean & defoliate' });
  // ── FLOWER ──
  for (let d = 0; d < flowerDays; d++) {
    let t = '', x: any = {};
    if (d % 7 === 2) { t = 'Scouting'; const bn = Math.floor(d / 7) % 2 === 1; x = { ipm: bn ? 'Bioneem' : 'Pyrol', dosage: bn ? '80ml' : '180ml', additionalTask: d < flowerDays - 14 ? 'Spray on & under plants' : 'NO MORE SPRAYING' }; }
    else if (d % 7 === 4) t = 'Run-off test';
    if (d === 19 || d === 33) x = { ...x, additionalTask: 'Defoliate / fan-leaf removal' };
    if (d >= flowerDays - 3) x = { ...x, additionalTask: 'Pre-harvest deleaf' };
    push('FLOWER', t, x);
  }
  // ── HARVEST ──
  push('HARVEST', 'Prepare for harvest', { additionalTask: 'Pre-harvest deleaf' });
  push('HARVEST', 'HARVEST', { additionalTask: 'Harvest all plants · record wet weight' });
  // ── POST ──
  for (let d = 0; d < postDays; d++) push('POST', d === postDays - 2 ? 'Clean greenhouse' : '', {});
  return out;
}
