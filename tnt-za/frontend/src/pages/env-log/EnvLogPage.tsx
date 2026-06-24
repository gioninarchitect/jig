import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useReadOnly } from '../../hooks/useReadOnly';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalInput, ModalButton } from '../../components/Modal';
import SOPHeader from '../../components/SOPHeader';
import { FACILITY_ZONES, zoneFamily } from '../../constants/facilityZones';
import { Thermometer, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../services/api';

// =====================================================================
// Temperature & Humidity Daily Check Sheet — SOP 4-FAC-2
//
// Per-zone 3x-daily environmental check (8AM / 11:50AM / 4:50PM). Each
// reading is flagged pass/warn/fail based on the zone's target range.
// =====================================================================

type Zone = string;
// mother rooms share greenhouse-like env targets until a dedicated mother target exists
const FAMILY_KEY: Record<string, 'CLONE_ROOM' | 'GREENHOUSE'> = { MOTHER: 'GREENHOUSE', CLONE: 'CLONE_ROOM', GREENHOUSE: 'GREENHOUSE' };

const ZONE_CONFIG: Record<Zone, {
  label: string; effective: string;
  targetTemp: { min: number; max: number };
  targetRH: { min: number; max: number };
}> = {
  CLONE_ROOM:  { label: 'Clone Room',  effective: '30/09/2025', targetTemp: { min: 22, max: 28 }, targetRH: { min: 70, max: 100 } },
  GREENHOUSE:  { label: 'Greenhouse',  effective: '30/09/2025', targetTemp: { min: 22, max: 28 }, targetRH: { min: 45, max: 65  } },
};

interface EnvReading {
  id: string; date: string; zone: Zone; batchNo?: string; strainId?: string;
  temp8: number | null;  rh8:  number | null;
  temp12: number | null; rh12: number | null;
  temp17: number | null; rh17: number | null;
  checkedBy: string;
}

const inRange = (v: number | null, min: number, max: number) =>
  v == null ? 'missing' : (v >= min && v <= max ? 'pass' : v < min ? 'low' : 'high');

const readingPill = (status: string) => {
  if (status === 'pass') return 'bg-green-500/15 border border-green-500/40 text-green-300';
  if (status === 'low')  return 'bg-blue-500/15 border border-blue-500/40 text-blue-300';
  if (status === 'high') return 'bg-amber-500/15 border border-amber-500/40 text-amber-300';
  return 'bg-white/5 border border-white/10 text-white/40';
};

export default function EnvLogPage() {
  const { hasMinLevel } = useRBAC();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const readOnly = useReadOnly();
  const canLog = !readOnly && hasMinLevel(1);

  const [zone, setZone] = useState<Zone>('GH1');
  const [showLog, setShowLog] = useState(false);
  const [slot, setSlot] = useState<'08:00' | '11:50' | '16:50'>('08:00');
  const [form, setForm] = useState({ temp: '', rh: '', batchNo: '', strainId: '' });

  const config = ZONE_CONFIG[FAMILY_KEY[zoneFamily(zone)]];

  const { data: readings, isLoading } = useQuery<EnvReading[]>({
    queryKey: ['env-log', zone],
    queryFn: () => api.get(`/env-log?zone=${zone}`).then(r => r.data.readings ?? []).catch(() => []),
  });

  const logMut = useMutation({
    mutationFn: () => api.post('/env-log', {
      zone, slot,
      temp: parseFloat(form.temp), rh: parseFloat(form.rh),
      batchNo: form.batchNo || undefined, strainId: form.strainId || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['env-log'] });
      setShowLog(false);
      setForm({ temp: '', rh: '', batchNo: '', strainId: '' });
      addToast('success', `${slot} reading logged`);
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed'),
  });

  return (
    <div className="space-y-6">
      <SOPHeader
        sopNumber="4-FAC-2"
        title={`Temperature & Humidity Daily Check · ${config.label}`}
        effectiveDate={config.effective}
        version="1.0"
        responsibility="Plant Technicians"
        reportsTo="Facility Manager"
        authorisedBy="Authorised Representative"
        checkedBy="Quality Assurance Manager"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Thermometer className="text-amber-400" size={26} /> Environment Log
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Target temp: <span className="text-white/70 font-mono">{config.targetTemp.min}–{config.targetTemp.max}°C</span>
            {' · '}Target RH: <span className="text-white/70 font-mono">{config.targetRH.min}–{config.targetRH.max}%</span>
          </p>
        </div>
        {canLog && (
          <div className="flex gap-2">
            {(['08:00', '11:50', '16:50'] as const).map(s => (
              <button key={s} onClick={() => { setSlot(s); setShowLog(true); }}
                className="px-3.5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition min-h-[40px]">
                <Plus size={13} /> {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Zone chips */}
      <div className="flex gap-2 flex-wrap">
        {FACILITY_ZONES.map(z => (
          <button key={z.key} onClick={() => setZone(z.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border min-h-[36px] ${
              zone === z.key
                ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
            }`}>
            {z.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : !readings?.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Thermometer className="mx-auto text-white/30 mb-3" size={36} />
          <p className="text-white/60 text-sm">No environment readings for {config.label} yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-amber-400/80 border-b border-white/10">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold text-center">08:00 AM</th>
                <th className="px-4 py-3 font-semibold text-center">11:50 AM</th>
                <th className="px-4 py-3 font-semibold text-center">16:50 PM</th>
                <th className="px-4 py-3 font-semibold">Checked by</th>
              </tr>
            </thead>
            <tbody>
              {readings.map(r => (
                <tr key={r.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-2.5 font-mono text-xs text-white/80">{new Date(r.date).toLocaleDateString()}</td>
                  <ReadingCell temp={r.temp8}  rh={r.rh8}  config={config} />
                  <ReadingCell temp={r.temp12} rh={r.rh12} config={config} />
                  <ReadingCell temp={r.temp17} rh={r.rh17} config={config} />
                  <td className="px-4 py-2.5 text-xs text-white/60">{r.checkedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showLog} onClose={() => setShowLog(false)} title={`Log ${slot} reading · ${config.label}`}>
        <div className="space-y-2">
          <ModalInput label="Temperature (°C)" type="number" placeholder={`Target ${config.targetTemp.min}–${config.targetTemp.max}`}
            value={form.temp} onChange={e => setForm({ ...form, temp: e.target.value })} />
          <ModalInput label="Relative humidity (%)" type="number" placeholder={`Target ${config.targetRH.min}–${config.targetRH.max}`}
            value={form.rh} onChange={e => setForm({ ...form, rh: e.target.value })} />
          <ModalInput label="Strain ID (optional)" placeholder="e.g. AUR-22"
            value={form.strainId} onChange={e => setForm({ ...form, strainId: e.target.value })} />
          <ModalInput label="Batch No (optional)" placeholder="e.g. B-2026-012"
            value={form.batchNo} onChange={e => setForm({ ...form, batchNo: e.target.value })} />

          <ModalButton onClick={() => logMut.mutate()} disabled={logMut.isPending || !form.temp || !form.rh}>
            {logMut.isPending ? 'Logging…' : `Log ${slot} reading`}
          </ModalButton>
          <p className="text-[11px] text-white/30 text-center">
            Checked by <span className="text-white/50">{user?.name ?? 'you'}</span>
          </p>
        </div>
      </Modal>
    </div>
  );
}

const ReadingCell: React.FC<{
  temp: number | null; rh: number | null;
  config: (typeof ZONE_CONFIG)[Zone];
}> = ({ temp, rh, config }) => {
  const tStatus = inRange(temp, config.targetTemp.min, config.targetTemp.max);
  const rStatus = inRange(rh,   config.targetRH.min,   config.targetRH.max);
  return (
    <td className="px-4 py-2.5 text-center">
      {temp == null && rh == null ? (
        <span className="text-white/20 text-xs">—</span>
      ) : (
        <div className="flex flex-col items-center gap-1">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${readingPill(tStatus)}`}>
            {tStatus === 'high' && <TrendingUp size={9} />}
            {tStatus === 'low'  && <TrendingDown size={9} />}
            {temp}°C
          </span>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${readingPill(rStatus)}`}>
            {rStatus === 'high' && <TrendingUp size={9} />}
            {rStatus === 'low'  && <TrendingDown size={9} />}
            {rh}%
          </span>
        </div>
      )}
    </td>
  );
};
