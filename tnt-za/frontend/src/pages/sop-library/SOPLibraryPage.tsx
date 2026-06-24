import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { Plus, Check, FileText, Shield, ChevronDown, Search, GitBranch, Scale, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import api from '../../services/api';

// The regulatory bodies the system grounds to. QA is the verified human who cites them.
const FRAMEWORKS: { id: string; label: string; color: string }[] = [
  { id: 'EU_GMP', label: 'EU-GMP / EudraLex', color: 'text-cyan-300' },
  { id: 'SAHPRA', label: 'SAHPRA', color: 'text-green-300' },
  { id: 'SAPC', label: 'SA Pharmacy Council', color: 'text-amber-300' },
  { id: 'HPCSA', label: 'HPCSA', color: 'text-purple-300' },
  { id: 'SA_LAW', label: 'SA Law (Medicines Act)', color: 'text-rose-300' },
  { id: 'OTHER', label: 'Other', color: 'text-white/50' },
];

const SOP_CATEGORIES = [
  { id: 'SAHPRA', label: 'SAHPRA Compliance', color: 'text-red-400', border: 'border-red-500/20' },
  { id: 'CULTIVATION', label: 'Cultivation', color: 'text-green-400', border: 'border-green-500/20' },
  { id: 'PROCESSING', label: 'Processing', color: 'text-amber-400', border: 'border-amber-500/20' },
  { id: 'QA', label: 'Quality Assurance', color: 'text-cyan-400', border: 'border-cyan-500/20' },
  { id: 'CLEANING', label: 'Cleaning & Hygiene', color: 'text-pink-400', border: 'border-pink-500/20' },
  { id: 'MAINTENANCE', label: 'Maintenance', color: 'text-orange-400', border: 'border-orange-500/20' },
  { id: 'QUARANTINE', label: 'Quarantine', color: 'text-red-300', border: 'border-red-500/15' },
  { id: 'GENERAL', label: 'General', color: 'text-white/40', border: 'border-white/10' },
];

export default function SOPLibraryPage() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [sp] = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState(sp.get('ref') || '');   // header ↗ deep-link lands here
  const [catFilter, setCatFilter] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ title: '', content: '', category: 'GENERAL' });
  // QA console state
  const isQA = hasMinLevel(3);
  const [showSources, setShowSources] = useState(false);
  const [showAddSource, setShowAddSource] = useState(false);
  const [sourceForm, setSourceForm] = useState({ framework: 'SAHPRA', title: '', chapter: '', officialUrl: '', notes: '' });
  const [editTpl, setEditTpl] = useState<any>(null);
  const [tplItems, setTplItems] = useState<{ item: string; required: boolean }[]>([]);

  // SOPs from QMS
  const { data: sops, isLoading } = useQuery({
    queryKey: ['sops'],
    queryFn: () => api.get('/qms/sops').then(r => r.data.sops),
  });

  // Task templates (linked to SOPs as checklists)
  const { data: templates } = useQuery({
    queryKey: ['task-templates'],
    queryFn: () => api.get('/tasks/templates').then(r => r.data.templates),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/qms/sops', { ...form, facilityId: 'default' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sops'] }); setShowCreate(false); setForm({ title: '', content: '', category: 'GENERAL' }); addToast('success', 'SOP created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const seedMut = useMutation({
    mutationFn: () => api.post('/tasks/templates/seed-sahpra'),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['task-templates'] }); addToast('success', `${res.data.created} SAHPRA templates created`); },
  });

  const syncGovernanceMut = useMutation({
    mutationFn: () => api.post('/qms/sops/sync-governance'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['sops'] });
      qc.invalidateQueries({ queryKey: ['task-templates'] });
      addToast('success', `${res.data.synced} SOPs synced to roles/checklists/training`);
    },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  // ── Regulatory source registry (all frameworks) ──
  const { data: registry } = useQuery({
    queryKey: ['compliance-registry'],
    queryFn: () => api.get('/qms/eu-gmp-registry').then(r => r.data),
  });
  const sources: any[] = registry?.sources || [];
  const addSourceMut = useMutation({
    mutationFn: () => api.post('/qms/sources', sourceForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-registry'] }); setShowAddSource(false); setSourceForm({ framework: 'SAHPRA', title: '', chapter: '', officialUrl: '', notes: '' }); addToast('success', 'Source added (draft — activate once verified)'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const activateSourceMut = useMutation({
    mutationFn: (s: any) => api.patch(`/qms/sources/${s.id}`, { status: s.status === 'ACTIVE' ? 'DRAFT_TRACKED' : 'ACTIVE' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['compliance-registry'] }); addToast('success', 'Source status updated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  // ── Form/template checklist editor ──
  const openTplEditor = (t: any) => { setEditTpl(t); setTplItems(Array.isArray(t.checklist) ? t.checklist.map((c: any) => ({ item: c.item, required: !!c.required })) : []); };
  const updateTplMut = useMutation({
    mutationFn: () => api.patch(`/tasks/templates/${editTpl.id}`, { checklist: tplItems.filter(i => i.item.trim()) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['task-templates'] }); setEditTpl(null); addToast('success', 'Form checklist updated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  // ── SOP content edit (QA amend + version bump server-side) ──
  const [sopEdit, setSopEdit] = useState<string | null>(null);
  const updateSopMut = useMutation({
    mutationFn: () => api.patch(`/qms/sops/${selectedSOP.id}`, { content: sopEdit }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sops'] }); qc.invalidateQueries({ queryKey: ['sop-versions'] }); setSopEdit(null); setSelectedSOP(null); addToast('success', 'SOP amended (new version)'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  // ── Version history (snapshot-before-overwrite safeguard) ──
  const [showVersions, setShowVersions] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<string | null>(null);   // versionId armed for restore
  const { data: sopVersions } = useQuery({
    queryKey: ['sop-versions', selectedSOP?.id],
    queryFn: async () => (await api.get(`/qms/sops/${selectedSOP.id}/versions`)).data.versions as any[],
    enabled: !!selectedSOP?.id && showVersions,
  });
  const restoreSopMut = useMutation({
    mutationFn: (content: string) => api.patch(`/qms/sops/${selectedSOP.id}`, { content }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sops'] }); qc.invalidateQueries({ queryKey: ['sop-versions'] }); setSelectedSOP(null); setShowVersions(false); setConfirmRestore(null); addToast('success', 'Previous version restored (new version created)'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  // Filter SOPs
  const filteredSOPs = sops?.filter((s: any) => {
    if (searchTerm && !s.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }) || [];

  // Filter templates
  const filteredTemplates = templates?.filter((t: any) => {
    if (searchTerm && !t.title.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (catFilter && t.category !== catFilter) return false;
    return true;
  }) || [];

  // Group templates by category
  const groupedTemplates = SOP_CATEGORIES.map(cat => ({
    ...cat,
    templates: filteredTemplates.filter((t: any) => t.category === cat.id),
  })).filter(g => g.templates.length > 0 || catFilter === g.id);

  const toggleCat = (id: string) => setExpandedCats(s => ({ ...s, [id]: !s[id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">SOP Library</h1>
          <p className="text-sm text-white/40">Standard Operating Procedures — SAHPRA Compliance</p>
        </div>
        <div className="flex gap-2">
          {isQA && (
            <button onClick={() => setShowSources(s => !s)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition min-h-[40px] flex items-center gap-1.5 border ${showSources ? 'bg-primary text-white border-primary' : 'bg-white/5 border-white/10 text-white/60 hover:text-white'}`}>
              <Scale size={13} /> Regulatory Sources
            </button>
          )}
          {/* Setup-only actions — admin (level 4), kept out of QA's day-to-day view */}
          {hasMinLevel(4) && (
            <button onClick={() => syncGovernanceMut.mutate()} disabled={syncGovernanceMut.isPending}
              className="px-3 py-2 bg-primary/10 border border-primary/20 text-primary rounded-xl text-xs font-semibold hover:bg-primary/20 transition min-h-[40px] flex items-center gap-1.5">
              <GitBranch size={13} /> Sync Governance
            </button>
          )}
          {hasMinLevel(4) && (
            <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
              className="px-3 py-2 bg-white/5 border border-white/10 text-white/40 rounded-xl text-xs font-semibold hover:bg-white/10 transition min-h-[40px]">
              Seed templates
            </button>
          )}
          {isQA && (
            <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
              <Plus size={16} /> New SOP
            </button>
          )}
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
          <input placeholder="Search SOPs..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[40px]" />
        </div>
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 text-xs min-h-[40px]">
          <option value="">All Categories</option>
          {SOP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <div className="text-xl font-bold font-mono text-white">{sops?.length || 0}</div>
          <div className="text-[10px] text-white/20">Active SOPs</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <div className="text-xl font-bold font-mono text-white">{templates?.length || 0}</div>
          <div className="text-[10px] text-white/20">Task Templates</div>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <div className="text-xl font-bold font-mono text-white">{templates?.filter((t: any) => t.category === 'SAHPRA').length || 0}</div>
          <div className="text-[10px] text-white/20">SAHPRA SOPs</div>
        </div>
      </div>

      {/* ── Regulatory Sources registry (QA-owned grounding) ── */}
      {showSources && (
        <div className="bg-primary/[0.04] border border-primary/20 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Scale size={15} className="text-primary" /><span className="text-sm font-semibold text-white/70">Regulatory Sources</span><span className="text-[11px] text-white/30">{sources.length} · the documents the system grounds to</span></div>
            {isQA && <button onClick={() => setShowAddSource(true)} className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 flex items-center gap-1"><Plus size={12} /> Add source</button>}
          </div>
          {FRAMEWORKS.map(fw => {
            const fwSources = sources.filter(s => (s.framework || 'EU_GMP') === fw.id);
            if (!fwSources.length) return null;
            return (
              <div key={fw.id}>
                <div className={`text-[11px] font-bold uppercase tracking-wide mb-1.5 ${fw.color}`}>{fw.label} <span className="text-white/20">· {fwSources.length}</span></div>
                <div className="space-y-1.5">
                  {fwSources.map(s => {
                    const draft = s.status !== 'ACTIVE';
                    return (
                      <div key={s.id} className="flex items-center gap-2 bg-black/20 border border-white/[0.06] rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-white/80 truncate">{s.title}{s.chapter ? ` · ${s.chapter}` : ''}</div>
                          <div className="text-[10px] text-white/30 font-mono truncate">{s.sourceId}</div>
                        </div>
                        {s.officialUrl && <a href={s.officialUrl} target="_blank" rel="noreferrer" className="text-white/40 hover:text-primary flex-shrink-0" title="Open official document"><ExternalLink size={13} /></a>}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${draft ? 'bg-amber-500/15 text-amber-300' : 'bg-green-500/15 text-green-300'}`}>{draft ? 'DRAFT' : 'ACTIVE'}</span>
                        {isQA && (
                          <button onClick={() => activateSourceMut.mutate(s)} disabled={activateSourceMut.isPending} className={`text-[10px] px-2 py-1 rounded-md flex-shrink-0 font-semibold border ${draft ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-white/5 border-white/15 text-white/40'}`}>{draft ? '✓ Verify & activate' : 'Set draft'}</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          <p className="text-[10px] text-white/30">Drafts are real documents pending QA sign-off. Only QA activates a source — the system never authors a citation.</p>
        </div>
      )}

      {isLoading ? <SkeletonTable rows={5} /> : (
        <>
          {/* SOPs — formal documents */}
          {filteredSOPs.length > 0 && (
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                <FileText size={14} className="text-primary" />
                <span className="text-sm font-semibold text-white/60">Formal SOPs ({filteredSOPs.length})</span>
              </div>
              {filteredSOPs.map((s: any) => (
                <div key={s.id} onClick={() => { setSelectedSOP(s); setSopEdit(null); }}
                  className="px-4 py-3 border-b border-white/[0.03] last:border-0 hover:bg-white/[0.03] cursor-pointer transition">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-white font-medium">{s.title}</div>
                      <div className="text-xs text-white/20 mt-0.5">v{s.version} — {s._count?.acknowledgements || 0} acknowledgements</div>
                    </div>
                    <Check size={14} className="text-primary" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Task Templates — accordion by category */}
          <div className="space-y-2">
            {groupedTemplates.map(group => {
              const isOpen = expandedCats[group.id] !== false;
              return (
                <div key={group.id} className={`border rounded-xl overflow-hidden ${group.border}`}>
                  <button onClick={() => toggleCat(group.id)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition">
                    <div className="flex items-center gap-2">
                      <ChevronDown size={14} className={`text-white/20 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                      <Shield size={14} className={group.color} />
                      <span className={`text-sm font-semibold ${group.color}`}>{group.label}</span>
                    </div>
                    <span className="text-xs text-white/15 font-mono">{group.templates.length}</span>
                  </button>

                  {isOpen && group.templates.length > 0 && (
                    <div className="border-t border-white/5">
                      {group.templates.map((t: any) => (
                        <div key={t.id} className="px-4 py-3 border-b border-white/[0.03] last:border-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="text-sm text-white font-medium">{t.title}</div>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-white/20">
                                <span>Role: {t.roleRequired?.replace(/_/g, ' ')}</span>
                                <span>Freq: {t.frequency}</span>
                                {t.autoCreate && <span className="text-amber-400">Auto-create</span>}
                                <span>{(t.checklist as any[])?.length || 0} items</span>
                              </div>
                            </div>
                            {isQA && (
                              <button onClick={() => openTplEditor(t)} className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-primary hover:border-primary/40 text-[11px] font-semibold flex items-center gap-1 flex-shrink-0"><Pencil size={11} /> Edit form</button>
                            )}
                          </div>
                          {/* Checklist preview */}
                          {t.checklist && (
                            <div className="mt-2 space-y-1">
                              {(t.checklist as any[]).slice(0, 4).map((item: any, i: number) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-white/30">
                                  <div className="w-3.5 h-3.5 rounded border border-white/15 flex-shrink-0" />
                                  <span>{item.item}</span>
                                  {item.required && <span className="text-red-400 text-[9px]">*</span>}
                                </div>
                              ))}
                              {(t.checklist as any[]).length > 4 && (
                                <span className="text-[10px] text-white/10">+{(t.checklist as any[]).length - 4} more items</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {isOpen && group.templates.length === 0 && (
                    <div className="px-4 py-6 text-center text-white/10 text-xs border-t border-white/5">No templates in this category</div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SOP Detail Modal */}
      <Modal open={!!selectedSOP} onClose={() => { setSelectedSOP(null); setShowVersions(false); }} title={selectedSOP?.title || 'SOP'}>
        {selectedSOP && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-primary/15 text-primary rounded-full font-mono">v{selectedSOP.version}</span>
              <span className="text-xs px-2 py-1 bg-white/5 text-white/40 rounded-full font-mono">{selectedSOP.category}</span>
              <span className="text-xs text-white/20">{selectedSOP._count?.acknowledgements || 0} staff acknowledged</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                <div className="text-[10px] text-white/25 mb-1">Required Roles</div>
                <div className="text-xs text-white/70">{(selectedSOP.rolesRequired || []).length ? selectedSOP.rolesRequired.map((r: string) => r.replace(/_/g, ' ')).join(', ') : 'Mapped by category'}</div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                <div className="text-[10px] text-white/25 mb-1">Linked Checklists</div>
                <div className="text-xs text-white/70">{templates?.filter((t: any) => t.sopId === selectedSOP.id).length || 0} task template(s)</div>
              </div>
              <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                <div className="text-[10px] text-white/25 mb-1">EU GMP Basis</div>
                <div className="text-xs text-primary">Source registry mapped</div>
              </div>
            </div>
            {sopEdit === null ? (
              <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
                <pre className="text-sm text-white/60 whitespace-pre-wrap font-sans leading-relaxed">{selectedSOP.content}</pre>
                <div className="mt-3 flex flex-wrap gap-2">
                  {isQA && <button onClick={() => setSopEdit(selectedSOP.content || '')} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-primary hover:border-primary/40 text-xs font-semibold flex items-center gap-1.5"><Pencil size={12} /> Amend SOP</button>}
                  <button onClick={() => setShowVersions(v => !v)} className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/60 hover:text-primary hover:border-primary/40 text-xs font-semibold flex items-center gap-1.5"><GitBranch size={12} /> {showVersions ? 'Hide' : 'Version history'}</button>
                </div>
                {showVersions && (
                  <div className="mt-3 border-t border-white/5 pt-3 space-y-2">
                    <div className="text-[10px] uppercase tracking-wider text-white/30">Previous versions — every amendment is snapshotted before it's overwritten</div>
                    {!sopVersions ? (
                      <div className="text-xs text-white/30">Loading…</div>
                    ) : sopVersions.length === 0 ? (
                      <div className="text-xs text-white/30">No prior versions yet. The next amendment will snapshot v{selectedSOP.version} here.</div>
                    ) : sopVersions.map((ver: any) => (
                      <div key={ver.id} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 bg-white/5 text-white/50 rounded-full font-mono">v{ver.version}</span>
                            <span className="text-white/30">{new Date(ver.createdAt).toLocaleString('en-ZA')}</span>
                          </div>
                          {isQA && (confirmRestore === ver.id
                            ? <button onClick={() => restoreSopMut.mutate(ver.content)} disabled={restoreSopMut.isPending} className="px-2.5 py-1 rounded-lg bg-primary/20 border border-primary/50 text-primary text-[11px] font-semibold disabled:opacity-50">Confirm restore →</button>
                            : <button onClick={() => setConfirmRestore(ver.id)} className="px-2.5 py-1 rounded-lg bg-primary/10 border border-primary/30 text-primary hover:bg-primary/20 text-[11px] font-semibold">Restore</button>)}
                        </div>
                        <pre className="mt-2 text-[11px] text-white/40 whitespace-pre-wrap font-sans leading-relaxed max-h-32 overflow-y-auto">{ver.content}</pre>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <textarea value={sopEdit} onChange={e => setSopEdit(e.target.value)} className="w-full px-4 py-3 bg-dark border border-primary/30 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[200px] resize-y" />
                <div className="flex gap-2 mt-2">
                  <ModalButton loading={updateSopMut.isPending} onClick={() => updateSopMut.mutate()} disabled={!sopEdit?.trim()}>Save amendment (new version)</ModalButton>
                  <button onClick={() => setSopEdit(null)} className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white/50 text-sm">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Add Regulatory Source (QA types the citation — never fabricated) */}
      <Modal open={showAddSource} onClose={() => setShowAddSource(false)} title="Add Regulatory Source">
        <ModalSelect label="Framework / body" value={sourceForm.framework} onChange={e => setSourceForm(f => ({ ...f, framework: (e.target as HTMLSelectElement).value }))}>
          {FRAMEWORKS.filter(f => f.id !== 'EU_GMP').map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </ModalSelect>
        <ModalInput label="Document title" placeholder="e.g. SAHPRA Cannabis Cultivation Guideline" value={sourceForm.title} onChange={e => setSourceForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Section / chapter (optional)" placeholder="e.g. Section 22C(1)(b)" value={sourceForm.chapter} onChange={e => setSourceForm(f => ({ ...f, chapter: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Official URL" placeholder="https://www.sahpra.org.za/…" value={sourceForm.officialUrl} onChange={e => setSourceForm(f => ({ ...f, officialUrl: (e.target as HTMLInputElement).value }))} />
        <p className="text-[11px] text-white/30 mb-2">Saved as a draft. It becomes ACTIVE only when you verify & activate it.</p>
        <ModalButton loading={addSourceMut.isPending} onClick={() => addSourceMut.mutate()} disabled={!sourceForm.title || !sourceForm.officialUrl}>Add source (draft)</ModalButton>
      </Modal>

      {/* Form / checklist editor (QA edits the actual checklist lines) */}
      <Modal open={!!editTpl} onClose={() => setEditTpl(null)} title={editTpl ? `Edit form · ${editTpl.title}` : ''}>
        <div className="space-y-2">
          <div className="text-xs text-white/40">Checklist items — tap to edit, toggle Required, remove or add lines.</div>
          {tplItems.map((it, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={it.item} onChange={e => setTplItems(arr => arr.map((x, j) => j === i ? { ...x, item: e.target.value } : x))}
                className="flex-1 px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-sm focus:border-primary focus:outline-none" />
              <button onClick={() => setTplItems(arr => arr.map((x, j) => j === i ? { ...x, required: !x.required } : x))} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold border ${it.required ? 'bg-red-500/15 border-red-500/40 text-red-300' : 'bg-white/5 border-white/15 text-white/40'}`}>{it.required ? 'REQ' : 'opt'}</button>
              <button onClick={() => setTplItems(arr => arr.filter((_, j) => j !== i))} className="p-1.5 rounded-lg text-white/30 hover:text-red-400"><Trash2 size={13} /></button>
            </div>
          ))}
          <button onClick={() => setTplItems(arr => [...arr, { item: '', required: false }])} className="text-xs text-primary hover:text-primary-light flex items-center gap-1"><Plus size={12} /> Add line</button>
          <ModalButton loading={updateTplMut.isPending} onClick={() => updateTplMut.mutate()} disabled={!tplItems.some(i => i.item.trim())}>Save form ({tplItems.filter(i => i.item.trim()).length} items)</ModalButton>
        </div>
      </Modal>

      {/* Create SOP Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Create SOP">
        <ModalInput label="Title" placeholder="e.g. Harvest & Weighing Procedure" value={form.title} onChange={e => setForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: (e.target as HTMLSelectElement).value }))}>
          {SOP_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </ModalSelect>
        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-1.5">Content</label>
          <textarea placeholder="SOP content — steps, procedures, requirements..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[150px] resize-y" />
        </div>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.title || !form.content}>
          Create SOP
        </ModalButton>
      </Modal>
    </div>
  );
}
