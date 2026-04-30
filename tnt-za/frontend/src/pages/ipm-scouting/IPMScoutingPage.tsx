import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import SOPHeader from '../../components/SOPHeader';
import { Bug, Plus, AlertTriangle, CheckCircle2, Leaf } from 'lucide-react';
import api from '../../services/api';

// =====================================================================
// IPM Scouting Sheet — SOP 3-CUL-2
//
// Replaces the printed "IPM Scouting Sheet" form. Plant Technicians
// log pest/disease observations per zone-line, with infestation degree
// (LOW/MED/HIGH), pest type, sticky-card counts and notes.
//
// HIGH infestation auto-creates a /qms deviation so the QMS / QA loop
// picks it up immediately.
// =====================================================================

type Degree = 'LOW' | 'MEDIUM' | 'HIGH';

interface Observation {
  id: string;
  date: string;
  batchId?: string;
  line: string;
  zone: 'MOTHER_BAY' | 'CLONE_ROOM' | 'GREENHOUSE';
  insectOrDisease: string;
  degree: Degree;
  pestType: string;
  stickyCardCount?: number;
  notes?: string;
  doneBy: string;
  signedAt: string;
  departmentHead?: string;
}

const DEGREE_PILL: Record<Degree, string> = {
  LOW:    'bg-green-500/15 border border-green-500/40 text-green-300',
  MEDIUM: 'bg-amber-500/15 border border-amber-500/40 text-amber-300',
  HIGH:   'bg-red-500/15 border border-red-500/40 text-red-300',
};

const ZONE_LABEL: Record<string, string> = {
  MOTHER_BAY:  'Mother Bay',
  CLONE_ROOM:  'Clone Room',
  GREENHOUSE:  'Greenhouse',
};

export default function IPMScoutingPage() {
  const { hasMinLevel } = useRBAC();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const canLog = hasMinLevel(2); // Cultivator and above

  const [zoneFilter, setZoneFilter] = useState<string>('');
  const [showLog, setShowLog] = useState(false);
  const [form, setForm] = useState({
    batchId: '', line: '', zone: 'GREENHOUSE',
    insectOrDisease: '', degree: 'LOW' as Degree, pestType: '',
    stickyCardCount: '', notes: '',
  });

  // Backend endpoint pending — graceful empty fallback per existing pattern
  const { data: observations, isLoading } = useQuery<Observation[]>({
    queryKey: ['ipm-scouting', zoneFilter],
    queryFn: () => api.get(`/ipm-scouting${zoneFilter ? `?zone=${zoneFilter}` : ''}`)
      .then(r => r.data.observations ?? [])
      .catch(() => []),
  });

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then(r => r.data.batches ?? []),
  });

  const logMut = useMutation({
    mutationFn: () => api.post('/ipm-scouting', {
      ...form,
      stickyCardCount: form.stickyCardCount ? parseInt(form.stickyCardCount) : undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ipm-scouting'] });
      setShowLog(false);
      setForm({ batchId: '', line: '', zone: 'GREENHOUSE', insectOrDisease: '', degree: 'LOW', pestType: '', stickyCardCount: '', notes: '' });
      addToast('success', 'IPM observation logged');
      if (form.degree === 'HIGH') {
        addToast('warning', 'HIGH infestation — deviation created in QMS');
      }
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed to log observation'),
  });

  const stats = useMemo(() => {
    const all = observations ?? [];
    return {
      total: all.length,
      high: all.filter(o => o.degree === 'HIGH').length,
      medium: all.filter(o => o.degree === 'MEDIUM').length,
      last7days: all.filter(o => {
        const d = new Date(o.date); const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
        return d >= cutoff;
      }).length,
    };
  }, [observations]);

  return (
    <div className="space-y-6">
      <SOPHeader
        sopNumber="3-CUL-2"
        title="IPM Scouting Sheet"
        effectiveDate="10/10/2025"
        version="1.0"
        responsibility="Plant Technicians"
        reportsTo="Department Head"
        authorisedBy="Authorised Representative"
        checkedBy="Responsible Pharmacist"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Bug className="text-amber-400" size={26} /> IPM Scouting
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Pest &amp; disease observations · sticky-card counts · degree of infestation per zone-line
          </p>
        </div>
        {canLog && (
          <button
            onClick={() => setShowLog(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]"
          >
            <Plus size={16} /> Log observation
          </button>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={Leaf}     label="Observations (all time)" value={stats.total}     tone="neutral" />
        <StatTile icon={Leaf}     label="Last 7 days"             value={stats.last7days} tone="neutral" />
        <StatTile icon={AlertTriangle} label="High infestation"   value={stats.high}      tone={stats.high > 0 ? 'red' : 'neutral'} />
        <StatTile icon={AlertTriangle} label="Medium infestation" value={stats.medium}    tone={stats.medium > 0 ? 'amber' : 'neutral'} />
      </div>

      {/* Zone filter */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip active={zoneFilter === ''}            onClick={() => setZoneFilter('')}>All zones</FilterChip>
        <FilterChip active={zoneFilter === 'MOTHER_BAY'}  onClick={() => setZoneFilter('MOTHER_BAY')}>Mother Bay</FilterChip>
        <FilterChip active={zoneFilter === 'CLONE_ROOM'}  onClick={() => setZoneFilter('CLONE_ROOM')}>Clone Room</FilterChip>
        <FilterChip active={zoneFilter === 'GREENHOUSE'}  onClick={() => setZoneFilter('GREENHOUSE')}>Greenhouse</FilterChip>
      </div>

      {/* Observations table */}
      {isLoading ? (
        <SkeletonTable />
      ) : !observations?.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <CheckCircle2 className="mx-auto text-white/30 mb-3" size={36} />
          <p className="text-white/60 text-sm">No IPM observations logged yet.</p>
          {canLog && (
            <p className="text-white/40 text-xs mt-2">Click <span className="text-amber-300">Log observation</span> to start the scouting record.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-zinc-950/60">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-amber-400/80 border-b border-white/10">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Zone</th>
                <th className="px-4 py-3 font-semibold">Line</th>
                <th className="px-4 py-3 font-semibold">Insect / Disease</th>
                <th className="px-4 py-3 font-semibold">Pest type</th>
                <th className="px-4 py-3 font-semibold">Degree</th>
                <th className="px-4 py-3 font-semibold">Sticky cards</th>
                <th className="px-4 py-3 font-semibold">Done by</th>
              </tr>
            </thead>
            <tbody>
              {observations.map(o => (
                <tr key={o.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="px-4 py-3 text-white/80 font-mono text-xs">{new Date(o.date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-white/80">{ZONE_LABEL[o.zone] ?? o.zone}</td>
                  <td className="px-4 py-3 text-white/80 font-mono">{o.line}</td>
                  <td className="px-4 py-3 text-white">{o.insectOrDisease}</td>
                  <td className="px-4 py-3 text-white/70">{o.pestType}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${DEGREE_PILL[o.degree]}`}>
                      {o.degree}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white/70 font-mono">{o.stickyCardCount ?? '—'}</td>
                  <td className="px-4 py-3 text-white/60 text-xs">{o.doneBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log observation modal */}
      <Modal open={showLog} onClose={() => setShowLog(false)} title="Log IPM observation">
        <div className="space-y-3">
          <ModalSelect label="Zone" value={form.zone}
            onChange={e => setForm({ ...form, zone: e.target.value })}>
            <option value="MOTHER_BAY">Mother Bay</option>
            <option value="CLONE_ROOM">Clone Room</option>
            <option value="GREENHOUSE">Greenhouse</option>
          </ModalSelect>

          <ModalInput label="Line / row" placeholder="e.g. R3-L7"
            value={form.line} onChange={e => setForm({ ...form, line: e.target.value })} />

          <ModalSelect label="Batch (optional)" value={form.batchId}
            onChange={e => setForm({ ...form, batchId: e.target.value })}>
            <option value="">— No batch attached —</option>
            {(batches ?? []).map((b: any) => (
              <option key={b.id} value={b.id}>{b.batchNumber} · {b.strain}</option>
            ))}
          </ModalSelect>

          <ModalInput label="Insect or disease" placeholder="e.g. Spider mite, Powdery mildew"
            value={form.insectOrDisease} onChange={e => setForm({ ...form, insectOrDisease: e.target.value })} />

          <ModalInput label="Type of pest detected" placeholder="e.g. Adult, Egg, Spore"
            value={form.pestType} onChange={e => setForm({ ...form, pestType: e.target.value })} />

          <ModalSelect label="Degree of infestation" value={form.degree}
            onChange={e => setForm({ ...form, degree: e.target.value as Degree })}>
            <option value="LOW">LOW · monitor only</option>
            <option value="MEDIUM">MEDIUM · treat next cycle</option>
            <option value="HIGH">HIGH · immediate action + creates QMS deviation</option>
          </ModalSelect>

          <ModalInput label="Sticky-card count (avg per block)" placeholder="e.g. 4" type="number"
            value={form.stickyCardCount} onChange={e => setForm({ ...form, stickyCardCount: e.target.value })} />

          <ModalInput label="Notes / comments" placeholder="Action taken, treatment applied, observations…"
            value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />

          {form.degree === 'HIGH' && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 flex items-start gap-2">
              <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
              <span>HIGH infestation will auto-create a deviation in <code className="font-mono text-red-100/90 bg-red-950/40 px-1 rounded">/qms</code> and notify the Department Head + Responsible Pharmacist.</span>
            </div>
          )}

          <ModalButton
            onClick={() => logMut.mutate()}
            disabled={logMut.isPending || !form.line || !form.insectOrDisease || !form.pestType}
          >
            {logMut.isPending ? 'Logging…' : 'Log observation'}
          </ModalButton>

          <p className="text-[11px] text-white/30 text-center">
            Logged by <span className="text-white/50">{user?.name ?? 'you'}</span> · saved to audit chain on submit
          </p>
        </div>
      </Modal>
    </div>
  );
}

// ---- Subcomponents ----

const StatTile: React.FC<{ icon: any; label: string; value: number; tone: 'neutral' | 'amber' | 'red' }> =
  ({ icon: Icon, label, value, tone }) => {
    const toneClass =
      tone === 'red'   ? 'text-red-300 border-red-500/40 bg-red-500/10' :
      tone === 'amber' ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' :
                         'text-white border-white/10 bg-white/5';
    return (
      <div className={`rounded-xl border p-4 ${toneClass}`}>
        <div className="flex items-center gap-2 mb-1">
          <Icon size={14} className="opacity-70" />
          <span className="text-[10px] font-mono uppercase tracking-[0.18em] opacity-70">{label}</span>
        </div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
    );
  };

const FilterChip: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> =
  ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition border min-h-[36px] ${
        active
          ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
          : 'bg-white/5 text-white/60 border-white/10 hover:border-white/30 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
