import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonCard } from '../../components/Skeleton';
import SOPHeader from '../../components/SOPHeader';
import { Building2, Plus, ChevronRight, Leaf } from 'lucide-react';
import api from '../../services/api';

const STRAIN_COLORS: Record<string, string> = {
  'Durban Poison': 'bg-green-500', 'Swazi Gold': 'bg-yellow-500', 'Malawi Gold': 'bg-purple-500',
  'Power Plant': 'bg-red-500', 'Rooibaard': 'bg-orange-500', 'Northern Lights': 'bg-blue-500',
};

const STATUS_STYLE: Record<string, string> = {
  EMPTY: 'border-dashed border-white/10', PARTIAL: 'border-white/20', FULL: 'border-white/30',
  RESERVED: 'border-amber-500/30', HARVESTING: 'border-red-500/30 animate-pulse',
};

export default function BayGridPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [ghForm, setGhForm] = useState({ name: '', type: 'VEG', totalBays: 6, rows: 4, spotsPerRow: 130 });
  const [selectedBay, setSelectedBay] = useState<any>(null);
  const [showAllocate, setShowAllocate] = useState<any>(null);
  const [allocForm, setAllocForm] = useState({ strain: '', plantCount: '8' });

  const { data: greenhouses, isLoading } = useQuery({
    queryKey: ['greenhouses'],
    queryFn: () => api.get('/baygrid/greenhouses').then(r => r.data.greenhouses),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/baygrid/greenhouses', ghForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['greenhouses'] }); setShowCreate(false); addToast('success', 'Greenhouse created with bays'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const allocateMut = useMutation({
    mutationFn: () => {
      const plantIds = Array.from({ length: parseInt(allocForm.plantCount) }, (_, i) => `temp-${i}`);
      return api.post(`/baygrid/bays/${showAllocate?.id}/allocate`, { plantIds, strain: allocForm.strain });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['greenhouses'] }); setShowAllocate(null); addToast('success', 'Bay allocated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const clearMut = useMutation({
    mutationFn: (bayId: string) => api.post(`/baygrid/bays/${bayId}/clear`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['greenhouses'] }); qc.invalidateQueries({ queryKey: ['bay'] }); setSelectedBay(null); addToast('success', 'Bay cleared'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const { data: bayDetail } = useQuery({
    queryKey: ['bay', selectedBay?.id],
    queryFn: () => api.get(`/baygrid/bays/${selectedBay.id}`).then(r => r.data.bay),
    enabled: !!selectedBay,
  });

  return (
    <div className="space-y-6">
      <SOPHeader
        sopNumber="3-CUL-8"
        title="Greenhouse · Current Plants"
        effectiveDate="10/10/2025"
        version="1.0"
        responsibility="Plant Technicians"
        reportsTo="Head Grower"
        authorisedBy="Authorised Representative"
        checkedBy="Responsible Pharmacist"
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">BayGrid</h1>
          <p className="text-sm text-white/40">Facility → Greenhouse → Bay → Batch → Clone</p>
        </div>
        {hasMinLevel(3) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> Add Greenhouse
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2].map(i => <SkeletonCard key={i} />)}</div>
      ) : !greenhouses?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center">
          <Building2 size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 mb-4">No greenhouses yet</p>
          {hasMinLevel(3) && (
            <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-primary text-white rounded-xl font-semibold">
              Create Your First Greenhouse
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {greenhouses.map((gh: any) => (
            <div key={gh.id} className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Building2 size={20} className="text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">{gh.name}</h2>
                    <p className="text-xs text-white/40">{gh.type} — {gh.bays?.filter((b: any) => b.status !== 'EMPTY').length}/{gh.bays?.length} bays active</p>
                  </div>
                </div>
              </div>

              {/* Bay Grid — each bay renders its rows as stripes going downward */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {gh.bays?.map((bay: any) => {
                  const strainColor = bay.currentStrain ? (STRAIN_COLORS[bay.currentStrain] || 'bg-white/20') : '';
                  const isEmpty = bay.status === 'EMPTY';
                  const plantCount = bay._count?.allocations || 0;
                  const rows = bay.lines || 4;
                  const potsPerRow = bay.capacity ? Math.round(bay.capacity / rows) : 0;
                  // Approximate per-row occupancy: split total plants across rows
                  const perRowFill = rows > 0 ? Math.min(potsPerRow, Math.ceil(plantCount / rows)) : 0;

                  return (
                    <button key={bay.id} onClick={() => setSelectedBay(bay)}
                      className={`relative rounded-xl border p-4 text-left transition-all active:scale-[0.97] min-h-[220px] flex flex-col ${STATUS_STYLE[bay.status] || 'border-white/10'} ${isEmpty ? 'bg-white/[0.02]' : 'bg-white/5 hover:bg-white/[0.07]'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className={`text-sm font-bold ${isEmpty ? 'text-white/40' : 'text-white'}`}>{bay.name}</div>
                          <div className="text-[10px] text-white/30 mt-0.5 font-mono">{rows} rows × {potsPerRow} pots</div>
                        </div>
                        {!isEmpty && <div className={`w-3 h-3 rounded-full mt-1 ${strainColor}`} />}
                      </div>

                      {/* Row stripes — drawn top to bottom */}
                      <div className="flex-1 flex flex-col gap-1.5 justify-center">
                        {Array.from({ length: rows }).map((_, idx) => {
                          const rowNum = idx + 1;
                          // In demo mode, distribute plants: earlier rows fill first
                          const filledInThisRow = isEmpty ? 0 : Math.max(0, Math.min(potsPerRow, plantCount - idx * potsPerRow));
                          const pct = potsPerRow > 0 ? (filledInThisRow / potsPerRow) * 100 : 0;
                          return (
                            <div key={rowNum} className="flex items-center gap-2">
                              <span className="text-[9px] text-white/25 w-5 font-mono">R{rowNum}</span>
                              <div className="flex-1 h-5 rounded bg-white/[0.03] border border-white/5 overflow-hidden relative">
                                {filledInThisRow > 0 && (
                                  <div className={`h-full ${strainColor || 'bg-white/20'} opacity-70 transition-all`}
                                       style={{ width: `${pct}%` }} />
                                )}
                                <span className="absolute inset-0 flex items-center justify-end pr-2 text-[9px] font-mono text-white/50">
                                  {filledInThisRow}/{potsPerRow}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 mt-2 border-t border-white/5 text-[11px]">
                        {isEmpty ? (
                          <span className="text-white/25">Empty · {bay.capacity} pot capacity</span>
                        ) : (
                          <>
                            <span className="text-white/60 truncate">{bay.currentStrain || '—'}</span>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {bay.currentPhase && <span className="text-primary font-medium">{bay.currentPhase}</span>}
                              <span className="text-white/50 font-mono">{plantCount}/{bay.capacity}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Strain legend */}
              {gh.bays?.some((b: any) => b.currentStrain) && (
                <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-white/5">
                  {[...new Set(gh.bays.filter((b: any) => b.currentStrain).map((b: any) => b.currentStrain))].map((strain: any) => (
                    <div key={strain} className="flex items-center gap-1.5 text-xs text-white/50">
                      <div className={`w-2.5 h-2.5 rounded-full ${STRAIN_COLORS[strain] || 'bg-white/20'}`} />
                      {strain}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Bay Detail Modal */}
      <Modal open={!!selectedBay} onClose={() => setSelectedBay(null)} title={`${selectedBay?.name} — ${selectedBay?.greenhouse?.name || ''}`}>
        {bayDetail ? (() => {
          const rows = bayDetail.lines || 4;
          const capacity = bayDetail.capacity || 0;
          const potsPerRow = rows > 0 ? Math.round(capacity / rows) : 0;
          const plantCount = bayDetail.allocations?.length || 0;
          const strainColor = bayDetail.currentStrain ? (STRAIN_COLORS[bayDetail.currentStrain] || 'bg-white/20') : '';
          return (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40">Strain</div>
                <div className="text-sm text-white font-medium">{bayDetail.currentStrain || 'Empty'}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40">Status</div>
                <div className="text-sm text-white font-medium">{bayDetail.status}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40">Plants</div>
                <div className="text-sm text-white font-medium">{plantCount} / {capacity}</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xs text-white/40">Phase</div>
                <div className="text-sm text-white font-medium">{bayDetail.currentPhase || '—'}</div>
              </div>
            </div>

            {/* Layout summary */}
            <div className="bg-primary/5 border border-primary/15 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-xs text-white/40">Layout</div>
                <div className="text-sm text-white font-medium">{rows} rows × {potsPerRow} pots = <span className="font-mono text-primary">{capacity}</span> capacity</div>
              </div>
              {bayDetail.currentBatchId && (
                <div className="text-right">
                  <div className="text-xs text-white/40">Batch</div>
                  <div className="text-sm text-primary font-mono font-bold">{bayDetail.currentBatchId.substring(0, 12)}</div>
                </div>
              )}
            </div>

            {/* Row stripes — drawn top to bottom, one stripe per row with occupancy bar */}
            <div>
              <h3 className="text-sm font-semibold text-white/60 mb-2">Rows — populate batch → row</h3>
              <div className="space-y-2">
                {Array.from({ length: rows }).map((_, idx) => {
                  const rowNum = idx + 1;
                  const filledInThisRow = Math.max(0, Math.min(potsPerRow, plantCount - idx * potsPerRow));
                  const pct = potsPerRow > 0 ? (filledInThisRow / potsPerRow) * 100 : 0;
                  const rowEmpty = filledInThisRow === 0;
                  return (
                    <div key={rowNum} className="flex items-center gap-2">
                      <span className="text-[11px] text-white/40 w-10 text-right font-mono flex-shrink-0">R{rowNum}</span>
                      <div className="flex-1 h-9 rounded-lg bg-white/[0.03] border border-white/10 overflow-hidden relative">
                        {!rowEmpty && (
                          <div className={`h-full ${strainColor || 'bg-white/20'} opacity-60 transition-all`}
                               style={{ width: `${pct}%` }} />
                        )}
                        <span className="absolute inset-0 flex items-center justify-between px-3 text-xs font-mono">
                          <span className="text-white/40">{bayDetail.currentStrain || 'empty'}</span>
                          <span className={rowEmpty ? 'text-white/30' : 'text-white'}>{filledInThisRow}/{potsPerRow}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-white/30 mt-2 text-center">{plantCount} / {capacity} pots populated</p>
            </div>

            {/* Bay actions */}
            {hasMinLevel(2) && (
              <div className="flex gap-2 pt-2">
                {bayDetail.status === 'EMPTY' && (
                  <button onClick={() => { setSelectedBay(null); setShowAllocate(bayDetail); setAllocForm({ strain: '', plantCount: String(bayDetail.capacity) }); }}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold transition min-h-[44px]">
                    Allocate Plants
                  </button>
                )}
                {bayDetail.status !== 'EMPTY' && hasMinLevel(3) && (
                  <button onClick={() => clearMut.mutate(bayDetail.id)} disabled={clearMut.isPending}
                    className="flex-1 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition min-h-[44px]">
                    Clear Bay (Harvested)
                  </button>
                )}
              </div>
            )}
          </div>
          );
        })() : (
          <div className="text-center py-6 text-white/30">Loading bay details...</div>
        )}
      </Modal>

      {/* Allocate Bay Modal */}
      <Modal open={!!showAllocate} onClose={() => setShowAllocate(null)} title={`Allocate ${showAllocate?.name || ''}`}>
        <ModalInput label="Strain" placeholder="e.g. Durban Poison" value={allocForm.strain} onChange={e => setAllocForm(f => ({ ...f, strain: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Number of Plants" type="number" value={allocForm.plantCount} onChange={e => setAllocForm(f => ({ ...f, plantCount: (e.target as HTMLInputElement).value }))} />
        <p className="text-xs text-white/30">Bay capacity: {showAllocate?.capacity || 8} plants</p>
        <ModalButton loading={allocateMut.isPending} onClick={() => allocateMut.mutate()} disabled={!allocForm.strain || !allocForm.plantCount}>
          Allocate {allocForm.plantCount} Plants
        </ModalButton>
      </Modal>

      {/* Create Greenhouse Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Greenhouse">
        <ModalInput label="Name" placeholder="e.g. GH1" value={ghForm.name} onChange={e => setGhForm(f => ({ ...f, name: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Type" value={ghForm.type} onChange={e => setGhForm(f => ({ ...f, type: (e.target as HTMLSelectElement).value }))}>
          <option value="VEG">Vegetative</option>
          <option value="FLOWER">Flower</option>
          <option value="MOTHER">Mother</option>
          <option value="MIXED">Mixed</option>
        </ModalSelect>
        <ModalInput label="Number of Bays" type="number" min="1" max="20" value={String(ghForm.totalBays || '')} onChange={e => setGhForm(f => ({ ...f, totalBays: parseInt((e.target as HTMLInputElement).value) || 0 }))} />
        <ModalInput label="Rows per Bay" type="number" min="1" max="20" value={String(ghForm.rows || '')} onChange={e => setGhForm(f => ({ ...f, rows: parseInt((e.target as HTMLInputElement).value) || 0 }))} />
        <ModalInput label="Pots per Row" type="number" min="1" max="500" value={String(ghForm.spotsPerRow || '')} onChange={e => setGhForm(f => ({ ...f, spotsPerRow: parseInt((e.target as HTMLInputElement).value) || 0 }))} />
        <p className="text-xs text-white/40">
          Capacity per bay: <span className="text-primary font-mono font-semibold">{(ghForm.rows || 0) * (ghForm.spotsPerRow || 0)}</span> pots ·
          total: <span className="text-primary font-mono font-semibold">{(ghForm.rows || 0) * (ghForm.spotsPerRow || 0) * (ghForm.totalBays || 0)}</span> pots across {ghForm.totalBays || 0} bays.
        </p>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!ghForm.name || !ghForm.totalBays || ghForm.totalBays < 1 || !ghForm.rows || !ghForm.spotsPerRow}>
          Create Greenhouse — {ghForm.totalBays} bays × {ghForm.rows}r × {ghForm.spotsPerRow}p
        </ModalButton>
      </Modal>
    </div>
  );
}
