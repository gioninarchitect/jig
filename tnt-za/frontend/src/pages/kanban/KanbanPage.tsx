import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { Plus, GripVertical, AlertTriangle, Clock, Check, User } from 'lucide-react';
import api from '../../services/api';

const COLUMNS = [
  { id: 'PENDING', label: 'To Do', dot: 'bg-white/20' },
  { id: 'IN_PROGRESS', label: 'In Progress', dot: 'bg-blue-500' },
  { id: 'COMPLETED', label: 'Done', dot: 'bg-green-500' },
];

const PRIORITY_BORDER: Record<string, string> = { LOW: 'border-l-white/10', MEDIUM: 'border-l-blue-500', HIGH: 'border-l-amber-500', CRITICAL: 'border-l-red-500' };
const PRIORITY_DOT: Record<string, string> = { LOW: 'bg-white/20', MEDIUM: 'bg-blue-500', HIGH: 'bg-amber-500', CRITICAL: 'bg-red-500' };

// Role → which workflow stages are "their team"
const ROLE_SCOPE: Record<string, { label: string; stages: string[] }> = {
  HEAD_OF_CULTIVATION: { label: 'Cultivation', stages: ['PROPAGATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST'] },
  NURSERY_MANAGER: { label: 'Nursery', stages: ['PROPAGATION'] },
  PROCESSING_MANAGER: { label: 'Processing', stages: ['WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA'] },
  RESPONSIBLE_PHARMACIST: { label: 'RP — All Processing', stages: ['WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA', 'SALE'] },
  QA_INSPECTOR: { label: 'QA', stages: ['STORE_QA'] },
  MAINTENANCE_MANAGER: { label: 'Maintenance', stages: ['FACILITY'] },
  FACILITY_SUPERVISOR: { label: 'Facility', stages: [] }, // all
  FACILITY_MANAGER: { label: 'All Ops', stages: [] }, // all
  TENANT_ADMIN: { label: 'All', stages: [] }, // all
  SUPER_ADMIN: { label: 'All', stages: [] }, // all
};

const SCOPE_TABS = [
  { id: 'mine', label: 'My Tasks' },
  { id: 'team', label: 'My Team' },
  { id: 'cultivation', label: 'Cultivation', stages: ['PROPAGATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST'] },
  { id: 'processing', label: 'Processing', stages: ['WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA'] },
  { id: 'qa', label: 'QA', stages: ['STORE_QA'] },
  { id: 'facility', label: 'Facility', stages: ['FACILITY'] },
  { id: 'all', label: 'All' },
];

const STAGES = [
  '', 'PROPAGATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST',
  'WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA',
  'DISPATCH', 'FACILITY',
];

export default function KanbanPage() {
  const { hasMinLevel, hasRole } = useRBAC();
  const { user } = useAuth();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [dragItem, setDragItem] = useState<any>(null);
  const [scope, setScope] = useState('mine');
  const [form, setForm] = useState({ title: '', assignedToId: '', priority: 'MEDIUM', dueDate: '', workflowStage: '' });

  const { data: allTasks, isLoading } = useQuery({
    queryKey: ['tasks-kanban'],
    queryFn: () => api.get('/tasks').then(r => r.data.tasks),
  });

  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.users),
    enabled: hasMinLevel(2),
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/tasks', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-kanban'] }); setShowCreate(false); setForm({ title: '', assignedToId: '', priority: 'MEDIUM', dueDate: '', workflowStage: '' }); addToast('success', 'Task created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const moveMut = useMutation({
    mutationFn: (data: { id: string; status: string }) => {
      if (data.status === 'COMPLETED') return api.patch(`/tasks/${data.id}/complete`, { notes: 'Completed from board' });
      return api.patch(`/tasks/${data.id}/status`, { status: data.status });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-kanban'] }); },
  });

  // Filter tasks by scope
  const myScope = ROLE_SCOPE[user?.role || ''];
  const filteredTasks = (allTasks || []).filter((t: any) => {
    if (scope === 'mine') return t.assignedToId === user?.id;
    if (scope === 'team') {
      if (!myScope || myScope.stages.length === 0) return true; // FM/Admin sees all
      return myScope.stages.includes(t.greenhouseId) || myScope.stages.includes(t.bayId) || !t.workflowStage || myScope.stages.includes(t.workflowStage || '');
    }
    if (scope === 'all') return true;
    const tab = SCOPE_TABS.find(s => s.id === scope);
    if (tab?.stages) return tab.stages.includes(t.workflowStage || '') || !t.workflowStage;
    return true;
  });

  // Which tabs to show based on role
  const visibleTabs = SCOPE_TABS.filter(tab => {
    if (tab.id === 'mine' || tab.id === 'team') return true;
    if (tab.id === 'all') return hasMinLevel(3);
    if (tab.id === 'cultivation') return hasMinLevel(3) || hasRole('HEAD_OF_CULTIVATION', 'CULTIVATOR');
    if (tab.id === 'processing') return hasMinLevel(3) || hasRole('PROCESSING_MANAGER');
    if (tab.id === 'qa') return hasMinLevel(3) || hasRole('QA_INSPECTOR');
    if (tab.id === 'facility') return hasMinLevel(3);
    return false;
  });

  function handleDragStart(task: any) { setDragItem(task); }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); }
  function handleDrop(columnId: string) {
    if (dragItem && dragItem.status !== columnId) {
      moveMut.mutate({ id: dragItem.id, status: columnId });
    }
    setDragItem(null);
  }
  function moveNext(task: any) {
    const order = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    const idx = order.indexOf(task.status);
    if (idx < order.length - 1) moveMut.mutate({ id: task.id, status: order[idx + 1] });
  }

  const todoCount = filteredTasks.filter((t: any) => t.status === 'PENDING').length;
  const inProgressCount = filteredTasks.filter((t: any) => t.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Task Board</h1>
          <div className="flex gap-3 text-xs mt-1">
            <span className="text-white/30">{todoCount} to do</span>
            <span className="text-blue-400">{inProgressCount} in progress</span>
          </div>
        </div>
        {hasMinLevel(2) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> New Task
          </button>
        )}
      </div>

      {/* Scope tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {visibleTabs.map(tab => (
          <button key={tab.id} onClick={() => setScope(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition min-h-[36px] ${scope === tab.id ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? <SkeletonTable rows={6} /> : (
        <>
          {/* Desktop: 3-column kanban */}
          <div className="hidden sm:grid grid-cols-3 gap-3 items-start">
            {COLUMNS.map(col => {
              const colTasks = filteredTasks.filter((t: any) => t.status === col.id);
              return (
                <div key={col.id} onDragOver={handleDragOver} onDrop={() => handleDrop(col.id)}
                  className="rounded-xl border border-white/[0.06] bg-white/[0.01] min-h-[250px]">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                      <span className="text-xs font-semibold text-white/60">{col.label}</span>
                    </div>
                    <span className="text-[10px] text-white/15 font-mono">{colTasks.length}</span>
                  </div>
                  <div className="p-1.5 space-y-1.5">
                    {colTasks.map((t: any) => <TaskCard key={t.id} task={t} onDragStart={handleDragStart} onMoveNext={moveNext} desktop />)}
                    {colTasks.length === 0 && <div className="text-center py-10 text-white/8 text-xs">Drop here</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mobile: stacked */}
          <div className="sm:hidden space-y-4">
            {COLUMNS.map(col => {
              const colTasks = filteredTasks.filter((t: any) => t.status === col.id);
              if (colTasks.length === 0 && col.id === 'COMPLETED') return null;
              return (
                <div key={col.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className={`w-2 h-2 rounded-full ${col.dot}`} />
                    <span className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">{col.label}</span>
                    <span className="text-[10px] text-white/10 font-mono">{colTasks.length}</span>
                  </div>
                  <div className="space-y-1.5">
                    {colTasks.map((t: any) => <TaskCard key={t.id} task={t} onDragStart={handleDragStart} onMoveNext={moveNext} />)}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Create Task Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <ModalInput label="Task" placeholder="e.g. Scout GH1 for pests" value={form.title} onChange={e => setForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        {users && (
          <ModalSelect label="Assign To" value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: (e.target as HTMLSelectElement).value }))}>
            <option value="">Select person</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role?.replace(/_/g, ' ')})</option>)}
          </ModalSelect>
        )}
        <div className="grid grid-cols-2 gap-3">
          <ModalSelect label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: (e.target as HTMLSelectElement).value }))}>
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
          </ModalSelect>
          <ModalInput label="Due Date" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: (e.target as HTMLInputElement).value }))} />
        </div>
        <ModalSelect label="Workflow Stage" value={form.workflowStage} onChange={e => setForm(f => ({ ...f, workflowStage: (e.target as HTMLSelectElement).value }))}>
          <option value="">General</option>
          {STAGES.filter(Boolean).map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </ModalSelect>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.title || !form.assignedToId}>
          Create Task
        </ModalButton>
      </Modal>
    </div>
  );
}

// ── Task Card Component ──
function TaskCard({ task: t, onDragStart, onMoveNext, desktop }: {
  task: any; onDragStart: (t: any) => void; onMoveNext: (t: any) => void; desktop?: boolean;
}) {
  const isOverdue = t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED';
  const assigneeName = t.assignedToId ? (t.template?.category || '') : '';

  return (
    <div draggable={desktop} onDragStart={() => onDragStart(t)}
      className={`bg-white/[0.03] border border-white/[0.05] rounded-lg p-3 transition border-l-[3px] ${PRIORITY_BORDER[t.priority]}
        ${desktop ? 'cursor-grab active:cursor-grabbing hover:border-white/12 hover:bg-white/[0.05]' : 'flex items-center gap-3'}
        ${isOverdue ? 'ring-1 ring-red-500/20' : ''}`}>
      <div className={`${desktop ? '' : 'flex-1'} min-w-0`}>
        <div className="text-sm text-white font-medium leading-snug">{t.title}</div>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
          {t.workflowStage && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/20">{t.workflowStage.replace(/_/g, ' ')}</span>}
          {t.dueDate && (
            <span className={`text-[10px] ${isOverdue ? 'text-red-400 font-bold' : 'text-white/15'}`}>
              {new Date(t.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {isOverdue && <AlertTriangle size={9} className="text-red-400" />}
        </div>
      </div>
      {!desktop && t.status !== 'COMPLETED' && (
        <button onClick={() => onMoveNext(t)}
          className="p-2.5 rounded-lg bg-white/5 hover:bg-primary/20 text-white/20 hover:text-primary transition min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0">
          {t.status === 'PENDING' ? <Clock size={16} /> : <Check size={16} />}
        </button>
      )}
      {!desktop && t.status === 'COMPLETED' && <Check size={14} className="text-green-400 flex-shrink-0" />}
    </div>
  );
}
