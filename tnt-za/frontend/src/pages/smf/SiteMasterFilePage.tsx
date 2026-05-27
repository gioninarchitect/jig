import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import {
  ScrollText, ChevronDown, FileSignature, Stamp, BadgeCheck, AlertTriangle, Clock, Pencil, X, Download, Eye, Sparkles, Loader2, CheckCircle2,
} from 'lucide-react';
import MarkdownLite from '../../components/MarkdownLite';
import api from '../../services/api';

// =====================================================================
// Site Master File — governed evidence record mapped to EU GMP (3-step sign-off chain)
//
// DRAFT → RP_SIGNED → DAR_SIGNED → AR_APPROVED
// Each AR approval freezes a SMFSectionVersion snapshot for the regulator PDF.
// =====================================================================

type Status = 'DRAFT' | 'RP_SIGNED' | 'DAR_SIGNED' | 'AR_APPROVED';

interface Section {
  id: string;
  sectionId: string;
  chapter: string;
  title: string;
  bodyText: string | null;
  status: Status;
  rpSignedById: string | null;  rpSignedAt: string | null;
  darSignedById: string | null; darSignedAt: string | null;
  arApprovedById: string | null; arApprovedAt: string | null;
  staleSince: string | null;
  staleReason: string | null;
  composedDraft?: string | null;
  composedDraftAt?: string | null;
  composedThinking?: string | null;
  unit: string;
  updatedAt: string;
}

const CHAPTER_LABELS: Record<string, string> = {
  'C.1': 'C.1 — General Information',
  'C.2': 'C.2 — Personnel',
  'C.3': 'C.3 — Premises and Equipment',
  'C.4': 'C.4 — Documentation',
  'C.5': 'C.5 — Production',
  'C.6': 'C.6 — Quality Control',
};

const STATUS_META: Record<Status, { label: string; cls: string; dot: string; icon: any }> = {
  DRAFT:        { label: 'Draft',        cls: 'bg-white/5 text-white/40 border-white/10',        dot: 'bg-white/30',  icon: Pencil },
  RP_SIGNED:    { label: 'RP Signed',    cls: 'bg-rose-500/10 text-rose-300 border-rose-500/30', dot: 'bg-rose-400',  icon: Stamp },
  DAR_SIGNED:   { label: 'DAR Signed',   cls: 'bg-blue-500/10 text-blue-300 border-blue-500/30', dot: 'bg-blue-400',  icon: FileSignature },
  AR_APPROVED:  { label: 'AR Approved',  cls: 'bg-green-500/10 text-green-300 border-green-500/30', dot: 'bg-green-400', icon: BadgeCheck },
};

export default function SiteMasterFilePage() {
  const { hasRole, hasMinLevel, user } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Section | null>(null);
  const [edit, setEdit] = useState(false);
  const [bodyDraft, setBodyDraft] = useState('');
  const [signNotes, setSignNotes] = useState('');
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({ 'C.1': true, 'C.2': true, 'C.3': true, 'C.4': true, 'C.5': true, 'C.6': true });

  const { data, isLoading } = useQuery({
    queryKey: ['smf-sections'],
    queryFn: () => api.get('/site-master-file/sections').then(r => r.data),
  });

  const sections: Section[] = data?.sections ?? [];
  const summary = data?.summary;

  const editMut = useMutation({
    mutationFn: () => api.patch(`/site-master-file/sections/${selected!.id}`, { bodyText: bodyDraft }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['smf-sections'] });
      setEdit(false);
      addToast('success', 'Saved · sign-off chain reset to Draft');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed'),
  });

  const composeMut = useMutation({
    mutationFn: () => api.post(`/site-master-file/sections/${selected!.id}/compose`),
    onSuccess: async () => {
      const fresh = await api.get(`/site-master-file/sections/${selected!.id}`);
      setSelected(fresh.data.section);
      qc.invalidateQueries({ queryKey: ['smf-sections'] });
      addToast('success', 'AI draft ready · review and apply or discard');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Compose failed'),
  });
  const applyDraftMut = useMutation({
    mutationFn: () => api.post(`/site-master-file/sections/${selected!.id}/apply-draft`),
    onSuccess: async () => {
      const fresh = await api.get(`/site-master-file/sections/${selected!.id}`);
      setSelected(fresh.data.section);
      qc.invalidateQueries({ queryKey: ['smf-sections'] });
      addToast('success', 'Draft applied · section reset to DRAFT for re-sign');
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Apply failed'),
  });
  const discardDraftMut = useMutation({
    mutationFn: () => api.post(`/site-master-file/sections/${selected!.id}/discard-draft`),
    onSuccess: async () => {
      const fresh = await api.get(`/site-master-file/sections/${selected!.id}`);
      setSelected(fresh.data.section);
      qc.invalidateQueries({ queryKey: ['smf-sections'] });
      addToast('success', 'Draft discarded');
    },
  });

  const signMut = useMutation({
    mutationFn: (step: 'rp' | 'dar' | 'ar') => {
      const path = step === 'rp' ? 'sign-rp' : step === 'dar' ? 'sign-dar' : 'approve-ar';
      return api.post(`/site-master-file/sections/${selected!.id}/${path}`, { notes: signNotes || undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['smf-sections'] });
      setSignNotes('');
      addToast('success', 'Signed');
      // Re-fetch the selected section so the modal reflects the new state
      api.get(`/site-master-file/sections/${selected!.id}`).then(r => setSelected(r.data.section));
    },
    onError: (e: any) => addToast('error', e.response?.data?.error ?? 'Failed'),
  });

  // Group by chapter
  const grouped = sections.reduce((acc, s) => {
    (acc[s.chapter] = acc[s.chapter] || []).push(s);
    return acc;
  }, {} as Record<string, Section[]>);
  const chapters = Object.keys(grouped).sort();

  const isRP = hasRole('RESPONSIBLE_PHARMACIST');
  const isDarAr = hasMinLevel(4);  // TENANT_ADMIN+ covers DAR + AR
  const canEdit = hasMinLevel(4);

  function openSection(s: Section) {
    setSelected(s);
    setBodyDraft(s.bodyText ?? '');
    setEdit(false);
    setSignNotes('');
  }

  function progressFor(s: Section): number {
    if (s.status === 'AR_APPROVED') return 3;
    if (s.status === 'DAR_SIGNED') return 2;
    if (s.status === 'RP_SIGNED') return 1;
    return 0;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText size={20} className="text-primary" /> Site Master File
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            EU GMP mapped evidence record · Cannabis · v4.6 baseline · {summary?.total ?? '—'} canonical sections · sign-off chain RP → DAR → AR
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('/api/site-master-file', '_blank')}
            className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px]"
          >
            <Eye size={12} /> Live Snapshot
          </button>
          <button
            onClick={() => window.print()}
            className="px-3 py-2 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 min-h-[36px]"
          >
            <Download size={12} /> Export PDF
          </button>
        </div>
      </div>

      {/* Status summary */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <SummaryCard label="Total" value={summary.total} tone="info" />
          <SummaryCard label="Draft" value={summary.byStatus?.DRAFT ?? 0} tone="muted" />
          <SummaryCard label="RP Signed" value={summary.byStatus?.RP_SIGNED ?? 0} tone="rose" />
          <SummaryCard label="DAR Signed" value={summary.byStatus?.DAR_SIGNED ?? 0} tone="blue" />
          <SummaryCard label="AR Approved" value={summary.byStatus?.AR_APPROVED ?? 0} tone="green" />
        </div>
      )}

      {isLoading && <SkeletonTable rows={6} />}

      {/* Chapters */}
      {!isLoading && chapters.map(ch => {
        const open = openChapters[ch] !== false;
        const list = grouped[ch];
        const approvedCount = list.filter(s => s.status === 'AR_APPROVED').length;
        return (
          <div key={ch} className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02]">
            <button
              onClick={() => setOpenChapters(c => ({ ...c, [ch]: !open }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.04] transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <ChevronDown size={14} className={`text-white/30 transition-transform ${open ? '' : '-rotate-90'}`} />
                <span className="text-sm font-semibold text-white">{CHAPTER_LABELS[ch] ?? ch}</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/40 font-mono">
                <span className="text-green-400">{approvedCount}</span>
                <span className="text-white/20">/</span>
                <span>{list.length}</span>
                <span className="text-white/30 ml-1">approved</span>
              </div>
            </button>
            {open && (
              <div className="border-t border-white/[0.04]">
                {list.map(s => {
                  const meta = STATUS_META[s.status];
                  const prog = progressFor(s);
                  return (
                    <button
                      key={s.id}
                      onClick={() => openSection(s)}
                      className="w-full px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.03] transition text-left flex items-start gap-3"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2 ${meta.dot}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-mono text-xs text-white/40">{s.sectionId}</span>
                          <span className="text-sm text-white/85 truncate">{s.title}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {/* Sign-off progress bar */}
                          <div className="flex items-center gap-0.5">
                            <Pip on={prog >= 1} colour="rose" />
                            <span className="text-[8px] text-white/20">→</span>
                            <Pip on={prog >= 2} colour="blue" />
                            <span className="text-[8px] text-white/20">→</span>
                            <Pip on={prog >= 3} colour="green" />
                          </div>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${meta.cls}`}>{meta.label}</span>
                          {s.staleSince && (
                            <span className="text-[10px] text-amber-300 flex items-center gap-1"><AlertTriangle size={9} /> stale</span>
                          )}
                          {!s.bodyText && (
                            <span className="text-[10px] text-white/25">empty body</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {/* Section detail modal */}
      <Modal open={!!selected} onClose={() => { setSelected(null); setEdit(false); }} title={selected ? `${selected.sectionId} — ${selected.title}` : ''}>
        {selected && (
          <div className="space-y-4">
            {/* Status row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_META[selected.status].cls}`}>
                {STATUS_META[selected.status].label}
              </span>
              <span className="text-xs text-white/30 font-mono">{selected.sectionId}</span>
              <span className="text-xs text-white/30">·</span>
              <span className="text-xs text-white/30">Updated {new Date(selected.updatedAt).toLocaleString('en-ZA')}</span>
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">Body</label>
                {canEdit && !edit && (
                  <button onClick={() => setEdit(true)} className="text-xs text-primary flex items-center gap-1 hover:text-primary-light">
                    <Pencil size={11} /> Edit
                  </button>
                )}
                {edit && (
                  <button onClick={() => { setEdit(false); setBodyDraft(selected.bodyText ?? ''); }} className="text-xs text-white/40 hover:text-white flex items-center gap-1">
                    <X size={11} /> Cancel
                  </button>
                )}
              </div>
              {edit ? (
                <>
                  <textarea
                    value={bodyDraft}
                    onChange={e => setBodyDraft(e.target.value)}
                    placeholder="Section text... (saving resets sign-off chain to Draft)"
                    className="w-full px-3 py-2.5 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[160px] resize-y"
                  />
                  <div className="text-[10px] text-amber-300 mt-1.5 flex items-center gap-1">
                    <AlertTriangle size={10} /> Saving will reset all signatures (RP / DAR / AR) — section returns to Draft
                  </div>
                  <button
                    onClick={() => editMut.mutate()}
                    disabled={editMut.isPending || bodyDraft === (selected.bodyText ?? '')}
                    className="mt-3 w-full py-3 bg-primary hover:bg-primary-light text-white rounded-xl font-semibold text-sm disabled:opacity-40 transition"
                  >
                    {editMut.isPending ? 'Saving…' : 'Save (resets sign-off chain)'}
                  </button>
                </>
              ) : (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-3 text-sm text-white/75 leading-relaxed whitespace-pre-wrap min-h-[80px]">
                  {selected.bodyText || <span className="text-white/25">No body text yet — RP to draft</span>}
                </div>
              )}

              {/* AI Composer button — only visible to RP+ when not editing */}
              {canEdit && !edit && (
                <button
                  onClick={() => composeMut.mutate()}
                  disabled={composeMut.isPending}
                  className="mt-2 px-3 py-2 bg-gradient-to-r from-primary/15 to-amber-500/10 hover:from-primary/25 border border-primary/25 text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
                >
                  {composeMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                  {composeMut.isPending
                    ? 'Composer thinking… (~15s)'
                    : selected.composedDraft ? 'Re-draft with AI' : 'Draft with AI (Opus 4.7)'}
                </button>
              )}
            </div>

            {/* AI Composed Draft — RED watermark · NOT YET APPROVED */}
            {selected.composedDraft && !edit && (
              <div className="bg-red-500/[0.04] border-2 border-red-500/40 rounded-lg overflow-hidden">
                {/* Bold red watermark header — impossible to mistake for an approved record */}
                <div className="bg-red-500/15 border-b border-red-500/30 px-3 py-2 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-300 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-red-200 tracking-wide uppercase">
                      🤖 AI-GENERATED · NOT YET APPROVED
                    </div>
                    <div className="text-[10px] text-red-200/70">
                      Opus 4.7 proposal · review carefully before applying · all 3 sign-offs reset on Apply
                      {selected.composedDraftAt && (
                        <> · drafted {new Date(selected.composedDraftAt).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'short' })}</>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-3 space-y-3">
                  <MarkdownLite text={selected.composedDraft} className="text-sm" />
                  {canEdit && (
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => applyDraftMut.mutate()}
                        disabled={applyDraftMut.isPending}
                        className="flex-1 px-3 py-2 bg-green-500/15 hover:bg-green-500/25 border border-green-500/30 text-green-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <CheckCircle2 size={11} /> Apply (resets sign-off chain)
                      </button>
                      <button
                        onClick={() => discardDraftMut.mutate()}
                        disabled={discardDraftMut.isPending}
                        className="flex-1 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                      >
                        <X size={11} /> Discard
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sign-off chain */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-white/40 font-semibold mb-1.5 block">Sign-off chain</label>
              <div className="space-y-2">
                <SignRow label="RP — Responsible Pharmacist" who="Berne Swart" signedAt={selected.rpSignedAt} colour="rose" />
                <SignRow label="DAR — Deputy Authorised Rep" who="Coenie Venter" signedAt={selected.darSignedAt} colour="blue" />
                <SignRow label="AR — Authorised Representative" who="Ilse Venter" signedAt={selected.arApprovedAt} colour="green" />
              </div>
            </div>

            {/* Action buttons (role-gated, in order) */}
            {!edit && (
              <div className="space-y-3 pt-1">
                <textarea
                  placeholder="Optional sign-off notes..."
                  value={signNotes}
                  onChange={e => setSignNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white/80 text-sm focus:border-primary focus:outline-none min-h-[60px] resize-y"
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {/* RP can sign DRAFT */}
                  {isRP && selected.status === 'DRAFT' && (
                    <ChainButton onClick={() => signMut.mutate('rp')} loading={signMut.isPending} icon={Stamp} colour="rose" label="RP Sign" />
                  )}
                  {/* DAR can sign after RP */}
                  {isDarAr && selected.status === 'RP_SIGNED' && (
                    <ChainButton onClick={() => signMut.mutate('dar')} loading={signMut.isPending} icon={FileSignature} colour="blue" label="DAR Sign" />
                  )}
                  {/* AR can approve after DAR */}
                  {isDarAr && selected.status === 'DAR_SIGNED' && (
                    <ChainButton onClick={() => signMut.mutate('ar')} loading={signMut.isPending} icon={BadgeCheck} colour="green" label="AR Approve & Freeze v" />
                  )}
                  {selected.status === 'AR_APPROVED' && (
                    <div className="col-span-3 bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center text-sm text-green-300 flex items-center justify-center gap-2">
                      <BadgeCheck size={14} /> Section fully approved — snapshot frozen for regulator PDF
                    </div>
                  )}
                  {/* Helpful hint when user can't act */}
                  {!isRP && !isDarAr && (
                    <div className="col-span-3 text-xs text-white/30 text-center">Sign-off requires RP, DAR, or AR role</div>
                  )}
                </div>
              </div>
            )}

            {/* Stale warning if set */}
            {selected.staleSince && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-300 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Stale since {new Date(selected.staleSince).toLocaleString('en-ZA')}</div>
                  {selected.staleReason && <div className="text-amber-200/70 mt-0.5">{selected.staleReason}</div>}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'info' | 'muted' | 'rose' | 'blue' | 'green' }) {
  const toneCls: Record<string, string> = {
    info:   'bg-white/5 border-white/10 text-white',
    muted:  'bg-white/[0.02] border-white/[0.06] text-white/60',
    rose:   'bg-rose-500/[0.05] border-rose-500/15 text-rose-300',
    blue:   'bg-blue-500/[0.05] border-blue-500/15 text-blue-300',
    green:  'bg-green-500/[0.05] border-green-500/15 text-green-300',
  };
  return (
    <div className={`rounded-xl border p-3 ${toneCls[tone]}`}>
      <div className="text-2xl font-bold font-mono leading-none">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-white/40 mt-1">{label}</div>
    </div>
  );
}

function Pip({ on, colour }: { on: boolean; colour: 'rose' | 'blue' | 'green' }) {
  const cls = on
    ? colour === 'rose' ? 'bg-rose-400'
    : colour === 'blue' ? 'bg-blue-400'
    : 'bg-green-400'
    : 'bg-white/10';
  return <span className={`w-1.5 h-1.5 rounded-full ${cls}`} />;
}

function SignRow({ label, who, signedAt, colour }: { label: string; who: string; signedAt: string | null; colour: 'rose' | 'blue' | 'green' }) {
  const signed = !!signedAt;
  const cls = signed
    ? colour === 'rose' ? 'border-rose-500/25 bg-rose-500/5'
    : colour === 'blue' ? 'border-blue-500/25 bg-blue-500/5'
    : 'border-green-500/25 bg-green-500/5'
    : 'border-white/[0.06] bg-white/[0.02]';
  return (
    <div className={`border rounded-lg px-3 py-2 flex items-center justify-between gap-3 ${cls}`}>
      <div className="min-w-0">
        <div className="text-xs text-white/70 font-medium">{label}</div>
        <div className="text-[10px] text-white/40">expected: {who}</div>
      </div>
      <div className="text-right text-[10px] flex-shrink-0">
        {signedAt ? (
          <>
            <div className="text-white/70">signed</div>
            <div className="text-white/40 font-mono">{new Date(signedAt).toLocaleString('en-ZA')}</div>
          </>
        ) : (
          <div className="text-white/25 flex items-center gap-1"><Clock size={9} /> pending</div>
        )}
      </div>
    </div>
  );
}

function ChainButton({ onClick, loading, icon: Icon, colour, label }: { onClick: () => void; loading: boolean; icon: any; colour: 'rose' | 'blue' | 'green'; label: string }) {
  const cls = colour === 'rose' ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/40 text-rose-200'
            : colour === 'blue' ? 'bg-blue-500/15 hover:bg-blue-500/25 border-blue-500/40 text-blue-200'
            : 'bg-green-500/15 hover:bg-green-500/25 border-green-500/40 text-green-200';
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`col-span-3 sm:col-span-1 px-3 py-3 rounded-xl border font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-40 ${cls}`}
    >
      <Icon size={14} /> {loading ? 'Signing…' : label}
    </button>
  );
}
