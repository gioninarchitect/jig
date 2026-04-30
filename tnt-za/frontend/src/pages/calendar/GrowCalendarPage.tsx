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
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const todayRef = useRef<HTMLDivElement>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedGH, setSelectedGH] = useState('');
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);
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
        {hasMinLevel(2) && (
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

      {/* Calendar timeline — mobile-first vertical scroll */}
      {!calendarDays.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center">
          <Calendar size={40} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 mb-2">No grow schedules yet</p>
          <p className="text-xs text-white/20">Create a schedule to see the day-by-day calendar</p>
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

            {/* Staff allocation for this day */}
            {hasMinLevel(2) && selectedDay.hasTask && (
              <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                <div className="text-xs text-primary font-semibold mb-2">Assign Staff for This Day</div>
                <div className="space-y-2">
                  <select className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none"
                    onChange={e => {
                      if (!e.target.value || !selectedDay) return;
                      api.post('/shifts', {
                        date: selectedDay.date, userId: e.target.value,
                        userName: e.target.selectedOptions[0]?.text?.split(' (')[0] || '',
                        role: 'CULTIVATOR',
                        tasks: [{ title: selectedDay.task || selectedDay.additionalTask || 'Calendar task', description: selectedDay.ipmApplication ? `IPM: ${selectedDay.ipmApplication} ${selectedDay.dosage || ''}` : '' }],
                      }).then(() => addToast('success', 'Staff allocated'));
                      e.target.value = '';
                    }}>
                    <option value="">Assign staff...</option>
                  </select>
                  <p className="text-[10px] text-white/20">Staff will see this in their "My Shift" view</p>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Schedule Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Grow Schedule">
        <ModalInput label="Schedule Name" placeholder="e.g. GH1 Batch #03 2026" value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Strain" placeholder="e.g. Durban Poison" value={createForm.strain} onChange={e => setCreateForm(f => ({ ...f, strain: (e.target as HTMLInputElement).value }))} />
        {greenhouses && (
          <ModalSelect label="Greenhouse" value={createForm.greenhouseId} onChange={e => setCreateForm(f => ({ ...f, greenhouseId: (e.target as HTMLSelectElement).value }))}>
            <option value="">Select greenhouse</option>
            {greenhouses.map((gh: any) => <option key={gh.id} value={gh.id}>{gh.name}</option>)}
          </ModalSelect>
        )}
        <ModalInput label="Transplant Date" type="date" value={createForm.startDate} onChange={e => setCreateForm(f => ({ ...f, startDate: (e.target as HTMLInputElement).value }))} />
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

function buildDefaultPhases(startDate: string, vegDays: number, flowerDays: number) {
  const days = buildCalendarDays({ startDate, phases: [], strain: '' });
  return days.map(d => ({
    date: d.date, dayNum: d.dayNum, task: d.task, additionalTask: d.additionalTask,
    ipmApplication: d.ipmApplication, dosage: d.dosage, phase: d.phase, completed: false,
  }));
}
