import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useWorldState } from '../../hooks/useWorldModel';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import StatCard from '../../components/StatCard';
import Modal, { ModalInput, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { ShieldCheck, Gauge, FileWarning, Trash2, CheckCircle } from 'lucide-react';
import api from '../../services/api';

export default function CompliancePage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [resolveId, setResolveId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  const resolveMut = useMutation({
    mutationFn: () => api.patch(`/anomalies/${resolveId}/resolve`, { investigationNotes: notes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['anomalies-all'] }); qc.invalidateQueries({ queryKey: ['world-model'] }); setResolveId(null); setNotes(''); addToast('success', 'Anomaly resolved'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const { data: state, isLoading } = useWorldState();
  const { data: anomalies } = useQuery({ queryKey: ['anomalies-all'], queryFn: () => api.get('/anomalies?resolved=false').then(r => r.data.anomalies) });
  const { data: destructions } = useQuery({ queryKey: ['destructions'], queryFn: () => api.get('/compliance/destruction').then(r => r.data.destructions) });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Compliance</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Quota Used" value={state?.facility?.quotaUsedPercent !== undefined ? `${state.facility.quotaUsedPercent.toFixed(0)}%` : undefined} icon={<Gauge size={20} />} loading={isLoading} />
        <StatCard label="Open Anomalies" value={state?.compliance?.openAnomalies} icon={<FileWarning size={20} />} loading={isLoading} danger={(state?.compliance?.openAnomalies ?? 0) > 0} />
        <StatCard label="Permit Expiry" value={state?.compliance?.permitExpiringDays !== null ? `${state?.compliance?.permitExpiringDays}d` : '—'} icon={<ShieldCheck size={20} />} loading={isLoading} />
        <StatCard label="Pending Destructions" value={state?.compliance?.pendingDestructions} icon={<Trash2 size={20} />} loading={isLoading} />
      </div>

      {anomalies?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/60 mb-3">Open Anomalies</h2>
          <div className="space-y-2">
            {anomalies.map((a: any) => (
              <div key={a.id} className={`border rounded-xl p-4 ${a.severity === 'CRITICAL' ? 'border-red-500/30 bg-red-500/5' : 'border-amber-500/20 bg-amber-500/5'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-sm font-semibold ${a.severity === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>{a.type.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-white/30">{new Date(a.detectedAt).toLocaleDateString('en-ZA')}</span>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{a.description}</p>
                {hasMinLevel(3) && (
                  <button onClick={() => setResolveId(a.id)} className="mt-3 px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition flex items-center gap-1.5 min-h-[44px]">
                    <CheckCircle size={14} /> Resolve
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal open={!!resolveId} onClose={() => setResolveId(null)} title="Resolve Anomaly">
        <p className="text-white/50 text-sm mb-3">Investigation notes are <strong className="text-white">required</strong>. Document what you found.</p>
        <textarea placeholder="Root cause, corrective action taken, evidence reviewed..." value={notes} onChange={e => setNotes(e.target.value)}
          className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[100px] resize-y" />
        <ModalButton loading={resolveMut.isPending} onClick={() => resolveMut.mutate()} disabled={!notes.trim()}>
          Resolve with Notes
        </ModalButton>
      </Modal>

      {destructions?.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-white/60 mb-3">Destruction Log</h2>
          {destructions.map((d: any) => (
            <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
              <div>
                <span className="text-white/80">{d.reason}</span>
                <span className="text-white/30 ml-2 text-xs">{d.batch?.batchNumber || '—'}</span>
              </div>
              <div className="text-right">
                <span className="font-mono text-white/60">{d.weight}g</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${d.confirmed ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {d.confirmed ? 'Confirmed' : 'Pending'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
