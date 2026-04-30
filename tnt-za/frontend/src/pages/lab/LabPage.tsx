import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { FlaskConical, CheckCircle2, Clock, AlertCircle, Plus, FileText } from 'lucide-react';
import api from '../../services/api';

const TEST_TYPES = ['POTENCY', 'PESTICIDE', 'HEAVY_METALS', 'MICROBIAL', 'MYCOTOXIN', 'RESIDUAL_SOLVENTS', 'MOISTURE', 'FOREIGN_MATTER'];

export default function LabPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showSubmit, setShowSubmit] = useState(false);
  const [showCOA, setShowCOA] = useState<string | null>(null);
  const [result, setResult] = useState({ batchId: '', testType: 'POTENCY', value: '', unit: '', threshold: '', passed: true });

  const { data: batches, isLoading } = useQuery({
    queryKey: ['batches-lab'],
    queryFn: () => api.get('/batches').then(r => r.data.batches),
  });

  const submitMut = useMutation({
    mutationFn: () => api.post('/lab/results', {
      batchId: result.batchId,
      testType: result.testType,
      resultData: { value: parseFloat(result.value), unit: result.unit || (result.testType === 'POTENCY' ? '%THC' : 'ppm'), threshold: parseFloat(result.threshold) || 0.1 },
      passed: result.passed,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches-lab'] }); setShowSubmit(false); addToast('success', 'Lab result submitted'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const coaMut = useMutation({
    mutationFn: (batchId: string) => api.post(`/coa/generate/${batchId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['batches-lab'] }); setShowCOA(null); addToast('success', 'COA generated! Batch released.'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed — all 8 tests must pass first'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Lab Testing</h1>
        {hasMinLevel(2) && (
          <button onClick={() => setShowSubmit(true)} className="px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition">
            <Plus size={16} /> Submit Result
          </button>
        )}
      </div>

      {isLoading ? <SkeletonTable /> : !batches?.length ? (
        <p className="text-white/40 text-center py-12">No batches to test</p>
      ) : (
        <div className="space-y-3">
          {batches.map((b: any) => {
            const tested = b._count?.labResults || 0;
            const complete = tested >= 8;
            const hasCOA = b.coas?.length > 0;
            return (
              <div key={b.id} className={`bg-white/5 border rounded-xl p-4 ${b.status === 'QUARANTINED' ? 'border-red-500/30' : 'border-white/10'}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-primary font-bold text-sm">{b.batchNumber}</span>
                    <span className="text-white/50 text-sm">{b.strain}</span>
                    <div className="flex items-center gap-1.5 ml-auto sm:ml-2">
                      {complete ? <CheckCircle2 size={16} className="text-green-400" /> : <Clock size={16} className="text-amber-400" />}
                      <span className="text-sm text-white/50 font-mono">{tested}/8</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasMinLevel(2) && complete && !hasCOA && (
                      <button onClick={() => coaMut.mutate(b.id)}
                        className="px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg text-sm font-semibold hover:bg-primary/20 transition flex items-center gap-1.5 min-h-[40px]">
                        <FileText size={14} /> Generate COA
                      </button>
                    )}
                    {hasCOA && (
                      <span className="px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                        <CheckCircle2 size={14} /> COA Issued
                      </span>
                    )}
                  </div>
                </div>
                {b.status === 'QUARANTINED' && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-red-400">
                    <AlertCircle size={12} /> Quarantined — retest required
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Result Modal */}
      <Modal open={showSubmit} onClose={() => setShowSubmit(false)} title="Submit Lab Result">
        <ModalSelect label="Batch" value={result.batchId} onChange={e => setResult(r => ({ ...r, batchId: (e.target as HTMLSelectElement).value }))}>
          <option value="">Select batch</option>
          {batches?.map((b: any) => <option key={b.id} value={b.id}>{b.batchNumber} — {b.strain}</option>)}
        </ModalSelect>
        <ModalSelect label="Test Type" value={result.testType} onChange={e => setResult(r => ({ ...r, testType: (e.target as HTMLSelectElement).value }))}>
          {TEST_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </ModalSelect>
        <ModalInput label="Value" type="number" placeholder={result.testType === 'POTENCY' ? '22.5' : '0.01'} value={result.value} onChange={e => setResult(r => ({ ...r, value: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Threshold" type="number" placeholder={result.testType === 'POTENCY' ? '15' : '0.1'} value={result.threshold} onChange={e => setResult(r => ({ ...r, threshold: (e.target as HTMLInputElement).value }))} />
        <div className="mb-3">
          <label className="block text-sm text-white/50 mb-1">Result</label>
          <div className="flex gap-2">
            <button onClick={() => setResult(r => ({ ...r, passed: true }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${result.passed ? 'bg-green-500 text-white' : 'bg-white/5 border border-white/10 text-white/50'}`}>
              PASS
            </button>
            <button onClick={() => setResult(r => ({ ...r, passed: false }))}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${!result.passed ? 'bg-red-500 text-white' : 'bg-white/5 border border-white/10 text-white/50'}`}>
              FAIL
            </button>
          </div>
          {!result.passed && <p className="text-xs text-red-400 mt-1">Warning: failing a test will auto-quarantine the batch</p>}
        </div>
        <ModalButton loading={submitMut.isPending} onClick={() => submitMut.mutate()} disabled={!result.batchId || !result.value}>
          Submit Result
        </ModalButton>
      </Modal>
    </div>
  );
}
