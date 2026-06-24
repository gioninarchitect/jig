import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useReadOnly } from '../../hooks/useReadOnly';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonCard } from '../../components/Skeleton';
import SOPHeader from '../../components/SOPHeader';
import { SprayCan, Check } from 'lucide-react';
import api from '../../services/api';

// =====================================================================
// Cleaning Schedule — SOPs 8-CLN-7 / 8-CLN-8 / 8-CLN-9
//
// Weekly cleaning cadence per zone with area-colour coding. Each task
// gets initialled by the assigned cleaner. Records are date-stamped and
// attached to the zone.
// =====================================================================

type Zone = 'MOTHER_BAY' | 'CLONE_ROOM' | 'GREENHOUSE' | 'PPE' | 'CULTIVATION' | 'GENERAL' | 'IRRIGATION';

const ZONE_CONFIG: Record<Zone, {
  label: string; sop: string; effective: string; areaColour: string; colourClass: string;
  sanitizers: string[]; tasksByDay: Record<string, string[]>; frequencyRows: string[];
  compiler?: string; authorisedBy?: string;
}> = {
  MOTHER_BAY: {
    label: 'Mother Bay', sop: '8-CLN-7', effective: '30/08/2025', areaColour: 'Yellow',
    colourClass: 'bg-yellow-400/20 border-yellow-400/40 text-yellow-200',
    sanitizers: ['Steri-5', 'Hydrogen peroxide 2%'],
    tasksByDay: {
      MON: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
      TUE: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
      WED: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
      THU: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
      FRI: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
    },
    frequencyRows: ['Weekly · Rinse floor', 'Weekly · Clean fan blades & fins', 'Weekly · Clean water gutter', 'Weekly · Clean run-off catchers', 'Weekly · Clean lights', 'After batch / Monthly · Wash floor & radiator'],
  },
  GREENHOUSE: {
    label: 'Greenhouse', sop: '8-CLN-8', effective: '06/06/2025', areaColour: 'Blue',
    colourClass: 'bg-blue-400/20 border-blue-400/40 text-blue-200',
    sanitizers: ['Steri-5', 'Hydrogen peroxide 1%'],
    tasksByDay: {
      MON: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
      TUE: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
      WED: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
      THU: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
      FRI: ['Clean switches', 'Clean access control', 'Empty & clean bins', 'Spot check walls', 'Clean doors & handles', 'Clean DB boxes', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'],
    },
    frequencyRows: ['After batch · Clean fan blades & fins', 'After batch · De-humidifier clean', 'After batch · Clean curtains', 'After batch · Clean floor water gutter', 'After batch · Clean lights', 'After batch · Wash evaporator cooling pads', 'After batch · Wash floor & radiator'],
    compiler: 'Jeanette Ferreira', authorisedBy: 'Authorised Representative',
  },
  CLONE_ROOM: {
    label: 'Clone Room', sop: '8-CLN-9', effective: '13/02/2026', areaColour: 'Green',
    colourClass: 'bg-green-400/20 border-green-400/40 text-green-200',
    sanitizers: ['HOCL', 'Tripple Orange Wonder Gel'],
    tasksByDay: {
      MON: ['Take mops & cloths to laundry', 'Clean brooms & dustpans', 'Clean mop clips, handles & buckets', 'Clean table & chair', 'Spot clean walls & doors', 'Sweep & mop floors', 'Clean racks & domes', 'Check & clean dispensers, empty dustbin', 'Clean handles & switch'],
      TUE: ['Take mops & cloths to laundry', 'Clean brooms & dustpans', 'Clean mop clips, handles & buckets', 'Clean table & chair', 'Spot clean walls & doors', 'Sweep & mop floors', 'Clean racks & domes', 'Check & clean dispensers, empty dustbin', 'Door handles & light'],
      WED: ['Take mops & cloths to laundry', 'Clean brooms & dustpans', 'Clean mop clips, handles & buckets', 'Clean tables & chair', 'Spot clean walls & doors', 'Sweep & mop floors', 'Clean racks & domes', 'Check & clean dispensers, empty dustbin', 'Door handles & light'],
      THU: ['Take mops & cloths to laundry', 'Clean brooms & dustpans', 'Clean mop clips, handles & buckets', 'Clean tables & chair', 'Spot clean walls & doors', 'Sweep & mop floors', 'Clean racks & domes', 'Check clean dispensers', 'Clean handles & switch'],
      FRI: ['Take mops & cloths to laundry', 'Clean brooms & dustpans', 'Clean clips, handles & buckets', 'Clean table & chair', 'Spot clean walls & doors', 'Sweep & mop floors', 'Clean racks & domes', 'Check & clean dispensers, empty dustbin', 'Door handles & light'],
    },
    frequencyRows: ['Pre/Post cloning · Clean clone racks & domes/trays', 'Pre/Post cloning · Clean table & chair', 'Pre/Post cloning · Clean walls, doors, ceiling', 'Pre/Post cloning · Clean fans & aircons, humidifiers', 'Pre/Post cloning · Wash capillary mats', 'Pre/Post cloning · Scrub floors'],
    compiler: 'Jeanette Ferreira', authorisedBy: 'Authorised Representative',
  },
  PPE: {
    label: 'PPE (Mother & GH)', sop: 'To assign', effective: '—', areaColour: 'Teal',
    colourClass: 'bg-teal-400/20 border-teal-400/40 text-teal-200',
    sanitizers: ['Steri-5', 'Hydrogen peroxide 2 pct'],
    tasksByDay: { MON: ['Launder reusable gowns / PPE', 'Clean & sanitise reusable PPE', 'Restock disposable PPE', 'Wipe PPE lockers & hooks', 'Empty & clean bins', 'Sweep & mop floor', 'Check & clean dispensers'], TUE: ['Launder reusable gowns / PPE', 'Clean & sanitise reusable PPE', 'Restock disposable PPE', 'Wipe PPE lockers & hooks', 'Empty & clean bins', 'Sweep & mop floor', 'Check & clean dispensers'], WED: ['Launder reusable gowns / PPE', 'Clean & sanitise reusable PPE', 'Restock disposable PPE', 'Wipe PPE lockers & hooks', 'Empty & clean bins', 'Sweep & mop floor', 'Check & clean dispensers'], THU: ['Launder reusable gowns / PPE', 'Clean & sanitise reusable PPE', 'Restock disposable PPE', 'Wipe PPE lockers & hooks', 'Empty & clean bins', 'Sweep & mop floor', 'Check & clean dispensers'], FRI: ['Launder reusable gowns / PPE', 'Clean & sanitise reusable PPE', 'Restock disposable PPE', 'Wipe PPE lockers & hooks', 'Empty & clean bins', 'Sweep & mop floor', 'Check & clean dispensers'] },
    frequencyRows: ['Weekly · Deep-clean PPE store', 'Monthly · Audit PPE stock & condition'],
  },
  CULTIVATION: {
    label: 'Cultivation Area', sop: 'To assign', effective: '—', areaColour: 'Lime',
    colourClass: 'bg-lime-400/20 border-lime-400/40 text-lime-200',
    sanitizers: ['Steri-5'],
    tasksByDay: { MON: ['Clean switches & handles', 'Empty & clean bins', 'Spot check walls', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'], TUE: ['Clean switches & handles', 'Empty & clean bins', 'Spot check walls', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'], WED: ['Clean switches & handles', 'Empty & clean bins', 'Spot check walls', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'], THU: ['Clean switches & handles', 'Empty & clean bins', 'Spot check walls', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'], FRI: ['Clean switches & handles', 'Empty & clean bins', 'Spot check walls', 'Wipe flat surfaces', 'Sweep floors', 'Spot check fans', 'Check & clean dispensers'] },
    frequencyRows: ['Weekly · Clean fans & fins', 'Weekly · Clean lights', 'After batch / Monthly · Wash floor'],
  },
  GENERAL: {
    label: 'General Area', sop: 'To assign', effective: '—', areaColour: 'Slate',
    colourClass: 'bg-slate-400/20 border-slate-400/40 text-slate-200',
    sanitizers: ['Steri-5'],
    tasksByDay: { MON: ['Empty & clean bins', 'Clean doors & handles', 'Wipe flat surfaces', 'Sweep & mop floors', 'Spot check walls', 'Check & clean dispensers'], TUE: ['Empty & clean bins', 'Clean doors & handles', 'Wipe flat surfaces', 'Sweep & mop floors', 'Spot check walls', 'Check & clean dispensers'], WED: ['Empty & clean bins', 'Clean doors & handles', 'Wipe flat surfaces', 'Sweep & mop floors', 'Spot check walls', 'Check & clean dispensers'], THU: ['Empty & clean bins', 'Clean doors & handles', 'Wipe flat surfaces', 'Sweep & mop floors', 'Spot check walls', 'Check & clean dispensers'], FRI: ['Empty & clean bins', 'Clean doors & handles', 'Wipe flat surfaces', 'Sweep & mop floors', 'Spot check walls', 'Check & clean dispensers'] },
    frequencyRows: ['Weekly · Rinse floor', 'Monthly · Deep clean', 'After batch · Wash down'],
  },
  IRRIGATION: {
    label: 'Irrigation', sop: 'To assign', effective: '—', areaColour: 'Cyan',
    colourClass: 'bg-cyan-400/20 border-cyan-400/40 text-cyan-200',
    sanitizers: ['HOCL'],
    tasksByDay: { MON: ['Wipe dosing pumps & lines', 'Clean stock-solution area', 'Check & clean filters', 'Clean drip lines / emitters', 'Empty & clean bins', 'Sweep floor'], TUE: ['Wipe dosing pumps & lines', 'Clean stock-solution area', 'Check & clean filters', 'Clean drip lines / emitters', 'Empty & clean bins', 'Sweep floor'], WED: ['Wipe dosing pumps & lines', 'Clean stock-solution area', 'Check & clean filters', 'Clean drip lines / emitters', 'Empty & clean bins', 'Sweep floor'], THU: ['Wipe dosing pumps & lines', 'Clean stock-solution area', 'Check & clean filters', 'Clean drip lines / emitters', 'Empty & clean bins', 'Sweep floor'], FRI: ['Wipe dosing pumps & lines', 'Clean stock-solution area', 'Check & clean filters', 'Clean drip lines / emitters', 'Empty & clean bins', 'Sweep floor'] },
    frequencyRows: ['Weekly · Flush & sanitise lines', 'Weekly · Clean tanks', 'Monthly · Descale dosers', 'After batch · Full system flush'],
  },
};

interface CleaningRecord {
  id: string; date: string; zone: Zone; day: string; taskIndex: number; taskLabel: string; initialled: string; signedAt: string;
}

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'];

export default function CleaningSchedulePage() {
  const { hasMinLevel } = useRBAC();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const readOnly = useReadOnly();
  const canInit = !readOnly && hasMinLevel(1);

  const [zone, setZone] = useState<Zone>('GREENHOUSE');
  const config = ZONE_CONFIG[zone];

  const { data: records, isLoading } = useQuery<CleaningRecord[]>({
    queryKey: ['cleaning-schedule', zone],
    queryFn: () => api.get(`/cleaning-schedule?zone=${zone}`).then(r => r.data.records ?? []).catch(() => []),
  });

  const initialMut = useMutation({
    mutationFn: (args: { day: string; taskIndex: number; taskLabel: string }) =>
      api.post('/cleaning-schedule', { zone, ...args }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cleaning-schedule'] });
      addToast('success', 'Initialled');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed'),
  });

  // Map of "day::taskIndex" → initials, for today
  const todayKey = new Date().toDateString();
  const todaysMarks = useMemo(() => {
    const out: Record<string, string> = {};
    (records ?? []).filter(r => new Date(r.date).toDateString() === todayKey)
      .forEach(r => { out[`${r.day}::${r.taskIndex}`] = r.initialled; });
    return out;
  }, [records, todayKey]);

  const currentDayAbbr = ['SUN','MON','TUE','WED','THU','FRI','SAT'][new Date().getDay()];

  return (
    <div className="space-y-6">
      <SOPHeader
        sopNumber={config.sop}
        title={`${config.label} · Cleaning Checklist`}
        effectiveDate={config.effective}
        version="1.0"
        responsibility="Facility Cleaners / Assistant Growers"
        reportsTo="Facility Manager"
        authorisedBy={config.authorisedBy ?? 'Authorised Representative'}
        checkedBy="QA"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <SprayCan className="text-amber-400" size={26} /> Cleaning Schedule
          </h1>
          <p className="text-sm text-white/40 mt-1">Weekly cleaning cadence · initial each completed task</p>
        </div>
        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${config.colourClass}`}>
          Area colour · {config.areaColour}
        </span>
      </div>

      {/* Zone chips */}
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(ZONE_CONFIG) as Zone[]).map(z => (
          <button key={z} onClick={() => setZone(z)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border min-h-[36px] ${
              zone === z
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
            }`}>
            {ZONE_CONFIG[z].label}
          </button>
        ))}
      </div>

      {/* Sanitizer block */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/80 mb-2">Sanitizers</div>
        <div className="flex gap-3 flex-wrap">
          {config.sanitizers.map(s => (
            <span key={s} className="px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-medium">{s}</span>
          ))}
        </div>
      </div>

      {/* Weekly grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1,2,3,4].map(i => <SkeletonCard key={i} />)}</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-[10px] uppercase tracking-[0.18em] text-amber-400/80 font-semibold">Task</th>
                {DAYS.map(d => (
                  <th key={d} className={`px-3 py-3 text-center text-[10px] uppercase tracking-[0.18em] font-semibold ${d === currentDayAbbr ? 'text-amber-300' : 'text-amber-400/80'}`}>
                    {d}{d === currentDayAbbr && <span className="ml-1 text-[8px]">●</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(config.tasksByDay.MON ?? []).map((task, idx) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2.5 text-white/80 text-xs max-w-xs">{task}</td>
                  {DAYS.map(d => {
                    const key = `${d}::${idx}`;
                    const initialled = todaysMarks[key];
                    const dayTasks = config.tasksByDay[d] ?? [];
                    const thisTask = dayTasks[idx];
                    const isToday = d === currentDayAbbr;
                    return (
                      <td key={d} className="px-3 py-2 text-center">
                        {thisTask ? (
                          initialled ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-mono text-[10px] font-bold">
                              {initialled.slice(0, 2).toUpperCase()}
                            </span>
                          ) : canInit && isToday ? (
                            <button
                              onClick={() => initialMut.mutate({ day: d, taskIndex: idx, taskLabel: thisTask })}
                              className="w-8 h-8 rounded-full border border-dashed border-white/20 text-white/30 hover:border-amber-500/40 hover:text-amber-300 transition"
                              title={`Initial: ${thisTask}`}>
                              <Check size={12} className="mx-auto" />
                            </button>
                          ) : (
                            <span className="inline-block w-8 h-8 rounded-full border border-white/10" />
                          )
                        ) : (
                          <span className="text-white/20 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Frequency rows */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/80 mb-3">Weekly · After-batch · Monthly</div>
        <ul className="space-y-1.5">
          {config.frequencyRows.map((r, i) => {
            const fk = `FREQ::${1000 + i}`;
            const mark = todaysMarks[fk];
            return (
              <li key={i} className="flex items-center gap-2 text-xs text-white/70 py-1 border-b border-white/5 last:border-0">
                {mark ? (
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 border border-green-500/40 text-green-300 font-mono text-[9px] font-bold flex-shrink-0">{mark.slice(0, 2).toUpperCase()}</span>
                ) : canInit ? (
                  <button onClick={() => initialMut.mutate({ day: 'FREQ', taskIndex: 1000 + i, taskLabel: r })} title={`Initial: ${r}`}
                    className="w-6 h-6 rounded-full border border-dashed border-white/20 text-white/30 hover:border-amber-500/40 hover:text-amber-300 transition flex-shrink-0"><Check size={11} className="mx-auto" /></button>
                ) : (
                  <span className="inline-block w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                )}
                {r}
              </li>
            );
          })}
        </ul>
      </div>

      {config.compiler && (
        <p className="text-[11px] text-white/30">
          Compiler: <span className="text-white/60">{config.compiler}</span> · Approver: <span className="text-white/60">{config.authorisedBy}</span>
        </p>
      )}
    </div>
  );
}
