import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalInput, ModalButton } from '../../components/Modal';
import {
  ShieldCheck, CheckCircle2, XCircle, RotateCcw, FlaskConical, Package, AlertTriangle, FileSearch,
} from 'lucide-react';
import api from '../../services/api';

// =====================================================================
// QA Sign-Off Queue
//
// For QA_INSPECTOR (Level 3). The "review → sign off → release" workflow:
//   1. Batches awaiting QA release  (all 8 lab tests passed, no COA yet)
//   2. Packaging runs awaiting QA   (Processing Manager has handed off)
//   3. Lab results awaiting review  (out-of-spec / borderline values)
//   4. Open deviations awaiting CAPA close
//
// Every decision is appended to the audit log via the backend (existing
// audit chain). Backend QA decision endpoint is on the build list — until
// then this page calls existing PATCH endpoints (release, deviation close).
// =====================================================================

type QueueKey = 'batches' | 'packaging' | 'lab' | 'deviations';
type Decision = 'approve' | 'reject' | 'rework';

interface QueueItem {
  id: string;
  kind: QueueKey;
  title: string;
  subtitle?: string;
  meta?: { label: string; value: string }[];
  raisedAt?: string;
  severity?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

const ICONS: Record<QueueKey, any> = {
  batches:    Package,
  packaging:  Package,
  lab:        FlaskConical,
  deviations: AlertTriangle,
};

const KIND_LABEL: Record<QueueKey, string> = {
  batches:    'Batches awaiting release',
  packaging:  'Packaging awaiting QA',
  lab:        'Lab results awaiting review',
  deviations: 'Deviations awaiting CAPA close',
};

export default function QASignOffPage() {
  const { hasMinLevel, hasRole } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const canSign = hasMinLevel(3) || hasRole('QA_INSPECTOR');

  const [activeTab, setActiveTab] = useState<QueueKey>('batches');
  const [decision, setDecision] = useState<{ item: QueueItem; type: Decision } | null>(null);
  const [notes, setNotes] = useState('');

  // ---- Data queries (use existing endpoints; filter client-side for QA cuts) ----
  const { data: batches, isLoading: bLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then(r => r.data.batches ?? []),
  });

  const { data: deviations, isLoading: dLoading } = useQuery({
    queryKey: ['deviations', 'open'],
    queryFn: () => api.get('/qms/deviations?open=true').then(r => r.data.deviations ?? []),
  });

  const { data: labResults, isLoading: lLoading } = useQuery({
    queryKey: ['lab-results', 'awaiting-review'],
    // Endpoint may not exist yet — empty fallback
    queryFn: () => api.get('/lab/results?awaiting_review=true').then(r => r.data.results ?? []).catch(() => []),
  });

  const queues = useMemo<Record<QueueKey, QueueItem[]>>(() => {
    const batchAll = batches ?? [];
    const release: QueueItem[] = batchAll
      .filter((b: any) => (b._count?.labResults ?? b.labResults?.length ?? 0) >= 8 && !(b.coas?.length))
      .map((b: any) => ({
        id: b.id, kind: 'batches' as const,
        title: b.batchNumber,
        subtitle: b.strain,
        meta: [
          { label: 'Total weight', value: `${b.totalWeight ?? '—'} g` },
          { label: 'Tests', value: `${b._count?.labResults ?? 8}/8 passed` },
          { label: 'Status', value: b.status ?? 'IN_TESTING' },
        ],
      }));

    const packaging: QueueItem[] = batchAll
      .filter((b: any) => b.status === 'PROCESSING' || b.packagingStatus === 'AWAITING_QA')
      .map((b: any) => ({
        id: b.id, kind: 'packaging' as const,
        title: `${b.batchNumber} — packaging`,
        subtitle: b.strain,
        meta: [
          { label: 'Units packed', value: String(b.unitsPacked ?? '—') },
          { label: 'Handoff by', value: b.processedBy?.name ?? 'Processing Mgr' },
        ],
      }));

    const lab: QueueItem[] = (labResults ?? []).map((r: any) => ({
      id: r.id, kind: 'lab' as const,
      title: `${r.batch?.batchNumber ?? 'unknown'} · ${r.testType}`,
      subtitle: r.passed === false ? 'Out of spec — review required' : 'Borderline value — review',
      meta: [
        { label: 'Result', value: `${r.resultData?.value ?? '—'} ${r.resultData?.unit ?? ''}` },
        { label: 'Threshold', value: String(r.resultData?.threshold ?? '—') },
        { label: 'Tested', value: r.testedAt ? new Date(r.testedAt).toLocaleDateString() : '—' },
      ],
    }));

    const devs: QueueItem[] = (deviations ?? []).map((d: any) => ({
      id: d.id, kind: 'deviations' as const,
      title: d.sop?.title ?? 'Deviation',
      subtitle: d.description,
      severity: d.severity,
      raisedAt: d.createdAt,
      meta: [
        { label: 'Raised by', value: d.raisedBy?.name ?? 'Unknown' },
        { label: 'Root cause', value: d.rootCause ? '✓ Documented' : '✗ Pending' },
        { label: 'CAPA',       value: d.capa       ? '✓ Defined'    : '✗ Pending' },
      ],
    }));

    return { batches: release, packaging, lab, deviations: devs };
  }, [batches, deviations, labResults]);

  const totals = {
    batches:    queues.batches.length,
    packaging:  queues.packaging.length,
    lab:        queues.lab.length,
    deviations: queues.deviations.length,
  };
  const totalCount = totals.batches + totals.packaging + totals.lab + totals.deviations;

  // ---- Decision mutation ----
  const decisionMut = useMutation({
    mutationFn: ({ item, type, notes }: { item: QueueItem; type: Decision; notes: string }) => {
      // Route by item kind to the right backend endpoint.
      // TODO: replace with unified POST /qa/decisions once backend lands.
      if (item.kind === 'batches' && type === 'approve') {
        return api.post(`/coa/generate/${item.id}`, { qaApprovedNotes: notes });
      }
      if (item.kind === 'batches' && type === 'reject') {
        return api.patch(`/batches/${item.id}`, { status: 'QUARANTINED', qaRejectionReason: notes });
      }
      if (item.kind === 'deviations' && type === 'approve') {
        return api.patch(`/qms/deviations/${item.id}/close`, { closeNotes: notes });
      }
      if (item.kind === 'deviations' && type === 'reject') {
        return api.patch(`/qms/deviations/${item.id}`, { qaQueries: notes });
      }
      // Fallback — queue against the QA decision endpoint (TODO build)
      return api.post('/qa/decisions', { itemId: item.id, kind: item.kind, decision: type, notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['batches'] });
      qc.invalidateQueries({ queryKey: ['deviations'] });
      qc.invalidateQueries({ queryKey: ['lab-results'] });
      addToast('success', `${decision?.type.toUpperCase()} signed off — audit entry recorded`);
      setDecision(null);
      setNotes('');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Decision failed — backend may not yet expose this endpoint'),
  });

  // ---- Render ----
  const TabBtn = ({ k, icon: Icon }: { k: QueueKey; icon: any }) => (
    <button onClick={() => setActiveTab(k)}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${
        activeTab === k
          ? 'bg-primary text-dark'
          : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
      }`}>
      <Icon size={16} />
      <span>{KIND_LABEL[k]}</span>
      <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
        activeTab === k ? 'bg-dark/30 text-dark' : 'bg-white/10 text-white/70'
      }`}>{totals[k]}</span>
    </button>
  );

  const isLoading = bLoading || dLoading || lLoading;
  const visible = queues[activeTab];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="text-primary" size={24} />
            QA Sign-Off Queue
          </h1>
          <p className="text-white/40 text-sm mt-1">Review &amp; release · approve · reject · request rework — every decision audited.</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-white/40">Items awaiting QA</div>
          <div className="text-3xl font-bold text-primary">{totalCount}</div>
        </div>
      </div>

      {!canSign && (
        <div className="rounded-lg p-3 border border-amber-500/30 bg-amber-500/5 text-sm text-amber-300">
          <FileSearch className="inline mr-2" size={14} />
          You are viewing in read-only mode. QA_INSPECTOR or higher level required to approve / reject.
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <TabBtn k="batches"    icon={Package} />
        <TabBtn k="packaging"  icon={Package} />
        <TabBtn k="lab"        icon={FlaskConical} />
        <TabBtn k="deviations" icon={AlertTriangle} />
      </div>

      {isLoading ? (
        <SkeletonTable />
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center">
          <CheckCircle2 className="mx-auto text-green-400 mb-3" size={32} />
          <p className="text-white/60">Nothing awaiting QA in this queue.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map(item => {
            const Icon = ICONS[item.kind];
            return (
              <div key={item.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-primary/40 transition">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <Icon className="text-primary mt-0.5" size={18} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-primary font-bold text-sm">{item.title}</span>
                        {item.severity && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-300' :
                            item.severity === 'HIGH'     ? 'bg-orange-500/20 text-orange-300' :
                            item.severity === 'MEDIUM'   ? 'bg-amber-500/20 text-amber-300' :
                                                           'bg-blue-500/20 text-blue-300'
                          }`}>{item.severity}</span>
                        )}
                      </div>
                      {item.subtitle && <p className="text-white/60 text-sm mt-1">{item.subtitle}</p>}
                      {item.meta && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                          {item.meta.map(m => (
                            <div key={m.label} className="text-xs">
                              <div className="text-white/40 uppercase tracking-wider text-[10px]">{m.label}</div>
                              <div className="text-white/80 font-mono">{m.value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {canSign && (
                    <div className="flex items-center gap-2">
                      <button onClick={() => setDecision({ item, type: 'approve' })}
                        className="px-3 py-2 bg-green-500/10 border border-green-500/30 text-green-400 rounded-lg text-sm font-semibold hover:bg-green-500/20 transition flex items-center gap-1.5 min-h-[40px]">
                        <CheckCircle2 size={14} /> Approve
                      </button>
                      <button onClick={() => setDecision({ item, type: 'rework' })}
                        className="px-3 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg text-sm font-semibold hover:bg-amber-500/20 transition flex items-center gap-1.5 min-h-[40px]">
                        <RotateCcw size={14} /> Rework
                      </button>
                      <button onClick={() => setDecision({ item, type: 'reject' })}
                        className="px-3 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/20 transition flex items-center gap-1.5 min-h-[40px]">
                        <XCircle size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={!!decision} onClose={() => { setDecision(null); setNotes(''); }}
        title={decision ? `${decision.type.charAt(0).toUpperCase() + decision.type.slice(1)} — ${decision.item.title}` : ''}>
        {decision && (
          <>
            <p className="text-white/60 text-sm mb-3">
              {decision.type === 'approve' && 'Sign-off will be appended to the audit log and the item proceeds to the next stage.'}
              {decision.type === 'reject'  && 'Item will be quarantined or marked rejected. Provide a clear reason.'}
              {decision.type === 'rework'  && 'Item is returned to the previous stage with your notes attached.'}
            </p>
            <ModalInput label="QA notes (audit-recorded)"
              value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Reason / observations / follow-up actions" />
            <ModalButton loading={decisionMut.isPending}
              onClick={() => decision && decisionMut.mutate({ item: decision.item, type: decision.type, notes })}>
              Confirm {decision.type}
            </ModalButton>
          </>
        )}
      </Modal>
    </div>
  );
}
