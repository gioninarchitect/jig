import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonPage } from '../../components/Skeleton';
import Modal, { ModalInput, ModalButton } from '../../components/Modal';
import { Leaf, GitBranch, ArrowRight, Flag, QrCode } from 'lucide-react';
import api from '../../services/api';

const PHASE_ORDER = ['SEEDLING', 'VEGETATIVE', 'FLOWERING', 'HARVESTED', 'DRYING', 'CURING', 'PROCESSING', 'PACKAGED'];
const WEIGHT_PHASES = ['HARVESTED', 'DRYING', 'CURING', 'PACKAGED'];

export default function PlantDetailPage() {
  const { id } = useParams();
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showPhase, setShowPhase] = useState(false);
  const [showFlag, setShowFlag] = useState(false);
  const [weight, setWeight] = useState('');
  const [flagReason, setFlagReason] = useState('');
  const { data, isLoading } = useQuery({
    queryKey: ['plant', id],
    queryFn: () => api.get(`/plants/${id}`).then(r => r.data.plant),
    enabled: !!id,
  });

  const phaseMut = useMutation({
    mutationFn: () => api.patch(`/plants/${id}/phase`, { weight: weight ? parseFloat(weight) : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plant', id] }); setShowPhase(false); setWeight(''); addToast('success', 'Phase updated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const flagMut = useMutation({
    mutationFn: () => api.patch(`/plants/${id}/flag`, { reason: flagReason }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plant', id] }); setShowFlag(false); setFlagReason(''); addToast('success', 'Plant flagged'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <SkeletonPage />;
  if (!data) return <p className="text-white/40">Plant not found</p>;

  const weights = (data.weightsJson || {}) as Record<string, number>;
  const phaseIdx = PHASE_ORDER.indexOf(data.phase);
  const nextPhase = phaseIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[phaseIdx + 1] : null;
  const needsWeight = nextPhase ? WEIGHT_PHASES.includes(nextPhase) : false;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Leaf size={20} className="text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-primary">{data.identifier}</h1>
          <p className="text-sm text-white/50">{data.strain} &middot; {data.rfidTag}</p>
        </div>
        <span className={`text-xs px-3 py-1 rounded-full ${data.status === 'FLAGGED' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
          {data.status}
        </span>
        {hasMinLevel(2) && nextPhase && (
          <button onClick={() => setShowPhase(true)} className="ml-auto px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition">
            <ArrowRight size={14} /> Advance to {nextPhase}
          </button>
        )}
        {hasMinLevel(2) && data.status !== 'FLAGGED' && (
          <button onClick={() => setShowFlag(true)} className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm flex items-center gap-2 hover:bg-red-500/20 transition">
            <Flag size={14} /> Flag
          </button>
        )}
        <a href={`/api/qr/print/plant/${id}`} target="_blank" className="px-3 py-2 bg-white/5 border border-white/10 text-white/50 rounded-lg text-sm flex items-center gap-2 hover:bg-white/10 transition">
          <QrCode size={14} /> Print QR
        </a>
      </div>

      <Modal open={showPhase} onClose={() => setShowPhase(false)} title={`Advance to ${nextPhase}`}>
        <p className="text-white/50 text-sm mb-4">Current: <strong className="text-white">{data.phase}</strong> → Next: <strong className="text-primary">{nextPhase}</strong></p>
        {needsWeight && <ModalInput label="Weight (grams) — required" type="number" placeholder="0.00" value={weight} onChange={e => setWeight((e.target as HTMLInputElement).value)} />}
        <ModalButton loading={phaseMut.isPending} onClick={() => phaseMut.mutate()} disabled={needsWeight && !weight}>
          Confirm Transition
        </ModalButton>
      </Modal>

      <Modal open={showFlag} onClose={() => setShowFlag(false)} title="Flag Plant">
        <ModalInput label="Reason" placeholder="e.g. Mould detected on lower leaves" value={flagReason} onChange={e => setFlagReason((e.target as HTMLInputElement).value)} />
        <ModalButton loading={flagMut.isPending} onClick={() => flagMut.mutate()} disabled={!flagReason}>
          Flag as Non-Compliant
        </ModalButton>
      </Modal>

      {/* Info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { l: 'Phase', v: data.phase },
          { l: 'Zone', v: data.zone?.name || '—' },
          { l: 'Facility', v: data.facility?.name || '—' },
          { l: 'Handler', v: data.handler?.name || '—' },
        ].map(({ l, v }) => (
          <div key={l} className="bg-white/5 border border-white/10 rounded-lg p-3">
            <div className="text-xs text-white/40">{l}</div>
            <div className="text-sm text-white font-medium mt-1">{v}</div>
          </div>
        ))}
      </div>

      {/* Phase timeline */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-white/60 mb-4">Phase Timeline</h2>
        {/* Desktop: horizontal */}
        <div className="hidden sm:flex items-center gap-1 overflow-x-auto pb-2">
          {PHASE_ORDER.map((ph, i) => {
            const active = i <= phaseIdx;
            const current = i === phaseIdx;
            return (
              <div key={ph} className="flex items-center">
                <div className="flex flex-col items-center min-w-[70px]">
                  <div className={`w-4 h-4 rounded-full border-2 ${current ? 'bg-primary border-primary scale-125' : active ? 'bg-primary/60 border-primary/60' : 'border-white/20'}`} />
                  <span className={`text-xs mt-1 ${current ? 'text-primary font-bold' : active ? 'text-white/60' : 'text-white/20'}`}>{ph}</span>
                  {weights[ph] && <span className="text-xs text-white/40 font-mono">{weights[ph].toFixed(0)}g</span>}
                </div>
                {i < PHASE_ORDER.length - 1 && <div className={`h-0.5 w-6 ${active ? 'bg-primary/60' : 'bg-white/10'}`} />}
              </div>
            );
          })}
        </div>
        {/* Mobile: vertical list */}
        <div className="sm:hidden space-y-1">
          {PHASE_ORDER.map((ph, i) => {
            const active = i <= phaseIdx;
            const current = i === phaseIdx;
            return (
              <div key={ph} className={`flex items-center gap-3 py-1.5 ${current ? '' : ''}`}>
                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${current ? 'bg-primary ring-2 ring-primary/30' : active ? 'bg-primary/60' : 'bg-white/10'}`} />
                <span className={`text-sm flex-1 ${current ? 'text-primary font-bold' : active ? 'text-white/70' : 'text-white/20'}`}>{ph}</span>
                {weights[ph] && <span className="text-sm text-white/40 font-mono">{weights[ph].toFixed(0)}g</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Genealogy */}
      {(data.motherPlant || data.children?.length > 0) && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <GitBranch size={16} className="text-primary" />
            <h2 className="text-sm font-semibold text-white/60">Genealogy</h2>
          </div>
          {data.motherPlant && (
            <div className="text-sm mb-2">
              <span className="text-white/40">Mother: </span>
              <span className="text-primary font-mono">{data.motherPlant.identifier}</span>
              <span className="text-white/30 ml-2">{data.motherPlant.strain}</span>
            </div>
          )}
          {data.children?.length > 0 && (
            <div>
              <span className="text-white/40 text-sm">Clones ({data.children.length}): </span>
              {data.children.map((c: any) => (
                <span key={c.id} className="inline-block text-xs bg-white/5 border border-white/10 rounded px-2 py-0.5 mr-1 mb-1 font-mono text-primary">{c.identifier}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Batches */}
      {data.batchPlants?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/60 mb-3">Linked Batches</h2>
          {data.batchPlants.map((bp: any) => (
            <div key={bp.id} className="text-sm">
              <span className="font-mono text-primary">{bp.batch.batchNumber}</span>
              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${bp.batch.status === 'RELEASED' ? 'bg-green-500/20 text-green-400' : bp.batch.status === 'QUARANTINED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {bp.batch.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
