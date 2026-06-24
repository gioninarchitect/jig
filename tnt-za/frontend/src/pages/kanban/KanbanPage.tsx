import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { Plus, AlertTriangle, Clock, Check, Ticket as TicketIcon, CheckSquare, ShieldAlert } from 'lucide-react';
import api from '../../services/api';

// Work Surface — one board, the cards are Tickets + Checklist-tasks. Pick the lens (Group by).
const COLUMNS = [
  { id: 'PENDING', label: 'Backlog', dot: 'bg-white/25' },
  { id: 'IN_PROGRESS', label: 'In Progress', dot: 'bg-blue-500' },
  { id: 'COMPLETED', label: 'Done', dot: 'bg-green-500' },
];
const GROUP_OPTIONS = [
  { id: 'status', label: 'Status' },
  { id: 'department', label: 'Department' },
  { id: 'phase', label: 'Phase' },
];
const PRIORITY_BORDER: Record<string, string> = { LOW: 'border-l-white/10', MEDIUM: 'border-l-blue-500', HIGH: 'border-l-amber-500', CRITICAL: 'border-l-red-500' };
const PRIORITY_DOT: Record<string, string> = { LOW: 'bg-white/20', MEDIUM: 'bg-blue-500', HIGH: 'bg-amber-500', CRITICAL: 'bg-red-500' };
const LANE_LABEL: Record<string, string> = { PENDING: 'Backlog', IN_PROGRESS: 'In Progress', COMPLETED: 'Done' };
const LANE_CHIP: Record<string, string> = { PENDING: 'bg-white/10 text-white/50', IN_PROGRESS: 'bg-blue-500/20 text-blue-300', COMPLETED: 'bg-green-500/20 text-green-300' };

const STAGE_TO_PHASE: Record<string, string> = { PROPAGATION: 'Propagation / Cloning', VEGETATIVE: 'Vegetative', FLOWERING: 'Flowering', HARVEST: 'Harvest', WET_RECEIVING: 'Drying', DRYING: 'Drying', DEBUC: 'Trim', TRIM: 'Trim', CURE: 'Cure / Trim', STORE_QA: 'QA / Store', DISPATCH: 'Dispatch', FACILITY: 'Facility' };
const STAGE_TO_DEPT: Record<string, string> = { PROPAGATION: 'Cultivation', VEGETATIVE: 'Cultivation', FLOWERING: 'Cultivation', HARVEST: 'Cultivation', WET_RECEIVING: 'Processing', DRYING: 'Processing', DEBUC: 'Processing', TRIM: 'Processing', CURE: 'Processing', STORE_QA: 'QA / Lab', DISPATCH: 'Processing', FACILITY: 'Engineering / Facility' };

const SCOPE_TABS = [
  { id: 'mine', label: 'My Work' },
  { id: 'cultivation', label: 'Cultivation', depts: ['Cultivation'] },
  { id: 'processing', label: 'Processing', depts: ['Processing'] },
  { id: 'qa', label: 'QA', depts: ['QA / Lab'] },
  { id: 'all', label: 'All' },
];
const STAGES = ['PROPAGATION', 'VEGETATIVE', 'FLOWERING', 'HARVEST', 'WET_RECEIVING', 'DRYING', 'DEBUC', 'TRIM', 'CURE', 'STORE_QA', 'DISPATCH', 'FACILITY'];

const laneOfTicket = (s: string) => (['COMPLETED', 'CLOSED'].includes(s) ? 'COMPLETED' : s === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'PENDING');
// Deviation lifecycle → board lane: raised = Backlog, QA-approved = In Progress, RP-closed = Done.
const laneOfDeviation = (d: any) => (d.closedAt ? 'COMPLETED' : d.qaApprovedById ? 'IN_PROGRESS' : 'PENDING');
const PRI_FROM_LEVEL: Record<number, string> = { 1: 'CRITICAL', 2: 'HIGH', 3: 'MEDIUM' };

export default function KanbanPage() {
  const { hasMinLevel, hasRole } = useRBAC();
  const { user } = useAuth();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [dragItem, setDragItem] = useState<any>(null);
  const [scope, setScope] = useState(hasRole('QA_INSPECTOR') ? 'qa' : 'mine');
  const [groupBy, setGroupBy] = useState('status');
  const [optLane, setOptLane] = useState<Record<string, string>>({}); // optimistic card lanes
  const [form, setForm] = useState({ title: '', assignedToId: '', priority: 'MEDIUM', dueDate: '', workflowStage: '' });

  const { data: tasks, isLoading } = useQuery({ queryKey: ['tasks-kanban'], queryFn: () => api.get('/tasks').then(r => r.data.tasks) });
  const { data: tickets } = useQuery({ queryKey: ['tickets-kanban'], queryFn: () => api.get('/baygrid/tickets').then(r => r.data.tickets ?? []).catch(() => []) });
  // Open deviations ride the board too — QA works them agile (raise → approve → close).
  // Level 3+ only — approve/close are requireLevel(3); don't show cards a user can't action.
  const { data: deviations } = useQuery({ queryKey: ['deviations-kanban'], queryFn: () => api.get('/qms/deviations?open=true').then(r => r.data.deviations ?? []).catch(() => []), enabled: hasMinLevel(3) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data.users), enabled: hasMinLevel(2) });

  const createMut = useMutation({
    mutationFn: () => api.post('/tasks', form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-kanban'] }); setShowCreate(false); setForm({ title: '', assignedToId: '', priority: 'MEDIUM', dueDate: '', workflowStage: '' }); addToast('success', 'Card created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const moveMut = useMutation({
    mutationFn: ({ item, lane }: { item: any; lane: string }) => {
      if (item.kind === 'task') {
        if (lane === 'COMPLETED') return api.patch(`/tasks/${item.id}/complete`, { notes: 'Completed from board' });
        return api.patch(`/tasks/${item.id}/status`, { status: lane });
      }
      if (item.kind === 'deviation') {
        // In Progress = QA approves; Done = RP close-off (server 409s if a CAPA is missing on L1/L2).
        if (lane === 'IN_PROGRESS') return api.patch(`/qms/deviations/${item.id}/approve`, { name: user?.name });
        if (lane === 'COMPLETED') return api.patch(`/qms/deviations/${item.id}/close`, { name: user?.name });
        addToast('info', "Raised deviations can't move back to backlog.");
        return Promise.resolve({ data: {} } as any);
      }
      const tStatus = lane === 'COMPLETED' ? 'COMPLETED' : lane === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'OPEN';
      return api.patch(`/baygrid/tickets/${item.id}`, { status: tStatus });
    },
    // Optimistic: drop the card in its new lane immediately; reconcile on settle.
    onMutate: ({ item, lane }: { item: any; lane: string }) => setOptLane(prev => ({ ...prev, [`${item.kind}-${item.id}`]: lane })),
    onSettled: (_d, _e, { item }: any) => setOptLane(prev => { const next = { ...prev }; delete next[`${item.kind}-${item.id}`]; return next; }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks-kanban'] }); qc.invalidateQueries({ queryKey: ['tickets-kanban'] }); qc.invalidateQueries({ queryKey: ['deviations-kanban'] }); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Move blocked (needs sign-off?)'),
  });

  // Unify tickets + checklist-tasks into one set of cards
  const allItems = [
    ...(tasks || []).map((t: any) => ({ kind: 'task', id: t.id, title: t.title, lane: t.status, priority: t.priority || 'MEDIUM', dueDate: t.dueDate, stage: t.workflowStage, assignedToId: t.assignedToId, dept: STAGE_TO_DEPT[t.workflowStage] || 'General', phase: STAGE_TO_PHASE[t.workflowStage] || 'General' })),
    ...(tickets || []).map((k: any) => ({ kind: 'ticket', id: k.id, title: k.title, lane: laneOfTicket(k.status), priority: k.priority || 'MEDIUM', dueDate: k.dueDate, stage: k.workflowStage, assignedToId: k.assignedToId, role: k.assignedToRole, dept: STAGE_TO_DEPT[k.workflowStage] || 'General', phase: STAGE_TO_PHASE[k.workflowStage] || 'General' })),
    ...(deviations || []).map((d: any) => ({ kind: 'deviation', id: d.id, title: d.description || d.deviationType || 'Deviation', lane: laneOfDeviation(d), priority: PRI_FROM_LEVEL[d.level] || (d.severity === 'CRITICAL' ? 'CRITICAL' : d.severity === 'HIGH' ? 'HIGH' : 'MEDIUM'), dueDate: null, stage: d.deviationType, assignedToId: null, dept: d.department || 'QA / Lab', phase: d.phase || 'QA / Store', level: d.level })),
  ].map((it: any) => ({ ...it, lane: optLane[`${it.kind}-${it.id}`] ?? it.lane }));

  const items = allItems.filter((it: any) => {
    if (scope === 'mine') return it.assignedToId === user?.id || (it.role && it.role === user?.role);
    if (scope === 'all') return true;
    // QA lens = every deviation (whatever department it sits in) + QA/Lab work.
    if (scope === 'qa') return it.kind === 'deviation' || it.dept === 'QA / Lab';
    const tab = SCOPE_TABS.find(s => s.id === scope);
    if (tab?.depts) return tab.depts.includes(it.dept);
    return true;
  });

  const visibleTabs = SCOPE_TABS.filter(tab => {
    if (tab.id === 'mine' || tab.id === 'all') return tab.id === 'mine' || hasMinLevel(3);
    if (tab.id === 'cultivation') return hasMinLevel(3) || hasRole('HEAD_OF_CULTIVATION', 'CULTIVATOR', 'NURSERY_MANAGER', 'FACILITY_SUPERVISOR');
    if (tab.id === 'processing') return hasMinLevel(3) || hasRole('PROCESSING_MANAGER');
    if (tab.id === 'qa') return hasMinLevel(3) || hasRole('QA_INSPECTOR');
    return false;
  });

  function moveNext(item: any) {
    const order = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    const idx = order.indexOf(item.lane);
    if (idx < order.length - 1) moveMut.mutate({ item, lane: order[idx + 1] });
  }

  const counts = { todo: items.filter(i => i.lane === 'PENDING').length, prog: items.filter(i => i.lane === 'IN_PROGRESS').length, done: items.filter(i => i.lane === 'COMPLETED').length };

  // group keys for department / phase views
  const groupKeys = (key: 'dept' | 'phase') => Array.from(new Set(items.map(i => i[key]))).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Work Board</h1>
          <div className="flex gap-3 text-xs mt-1">
            <span className="text-white/30">{counts.todo} backlog</span>
            <span className="text-blue-400">{counts.prog} in progress</span>
            <span className="text-green-400/70">{counts.done} done</span>
          </div>
        </div>
        {hasMinLevel(2) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> New Card
          </button>
        )}
      </div>

      {/* Controls — scope filter + group-by lens (the Views pattern) */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {visibleTabs.map(tab => (
            <button key={tab.id} onClick={() => setScope(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition min-h-[36px] ${scope === tab.id ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-[10px] uppercase tracking-wider text-white/30">Group by</span>
          <div className="flex rounded-lg border border-white/10 overflow-hidden">
            {GROUP_OPTIONS.map(g => (
              <button key={g.id} onClick={() => setGroupBy(g.id)} className={`px-3 py-2 text-xs font-semibold ${groupBy === g.id ? 'bg-primary text-white' : 'bg-white/5 text-white/50'}`}>{g.label}</button>
            ))}
          </div>
        </div>
      </div>

      {isLoading ? <SkeletonTable rows={6} /> : groupBy === 'status' ? (
        /* STATUS view — kanban, drag to move (auto-updates the ticket/task) */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
          {COLUMNS.map(col => {
            const colItems = items.filter(i => i.lane === col.id);
            return (
              <div key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragItem && dragItem.lane !== col.id) moveMut.mutate({ item: dragItem, lane: col.id }); setDragItem(null); }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.01] min-h-[250px]">
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5">
                  <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full ${col.dot}`} /><span className="text-xs font-semibold text-white/60">{col.label}</span></div>
                  <span className="text-[10px] text-white/15 font-mono">{colItems.length}</span>
                </div>
                <div className="p-1.5 space-y-1.5">
                  {colItems.map(it => <Card key={`${it.kind}-${it.id}`} item={it} onDragStart={() => setDragItem(it)} onMoveNext={() => moveNext(it)} draggable />)}
                  {colItems.length === 0 && <div className="text-center py-10 text-white/10 text-xs">Drop here</div>}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DEPARTMENT / PHASE view — grouped sections, status shown as a chip per card */
        <div className="space-y-5">
          {groupKeys(groupBy === 'department' ? 'dept' : 'phase').map((g: any) => {
            const groupItems = items.filter(i => (groupBy === 'department' ? i.dept : i.phase) === g);
            return (
              <div key={g}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold text-amber-300">{g}</span>
                  <span className="text-[11px] text-white/30">{groupItems.length} · {groupItems.filter(i => i.lane !== 'COMPLETED').length} open</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {groupItems.map(it => <Card key={`${it.kind}-${it.id}`} item={it} showLane />)}
                </div>
              </div>
            );
          })}
          {items.length === 0 && <div className="text-center py-12 text-white/20 text-sm">No cards in this view.</div>}
        </div>
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Card">
        <ModalInput label="Title" placeholder="e.g. Scout GH1 for pests" value={form.title} onChange={e => setForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        {users && (
          <ModalSelect label="Assign to (role / person)" value={form.assignedToId} onChange={e => setForm(f => ({ ...f, assignedToId: (e.target as HTMLSelectElement).value }))}>
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
        <ModalSelect label="Phase / stage" value={form.workflowStage} onChange={e => setForm(f => ({ ...f, workflowStage: (e.target as HTMLSelectElement).value }))}>
          <option value="">General</option>
          {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </ModalSelect>
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.title || !form.assignedToId}>Create card</ModalButton>
      </Modal>
    </div>
  );
}

function Card({ item: it, onDragStart, onMoveNext, draggable, showLane }: {
  item: any; onDragStart?: () => void; onMoveNext?: () => void; draggable?: boolean; showLane?: boolean;
}) {
  const isOverdue = it.dueDate && new Date(it.dueDate) < new Date() && it.lane !== 'COMPLETED';
  return (
    <div draggable={draggable} onDragStart={onDragStart}
      className={`bg-white/[0.03] border border-white/[0.05] rounded-lg p-3 transition border-l-[3px] ${PRIORITY_BORDER[it.priority]} ${draggable ? 'cursor-grab active:cursor-grabbing hover:border-white/12 hover:bg-white/[0.05]' : ''} ${isOverdue ? 'ring-1 ring-red-500/20' : ''}`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 flex-shrink-0 ${it.kind === 'deviation' ? 'text-red-400' : it.kind === 'ticket' ? 'text-amber-400' : 'text-blue-400'}`} title={it.kind}>
          {it.kind === 'deviation' ? <ShieldAlert size={12} /> : it.kind === 'ticket' ? <TicketIcon size={12} /> : <CheckSquare size={12} />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm text-white font-medium leading-snug">{it.title}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_DOT[it.priority]}`} />
            {showLane && <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${LANE_CHIP[it.lane]}`}>{LANE_LABEL[it.lane]}</span>}
            {it.stage && <span className="text-[9px] px-1.5 py-0.5 bg-white/5 rounded text-white/25">{it.stage.replace(/_/g, ' ')}</span>}
            {it.dueDate && <span className={`text-[10px] ${isOverdue ? 'text-red-400 font-bold' : 'text-white/15'}`}>{new Date(it.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>}
            {isOverdue && <AlertTriangle size={9} className="text-red-400" />}
          </div>
        </div>
        {onMoveNext && it.lane !== 'COMPLETED' && (
          <button onClick={onMoveNext} className="sm:hidden p-2 rounded-lg bg-white/5 hover:bg-primary/20 text-white/30 hover:text-primary min-w-[40px] min-h-[40px] flex items-center justify-center flex-shrink-0">
            {it.lane === 'PENDING' ? <Clock size={15} /> : <Check size={15} />}
          </button>
        )}
      </div>
    </div>
  );
}
