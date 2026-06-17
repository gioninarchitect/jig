import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonCard } from '../../components/Skeleton';
import SOPHeader from '../../components/SOPHeader';
import { Scissors, Plus, Crown, GitBranch } from 'lucide-react';
import api from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  ROOTING: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  ROOTED: 'bg-green-500/15 text-green-300 border-green-500/30',
  TRANSPLANTED: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-500/30',
};
const PURPOSE_LABEL: Record<string, string> = { PRODUCTION: 'Production', R_AND_D: 'New Mothers', CLIENT: 'Client' };

const today = () => new Date().toISOString().split('T')[0];

export default function CloningSchedulePage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ strain: '', motherPlantId: '', motherUnit: '', motherLabel: '', batchNumber: '', totalCuttings: '50', cloneDate: today(), rootingDays: '14', purpose: 'PRODUCTION', clientName: '' });

  const { data: trays, isLoading } = useQuery({ queryKey: ['clone-trays'], queryFn: () => api.get('/baygrid/clone-trays').then(r => r.data.trays) });
  const { data: mothers } = useQuery({ queryKey: ['mothers'], queryFn: () => api.get('/baygrid/mothers').then(r => r.data.mothers) });

  const selectedMother = mothers?.find((m: any) => m.id === form.motherPlantId);

  const createMut = useMutation({
    mutationFn: () => api.post('/baygrid/clone-trays', {
      motherPlantId: form.motherPlantId,
      strain: form.strain,
      motherUnit: form.motherUnit ? parseInt(form.motherUnit) : undefined,
      motherLabel: form.motherLabel || undefined,
      batchNumber: form.batchNumber.trim() || undefined,
      totalCuttings: parseInt(form.totalCuttings),
      cloneDate: form.cloneDate,
      rootingDays: parseInt(form.rootingDays),
      purpose: form.purpose,
      clientName: form.purpose === 'CLIENT' ? form.clientName : undefined,
    }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['clone-trays'] }); qc.invalidateQueries({ queryKey: ['mothers'] });
      setShowCreate(false);
      addToast('success', `Cloning job ${res.data.tray?.trayNumber || ''} started — ${form.totalCuttings} cuttings`);
      setForm({ strain: '', motherPlantId: '', motherUnit: '', motherLabel: '', batchNumber: '', totalCuttings: '50', cloneDate: today(), rootingDays: '14', purpose: 'PRODUCTION', clientName: '' });
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const activeMothers = (mothers || []).filter((m: any) => m.status === 'ACTIVE');
  const strains: string[] = [...new Set(activeMothers.map((m: any) => m.strain))].sort() as string[];
  // drill to pot level: each mother entry's quantity → individual pots, labelled SL1-01 (strain+room#+pot#)
  const strainPots = (() => {
    if (!form.strain) return [] as any[];
    const entries = activeMothers.filter((m: any) => m.strain === form.strain).sort((a: any, b: any) => (a.identifier || '').localeCompare(b.identifier || ''));
    const roomCount: Record<string, number> = {};
    const pots: any[] = [];
    entries.forEach((m: any) => {
      const roomDigit = (m.room || '').replace(/\D/g, '') || '0';
      for (let u = 1; u <= (m.quantity || 1); u++) {
        const key = m.room || '?';
        roomCount[key] = (roomCount[key] || 0) + 1;
        pots.push({ motherPlantId: m.id, entry: m.identifier, room: m.room, unit: u, inception: m.inceptionDate, label: `${form.strain}${roomDigit}-${String(roomCount[key]).padStart(2, '0')}` });
      }
    });
    const used = new Set((trays || []).map((t: any) => t.motherLabel).filter(Boolean));
    pots.forEach((p: any) => { p.used = used.has(p.label); });
    return pots;
  })();

  return (
    <div className="space-y-5">
      <SOPHeader sopNumber="3-CUL-7" title="Cloning & Transplanting Schedule" effectiveDate="16/06/2026" version="1.0"
        responsibility="Nursery Manager / Cultivators" reportsTo="Head of Cultivation" authorisedBy="Facility Manager" checkedBy="QA" referenceDoc="New Cloning form · Mother cloning" />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Cloning Schedule</h1>
          <p className="text-sm text-white/40">Start a cloning job from a mother → auto batch # + W1–W3 tracking</p>
        </div>
        {hasMinLevel(1) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 min-h-[44px]">
            <Plus size={16} /> New Cloning Job
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !trays?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-10 text-center">
          <Scissors size={36} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40 mb-1">No cloning jobs yet</p>
          <p className="text-xs text-white/25">Start one from a mother plant to create a clone tray + batch #</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {trays.map((t: any) => {
            const day = Math.max(0, Math.floor((Date.now() - new Date(t.cloneDate).getTime()) / 86400000));
            const rootPct = t.totalCuttings ? Math.round((t.rooted / t.totalCuttings) * 100) : 0;
            return (
              <div key={t.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold font-mono text-white">{t.trayNumber}</span>
                  <span className={`text-xs px-2 py-1 rounded-full border font-medium ${STATUS_COLORS[t.status] || 'bg-white/10 text-white/50'}`}>{t.status}</span>
                </div>
                <div className="text-sm text-white/80 mb-1">{t.strain}</div>
                <div className="text-xs text-white/40 mb-2 flex items-center gap-1"><Crown size={11} className="text-amber-400" /> {t.motherPlant?.identifier || '—'} · <span className={t.purpose === 'R_AND_D' ? 'text-purple-300' : t.purpose === 'CLIENT' ? 'text-blue-300' : ''}>{PURPOSE_LABEL[t.purpose] || t.purpose}</span></div>
                <div className="flex justify-between text-xs text-white/50 mb-2">
                  <span>{t.totalCuttings} cuttings</span><span>{t.rooted} rooted</span><span className={t.mortality > 0 ? 'text-red-300' : ''}>{t.mortality} lost</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2"><div className="h-full bg-green-500" style={{ width: `${rootPct}%` }} /></div>
                <div className="flex justify-between text-[11px] text-white/35">
                  <span>Day {day} / {t.rootingDays}</span>
                  <span>{new Date(t.cloneDate).toLocaleDateString('en-ZA')}{t.transplantDate ? ` → ${new Date(t.transplantDate).toLocaleDateString('en-ZA')}` : ''}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Cloning Job */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Cloning Job (SOP 3-CUL-7)">
        <ModalSelect label="Strain" value={form.strain} onChange={e => setForm(f => ({ ...f, strain: (e.target as HTMLSelectElement).value, motherPlantId: '', motherUnit: '', motherLabel: '' }))}>
          <option value="">— select strain —</option>
          {strains.map((s: string) => <option key={s} value={s}>{s}</option>)}
        </ModalSelect>
        {form.strain && (
          <ModalSelect label="Mother plant — pot" value={form.motherLabel} onChange={e => {
            const lbl = (e.target as HTMLSelectElement).value;
            const pot = strainPots.find((p: any) => p.label === lbl);
            setForm(f => ({ ...f, motherLabel: lbl, motherPlantId: pot?.motherPlantId || '', motherUnit: pot ? String(pot.unit) : '' }));
          }}>
            <option value="">— select mother pot ({strainPots.length} available) —</option>
            {strainPots.map((p: any) => <option key={p.label} value={p.label}>{p.label} · {p.entry}{p.inception ? ` · est ${new Date(p.inception).toLocaleDateString()}` : ''}{p.used ? ' · ✓ used' : ''}</option>)}
          </ModalSelect>
        )}
        <ModalInput label="Batch / Tray # (leave blank = auto CT-YYYY-NNN)" placeholder={`auto · CT-${new Date().getFullYear()}-NNN`} value={form.batchNumber} onChange={e => setForm(f => ({ ...f, batchNumber: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Number of clones" type="number" value={form.totalCuttings} onChange={e => setForm(f => ({ ...f, totalCuttings: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Clone date" type="date" value={form.cloneDate} onChange={e => setForm(f => ({ ...f, cloneDate: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Rooting days" type="number" value={form.rootingDays} onChange={e => setForm(f => ({ ...f, rootingDays: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Purpose" value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: (e.target as HTMLSelectElement).value }))}>
          <option value="PRODUCTION">Production (grow / sell product)</option>
          <option value="R_AND_D">New Mothers (raise into mother stock)</option>
          <option value="CLIENT">Client (sell clones)</option>
        </ModalSelect>
        {form.purpose === 'CLIENT' && (
          <ModalInput label="Client name" placeholder="who ordered" value={form.clientName} onChange={e => setForm(f => ({ ...f, clientName: (e.target as HTMLInputElement).value }))} />
        )}
        <div className="text-[11px] text-white/35 mb-2">Creates the clone tray + batch # and tracks W1–W3 mortality → transplant.</div>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.motherPlantId || !form.totalCuttings}>Start cloning job</ModalButton>
      </Modal>
    </div>
  );
}
