import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonCard } from '../../components/Skeleton';
import { Dna, Plus, Pencil, Trash2, History, Scissors, Sprout, AlertTriangle, Weight } from 'lucide-react';
import api from '../../services/api';

const EVENT_META: Record<string, { icon: any; color: string; label: string }> = {
  CLONE: { icon: Scissors, color: 'text-emerald-300', label: 'Cloned' },
  TRANSPLANT: { icon: Sprout, color: 'text-green-300', label: 'Transplant' },
  STRESS: { icon: AlertTriangle, color: 'text-red-300', label: 'Stress' },
  YIELD: { icon: Weight, color: 'text-amber-300', label: 'Yield' },
};

export default function StrainsPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', species: 'HYBRID', chemoType: 'THC_DOMINANT', source: '', expectedYield: '', expectedThc: '', expectedCbd: '', floweringWeeks: '8' });

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['strain-analytics'],
    queryFn: () => api.get('/strains/analytics').then(r => r.data.analytics),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/strains', {
      ...form,
      expectedYield: form.expectedYield ? parseFloat(form.expectedYield) : undefined,
      expectedThc: form.expectedThc ? parseFloat(form.expectedThc) : undefined,
      expectedCbd: form.expectedCbd ? parseFloat(form.expectedCbd) : undefined,
      floweringWeeks: parseInt(form.floweringWeeks),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['strain-analytics'] }); setShowCreate(false); addToast('success', 'Strain registered'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  // ── Edit / Delete / History (Lou & Loraine) ──
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [confirmDel, setConfirmDel] = useState<any>(null);
  const [historyStrain, setHistoryStrain] = useState<any>(null);

  const openEdit = (s: any) => { setEditId(s.id); setEditForm({ name: s.name, species: s.species, chemoType: s.chemoType, source: s.source || '', expectedYield: s.expectedYield ?? '', expectedThc: s.avgThc ?? s.expectedThc ?? '', floweringWeeks: s.floweringWeeks ?? '' }); };
  const editMut = useMutation({
    mutationFn: () => api.patch(`/strains/${editId}`, {
      name: editForm.name, species: editForm.species, chemoType: editForm.chemoType, source: editForm.source || undefined,
      expectedYield: editForm.expectedYield !== '' ? parseFloat(editForm.expectedYield) : undefined,
      expectedThc: editForm.expectedThc !== '' ? parseFloat(editForm.expectedThc) : undefined,
      floweringWeeks: editForm.floweringWeeks !== '' ? parseInt(editForm.floweringWeeks) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['strain-analytics'] }); setEditId(null); addToast('success', 'Strain updated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const delMut = useMutation({
    mutationFn: (id: string) => api.delete(`/strains/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['strain-analytics'] }); setConfirmDel(null); addToast('success', 'Strain removed'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const { data: history } = useQuery({
    queryKey: ['strain-history', historyStrain?.id],
    queryFn: () => api.get(`/strains/${historyStrain.id}/history`).then(r => r.data.history),
    enabled: !!historyStrain,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Strain Database</h1>
          <p className="text-sm text-white/40">Performance analytics per strain</p>
        </div>
        {hasMinLevel(2) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> Add Strain
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !analytics?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center">
          <Dna size={40} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/40">No strains registered yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {analytics.map((s: any) => (
            <div key={s.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.07] transition">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-lg font-bold text-white">{s.name}</div>
                  <div className="text-xs text-white/30">{s.species} · {s.chemoType?.replace('_', ' ')}</div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => setHistoryStrain(s)} title="History" className="p-1.5 rounded-lg text-white/40 hover:text-primary hover:bg-white/5 transition"><History size={15} /></button>
                  {hasMinLevel(3) && <button onClick={() => openEdit(s)} title="Edit" className="p-1.5 rounded-lg text-white/40 hover:text-primary hover:bg-white/5 transition"><Pencil size={15} /></button>}
                  {hasMinLevel(3) && <button onClick={() => setConfirmDel(s)} title="Delete" className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-white/5 transition"><Trash2 size={15} /></button>}
                </div>
              </div>

              {/* Key stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center">
                  <div className="text-xl font-bold font-mono text-white">{s.totalPlants}</div>
                  <div className="text-[10px] text-white/25">Plants</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold font-mono text-white">{s.totalBatches}</div>
                  <div className="text-[10px] text-white/25">Batches</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold font-mono text-primary">{s.motherCount}</div>
                  <div className="text-[10px] text-white/25">Mothers</div>
                </div>
              </div>

              {/* Performance metrics */}
              <div className="space-y-2 pt-3 border-t border-white/5">
                {/* Rooting rate */}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/40">Clone Rooting</span>
                  <span className={`font-mono font-bold ${s.rootingRate >= 80 ? 'text-green-400' : s.rootingRate >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{s.rootingRate}%</span>
                </div>
                {s.totalCuttings > 0 && (
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${s.rootingRate >= 80 ? 'bg-green-500' : s.rootingRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${s.rootingRate}%` }} />
                  </div>
                )}

                {/* Lab pass rate */}
                {s.labTestCount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Lab Pass Rate</span>
                    <span className="font-mono font-bold text-white">{s.passRate}% <span className="text-white/20">({s.labTestCount} tests)</span></span>
                  </div>
                )}

                {/* THC */}
                {s.avgThc > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Avg THC</span>
                    <span className="font-mono font-bold text-purple-400">{s.avgThc}%</span>
                  </div>
                )}

                {/* Expected yield */}
                {s.expectedYield && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Expected Yield</span>
                    <span className="font-mono text-white/50">{s.expectedYield}g/plant</span>
                  </div>
                )}

                {s.floweringWeeks && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-white/40">Flower Time</span>
                    <span className="font-mono text-white/50">{s.floweringWeeks} weeks</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Register Strain">
        <ModalInput label="Name" placeholder="e.g. Durban Poison" value={form.name} onChange={e => setForm(f => ({ ...f, name: (e.target as HTMLInputElement).value }))} />
        <div className="grid grid-cols-2 gap-3">
          <ModalSelect label="Species" value={form.species} onChange={e => setForm(f => ({ ...f, species: (e.target as HTMLSelectElement).value }))}>
            <option value="SATIVA">Sativa</option><option value="INDICA">Indica</option><option value="HYBRID">Hybrid</option>
          </ModalSelect>
          <ModalSelect label="Chemo Type" value={form.chemoType} onChange={e => setForm(f => ({ ...f, chemoType: (e.target as HTMLSelectElement).value }))}>
            <option value="THC_DOMINANT">THC Dominant</option><option value="CBD_DOMINANT">CBD Dominant</option><option value="BALANCED">Balanced</option>
          </ModalSelect>
        </div>
        <ModalInput label="Source (seed bank)" placeholder="e.g. Dutch Passion" value={form.source} onChange={e => setForm(f => ({ ...f, source: (e.target as HTMLInputElement).value }))} />
        <div className="grid grid-cols-3 gap-3">
          <ModalInput label="Exp. Yield (g)" type="number" value={form.expectedYield} onChange={e => setForm(f => ({ ...f, expectedYield: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Exp. THC (%)" type="number" value={form.expectedThc} onChange={e => setForm(f => ({ ...f, expectedThc: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Flower Weeks" type="number" value={form.floweringWeeks} onChange={e => setForm(f => ({ ...f, floweringWeeks: (e.target as HTMLInputElement).value }))} />
        </div>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.name}>Register Strain</ModalButton>
      </Modal>

      {/* Edit Strain */}
      <Modal open={!!editId} onClose={() => setEditId(null)} title="Edit Strain">
        <ModalInput label="Name" value={editForm.name || ''} onChange={e => setEditForm((f: any) => ({ ...f, name: (e.target as HTMLInputElement).value }))} />
        <div className="grid grid-cols-2 gap-3">
          <ModalSelect label="Species" value={editForm.species || 'HYBRID'} onChange={e => setEditForm((f: any) => ({ ...f, species: (e.target as HTMLSelectElement).value }))}>
            <option value="SATIVA">Sativa</option><option value="INDICA">Indica</option><option value="HYBRID">Hybrid</option>
          </ModalSelect>
          <ModalSelect label="Chemo Type" value={editForm.chemoType || 'THC_DOMINANT'} onChange={e => setEditForm((f: any) => ({ ...f, chemoType: (e.target as HTMLSelectElement).value }))}>
            <option value="THC_DOMINANT">THC Dominant</option><option value="CBD_DOMINANT">CBD Dominant</option><option value="BALANCED">Balanced</option>
          </ModalSelect>
        </div>
        <ModalInput label="Source (seed bank)" value={editForm.source || ''} onChange={e => setEditForm((f: any) => ({ ...f, source: (e.target as HTMLInputElement).value }))} />
        <div className="grid grid-cols-3 gap-3">
          <ModalInput label="Exp. Yield (g)" type="number" value={editForm.expectedYield ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, expectedYield: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Exp. THC (%)" type="number" value={editForm.expectedThc ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, expectedThc: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Flower Weeks" type="number" value={editForm.floweringWeeks ?? ''} onChange={e => setEditForm((f: any) => ({ ...f, floweringWeeks: (e.target as HTMLInputElement).value }))} />
        </div>
        <ModalButton loading={editMut.isPending} onClick={() => editMut.mutate()} disabled={!editForm.name}>Save changes</ModalButton>
      </Modal>

      {/* Strain History */}
      <Modal open={!!historyStrain} onClose={() => setHistoryStrain(null)} title={historyStrain ? `${historyStrain.name} — history` : ''}>
        {!history ? <p className="text-sm text-white/40 py-4 text-center">Loading…</p>
          : history.length === 0 ? <p className="text-sm text-white/40 py-6 text-center">No lifecycle events yet — cloning, transplant, stress & yields will appear here.</p>
          : (
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {history.map((ev: any, i: number) => {
                const m = EVENT_META[ev.type] || EVENT_META.CLONE; const Icon = m.icon;
                return (
                  <div key={i} className="flex items-start gap-3 bg-white/[0.03] border border-white/[0.06] rounded-lg p-2.5">
                    <Icon size={15} className={`${m.color} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-white/85">{ev.label}</div>
                      <div className="text-[11px] text-white/35">{ev.detail}</div>
                    </div>
                    <div className="text-[11px] text-white/30 font-mono whitespace-nowrap">{new Date(ev.date).toLocaleDateString('en-ZA')}</div>
                  </div>
                );
              })}
            </div>
          )}
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Remove strain?">
        {confirmDel && (
          <div className="space-y-4">
            <p className="text-sm text-white/70">Remove <b className="text-white">{confirmDel.name}</b> from the active strain list? Its history and any plants/batches stay intact — it's just deactivated.</p>
            <div className="flex gap-2">
              <button onClick={() => delMut.mutate(confirmDel.id)} disabled={delMut.isPending} className="flex-1 px-4 py-2.5 bg-red-500/15 border border-red-500/40 text-red-300 rounded-xl text-sm font-semibold hover:bg-red-500/25 min-h-[44px]">Remove</button>
              <button onClick={() => setConfirmDel(null)} className="px-4 py-2.5 bg-white/5 border border-white/15 text-white/60 rounded-xl text-sm font-semibold min-h-[44px]">Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
