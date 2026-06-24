import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useReadOnly } from '../../hooks/useReadOnly';
import { useToastStore } from '../../stores/toastStore';
import { useAuthStore } from '../../stores/authStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalButton } from '../../components/Modal';
import { Factory, Camera, Loader2, Scale, CheckCircle, ChevronRight, FlaskConical, Lock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

// Confirmed ILCO processing order. weigh = a scale-snap point.
const STAGES: { key: string; label: string; weigh: boolean; lab?: boolean; gated?: boolean }[] = [
  { key: 'WET_INTAKE', label: 'Wet intake', weigh: true },
  { key: 'SAMPLING', label: 'Sampling & lab', weigh: true, lab: true },
  { key: 'DRYING', label: 'Drying', weigh: true },
  { key: 'DEBUCKING', label: 'Debucking', weigh: true },
  { key: 'TRIMMING', label: 'Trimming', weigh: true },
  { key: 'VISUAL_INSPECTION', label: 'Visual inspection', weigh: false },
  { key: 'PACKAGING', label: 'Packaging', weigh: true },
  { key: 'BULK_STORAGE', label: 'Bulk storage', weigh: true },
  { key: 'DISPATCH', label: 'Dispatch', weigh: true, gated: true },
];

type StageEvent = { stage: string; weight: number | null; weightUnit: string; photoUrl: string | null; by: string | null; at: string; notes?: string | null };

export default function ProcessingPage() {
  const { hasMinLevel } = useRBAC();
  const readOnly = useReadOnly();
  const addToast = useToastStore(s => s.addToast);
  const user = useAuthStore(s => s.user);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [selBatch, setSelBatch] = useState<any>(null);
  const [weighStage, setWeighStage] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [weight, setWeight] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  const { data: batches, isLoading } = useQuery({ queryKey: ['batches'], queryFn: () => api.get('/batches').then(r => r.data.batches) });
  const { data: records } = useQuery({
    queryKey: ['batch-records', selBatch?.id],
    queryFn: () => api.get(`/batches/${selBatch.id}/records`).then(r => r.data.records),
    enabled: !!selBatch,
  });

  const bpr = (records || []).find((r: any) => r.recordType === 'BPR');
  const stages: StageEvent[] = (bpr?.data?.stages as StageEvent[]) || [];
  const latest = (key: string) => [...stages].reverse().find(s => s.stage === key);
  const wetW = latest('WET_INTAKE')?.weight ?? null;
  const trimW = latest('TRIMMING')?.weight ?? null;
  const loss = wetW && trimW ? ((wetW - trimW) / wetW) * 100 : null;
  const sampled = !!latest('SAMPLING');

  const canEdit = !readOnly && hasMinLevel(1);

  async function onFile(file: File) {
    setReading(true); setConfidence(null);
    try {
      const form = new FormData();
      form.append('photo', file);
      const { data } = await api.post('/scan', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setPhotoUrl(data.photoUrl || null);
      setConfidence(data.scan?.confidence ?? null);
      if (data.scan?.weight != null) {
        setWeight(String(data.scan.weight));
        addToast('success', `Scale reads ${data.scan.weight}${data.scan.weightUnit || 'g'}`);
      } else {
        addToast('warning', 'Could not read the scale — type the weight');
      }
    } catch {
      addToast('warning', 'Scale read failed — type the weight');
    } finally { setReading(false); }
  }

  const saveMut = useMutation({
    mutationFn: () => api.post(`/batches/${selBatch.id}/processing/stage`, {
      stage: weighStage, weight: weight === '' ? null : Number(weight), weightUnit: 'g', photoUrl, name: user?.name,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batch-records', selBatch.id] });
      addToast('success', `${STAGES.find(s => s.key === weighStage)?.label} recorded`);
      closeWeigh();
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  function openWeigh(stage: string) { setWeighStage(stage); setWeight(''); setPhotoUrl(null); setConfidence(null); }
  function closeWeigh() { setWeighStage(null); setWeight(''); setPhotoUrl(null); setConfidence(null); }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Factory size={20} className="text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold text-white">Processing</h1>
          <p className="text-sm text-white/40">Wet intake → dispatch · snap the scale to capture weights</p>
        </div>
      </div>

      {!selBatch ? (
        isLoading ? <SkeletonTable rows={5} /> : !batches?.length ? (
          <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center text-white/40">No batches in processing yet</div>
        ) : (
          <div className="space-y-2">
            {batches.map((b: any) => (
              <button key={b.id} onClick={() => setSelBatch(b)}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between hover:border-primary/40 transition text-left">
                <div>
                  <span className="font-mono text-primary font-bold text-sm">{b.batchNumber}</span>
                  <span className="text-white/50 text-sm ml-2">{b.strain}</span>
                </div>
                <ChevronRight size={18} className="text-white/30" />
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <button onClick={() => setSelBatch(null)} className="text-sm text-white/40 hover:text-white/70">← All batches</button>

          {/* Header + reconciliation */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-mono text-primary font-bold">{selBatch.batchNumber}</span>
              <span className="text-white/50 text-sm">{selBatch.strain}</span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-black/20 border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">Wet in</div><div className="text-sm text-white font-mono">{wetW != null ? `${wetW}g` : '—'}</div></div>
              <div className="bg-black/20 border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">Trim out</div><div className="text-sm text-white font-mono">{trimW != null ? `${trimW}g` : '—'}</div></div>
              <div className={`bg-black/20 border rounded-lg p-3 ${loss != null && loss > 80 ? 'border-red-500/30' : 'border-white/[0.06]'}`}><div className="text-[10px] text-white/25">Loss wet→trim</div><div className="text-sm font-mono text-white">{loss != null ? `${loss.toFixed(0)}%` : '—'}</div></div>
            </div>
            {sampled && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-lg px-3 py-2">
                <FlaskConical size={13} /> Lab sample sent — results take up to 2 weeks. Dispatch stays locked until a PASS is back.
              </div>
            )}
          </div>

          {/* Stage rail */}
          <div className="space-y-2">
            {STAGES.map((st, i) => {
              const ev = latest(st.key);
              const done = !!ev;
              return (
                <div key={st.key} className={`rounded-xl border p-4 ${done ? 'bg-green-500/[0.06] border-green-500/20' : 'bg-white/5 border-white/10'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${done ? 'bg-green-500 text-black' : 'bg-white/10 text-white/50'}`}>
                      {done ? <CheckCircle size={14} /> : i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">{st.label}</span>
                        {st.lab && <FlaskConical size={12} className="text-amber-300" />}
                        {st.gated && <Lock size={12} className="text-white/40" />}
                      </div>
                      {ev && (
                        <div className="text-[11px] text-white/40 mt-0.5">
                          {ev.weight != null ? <span className="font-mono text-white/60">{ev.weight}{ev.weightUnit}</span> : 'logged'}
                          {ev.by ? ` · ${ev.by}` : ''} · {new Date(ev.at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                    {canEdit && (
                      <button onClick={() => openWeigh(st.key)}
                        className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition flex items-center gap-1.5 flex-shrink-0">
                        {st.weigh ? <><Camera size={13} /> Weigh</> : 'Log'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Weigh modal */}
      <Modal open={!!weighStage} onClose={closeWeigh} title={STAGES.find(s => s.key === weighStage)?.label || ''}>
        <p className="text-xs text-white/40 mb-3">Snap a photo of the scale — the weight reads in automatically. Check it, then save.</p>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ''; }} />

        <button onClick={() => fileRef.current?.click()} disabled={reading}
          className="w-full py-3 mb-3 bg-amber-500/15 border border-amber-500/30 text-amber-200 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          {reading ? <><Loader2 size={16} className="animate-spin" /> Reading scale…</> : <><Camera size={16} /> Snap the scale</>}
        </button>

        {confidence != null && confidence < 0.6 && weight !== '' && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-300 mb-2"><AlertTriangle size={12} /> Low confidence — double-check the reading.</div>
        )}

        <label className="block text-sm text-white/50 mb-1">Weight (g){STAGES.find(s => s.key === weighStage)?.weigh ? '' : ' — optional'}</label>
        <div className="relative mb-4">
          <Scale size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input type="number" step="0.1" value={weight} onChange={e => setWeight(e.target.value)} placeholder="0.0"
            className="w-full pl-9 pr-3 py-3 bg-dark border border-white/10 rounded-xl text-white text-center text-2xl font-mono focus:border-primary focus:outline-none" />
        </div>

        <ModalButton loading={saveMut.isPending} onClick={() => saveMut.mutate()}>
          Save {STAGES.find(s => s.key === weighStage)?.label}
        </ModalButton>
      </Modal>
    </div>
  );
}
