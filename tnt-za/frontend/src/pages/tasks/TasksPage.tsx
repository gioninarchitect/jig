import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { CheckSquare, Plus, Target, Clock, Check, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-white/10 text-white/50', MEDIUM: 'bg-blue-500/20 text-blue-400',
  HIGH: 'bg-amber-500/20 text-amber-400', CRITICAL: 'bg-red-500/20 text-red-400',
};
const STATUS_ICON: Record<string, any> = {
  PENDING: Clock, IN_PROGRESS: AlertTriangle, COMPLETED: Check, OVERDUE: AlertTriangle,
};
const CATEGORIES = ['SAHPRA', 'CLEANING', 'CULTIVATION', 'PROCESSING', 'QA', 'MAINTENANCE', 'QUARANTINE', 'GENERAL'];

export default function TasksPage() {
  const { hasMinLevel } = useRBAC();
  const { user } = useAuth();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [filter, setFilter] = useState('PENDING');
  const [showMine, setShowMine] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showComplete, setShowComplete] = useState<any>(null);
  const [form, setForm] = useState({ title: '', assignedToId: user?.id ?? '', priority: 'MEDIUM', dueDate: '', category: 'CULTIVATION' });
  const [completeNotes, setCompleteNotes] = useState('');

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', filter, showMine],
    queryFn: () => api.get('/tasks', { params: { status: filter || undefined, mine: showMine || undefined } }).then(r => r.data.tasks),
  });

  const { data: kpis } = useQuery({
    queryKey: ['kpis', user?.role],
    queryFn: () => api.get('/tasks/kpis/definitions', { params: { role: user?.role } }).then(r => r.data.kpis),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.users),
    enabled: hasMinLevel(2),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/tasks', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowCreate(false); setForm({ title: '', assignedToId: user?.id ?? '', priority: 'MEDIUM', dueDate: '', category: 'CULTIVATION' }); addToast('success', 'Task created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const completeMut = useMutation({
    mutationFn: (id: string) => api.patch(`/tasks/${id}/complete`, { notes: completeNotes }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); setShowComplete(null); setCompleteNotes(''); addToast('success', 'Task completed'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const seedMut = useMutation({
    mutationFn: () => api.post('/tasks/templates/seed-sahpra'),
    onSuccess: (res) => { addToast('success', `${res.data.created} SAHPRA SOP templates created`); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const pendingCount = tasks?.filter((t: any) => t.status === 'PENDING').length || 0;
  const overdueCount = tasks?.filter((t: any) => t.status === 'OVERDUE' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED')).length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tasks & SOPs</h1>
          <div className="flex gap-3 text-xs mt-1">
            <span className="text-amber-400">{pendingCount} pending</span>
            {overdueCount > 0 && <span className="text-red-400">{overdueCount} overdue</span>}
          </div>
        </div>
        <div className="flex gap-2">
          {hasMinLevel(3) && (
            <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
              className="px-3 py-2 bg-white/5 border border-white/10 text-white/60 rounded-xl text-xs font-semibold hover:bg-white/10 transition min-h-[40px]">
              Seed SAHPRA SOPs
            </button>
          )}
          {hasMinLevel(2) && (
            <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
              <Plus size={16} /> New Task
            </button>
          )}
        </div>
      </div>

      {/* KPIs — role-specific */}
      {kpis && kpis.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {kpis.map((kpi: any) => {
            const isInverse = kpi.metric.includes('mortality') || kpi.metric.includes('anomal') || kpi.metric.includes('open') || kpi.metric.includes('quarantine') || kpi.metric.includes('deviation');
            const onTarget = isInverse ? kpi.actual <= kpi.target : kpi.actual >= kpi.target;
            const pct = kpi.target > 0 ? Math.min(100, (kpi.actual / kpi.target) * 100) : 0;
            return (
              <div key={kpi.metric} className={`rounded-xl p-3 border ${onTarget ? 'bg-white/5 border-white/10' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Target size={12} className={onTarget ? 'text-primary' : 'text-red-400'} />
                  <span className="text-[11px] text-white/40 truncate">{kpi.name}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className={`text-xl font-bold font-mono ${onTarget ? 'text-white' : 'text-red-400'}`}>{kpi.actual}</span>
                  <span className="text-xs text-white/20">/ {kpi.target}{kpi.unit}</span>
                </div>
                <div className="mt-1.5 h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${onTarget ? 'bg-primary' : 'bg-red-500'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 items-center">
        <button onClick={() => setShowMine(!showMine)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition min-h-[36px] ${showMine ? 'bg-primary text-white' : 'bg-white/5 text-white/40'}`}>
          My Tasks
        </button>
        <div className="w-px h-5 bg-white/10" />
        {['', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition min-h-[36px] ${filter === s ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Task list */}
      {isLoading ? <SkeletonTable rows={5} /> : !tasks?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No tasks found</div>
      ) : (
        <div className="space-y-2">
          {tasks.map((t: any) => {
            const Icon = STATUS_ICON[t.status] || Clock;
            const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED';
            return (
              <div key={t.id} className={`bg-white/5 border rounded-xl p-4 transition ${isOverdue ? 'border-red-500/30' : 'border-white/10'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon size={14} className={t.status === 'COMPLETED' ? 'text-green-400' : isOverdue ? 'text-red-400' : 'text-white/40'} />
                      <span className="text-sm font-medium text-white">{t.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/30 mt-1 flex-wrap">
                      {(t.category || t.template?.category) && (
                        <span className="px-1.5 py-0.5 bg-white/5 rounded text-white/40">{t.category || t.template?.category}</span>
                      )}
                      {t.dueDate && <span className={isOverdue ? 'text-red-400' : ''}>Due: {new Date(t.dueDate).toLocaleDateString('en-ZA')}</span>}
                      {t.assignerId && (() => {
                        const assigner = users?.find((u: any) => u.id === t.assignerId);
                        const assignee = users?.find((u: any) => u.id === t.assignedToId);
                        if (!assigner) return null;
                        return (
                          <span className="text-white/30">
                            <span className="text-white/40">By</span> {assigner.name}
                            {assignee && assignee.id !== assigner.id && <> <span className="text-white/40">→</span> {assignee.name}</>}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                    {t.status !== 'COMPLETED' && (
                      <button onClick={() => { setShowComplete(t); setCompleteNotes(''); }}
                        className="px-3 py-1.5 bg-primary/10 border border-primary/30 text-primary rounded-lg text-xs font-semibold hover:bg-primary/20 transition min-h-[36px]">
                        Done
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline checklist from template */}
                {t.template?.checklist && t.status !== 'COMPLETED' && (
                  <div className="mt-3 pt-3 border-t border-white/5 space-y-1.5">
                    {(t.template.checklist as any[]).slice(0, 4).map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/40">
                        <div className="w-4 h-4 rounded border border-white/20 flex-shrink-0" />
                        <span>{item.item}</span>
                        {item.required && <span className="text-red-400 text-[10px]">*</span>}
                      </div>
                    ))}
                    {(t.template.checklist as any[]).length > 4 && (
                      <span className="text-[10px] text-white/20">+{(t.template.checklist as any[]).length - 4} more items</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Complete Task Modal */}
      <Modal open={!!showComplete} onClose={() => setShowComplete(null)} title={`Complete: ${showComplete?.title || ''}`}>
        {showComplete?.template?.checklist && (
          <div className="mb-4 space-y-2">
            <label className="block text-sm text-white/50 mb-1.5">Checklist</label>
            {(showComplete.template.checklist as any[]).map((item: any, i: number) => (
              <label key={i} className="flex items-start gap-2.5 text-sm text-white/70 cursor-pointer">
                <input type="checkbox" className="mt-0.5 w-4 h-4 rounded" />
                <span>{item.item} {item.required && <span className="text-red-400">*</span>}</span>
              </label>
            ))}
          </div>
        )}
        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-1.5">Notes (optional)</label>
          <textarea placeholder="Completion notes..." value={completeNotes} onChange={e => setCompleteNotes(e.target.value)}
            className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-base focus:border-primary focus:outline-none min-h-[80px] resize-y" />
        </div>
        <ModalButton loading={completeMut.isPending} onClick={() => completeMut.mutate(showComplete.id)}>
          Mark Complete
        </ModalButton>
      </Modal>

      {/* Create Task Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <ModalInput label="Title" placeholder="e.g. Spray GH1 with neem oil" value={form.title} onChange={e => setForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        <ModalSelect label="Assign To" value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: (e.target as HTMLSelectElement).value }))}>
          {user && <option value={user.id}>Me — {user.name} ({user.role})</option>}
          {users?.filter((u: any) => u.id !== user?.id).map((u: any) => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </ModalSelect>
        <ModalSelect label="Section" value={form.category} onChange={e => setForm(f => ({ ...f, category: (e.target as HTMLSelectElement).value }))}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </ModalSelect>
        <ModalSelect label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: (e.target as HTMLSelectElement).value }))}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical</option>
        </ModalSelect>
        <ModalInput label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.title || !form.assignedToId}>
          Create Task
        </ModalButton>
      </Modal>
    </div>
  );
}
