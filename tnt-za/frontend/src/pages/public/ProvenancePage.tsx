import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Leaf, CheckCircle2, XCircle, Clock, Shield, User, MapPin } from 'lucide-react';
import api from '../../services/api';

const TESTS = ['POTENCY', 'PESTICIDE', 'HEAVY_METALS', 'MICROBIAL', 'MYCOTOXIN', 'RESIDUAL_SOLVENTS', 'MOISTURE', 'FOREIGN_MATTER'];

export default function ProvenancePage() {
  const { batchId } = useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ['provenance', batchId],
    queryFn: () => api.get(`/batches/${batchId}`).then(r => r.data.batch),
    enabled: !!batchId,
    retry: false,
  });

  const { data: chain } = useQuery({
    queryKey: ['provenance-chain', batchId],
    queryFn: () => api.get(`/batches/${batchId}/chain`).then(r => r.data.events),
    enabled: !!batchId,
  });

  if (isLoading) return (
    <div className="min-h-screen bg-[#0a0a15] flex items-center justify-center">
      <div className="animate-pulse text-white/30">Loading provenance data...</div>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#0a0a15] flex items-center justify-center p-4">
      <div className="text-center">
        <Shield size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Batch Not Found</h1>
        <p className="text-white/40">This QR code may be invalid or the batch has been removed.</p>
      </div>
    </div>
  );

  const resultsByType = new Map(data.labResults?.map((r: any) => [r.testType, r]));

  return (
    <div className="min-h-screen bg-[#0a0a15] text-white">
      {/* Header */}
      <div className="bg-gradient-to-b from-[#C9A84C]/20 to-transparent border-b border-white/10 p-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#C9A84C]/30 flex items-center justify-center">
              <Leaf size={24} className="text-[#C9A84C]" />
            </div>
            <div>
              <div className="text-xs text-white/40 uppercase tracking-wider">Verified Product</div>
              <div className="font-bold text-lg">{data.facility?.name || 'Origin'}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <MapPin size={12} />{data.facility?.location || 'South Africa'}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-6 space-y-6">
        {/* Batch info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-white/40 mb-1">Batch</div>
          <div className="text-2xl font-bold font-mono text-[#C9A84C]">{data.batchNumber}</div>
          <div className="text-white/60 mt-1">{data.strain}</div>
          <div className="flex gap-4 mt-3 text-xs text-white/40">
            <span>{data.batchPlants?.length || 0} plants</span>
            <span>{data.totalWeight?.toFixed(0)}g harvest weight</span>
            <span>{new Date(data.createdAt).toLocaleDateString('en-ZA')}</span>
          </div>
        </div>

        {/* Lab results */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="text-xs text-white/40 uppercase tracking-wider mb-4">Certificate of Analysis</div>
          <div className="grid grid-cols-2 gap-2">
            {TESTS.map(t => {
              const r: any = resultsByType.get(t);
              return (
                <div key={t} className={`rounded-xl border p-3 ${r ? (r.passed ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5') : 'border-white/10'}`}>
                  <div className="flex items-center gap-2">
                    {r ? (r.passed ? <CheckCircle2 size={14} className="text-green-400" /> : <XCircle size={14} className="text-red-400" />) : <Clock size={14} className="text-white/20" />}
                    <span className="text-[11px] text-white/60">{t.replace(/_/g, ' ')}</span>
                  </div>
                  {r?.resultData && (
                    <div className="text-xs font-mono text-white/40 mt-1">
                      {(r.resultData as any).value} {(r.resultData as any).unit}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Chain of custody */}
        {chain && chain.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="text-xs text-white/40 uppercase tracking-wider mb-4">Chain of Custody</div>
            <div className="space-y-3">
              {chain.slice(0, 10).map((e: any) => (
                <div key={e.id} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                    <User size={14} className="text-white/30" />
                  </div>
                  <div className="flex-1">
                    <div className="text-white/70">{e.eventType} <span className="text-white/30">on</span> {e.container?.containerId}</div>
                    <div className="text-xs text-white/30">
                      {e.outgoingHandler?.name}{e.incomingHandler ? ` → ${e.incomingHandler.name}` : ''}
                      {e.weight && <span className="ml-2 font-mono">{e.weight.toFixed(1)}g</span>}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/20">{new Date(e.timestamp).toLocaleDateString('en-ZA')}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-xs text-white/20 py-4">
          TnT-ZA Cannabis Track & Trace &middot; Verified {new Date().toLocaleDateString('en-ZA')}
        </div>
      </div>
    </div>
  );
}
