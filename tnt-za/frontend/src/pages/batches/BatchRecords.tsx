import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalButton } from '../../components/Modal';
import { FileStack, Plus, ShieldCheck, ArrowRight, Check } from 'lucide-react';
import api from '../../services/api';

// BMR / BPR / BDR — the GMP batch records that travel with a batch through processing.
const REC_TYPES = [
  { id: 'BMR', label: 'Batch Manufacturing Record', desc: 'Harvest → drying → trimming' },
  { id: 'BPR', label: 'Batch Processing Record', desc: 'Processing / packaging' },
  { id: 'BDR', label: 'Batch Dispatch Record', desc: 'Release & dispatch' },
];
const STATUS_CHIP: Record<string, string> = {
  DRAFT: 'bg-white/10 text-white/50', IN_PROGRESS: 'bg-blue-500/20 text-blue-300',
  QA_SIGNED: 'bg-amber-500/20 text-amber-300', CLOSED: 'bg-green-500/20 text-green-300',
};
// Structured fields per record type (stored in the record's `data` JSON).
const FIELDS: Record<string, { key: string; label: string; type?: string }[]> = {
  BMR: [
    { key: 'rawMaterialSpec', label: 'Raw material spec / harvest request ref' },
    { key: 'harvestWeight', label: 'Harvest weight (g)', type: 'number' },
    { key: 'dryWeight', label: 'Dry weight (g)', type: 'number' },
    { key: 'trimWeight', label: 'Trim weight (g)', type: 'number' },
    { key: 'trimDate', label: 'Trimming session date', type: 'date' },
    { key: 'trimOperator', label: 'Trimming operator' },
  ],
  BPR: [
    { key: 'processStep', label: 'Process / method' },
    { key: 'inputWeight', label: 'Input weight (g)', type: 'number' },
    { key: 'outputWeight', label: 'Output weight (g)', type: 'number' },
    { key: 'labTestRef', label: 'QA lab test reference' },
    { key: 'sampleReceivedDate', label: 'Date sample received (QA)', type: 'date' },
  ],
  BDR: [
    { key: 'dispatchRef', label: 'Dispatch reference' },
    { key: 'destination', label: 'Destination' },
    { key: 'dispatchDate', label: 'Dispatch date', type: 'date' },
    { key: 'releasedBy', label: 'Released by' },
  ],
};

export default function BatchRecords({ batchId }: { batchId: string }) {
  const { hasMinLevel } = useRBAC();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [edit, setEdit] = useState<any>(null);

  const key = ['batch-records', batchId];
  const { data: records } = useQuery({ queryKey: key, queryFn: () => api.get(`/batches/${batchId}/records`).then(r => r.data.records ?? []).catch(() => []) });

  const createMut = useMutation({
    mutationFn: (recordType: string) => api.post(`/batches/${batchId}/records`, { recordType }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); addToast('success', 'Record opened'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const patchMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => api.patch(`/batches/records/${id}`, { ...patch, name: user?.name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setEdit(null); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const byType = new Map((records || []).map((r: any) => [r.recordType, r]));
  const advance = (rec: any) => {
    const next = rec.status === 'DRAFT' ? 'IN_PROGRESS' : rec.status === 'QA_SIGNED' ? 'CLOSED' : rec.status;
    if (next !== rec.status) patchMut.mutate({ id: rec.id, patch: { status: next } });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1"><FileStack size={16} className="text-primary" /><h2 className="text-sm font-semibold text-white/60">Batch Records — BMR / BPR / BDR</h2></div>
      <p className="text-xs text-white/35 mb-4">GMP records for this batch. Processing fills each, QA signs it off before the next stage proceeds.</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {REC_TYPES.map(rt => {
          const rec: any = byType.get(rt.id);
          return (
            <div key={rt.id} className="bg-black/20 border border-white/[0.06] rounded-lg p-3.5 flex flex-col">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-white font-mono">{rt.id}</span>
                {rec && <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_CHIP[rec.status] || 'bg-white/10 text-white/40'}`}>{rec.status.replace('_', ' ')}</span>}
              </div>
              <div className="text-[11px] text-white/35 mt-0.5">{rt.label}</div>
              <div className="text-[10px] text-white/25 mt-0.5 mb-2">{rt.desc}</div>

              {!rec ? (
                hasMinLevel(1) ? (
                  <button onClick={() => createMut.mutate(rt.id)} disabled={createMut.isPending}
                    className="mt-auto text-xs text-primary font-semibold flex items-center gap-1 hover:text-primary-light"><Plus size={12} /> Open {rt.id}</button>
                ) : <span className="mt-auto text-[10px] text-white/25">Not started</span>
              ) : (
                <div className="mt-auto space-y-2">
                  {rec.refNo && <div className="text-[10px] font-mono text-white/40">{rec.refNo}</div>}
                  {rec.summary && <div className="text-[11px] text-white/50 line-clamp-2">{rec.summary}</div>}
                  {rec.qaSignedName && <div className="text-[10px] text-amber-300/80 flex items-center gap-1"><ShieldCheck size={10} /> QA: {rec.qaSignedName}</div>}
                  <div className="flex items-center gap-1.5 pt-1">
                    {hasMinLevel(1) && rec.status !== 'CLOSED' && (
                      <button onClick={() => setEdit(rec)} className="text-[11px] px-2 py-1 rounded bg-white/5 text-white/50 hover:text-white">Fill</button>
                    )}
                    {hasMinLevel(3) && (rec.status === 'DRAFT' || rec.status === 'IN_PROGRESS') && (
                      <button onClick={() => patchMut.mutate({ id: rec.id, patch: { status: 'QA_SIGNED' } })}
                        className="text-[11px] px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-center gap-1"><ShieldCheck size={10} /> QA sign</button>
                    )}
                    {hasMinLevel(1) && rec.status !== 'CLOSED' && rec.status !== 'QA_SIGNED' && (
                      <button onClick={() => advance(rec)} title="Advance" className="text-[11px] p-1 rounded bg-white/5 text-white/40 hover:text-primary"><ArrowRight size={12} /></button>
                    )}
                    {hasMinLevel(3) && rec.status === 'QA_SIGNED' && (
                      <button onClick={() => advance(rec)} title="Close" className="text-[11px] px-2 py-1 rounded bg-green-500/15 border border-green-500/30 text-green-200 flex items-center gap-1"><Check size={10} /> Close</button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `${edit.recordType} · ${edit.refNo}` : ''}>
        {edit && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {(FIELDS[edit.recordType] || []).map(f => (
                <ModalInput key={f.key} label={f.label} type={f.type || 'text'}
                  value={edit.data?.[f.key] ?? ''}
                  onChange={e => { const v = (e.target as HTMLInputElement).value; setEdit((d: any) => ({ ...d, data: { ...(d.data || {}), [f.key]: v } })); }} />
              ))}
            </div>
            <div>
              <label className="block text-sm text-white/50 mb-1">Summary / notes</label>
              <textarea value={edit.summary || ''} onChange={e => setEdit((d: any) => ({ ...d, summary: e.target.value }))}
                placeholder="Anything not captured above…"
                className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[90px] resize-y" />
            </div>
            <ModalButton loading={patchMut.isPending} onClick={() => patchMut.mutate({ id: edit.id, patch: { summary: edit.summary, data: edit.data, status: edit.status === 'DRAFT' ? 'IN_PROGRESS' : edit.status } })}>Save</ModalButton>
          </div>
        )}
      </Modal>
    </div>
  );
}
