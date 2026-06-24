import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { Plus, ArrowRight, Check } from 'lucide-react';
import api from '../../services/api';

// Generic QMS register — one component drives Legal, Validations, Risk, Stability,
// Barcode, Engineering and Procurement off the shared /qms/records endpoint.
const STATUS_FLOW = ['OPEN', 'IN_PROGRESS', 'APPROVED', 'CLOSED'];
const STATUS_CHIP: Record<string, string> = {
  OPEN: 'bg-white/10 text-white/50',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-300',
  APPROVED: 'bg-amber-500/20 text-amber-300',
  CLOSED: 'bg-green-500/20 text-green-300',
};
const GRADE_CHIP: Record<string, string> = {
  APPROVED: 'bg-green-500/20 text-green-300', CONDITIONAL: 'bg-amber-500/20 text-amber-300',
  REJECTED: 'bg-red-500/20 text-red-300', PENDING: 'bg-white/10 text-white/40',
};

export default function QmsRegister({
  module, title, intro, recordTypes, typeLabel = 'Type', showGrade = false,
}: {
  module: string; title: string; intro?: string;
  recordTypes?: { id: string; label: string }[]; typeLabel?: string; showGrade?: boolean;
}) {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const blank = { title: '', description: '', recordType: recordTypes?.[0]?.id || '', refNo: '', severity: '', grade: showGrade ? 'PENDING' : '', dueDate: '' };
  const [form, setForm] = useState<any>(blank);

  const key = ['qms-records', module];
  const { data: records, isLoading } = useQuery({ queryKey: key, queryFn: () => api.get(`/qms/records?module=${module}`).then(r => r.data.records ?? []).catch(() => []) });

  const createMut = useMutation({
    mutationFn: () => api.post('/qms/records', { ...form, module }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); setShowCreate(false); setForm(blank); addToast('success', `${title} record added`); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const patchMut = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => api.patch(`/qms/records/${id}`, patch),
    onSuccess: () => { qc.invalidateQueries({ queryKey: key }); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const advance = (rec: any) => {
    const idx = STATUS_FLOW.indexOf(rec.status);
    const next = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    if (next !== rec.status) patchMut.mutate({ id: rec.id, patch: { status: next } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white">{title}</h2>
          {intro && <p className="text-xs text-white/40 mt-0.5 max-w-2xl">{intro}</p>}
        </div>
        {hasMinLevel(2) && (
          <button onClick={() => setShowCreate(true)} className="px-3.5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 min-h-[40px] flex-shrink-0">
            <Plus size={14} /> New
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="text-white/30 text-sm py-6">Loading…</div>
      ) : !records?.length ? (
        <div className="text-center py-12 border border-dashed border-white/10 rounded-xl">
          <p className="text-white/30 text-sm">No {title.toLowerCase()} records yet.</p>
          {hasMinLevel(2) && <button onClick={() => setShowCreate(true)} className="mt-2 text-primary text-xs font-semibold">+ Add the first one</button>}
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((rec: any) => (
            <div key={rec.id} className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white font-medium">{rec.title}</div>
                  {rec.description && <div className="text-xs text-white/40 mt-0.5">{rec.description}</div>}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {rec.refNo && <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-white/40 font-mono">{rec.refNo}</span>}
                    {rec.recordType && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{recordTypes?.find(t => t.id === rec.recordType)?.label || rec.recordType}</span>}
                    {showGrade && rec.grade && <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${GRADE_CHIP[rec.grade] || 'bg-white/10 text-white/40'}`}>{rec.grade}</span>}
                    {rec.dueDate && <span className="text-[10px] text-white/30">due {new Date(rec.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_CHIP[rec.status] || 'bg-white/10 text-white/40'}`}>{rec.status.replace('_', ' ')}</span>
                  {hasMinLevel(2) && rec.status !== 'CLOSED' && (
                    <button onClick={() => advance(rec)} disabled={patchMut.isPending} title="Advance status"
                      className="p-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary min-w-[36px] min-h-[36px] flex items-center justify-center">
                      {rec.status === 'APPROVED' ? <Check size={14} /> : <ArrowRight size={14} />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title={`New ${title} record`}>
        <ModalInput label="Title" placeholder="Short summary" value={form.title} onChange={e => setForm((f: any) => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        {recordTypes && (
          <ModalSelect label={typeLabel} value={form.recordType} onChange={e => setForm((f: any) => ({ ...f, recordType: (e.target as HTMLSelectElement).value }))}>
            {recordTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </ModalSelect>
        )}
        <div className="grid grid-cols-2 gap-3">
          <ModalInput label="Reference no." placeholder="e.g. VAL-2026-001" value={form.refNo} onChange={e => setForm((f: any) => ({ ...f, refNo: (e.target as HTMLInputElement).value }))} />
          <ModalInput label="Target date" type="date" value={form.dueDate} onChange={e => setForm((f: any) => ({ ...f, dueDate: (e.target as HTMLInputElement).value }))} />
        </div>
        {showGrade && (
          <ModalSelect label="Supplier grade" value={form.grade} onChange={e => setForm((f: any) => ({ ...f, grade: (e.target as HTMLSelectElement).value }))}>
            <option value="PENDING">Pending review</option>
            <option value="APPROVED">Approved</option>
            <option value="CONDITIONAL">Conditional</option>
            <option value="REJECTED">Rejected</option>
          </ModalSelect>
        )}
        <div className="mb-3">
          <label className="block text-sm text-white/50 mb-1">Details</label>
          <textarea placeholder="Description / scope / notes…" value={form.description} onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[90px] resize-y" />
        </div>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.title}>Add record</ModalButton>
      </Modal>
    </div>
  );
}
