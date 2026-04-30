import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { BookOpen, Plus, Check, FileText, Shield, ChevronDown, Search } from 'lucide-react';
import api from '../../services/api';

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
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSOP, setSelectedSOP] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState({ title: '', content: '', category: 'GENERAL' });

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
          {hasMinLevel(3) && (
            <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
              className="px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/20 transition min-h-[40px]">
              Seed SAHPRA SOPs
            </button>
          )}
          {hasMinLevel(3) && (
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
                <div key={s.id} onClick={() => setSelectedSOP(s)}
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
                              </div>
                            </div>
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
      <Modal open={!!selectedSOP} onClose={() => setSelectedSOP(null)} title={selectedSOP?.title || 'SOP'}>
        {selectedSOP && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-primary/15 text-primary rounded-full font-mono">v{selectedSOP.version}</span>
              <span className="text-xs text-white/20">{selectedSOP._count?.acknowledgements || 0} staff acknowledged</span>
            </div>
            <div className="bg-white/[0.03] border border-white/5 rounded-xl p-4">
              <pre className="text-sm text-white/60 whitespace-pre-wrap font-sans leading-relaxed">{selectedSOP.content}</pre>
            </div>
          </div>
        )}
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
