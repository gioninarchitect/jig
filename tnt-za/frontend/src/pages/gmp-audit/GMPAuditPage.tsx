import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import {
  Award, FileSearch, AlertOctagon, AlertTriangle, AlertCircle, Eye,
  ScrollText, BookOpen, FlaskConical, Trash2, Truck, ShieldAlert, CheckCircle2, Plus,
} from 'lucide-react';
import api from '../../services/api';

// =====================================================================
// GMP Partner Audit Dashboard
//
// External 3rd-party auditor scope. Visible to: GMP_PARTNER role +
// FACILITY_MANAGER+ for visibility of in-progress audits.
//
// Provides:
//   - Assigned audit engagement scope (facilities, period)
//   - Read access to: Site Master File, SOPs, deviations, CAPA, lab,
//     COAs, audit log, destruction events, transport manifests
//   - Logged GMP observations against SOPs/deviations
//   - Findings categorised by severity (Critical / Major / Minor / Observation)
//   - Sign-off audit reports
//
// Backend endpoints `POST /gmp/observations` and `POST /gmp/findings`
// are on the build list; until then those mutations error gracefully.
// =====================================================================

type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'OBSERVATION';

const SEV_META: Record<Severity, { label: string; cls: string; icon: any }> = {
  CRITICAL:    { label: 'Critical',    cls: 'bg-red-500/15 border-red-500/40 text-red-300',     icon: AlertOctagon },
  MAJOR:       { label: 'Major',       cls: 'bg-orange-500/15 border-orange-500/40 text-orange-300', icon: AlertTriangle },
  MINOR:       { label: 'Minor',       cls: 'bg-amber-500/15 border-amber-500/40 text-amber-300', icon: AlertCircle },
  OBSERVATION: { label: 'Observation', cls: 'bg-blue-500/15 border-blue-500/40 text-blue-300',   icon: Eye },
};

interface Finding {
  id: string;
  severity: Severity;
  reference: string;     // ISO clause or SOP / deviation reference
  description: string;
  observedAt: string;
  responseStatus: 'awaiting_response' | 'response_received' | 'closed';
  responseDueDate?: string;
}

export default function GMPAuditPage() {
  const { hasRole } = useRBAC();
  const user = useAuthStore(s => s.user);
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();

  const isAuditor = hasRole('GMP_PARTNER');

  // ---- Assigned engagement (mock structure — backend endpoint pending) ----
  const { data: engagement } = useQuery({
    queryKey: ['gmp-engagement', user?.id],
    queryFn: () => api.get('/gmp/engagement').then(r => r.data.engagement).catch(() => ({
      id: 'eng-2026-q2',
      reference: 'GMP-2026-Q2',
      auditor: user?.name ?? 'GMP Partner',
      facilities: ['ILCO Origin Farm — Western Cape'],
      periodStart: '2026-04-01',
      periodEnd:   '2026-04-30',
      status: 'IN_PROGRESS',
    })),
  });

  // ---- Read-only data sources for the audit ----
  const { data: sops, isLoading: sopsLoading } = useQuery({
    queryKey: ['sops'],
    queryFn: () => api.get('/qms/sops').then(r => r.data.sops ?? []),
  });
  const { data: deviations } = useQuery({
    queryKey: ['deviations', 'all'],
    queryFn: () => api.get('/qms/deviations').then(r => r.data.deviations ?? []),
  });
  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches').then(r => r.data.batches ?? []),
  });
  const { data: destructions } = useQuery({
    queryKey: ['destructions'],
    queryFn: () => api.get('/security/destructions').then(r => r.data.destructions ?? []).catch(() => []),
  });
  const { data: findings } = useQuery<Finding[]>({
    queryKey: ['gmp-findings', engagement?.id],
    queryFn: () => api.get(`/gmp/findings?engagementId=${engagement?.id}`).then(r => r.data.findings ?? []).catch(() => [
      // Fallback so the page is usable while backend is being built
    ]),
  });

  const totals = useMemo(() => {
    const f = findings ?? [];
    return {
      critical: f.filter(x => x.severity === 'CRITICAL').length,
      major:    f.filter(x => x.severity === 'MAJOR').length,
      minor:    f.filter(x => x.severity === 'MINOR').length,
      obs:      f.filter(x => x.severity === 'OBSERVATION').length,
      total:    f.length,
      open:     f.filter(x => x.responseStatus !== 'closed').length,
    };
  }, [findings]);

  const [showFinding, setShowFinding] = useState(false);
  const [findingForm, setFindingForm] = useState<{ severity: Severity; reference: string; description: string; }>({
    severity: 'OBSERVATION', reference: '', description: '',
  });

  const findingMut = useMutation({
    mutationFn: () => api.post('/gmp/findings', { engagementId: engagement?.id, ...findingForm }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['gmp-findings', engagement?.id] });
      setShowFinding(false);
      setFindingForm({ severity: 'OBSERVATION', reference: '', description: '' });
      addToast('success', 'Finding logged · audit trail entry recorded');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Backend endpoint POST /gmp/findings not yet available'),
  });

  const signOffMut = useMutation({
    mutationFn: () => api.post(`/gmp/engagement/${engagement?.id}/sign-off`),
    onSuccess: () => addToast('success', 'Audit report signed off'),
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Backend endpoint not yet available'),
  });

  return (
    <div className="space-y-4">
      {/* Header + engagement metadata */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Award className="text-primary" size={24} />
            GMP Audit · {engagement?.reference ?? '—'}
          </h1>
          <p className="text-white/40 text-sm mt-1">
            External GMP partner audit dashboard · scoped, read-mostly, observations &amp; findings.
          </p>
        </div>
        {isAuditor && (
          <div className="flex gap-2">
            <button onClick={() => setShowFinding(true)}
              className="px-4 py-2 bg-primary text-dark hover:bg-primary-light rounded-lg text-sm font-semibold flex items-center gap-2 transition">
              <Plus size={16} /> Log finding
            </button>
            <button onClick={() => signOffMut.mutate()}
              className="px-4 py-2 bg-green-500/15 border border-green-500/40 text-green-300 hover:bg-green-500/25 rounded-lg text-sm font-semibold flex items-center gap-2 transition">
              <CheckCircle2 size={16} /> Sign off audit
            </button>
          </div>
        )}
      </div>

      {/* Engagement card */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
          <div><div className="text-white/40 text-xs uppercase tracking-wider">Auditor</div><div className="text-white font-semibold">{engagement?.auditor}</div></div>
          <div><div className="text-white/40 text-xs uppercase tracking-wider">Engagement</div><div className="text-primary font-mono">{engagement?.reference}</div></div>
          <div><div className="text-white/40 text-xs uppercase tracking-wider">Period</div><div className="text-white">{engagement?.periodStart} → {engagement?.periodEnd}</div></div>
          <div><div className="text-white/40 text-xs uppercase tracking-wider">Facilities</div><div className="text-white">{engagement?.facilities?.join(', ')}</div></div>
          <div><div className="text-white/40 text-xs uppercase tracking-wider">Status</div><div className="text-amber-300 font-semibold">{engagement?.status}</div></div>
        </div>
      </div>

      {/* Findings stat strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {(['CRITICAL', 'MAJOR', 'MINOR', 'OBSERVATION'] as Severity[]).map(s => {
          const Icon = SEV_META[s].icon;
          const count = s === 'CRITICAL' ? totals.critical : s === 'MAJOR' ? totals.major : s === 'MINOR' ? totals.minor : totals.obs;
          return (
            <div key={s} className={`rounded-xl border p-4 ${SEV_META[s].cls}`}>
              <div className="flex items-center gap-2 text-xs uppercase tracking-wider opacity-80"><Icon size={12} /> {SEV_META[s].label}</div>
              <div className="text-3xl font-bold mt-1">{count}</div>
            </div>
          );
        })}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs uppercase tracking-wider text-white/40">Open responses</div>
          <div className="text-3xl font-bold text-white mt-1">{totals.open}</div>
        </div>
      </div>

      {/* Findings list */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <ShieldAlert className="text-primary" size={18} /> Findings ({totals.total})
        </h2>
        {!findings || findings.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/50">
            No findings logged yet for this engagement.
          </div>
        ) : (
          <div className="space-y-2">
            {findings.map(f => {
              const meta = SEV_META[f.severity];
              const Icon = meta.icon;
              return (
                <div key={f.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className={`px-2 py-1 rounded ${meta.cls} flex items-center gap-1.5 text-xs font-bold`}>
                      <Icon size={12} /> {meta.label}
                    </div>
                    <div className="flex-1">
                      <div className="font-mono text-primary text-sm">{f.reference}</div>
                      <div className="text-white/80 text-sm mt-1">{f.description}</div>
                      <div className="text-white/40 text-xs mt-2">
                        Observed {new Date(f.observedAt).toLocaleDateString()}
                        {f.responseDueDate && ` · response due ${new Date(f.responseDueDate).toLocaleDateString()}`}
                        {' · '}{f.responseStatus.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Read-only audit-evidence panels */}
      <section>
        <h2 className="text-lg font-bold text-white mb-3">Audit evidence (read-only)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <EvidencePanel icon={ScrollText} title="Site Master File" linkTo="/site-master-file"
            count={1} subtext="Living document — current revision" />
          <EvidencePanel icon={BookOpen} title="SOP Library" linkTo="/sop-library"
            count={sops?.length} subtext={`${sops?.length ?? '—'} controlled documents`} loading={sopsLoading} />
          <EvidencePanel icon={AlertTriangle} title="Open deviations" linkTo="/qms"
            count={deviations?.length} subtext="With CAPA status" />
          <EvidencePanel icon={FlaskConical} title="Batches & COAs" linkTo="/lab"
            count={batches?.length} subtext="Lab + CoA records" />
          <EvidencePanel icon={Trash2} title="Destruction events" linkTo="/security"
            count={destructions?.length} subtext="SAPS-witnessed register" />
          <EvidencePanel icon={ScrollText} title="Audit log (immutable)" linkTo="/audit"
            count={'all'} subtext="SHA-256 hash chain · append-only" />
          <EvidencePanel icon={Truck} title="Transport manifests" linkTo="/security"
            count={'view'} subtext="GPS-tracked outbound" />
          <EvidencePanel icon={FileSearch} title="Compliance anomalies" linkTo="/compliance"
            count={'view'} subtext="Auto-detected deviations" />
        </div>
      </section>

      {/* Log finding modal */}
      <Modal open={showFinding} onClose={() => setShowFinding(false)} title="Log GMP finding">
        <ModalSelect label="Severity" value={findingForm.severity}
          onChange={e => setFindingForm({ ...findingForm, severity: e.target.value as Severity })}>
          <option value="OBSERVATION">Observation</option>
          <option value="MINOR">Minor</option>
          <option value="MAJOR">Major</option>
          <option value="CRITICAL">Critical</option>
        </ModalSelect>
        <ModalInput label="Reference (SOP / deviation / clause)"
          value={findingForm.reference}
          onChange={e => setFindingForm({ ...findingForm, reference: e.target.value })}
          placeholder="e.g. SOP-CULT-014 · or ISO 22716 § 6.3" />
        <ModalInput label="Description (audit-recorded)"
          value={findingForm.description}
          onChange={e => setFindingForm({ ...findingForm, description: e.target.value })}
          placeholder="Concise description of the observed deviation or weakness" />
        <ModalButton loading={findingMut.isPending} onClick={() => findingMut.mutate()}>
          Log finding
        </ModalButton>
      </Modal>
    </div>
  );
}

function EvidencePanel({ icon: Icon, title, linkTo, count, subtext, loading }: {
  icon: any; title: string; linkTo: string; count: number | string | undefined; subtext: string; loading?: boolean;
}) {
  return (
    <a href={linkTo} className="block rounded-xl border border-white/10 bg-white/5 p-4 hover:border-primary/40 hover:bg-white/[0.07] transition">
      <div className="flex items-start justify-between">
        <Icon className="text-primary" size={18} />
        <span className="text-2xl font-bold text-white font-mono">{loading ? '…' : (count ?? '—')}</span>
      </div>
      <div className="mt-2 text-white font-semibold text-sm">{title}</div>
      <div className="text-white/50 text-xs mt-0.5">{subtext}</div>
    </a>
  );
}
