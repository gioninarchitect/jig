import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SkeletonPage } from '../../components/Skeleton';
import { Layers, CheckCircle2, XCircle, Clock, FileCheck, RefreshCw, Tags, AlertTriangle } from 'lucide-react';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import api from '../../services/api';

const TESTS = ['POTENCY', 'PESTICIDE', 'HEAVY_METALS', 'MICROBIAL', 'MYCOTOXIN', 'RESIDUAL_SOLVENTS', 'MOISTURE', 'FOREIGN_MATTER'];

export default function BatchDetailPage() {
  const { id } = useParams();
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['batch', id],
    queryFn: () => api.get(`/batches/${id}`).then(r => r.data.batch),
    enabled: !!id,
  });
  const { data: chain } = useQuery({
    queryKey: ['batch-chain', id],
    queryFn: () => api.get(`/batches/${id}/chain`).then(r => r.data.events),
    enabled: !!id,
  });

  const syncBcrMut = useMutation({
    mutationFn: () => api.post(`/batches/${id}/bcr/sync`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batch', id] }); addToast('success', 'BCR synced'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  if (isLoading) return <SkeletonPage />;
  if (!data) return <p className="text-white/40">Batch not found</p>;

  const resultsByType = new Map(data.labResults?.map((r: any) => [r.testType, r]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center"><Layers size={20} className="text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold font-mono text-primary">{data.batchNumber}</h1>
          <p className="text-sm text-white/50">{data.strain} &middot; {data.totalWeight.toFixed(0)}g &middot; {data.batchPlants?.length || 0} plants</p>
        </div>
      </div>

      {/* Batch Cultivation Record */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <FileCheck size={18} className="text-primary mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-white/70">Batch Cultivation Record</h2>
              <p className="text-xs text-white/40">Auto-created from batch number. Links SOP checklists, labels, deviations, mortality, environmental logs, and signatures.</p>
            </div>
          </div>
          {hasMinLevel(2) && (
            <button onClick={() => syncBcrMut.mutate()} className="px-3 py-2 bg-primary/10 border border-primary/30 rounded-lg text-xs text-primary flex items-center gap-1.5">
              <RefreshCw size={12} /> Sync BCR
            </button>
          )}
        </div>
        {!data.cultivationRecord ? (
          <p className="text-white/30 text-sm">No BCR created yet. Sync to generate it.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
            <div className="bg-black/20 border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">Record</div><div className="text-sm text-primary font-mono">{data.cultivationRecord.recordNumber}</div></div>
            <div className="bg-black/20 border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">Status</div><div className="text-sm text-white">{data.cultivationRecord.status}</div></div>
            <div className="bg-black/20 border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">Linked Checklists</div><div className="text-sm text-white">{data.cultivationRecord.checklistSummary?.length || 0}</div></div>
            <div className="bg-black/20 border border-white/[0.06] rounded-lg p-3"><div className="text-[10px] text-white/25">Open Deviations</div><div className="text-sm text-white">{data.cultivationRecord.deviations?.length || 0}</div></div>
          </div>
        )}
      </div>

      {/* Labels and deviation controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><Tags size={16} className="text-primary" /><h2 className="text-sm font-semibold text-white/60">Batch Labels</h2></div>
          {!data.labelRecords?.length ? <p className="text-white/30 text-sm">No label records</p> : data.labelRecords.map((l: any) => (
            <div key={l.id} className="flex justify-between py-2 border-b border-white/5 text-sm">
              <span className="font-mono text-primary">{l.labelCode}</span>
              <span className="text-xs text-white/40">{l.status}</span>
            </div>
          ))}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3"><AlertTriangle size={16} className="text-amber-300" /><h2 className="text-sm font-semibold text-white/60">Deviation Control</h2></div>
          <p className="text-sm text-white/45">Any failed checklist, mortality spike, label exception, environmental excursion, or QA hold should become a deviation or governance ticket and remain visible on the BCR.</p>
        </div>
      </div>

      {/* Lab results grid */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/60 mb-4">Lab Testing Protocol (8 Required)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TESTS.map(t => {
            const result: any = resultsByType.get(t);
            return (
              <div key={t} className={`rounded-lg border p-3 text-center ${result ? (result.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5') : 'border-white/10 bg-white/[0.02]'}`}>
                {result ? (result.passed ? <CheckCircle2 size={18} className="mx-auto text-green-400 mb-1" /> : <XCircle size={18} className="mx-auto text-red-400 mb-1" />) : <Clock size={18} className="mx-auto text-white/20 mb-1" />}
                <div className="text-[10px] text-white/50">{t.replace(/_/g, ' ')}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chain of custody */}
      {chain && chain.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/60 mb-4">Chain of Custody ({chain.length} events)</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {chain.map((e: any) => (
              <div key={e.id} className="py-2.5 border-b border-white/5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-primary font-mono text-sm font-medium">{e.container?.containerId}</span>
                  <span className="text-sm text-white/60">{e.eventType}</span>
                  {e.weight && <span className="font-mono text-sm text-white/50">{e.weight.toFixed(1)}g</span>}
                </div>
                <div className="flex items-center gap-3 text-xs text-white/30">
                  <span>{new Date(e.timestamp).toLocaleString('en-ZA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  {e.outgoingHandler && <span>{e.outgoingHandler.name}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked plants */}
      {data.batchPlants?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/60 mb-3">Plants in Batch</h2>
          <div className="flex flex-wrap gap-2">
            {data.batchPlants.map((bp: any) => (
              <span key={bp.id} className="text-xs bg-white/5 border border-white/10 rounded px-2 py-1 font-mono text-primary">{bp.plant.identifier}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
