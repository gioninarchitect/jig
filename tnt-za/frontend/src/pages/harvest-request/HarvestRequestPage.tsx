import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonCard } from '../../components/Skeleton';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import SOPHeader from '../../components/SOPHeader';
import { Scissors, Plus, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

// =====================================================================
// Harvest Request — SOP 3-CUL-012
//
// Two-step workflow:
//   Step 1: Harvest Request Form — batch, strain, flowering date, size,
//           location, reason, date of harvest
//   Step 2: Harvest Request Check Sheet — 9 pre-harvest readiness items
//           that Head of Cultivation + QAM sign off before harvest starts
// =====================================================================

type Status = 'REQUESTED' | 'APPROVED' | 'DECLINED' | 'COMPLETED';

const STATUS_PILL: Record<Status, string> = {
  REQUESTED: 'bg-amber-500/15 border border-amber-500/40 text-amber-300',
  APPROVED:  'bg-green-500/15 border border-green-500/40 text-green-300',
  DECLINED:  'bg-red-500/15 border border-red-500/40 text-red-300',
  COMPLETED: 'bg-blue-500/15 border border-blue-500/40 text-blue-300',
};

const PRE_HARVEST_CHECKS = [
  'Are all the cultivation batch records in place and up to date?',
  'Have the plants been devoliated for harvest?',
  'Has all PPE been checked and allocated?',
  'Have all the harvesting tools and equipment been checked, cleaned and sanitized?',
  'Has the harvest bins been checked, cleaned and sanitized?',
  'Have all the harvesting tools and equipment been allocated to correct areas?',
  'Has processing received harvest notice?',
  'Has processing allocated, cleaned and prepared a drying room?',
  'Has processing equipment and processing harvest bins been checked, cleaned and sanitized?',
];

interface HarvestRequest {
  id: string; batchNo: string; strainId: string; floweringStartDate: string;
  batchSizePlants: number; greenhouse: string; bay: string;
  reasonForHarvest: string; requestedBy: string; requestedDate: string;
  status: Status; checklistAnswers?: boolean[]; dryingRoomAllocated?: string;
  qamApprovedBy?: string; hocApprovedBy?: string; createdAt: string;
}

export default function HarvestRequestPage() {
  const { hasMinLevel, hasRole } = useRBAC();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const canRequest = hasMinLevel(2);
  const canApprove = hasMinLevel(3) || hasRole('HEAD_OF_CULTIVATION') || hasRole('FACILITY_MANAGER');

  const [showCreate, setShowCreate] = useState(false);
  const [showCheck, setShowCheck] = useState<string | null>(null);
  const [form, setForm] = useState({
    batchNo: '', strainId: '', floweringStartDate: '',
    batchSizePlants: '', greenhouse: '', bay: '',
    reasonForHarvest: '', requestedDate: '',
    expectedYieldPerPlantG: '', expectedHarvestDate: '',
  });
  const [checklist, setChecklist] = useState<boolean[]>(Array(PRE_HARVEST_CHECKS.length).fill(false));
  const [dryingRoom, setDryingRoom] = useState('');

  const { data: requests, isLoading } = useQuery<HarvestRequest[]>({
    queryKey: ['harvest-requests'],
    queryFn: () => api.get('/harvest-requests').then(r => r.data.requests ?? []).catch(() => []),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/harvest-requests', {
      ...form,
      batchSizePlants: parseInt(form.batchSizePlants || '0'),
      expectedYieldPerPlantG: form.expectedYieldPerPlantG ? parseInt(form.expectedYieldPerPlantG) : undefined,
      expectedHarvestDate: form.expectedHarvestDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-requests'] });
      setShowCreate(false);
      setForm({ batchNo: '', strainId: '', floweringStartDate: '', batchSizePlants: '', greenhouse: '', bay: '', reasonForHarvest: '', requestedDate: '', expectedYieldPerPlantG: '', expectedHarvestDate: '' });
      addToast('success', 'Harvest request submitted');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed'),
  });

  const approveMut = useMutation({
    mutationFn: (id: string) => api.post(`/harvest-requests/${id}/approve`, {
      checklistAnswers: checklist, dryingRoomAllocated: dryingRoom,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-requests'] });
      setShowCheck(null);
      setChecklist(Array(PRE_HARVEST_CHECKS.length).fill(false));
      setDryingRoom('');
      addToast('success', 'Harvest approved — processing notified');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed'),
  });

  // Record actual harvest yield (kg) — Loraine's "plante geharvest" capture. Harvest only — this has
  // NOTHING to do with clone cuttings; it records wet weight per harvest (SOP 3-CUL-012).
  const canRecordHarvest = hasRole('HEAD_OF_CULTIVATION', 'FACILITY_SUPERVISOR', 'CULTIVATOR', 'FACILITY_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN');
  const [showRecord, setShowRecord] = useState<string | null>(null);
  const [recordKg, setRecordKg] = useState('');
  const [recordDate, setRecordDate] = useState('');
  const recordMut = useMutation({
    mutationFn: (id: string) => api.post(`/harvest-requests/${id}/record-yield`, {
      actualYieldKg: Number(recordKg), actualHarvestDate: recordDate || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['harvest-requests'] });
      setShowRecord(null); setRecordKg(''); setRecordDate('');
      addToast('success', 'Harvest recorded');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed'),
  });

  const allChecked = checklist.every(v => v);
  const openForReview = requests?.find(r => r.id === showCheck);

  return (
    <div className="space-y-6">
      <SOPHeader
        sopNumber="3-CUL-012"
        title="Harvest Request Form + Check Sheet"
        effectiveDate="04/11/2025"
        version="1.0"
        responsibility="Head of Cultivation · QA Manager"
        reportsTo="Facility Manager"
        authorisedBy="QA Manager"
        checkedBy="Head of Cultivation"
      />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Scissors className="text-amber-400" size={26} /> Harvest Requests
          </h1>
          <p className="text-sm text-white/40 mt-1">Request → pre-harvest check → approved for processing handover</p>
        </div>
        {canRequest && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> New request
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{[1,2,3].map(i => <SkeletonCard key={i} />)}</div>
      ) : !requests?.length ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <Scissors className="mx-auto text-white/30 mb-3" size={36} />
          <p className="text-white/60 text-sm">No harvest requests yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {requests.map(r => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition">
              <div className="flex justify-between items-start gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <span className="text-white font-semibold">{r.batchNo}</span>
                    <span className="text-white/40">·</span>
                    <span className="text-white/70">{r.strainId}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_PILL[r.status]}`}>
                      {r.status === 'REQUESTED' && <Clock size={10} />}
                      {r.status === 'APPROVED'  && <CheckCircle2 size={10} />}
                      {r.status === 'DECLINED'  && <AlertTriangle size={10} />}
                      {r.status}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mb-1">
                    {r.greenhouse}/Bay {r.bay} · {r.batchSizePlants} plants · flowering from {new Date(r.floweringStartDate).toLocaleDateString()}
                  </p>
                  {((r as any).expectedYieldKg || (r as any).expectedYieldPerPlantG) && (
                    <p className="text-xs mb-1">
                      <span className="text-white/40">Potential:</span>{' '}
                      <span className="font-mono text-primary font-semibold">
                        {(r as any).expectedYieldKg ? `${Number((r as any).expectedYieldKg).toFixed(2)} kg` : '—'}
                      </span>
                      {(r as any).expectedYieldPerPlantG && (
                        <span className="text-white/40"> · {(r as any).expectedYieldPerPlantG} g/plant</span>
                      )}
                      {(r as any).actualYieldKg && (
                        <>
                          <span className="text-white/40"> → actual</span>{' '}
                          <span className="font-mono text-white">{Number((r as any).actualYieldKg).toFixed(2)} kg</span>
                          {(r as any).yieldVariancePct != null && (
                            <span className={Number((r as any).yieldVariancePct) >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {' '}({Number((r as any).yieldVariancePct) >= 0 ? '+' : ''}{Number((r as any).yieldVariancePct).toFixed(1)}%)
                            </span>
                          )}
                        </>
                      )}
                    </p>
                  )}
                  <p className="text-xs text-white/60 italic">"{r.reasonForHarvest}"</p>
                  <p className="text-[11px] text-white/40 mt-1.5">
                    Requested by <span className="text-white/60">{r.requestedBy}</span> · desired harvest <span className="text-white/60">{new Date(r.requestedDate).toLocaleDateString()}</span>
                  </p>
                </div>
                {canApprove && r.status === 'REQUESTED' && (
                  <button
                    onClick={() => { setChecklist(Array(PRE_HARVEST_CHECKS.length).fill(false)); setDryingRoom(''); setShowCheck(r.id); }}
                    className="px-3 py-1.5 bg-amber-500/80 hover:bg-amber-500 text-white rounded-lg text-xs font-semibold transition flex-shrink-0">
                    Pre-harvest check
                  </button>
                )}
                {canRecordHarvest && !(r as any).actualYieldKg && (
                  <button
                    onClick={() => { setRecordKg(''); setRecordDate(''); setShowRecord(r.id); }}
                    className="px-3 py-1.5 bg-primary hover:bg-primary-light text-white rounded-lg text-xs font-semibold transition flex-shrink-0">
                    Record harvest
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Create request */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Harvest Request Form">
        <div className="space-y-2">
          <ModalInput label="Batch No" placeholder="e.g. B-2026-012"
            value={form.batchNo} onChange={e => setForm({ ...form, batchNo: e.target.value })} />
          <ModalInput label="Strain ID" placeholder="e.g. AUR-22"
            value={form.strainId} onChange={e => setForm({ ...form, strainId: e.target.value })} />
          <ModalInput label="Flowering start date" type="date"
            value={form.floweringStartDate} onChange={e => setForm({ ...form, floweringStartDate: e.target.value })} />
          <ModalInput label="Batch size (no. of plants)" type="number" placeholder="e.g. 240"
            value={form.batchSizePlants} onChange={e => setForm({ ...form, batchSizePlants: e.target.value })} />
          <ModalInput label="Greenhouse" placeholder="e.g. GH1"
            value={form.greenhouse} onChange={e => setForm({ ...form, greenhouse: e.target.value })} />
          <ModalInput label="Bay" placeholder="e.g. Bay-3"
            value={form.bay} onChange={e => setForm({ ...form, bay: e.target.value })} />
          <ModalInput label="Expected yield per plant (g)" type="number" placeholder="e.g. 85"
            value={form.expectedYieldPerPlantG} onChange={e => setForm({ ...form, expectedYieldPerPlantG: e.target.value })} />
          {form.expectedYieldPerPlantG && form.batchSizePlants && (
            <p className="text-xs text-primary/80 -mt-2 mb-3">
              Potential: <span className="font-mono font-bold">
                {((parseInt(form.expectedYieldPerPlantG || '0') * parseInt(form.batchSizePlants || '0')) / 1000).toFixed(2)} kg
              </span> ({form.batchSizePlants} plants × {form.expectedYieldPerPlantG} g)
            </p>
          )}
          <ModalInput label="Expected harvest date" type="date"
            value={form.expectedHarvestDate} onChange={e => setForm({ ...form, expectedHarvestDate: e.target.value })} />
          <ModalInput label="Reason for harvest request" placeholder="e.g. Trichomes 80% milky / 20% amber, ready for harvest"
            value={form.reasonForHarvest} onChange={e => setForm({ ...form, reasonForHarvest: e.target.value })} />
          <ModalInput label="Requested date of harvest" type="date"
            value={form.requestedDate} onChange={e => setForm({ ...form, requestedDate: e.target.value })} />

          <ModalButton
            onClick={() => createMut.mutate()}
            disabled={createMut.isPending || !form.batchNo || !form.strainId || !form.reasonForHarvest || !form.requestedDate}>
            {createMut.isPending ? 'Submitting…' : 'Submit harvest request'}
          </ModalButton>
          <p className="text-[11px] text-white/30 text-center">
            Requested by <span className="text-white/50">{user?.name ?? 'you'}</span> · routes to QAM + Head of Cultivation
          </p>
        </div>
      </Modal>

      {/* Step 2: Pre-harvest check sheet */}
      <Modal open={!!showCheck} onClose={() => setShowCheck(null)} title="Harvest Request Check Sheet">
        {openForReview && (
          <div className="space-y-3">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-white/50 uppercase tracking-wider font-mono mb-1">Reviewing</p>
              <p className="text-sm text-white font-semibold">{openForReview.batchNo} · {openForReview.strainId}</p>
              <p className="text-xs text-white/50">{openForReview.greenhouse}/Bay {openForReview.bay} · {openForReview.batchSizePlants} plants</p>
            </div>

            <p className="text-xs text-white/50 mb-1">Tick each item after verification:</p>
            <div className="space-y-1.5">
              {PRE_HARVEST_CHECKS.map((q, i) => (
                <button key={i}
                  onClick={() => setChecklist(c => c.map((v, idx) => idx === i ? !v : v))}
                  className={`w-full flex items-start gap-3 text-left px-3.5 py-2.5 rounded-lg border transition ${
                    checklist[i]
                      ? 'bg-green-500/10 border-green-500/40'
                      : 'bg-white/5 border-white/10 hover:border-white/30'
                  }`}>
                  <span className={`w-5 h-5 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center text-[11px] font-bold ${
                    checklist[i] ? 'bg-green-500 border-green-500 text-white' : 'border-white/30 text-transparent'
                  }`}>✓</span>
                  <span className={`text-xs leading-snug ${checklist[i] ? 'text-white/90' : 'text-white/70'}`}>{q}</span>
                </button>
              ))}
            </div>

            <ModalInput label="Drying room allocated" placeholder="e.g. DR-A"
              value={dryingRoom} onChange={e => setDryingRoom(e.target.value)} />

            <ModalButton
              onClick={() => approveMut.mutate(openForReview.id)}
              disabled={approveMut.isPending || !allChecked || !dryingRoom}>
              {approveMut.isPending ? 'Approving…' : allChecked && dryingRoom ? 'Approve harvest · notify processing' : `Complete ${checklist.filter(Boolean).length}/${PRE_HARVEST_CHECKS.length} + drying room`}
            </ModalButton>
            <p className="text-[11px] text-white/30 text-center">
              Approved by <span className="text-white/50">{user?.name ?? 'you'}</span> · QAM + Head of Cultivation signatures captured
            </p>
          </div>
        )}
      </Modal>

      {/* Record actual harvest yield — wet weight (kg) per harvest. Harvest only (SOP 3-CUL-012). */}
      <Modal open={!!showRecord} onClose={() => setShowRecord(null)} title="Record harvest">
        <div className="space-y-3">
          <p className="text-xs text-white/50">Capture what was actually harvested — wet weight in kilograms.</p>
          <ModalInput label="Actual harvest weight (kg)" type="number" placeholder="e.g. 12.5"
            value={recordKg} onChange={(e: any) => setRecordKg(e.target.value)} />
          <ModalInput label="Harvest date" type="date"
            value={recordDate} onChange={(e: any) => setRecordDate(e.target.value)} />
          <ModalButton
            onClick={() => { if (Number(recordKg) > 0 && showRecord) recordMut.mutate(showRecord); }}
            disabled={!(Number(recordKg) > 0) || recordMut.isPending}>
            Save harvest
          </ModalButton>
        </div>
      </Modal>
    </div>
  );
}
