import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { Scissors, Plus, Scale, Check, AlertTriangle, User } from 'lucide-react';
import api from '../../services/api';

export default function TrimPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showAssign, setShowAssign] = useState<string | null>(null);
  const [showComplete, setShowComplete] = useState<any>(null);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [batchId, setBatchId] = useState('');
  const [assignForm, setAssignForm] = useState({ trimmerId: '', trimmerName: '', weightIn: '' });
  const [completeForm, setCompleteForm] = useState({ weightOut: '', wasteWeight: '', notes: '' });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['trim-sessions'],
    queryFn: () => api.get('/trim').then(r => r.data.sessions),
  });

  const { data: sessionDetail } = useQuery({
    queryKey: ['trim-session', selectedSession?.id],
    queryFn: () => api.get(`/trim/${selectedSession.id}`).then(r => r.data.session),
    enabled: !!selectedSession,
  });

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then(r => r.data.batches),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.users),
    enabled: hasMinLevel(3),
  });

  const trimmers = users?.filter((u: any) => u.role === 'TRIMMER' && u.active !== false) || [];

  const createMut = useMutation({
    mutationFn: () => api.post('/trim', { batchId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trim-sessions'] }); setShowCreate(false); setBatchId(''); addToast('success', 'Trim session created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const assignMut = useMutation({
    mutationFn: () => api.post(`/trim/${showAssign}/assign`, { ...assignForm, weightIn: parseFloat(assignForm.weightIn) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trim-sessions'] }); qc.invalidateQueries({ queryKey: ['trim-session'] }); setShowAssign(null); setAssignForm({ trimmerId: '', trimmerName: '', weightIn: '' }); addToast('success', 'Trimmer assigned'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const completeTrimmerMut = useMutation({
    mutationFn: () => api.patch(`/trim/assignments/${showComplete.id}/complete`, {
      weightOut: parseFloat(completeForm.weightOut), wasteWeight: parseFloat(completeForm.wasteWeight), notes: completeForm.notes,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trim-session'] }); setShowComplete(null); setCompleteForm({ weightOut: '', wasteWeight: '', notes: '' }); addToast('success', 'Trimmer assignment completed'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const completeSessionMut = useMutation({
    mutationFn: (id: string) => api.post(`/trim/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trim-sessions'] }); qc.invalidateQueries({ queryKey: ['trim-session'] }); addToast('success', 'Trim session completed — reconciliation done'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Trim Sessions</h1>
          <p className="text-sm text-white/40">Per-trimmer weight tracking — Step 12</p>
        </div>
        {hasMinLevel(3) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> New Session
          </button>
        )}
      </div>

      {/* Session list */}
      {isLoading ? <SkeletonTable rows={4} /> : !sessions?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No trim sessions</div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s: any) => {
            const totalOut = (s.totalWeightOut || 0) + (s.totalWaste || 0);
            const pct = s.totalWeightIn > 0 ? ((totalOut / s.totalWeightIn) * 100).toFixed(1) : '0';
            const isComplete = s.status === 'COMPLETED';
            const hasVariance = s.variance && Math.abs(s.variance) > 2;

            return (
              <div key={s.id} onClick={() => setSelectedSession(s)}
                className={`bg-white/5 border rounded-xl p-4 cursor-pointer hover:bg-white/[0.07] transition active:scale-[0.98] ${hasVariance ? 'border-red-500/20' : 'border-white/10'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Scissors size={16} className="text-emerald-400" />
                    <span className="text-sm font-medium text-white">Batch: <span className="font-mono text-primary">{s.batchId?.substring(0, 8)}</span></span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${isComplete ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>
                    {s.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div><div className="text-lg font-bold font-mono text-white">{s.totalWeightIn.toFixed(0)}<span className="text-xs text-white/30">g</span></div><div className="text-[10px] text-white/30">IN</div></div>
                  <div><div className="text-lg font-bold font-mono text-white">{(s.totalWeightOut || 0).toFixed(0)}<span className="text-xs text-white/30">g</span></div><div className="text-[10px] text-white/30">OUT</div></div>
                  <div><div className="text-lg font-bold font-mono text-white">{(s.totalWaste || 0).toFixed(0)}<span className="text-xs text-white/30">g</span></div><div className="text-[10px] text-white/30">WASTE</div></div>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-white/30">{s._count?.assignments || 0} trimmers</span>
                  <span className={`font-mono ${hasVariance ? 'text-red-400 font-bold' : 'text-white/40'}`}>{pct}% accounted</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Session Detail Modal */}
      <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)} title="Trim Session Detail">
        {sessionDetail && (
          <div className="space-y-4">
            {/* Weight summary */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xl font-bold font-mono text-white">{sessionDetail.totalWeightIn.toFixed(0)}<span className="text-xs text-white/30">g</span></div>
                <div className="text-[10px] text-white/30">TOTAL IN</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xl font-bold font-mono text-white">{(sessionDetail.totalWeightOut || 0).toFixed(0)}<span className="text-xs text-white/30">g</span></div>
                <div className="text-[10px] text-white/30">TOTAL OUT</div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                <div className="text-xl font-bold font-mono text-white">{(sessionDetail.totalWaste || 0).toFixed(0)}<span className="text-xs text-white/30">g</span></div>
                <div className="text-[10px] text-white/30">WASTE</div>
              </div>
            </div>

            {sessionDetail.variance !== null && Math.abs(sessionDetail.variance) > 2 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-400" />
                <span className="text-sm text-red-300">Variance: {sessionDetail.variance.toFixed(1)}% — anomaly flagged</span>
              </div>
            )}

            {/* Trimmer assignments */}
            <h3 className="text-sm font-semibold text-white/60">Trimmers</h3>
            {sessionDetail.assignments?.length > 0 ? (
              <div className="space-y-2">
                {sessionDetail.assignments.map((a: any) => (
                  <div key={a.id} className={`bg-white/[0.03] border rounded-lg p-3 ${a.status === 'COMPLETED' ? 'border-green-500/15' : 'border-white/10'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <User size={14} className="text-emerald-400" />
                        <span className="text-sm font-medium text-white">{a.trimmerName}</span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : 'bg-amber-500/20 text-amber-400'}`}>{a.status}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-white/40 font-mono">
                      <span>IN: {a.weightIn}g</span>
                      {a.weightOut !== null && <span>OUT: {a.weightOut}g</span>}
                      {a.wasteWeight !== null && <span>Waste: {a.wasteWeight}g</span>}
                    </div>
                    {a.status !== 'COMPLETED' && hasMinLevel(1) && (
                      <button onClick={() => { setShowComplete(a); setCompleteForm({ weightOut: '', wasteWeight: '', notes: '' }); }}
                        className="mt-2 px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition min-h-[36px]">
                        Record Output
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No trimmers assigned yet</p>
            )}

            {/* Actions */}
            {sessionDetail.status !== 'COMPLETED' && hasMinLevel(3) && (
              <div className="flex gap-2">
                <button onClick={() => { setShowAssign(sessionDetail.id); setAssignForm({ trimmerId: '', trimmerName: '', weightIn: '' }); }}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold transition min-h-[44px] flex items-center justify-center gap-1.5">
                  <User size={14} /> Assign Trimmer
                </button>
                {sessionDetail.assignments?.every((a: any) => a.status === 'COMPLETED') && sessionDetail.assignments?.length > 0 && (
                  <button onClick={() => completeSessionMut.mutate(sessionDetail.id)} disabled={completeSessionMut.isPending}
                    className="flex-1 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-sm font-semibold hover:bg-green-500/20 transition min-h-[44px] flex items-center justify-center gap-1.5">
                    <Check size={14} /> Complete Session
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Session Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Trim Session">
        <ModalSelect label="Batch" value={batchId} onChange={e => setBatchId((e.target as HTMLSelectElement).value)}>
          <option value="">Select batch</option>
          {batches?.map((b: any) => <option key={b.id} value={b.id}>{b.batchNumber} — {b.strain}</option>)}
        </ModalSelect>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!batchId}>
          Create Trim Session
        </ModalButton>
      </Modal>

      {/* Assign Trimmer Modal */}
      <Modal open={!!showAssign} onClose={() => setShowAssign(null)} title="Assign Trimmer">
        <ModalSelect label="Trimmer" value={assignForm.trimmerId} onChange={e => {
          const u = trimmers.find((t: any) => t.id === (e.target as HTMLSelectElement).value);
          setAssignForm(f => ({ ...f, trimmerId: (e.target as HTMLSelectElement).value, trimmerName: u?.name || '' }));
        }}>
          <option value="">Select trimmer</option>
          {trimmers.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </ModalSelect>
        <ModalInput label="Weight IN (grams)" type="number" placeholder="e.g. 45" value={assignForm.weightIn} onChange={e => setAssignForm(f => ({ ...f, weightIn: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={assignMut.isPending} onClick={() => assignMut.mutate()} disabled={!assignForm.trimmerId || !assignForm.weightIn}>
          Assign {assignForm.weightIn}g to Trimmer
        </ModalButton>
      </Modal>

      {/* Complete Trimmer Assignment Modal */}
      <Modal open={!!showComplete} onClose={() => setShowComplete(null)} title={`Record Output — ${showComplete?.trimmerName || ''}`}>
        <p className="text-sm text-white/50 mb-3">Weight IN: <strong className="text-white font-mono">{showComplete?.weightIn}g</strong></p>
        <ModalInput label="Weight OUT (trimmed product, grams)" type="number" placeholder="e.g. 35" value={completeForm.weightOut} onChange={e => setCompleteForm(f => ({ ...f, weightOut: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Waste Weight (grams)" type="number" placeholder="e.g. 8" value={completeForm.wasteWeight} onChange={e => setCompleteForm(f => ({ ...f, wasteWeight: (e.target as HTMLInputElement).value }))} />
        {completeForm.weightOut && completeForm.wasteWeight && showComplete?.weightIn && (
          <div className={`rounded-lg p-3 mb-3 border ${Math.abs(showComplete.weightIn - parseFloat(completeForm.weightOut) - parseFloat(completeForm.wasteWeight)) / showComplete.weightIn > 0.02 ? 'bg-red-500/10 border-red-500/20 text-red-300' : 'bg-green-500/10 border-green-500/20 text-green-300'}`}>
            <span className="text-xs font-mono">
              IN: {showComplete.weightIn}g — OUT: {completeForm.weightOut}g — Waste: {completeForm.wasteWeight}g — Diff: {(showComplete.weightIn - parseFloat(completeForm.weightOut) - parseFloat(completeForm.wasteWeight)).toFixed(1)}g
              ({((showComplete.weightIn - parseFloat(completeForm.weightOut) - parseFloat(completeForm.wasteWeight)) / showComplete.weightIn * 100).toFixed(1)}%)
            </span>
          </div>
        )}
        <ModalInput label="Notes (optional)" placeholder="Any issues?" value={completeForm.notes} onChange={e => setCompleteForm(f => ({ ...f, notes: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={completeTrimmerMut.isPending} onClick={() => completeTrimmerMut.mutate()} disabled={!completeForm.weightOut || !completeForm.wasteWeight}>
          Record Output
        </ModalButton>
      </Modal>
    </div>
  );
}
