import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useRBAC } from '../../hooks/useRBAC';
import { useReadOnly } from '../../hooks/useReadOnly';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonCard } from '../../components/Skeleton';
import Modal, { ModalInput, ModalButton } from '../../components/Modal';
import { Layers, FileCheck, Download, Plus, Check, Trash2 } from 'lucide-react';
import api from '../../services/api';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-primary/20 text-primary', IN_TESTING: 'bg-amber-500/20 text-amber-400',
  QUARANTINED: 'bg-red-500/20 text-red-400', RELEASED: 'bg-green-500/20 text-green-400',
  DESTROYED: 'bg-red-500/30 text-red-500', EXPIRED: 'bg-white/10 text-white/30',
};

export default function BatchesPage() {
  const navigate = useNavigate();
  const { hasMinLevel } = useRBAC();
  const readOnly = useReadOnly();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState<string[]>([]);
  const [showDestroy, setShowDestroy] = useState<any>(null);
  const [destroyReason, setDestroyReason] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['batches'], queryFn: () => api.get('/batches').then(r => r.data.batches) });

  // Get harvested plants for batch creation
  const { data: plantsData } = useQuery({
    queryKey: ['plants-harvested'],
    queryFn: () => api.get('/plants?phase=HARVESTED&limit=100').then(r => r.data),
    enabled: showCreate,
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/batches', { plantIds: selectedPlants }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setShowCreate(false); setSelectedPlants([]); addToast('success', 'Batch created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const destroyMut = useMutation({
    mutationFn: () => api.post(`/batches/${showDestroy?.id}/request-destruction`, { reason: destroyReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches'] }); setShowDestroy(null); setDestroyReason(''); addToast('success', 'Destruction request created — ticket sent to FM + Head of Cultivation'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const togglePlant = (id: string) => {
    setSelectedPlants(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Batches</h1>
        {!readOnly && hasMinLevel(3) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition">
            <Plus size={16} /> Create Batch
          </button>
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create Batch from Harvested Plants">
        <p className="text-white/50 text-sm mb-3">Select plants (same strain) to combine into a batch:</p>
        {!plantsData?.plants?.length ? (
          <p className="text-white/30 text-sm py-4 text-center">No harvested plants available</p>
        ) : (
          <div className="space-y-1.5 max-h-60 overflow-y-auto mb-3">
            {plantsData.plants.map((p: any) => (
              <button key={p.id} onClick={() => togglePlant(p.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-left transition ${selectedPlants.includes(p.id) ? 'bg-primary/15 border border-primary/30' : 'bg-white/5 border border-white/10 hover:border-white/20'}`}>
                <div className={`w-5 h-5 rounded flex items-center justify-center ${selectedPlants.includes(p.id) ? 'bg-primary' : 'border border-white/20'}`}>
                  {selectedPlants.includes(p.id) && <Check size={12} className="text-white" />}
                </div>
                <span className="font-mono text-primary">{p.identifier}</span>
                <span className="text-white/50">{p.strain}</span>
              </button>
            ))}
          </div>
        )}
        <p className="text-xs text-white/30">{selectedPlants.length} plants selected</p>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={selectedPlants.length === 0}>
          Create Batch
        </ModalButton>
      </Modal>
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !data?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No batches created</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((b: any) => (
            <div key={b.id} onClick={() => navigate(`/batches/${b.id}`)}
              className="bg-white/5 border border-white/10 rounded-xl p-5 cursor-pointer hover:bg-white/[0.07] transition">
              <div className="flex justify-between items-start mb-3">
                <span className="font-mono text-primary font-bold">{b.batchNumber}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[b.status] || 'bg-white/10 text-white/50'}`}>{b.status}</span>
              </div>
              <div className="text-sm text-white/70 mb-1">{b.strain}</div>
              <div className="text-xs text-white/40 mb-3">{b._count?.batchPlants || 0} plants &middot; {b.totalWeight.toFixed(0)}g</div>
              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full ${b.coas?.length > 0 ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}>
                  {b.coas?.length > 0 ? 'COA Issued' : 'No COA'}
                </span>
                <span className="text-xs text-white/30">{b._count?.labResults || 0}/8 tests</span>
              </div>
              {!readOnly && hasMinLevel(3) && b.status !== 'DESTROYED' && (
                <button onClick={(e) => { e.stopPropagation(); setShowDestroy(b); setDestroyReason(''); }}
                  className="mt-3 w-full py-2 bg-red-500/5 border border-red-500/20 text-red-400 rounded-lg text-xs font-semibold hover:bg-red-500/10 transition flex items-center justify-center gap-1.5 min-h-[36px]">
                  <Trash2 size={12} /> Request Destruction
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {/* Destruction Request Modal */}
      <Modal open={!!showDestroy} onClose={() => setShowDestroy(null)} title={`Request Destruction — ${showDestroy?.batchNumber || ''}`}>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-300">This will quarantine the batch and create a CRITICAL ticket for FM authorization. SAPS witness required for destruction.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
          <div className="bg-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Batch</div><div className="text-white font-mono">{showDestroy?.batchNumber}</div></div>
          <div className="bg-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Strain</div><div className="text-white">{showDestroy?.strain}</div></div>
          <div className="bg-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Weight</div><div className="text-white font-mono">{showDestroy?.totalWeight?.toFixed(0)}g</div></div>
          <div className="bg-white/5 rounded-lg p-3"><div className="text-xs text-white/30">Status</div><div className="text-white">{showDestroy?.status}</div></div>
        </div>
        <ModalInput label="Reason for destruction" placeholder="e.g. Failed lab test — mould contamination" value={destroyReason} onChange={e => setDestroyReason((e.target as HTMLInputElement).value)} />
        <ModalButton loading={destroyMut.isPending} onClick={() => destroyMut.mutate()} disabled={!destroyReason}>
          Submit Destruction Request
        </ModalButton>
      </Modal>
    </div>
  );
}
