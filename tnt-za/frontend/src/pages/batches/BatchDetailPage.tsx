import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SkeletonPage } from '../../components/Skeleton';
import { Layers, CheckCircle2, XCircle, Clock } from 'lucide-react';
import api from '../../services/api';

const TESTS = ['POTENCY', 'PESTICIDE', 'HEAVY_METALS', 'MICROBIAL', 'MYCOTOXIN', 'RESIDUAL_SOLVENTS', 'MOISTURE', 'FOREIGN_MATTER'];

export default function BatchDetailPage() {
  const { id } = useParams();
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
