import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { Plus, CheckCircle, XCircle, Clock, MessageSquare, ShieldCheck, ThumbsUp, ChevronDown } from 'lucide-react';
import api from '../../services/api';

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-white/10 text-white/50', MEDIUM: 'bg-blue-500/20 text-blue-400',
  HIGH: 'bg-amber-500/20 text-amber-400', CRITICAL: 'bg-red-500/20 text-red-400',
};
const TYPE_COLORS: Record<string, string> = {
  ISSUE: 'text-amber-400', REQUISITION: 'text-blue-400', APPROVAL: 'text-cyan-400', RP_SIGNOFF: 'text-rose-400',
};

const STAGES = [
  { value: '', label: 'All Stages' },
  { value: 'PROPAGATION', label: '1-3 Propagation' },
  { value: 'VEGETATIVE', label: '4-5 Vegetative' },
  { value: 'FLOWERING', label: '6-7 Flowering' },
  { value: 'HARVEST', label: '8 Harvest' },
  { value: 'WET_RECEIVING', label: '9 Wet Receiving' },
  { value: 'DRYING', label: '10 Drying' },
  { value: 'DEBUC', label: '11 Debuc' },
  { value: 'TRIM', label: '12 Trim' },
  { value: 'CURE', label: '13 Cure' },
  { value: 'STORE_QA', label: '14 Store & QA' },
  { value: 'SALE', label: '15 Sale' },
  { value: 'DISPATCH', label: '16 Dispatch' },
  { value: 'RETAIL', label: '17 Retail' },
  { value: 'FACILITY', label: 'Facility' },
];

const TYPES = [
  { value: '', label: 'All Types' },
  { value: 'ISSUE', label: 'Issues' },
  { value: 'REQUISITION', label: 'Requisitions' },
  { value: 'APPROVAL', label: 'Approvals' },
  { value: 'RP_SIGNOFF', label: 'RP Sign-off' },
];

const CATEGORIES = [
  'GENERAL', 'PEST', 'MOULD', 'EQUIPMENT', 'FEEDING', 'ENVIRONMENT', 'IRRIGATION', 'MAINTENANCE',
  'REQUISITION_SUPPLIES', 'REQUISITION_EQUIPMENT', 'REQUISITION_PPE', 'REQUISITION_SERVICES',
  'COMPLIANCE_APPROVAL', 'RP_SIGNOFF',
];

export default function TicketsPage() {
  const { hasMinLevel, hasRole } = useRBAC();
  const { user } = useAuth();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', ticketType: 'ISSUE', workflowStage: '', estimatedCost: '', quantity: '' });
  const [comment, setComment] = useState('');

  const isRP = hasRole('RESPONSIBLE_PHARMACIST');
  const isAdmin = hasMinLevel(4);

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', statusFilter, stageFilter, typeFilter],
    queryFn: () => api.get('/baygrid/tickets', {
      params: {
        status: statusFilter || undefined,
        workflowStage: stageFilter || undefined,
        ticketType: typeFilter || undefined,
      },
    }).then(r => r.data.tickets),
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ['ticket', selectedTicket?.id],
    queryFn: () => api.get(`/baygrid/tickets/${selectedTicket.id}`).then(r => r.data.ticket),
    enabled: !!selectedTicket,
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/baygrid/tickets', {
      ...form,
      estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
      quantity: form.quantity ? parseInt(form.quantity) : undefined,
      workflowStage: form.workflowStage || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tickets'] }); setShowCreate(false); setForm({ title: '', description: '', priority: 'MEDIUM', category: 'GENERAL', ticketType: 'ISSUE', workflowStage: '', estimatedCost: '', quantity: '' }); addToast('success', 'Ticket created'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const approveMut = useMutation({
    mutationFn: (data: { id: string; action: string }) => {
      if (data.action === 'rp_sign') return api.patch(`/baygrid/tickets/${data.id}`, { rpSignedById: user?.id, rpNotes: comment || 'RP approved' });
      if (data.action === 'approve') return api.patch(`/baygrid/tickets/${data.id}`, { approvedById: user?.id, approvalNotes: comment || 'Approved' });
      return api.patch(`/baygrid/tickets/${data.id}`, { status: 'CLOSED', resolution: comment || 'Rejected' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tickets'] }); qc.invalidateQueries({ queryKey: ['ticket'] }); setComment(''); addToast('success', 'Updated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const resolveMut = useMutation({
    mutationFn: (id: string) => api.patch(`/baygrid/tickets/${id}`, { status: 'COMPLETED', resolution: comment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tickets'] }); qc.invalidateQueries({ queryKey: ['ticket'] }); setComment(''); addToast('success', 'Resolved'); },
  });

  const commentMut = useMutation({
    mutationFn: () => api.post(`/baygrid/tickets/${selectedTicket.id}/comments`, { content: comment }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', selectedTicket.id] }); setComment(''); addToast('success', 'Comment added'); },
  });

  const openCount = tickets?.filter((t: any) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length || 0;
  const reqCount = tickets?.filter((t: any) => t.ticketType === 'REQUISITION' && t.status !== 'COMPLETED' && t.status !== 'CLOSED').length || 0;
  const rpCount = tickets?.filter((t: any) => t.ticketType === 'RP_SIGNOFF' && !t.rpSignedAt).length || 0;

  // Group tickets by workflow stage for accordion
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});
  const toggleStage = (stage: string) => setExpandedStages(s => ({ ...s, [stage]: !s[stage] }));

  const STAGE_ORDER = [
    { key: 'PROPAGATION', label: '1-3 Propagation (Mothers / Clones / Rooting)', color: 'text-green-400', border: 'border-green-500/20' },
    { key: 'VEGETATIVE', label: '4-5 Vegetative (Transplant / Veg)', color: 'text-green-300', border: 'border-green-500/15' },
    { key: 'FLOWERING', label: '6-7 Flowering (Flip / Flower)', color: 'text-purple-400', border: 'border-purple-500/20' },
    { key: 'HARVEST', label: '8 Harvest', color: 'text-red-400', border: 'border-red-500/20' },
    { key: 'WET_RECEIVING', label: '9 Wet Receiving', color: 'text-yellow-400', border: 'border-yellow-500/20' },
    { key: 'DRYING', label: '10 Drying (DRS)', color: 'text-yellow-300', border: 'border-yellow-500/15' },
    { key: 'DEBUC', label: '11 Debuc (JR)', color: 'text-yellow-200', border: 'border-yellow-500/10' },
    { key: 'TRIM', label: '12 Trim', color: 'text-emerald-400', border: 'border-emerald-500/20' },
    { key: 'CURE', label: '13 Cure', color: 'text-amber-400', border: 'border-amber-500/20' },
    { key: 'STORE_QA', label: '14 Store & QA', color: 'text-cyan-400', border: 'border-cyan-500/20' },
    { key: 'SALE', label: '15 Sale', color: 'text-blue-400', border: 'border-blue-500/20' },
    { key: 'DISPATCH', label: '16 Dispatch', color: 'text-blue-300', border: 'border-blue-500/15' },
    { key: 'RETAIL', label: '17 Retail', color: 'text-blue-200', border: 'border-blue-500/10' },
    { key: 'FACILITY', label: 'Facility (Cross-cutting)', color: 'text-white/40', border: 'border-white/10' },
    { key: '_UNTAGGED', label: 'Untagged', color: 'text-white/25', border: 'border-white/5' },
  ];

  const groupedTickets = STAGE_ORDER.map(stage => {
    const stageTickets = tickets?.filter((t: any) =>
      stage.key === '_UNTAGGED' ? !t.workflowStage : t.workflowStage === stage.key
    ) || [];
    const openInStage = stageTickets.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED').length;
    return { ...stage, tickets: stageTickets, openCount: openInStage };
  }).filter(g => g.tickets.length > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Tickets</h1>
          <div className="flex gap-3 text-xs mt-1">
            <span className="text-amber-400">{openCount} open</span>
            {reqCount > 0 && <span className="text-blue-400">{reqCount} requisitions</span>}
            {rpCount > 0 && <span className="text-rose-400">{rpCount} RP pending</span>}
          </div>
        </div>
        {hasMinLevel(1) && (
          <button onClick={() => setShowCreate(true)} className="px-4 py-2.5 bg-primary hover:bg-primary-light text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <Plus size={16} /> New Ticket
          </button>
        )}
      </div>

      {/* Filters row */}
      <div className="flex gap-2 overflow-x-auto pb-1 flex-wrap">
        {/* Status */}
        {['', 'OPEN', 'IN_PROGRESS', 'COMPLETED'].map(s => (
          <button key={`s-${s}`} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition min-h-[36px] ${statusFilter === s ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white'}`}>
            {s || 'All Status'}
          </button>
        ))}
        <div className="w-px h-6 bg-white/10 self-center" />
        {/* Type */}
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/60 border border-white/10 min-h-[36px]">
          {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {/* Stage */}
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-xs bg-white/5 text-white/60 border border-white/10 min-h-[36px]">
          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </div>

      {/* Ticket accordion by workflow stage */}
      {isLoading ? <SkeletonTable rows={5} /> : !tickets?.length ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-12 text-center text-white/40">No tickets found</div>
      ) : (
        <div className="space-y-2">
          {groupedTickets.map(group => {
            const isOpen = expandedStages[group.key] !== false; // default open
            return (
              <div key={group.key} className={`border rounded-xl overflow-hidden ${group.border}`}>
                {/* Accordion header */}
                <button onClick={() => toggleStage(group.key)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition">
                  <div className="flex items-center gap-2">
                    <ChevronDown size={14} className={`text-white/30 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
                    <span className={`text-sm font-semibold ${group.color}`}>{group.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {group.openCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 font-mono flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />{group.openCount} open
                      </span>
                    )}
                    <span className="text-xs text-white/20">{group.tickets.length}</span>
                  </div>
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="border-t border-white/5">
                    {group.tickets.map((t: any) => {
                      const needsRp = t.ticketType === 'RP_SIGNOFF' && !t.rpSignedAt;
                      const needsApproval = (t.ticketType === 'REQUISITION' || t.ticketType === 'APPROVAL') && !t.approvedAt && t.status !== 'COMPLETED' && t.status !== 'CLOSED';
                      return (
                        <div key={t.id} onClick={() => { setSelectedTicket(t); setComment(''); }}
                          className="px-4 py-3 border-b border-white/[0.03] last:border-0 cursor-pointer hover:bg-white/[0.03] transition active:scale-[0.99]">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${t.status === 'OPEN' || t.status === 'ASSIGNED' ? 'bg-red-500' : t.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-green-500'}`} />
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_COLORS[t.ticketType] || 'text-white/40'} bg-white/5`}>{t.ticketType}</span>
                                <span className="text-sm font-medium text-white truncate">{t.title}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {needsRp && <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 text-rose-400 rounded font-bold">RP</span>}
                              {needsApproval && isAdmin && <span className="text-[10px] px-1.5 py-0.5 bg-primary/20 text-primary rounded font-bold">APPROVE</span>}
                              {t.approvedAt && <span className="text-[10px] text-green-400">✓</span>}
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-[10px] text-white/20">
                            <span>{t.category}</span>
                            {t.estimatedCost && <span className="text-blue-400">R{t.estimatedCost.toLocaleString()}</span>}
                            <span className="ml-auto">{new Date(t.createdAt).toLocaleDateString('en-ZA')}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Ticket Detail Modal */}
      <Modal open={!!selectedTicket} onClose={() => setSelectedTicket(null)} title={selectedTicket?.title || 'Ticket'}>
        {ticketDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 ${ticketDetail.status === 'OPEN' || ticketDetail.status === 'ASSIGNED' ? 'bg-red-500/20 text-red-400' : ticketDetail.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${ticketDetail.status === 'OPEN' || ticketDetail.status === 'ASSIGNED' ? 'bg-red-500' : ticketDetail.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-green-500'}`} />{ticketDetail.status}
              </span>
              <span className={`text-xs font-bold ${TYPE_COLORS[ticketDetail.ticketType]}`}>{ticketDetail.ticketType}</span>
              <span className={`text-xs px-2 py-1 rounded-full ${PRIORITY_COLORS[ticketDetail.priority]}`}>{ticketDetail.priority}</span>
              {ticketDetail.workflowStage && <span className="text-xs px-2 py-0.5 bg-white/5 rounded text-white/30">{ticketDetail.workflowStage.replace(/_/g, ' ')}</span>}
              <span className="text-xs text-white/20">{ticketDetail.category}</span>
            </div>

            <p className="text-sm text-white/70 leading-relaxed">{ticketDetail.description}</p>

            {/* Requisition details */}
            {ticketDetail.estimatedCost && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 flex gap-4 text-sm">
                {ticketDetail.estimatedCost && <span className="text-blue-400">R{ticketDetail.estimatedCost.toLocaleString()}</span>}
                {ticketDetail.quantity && <span className="text-white/50">Qty: {ticketDetail.quantity}</span>}
                {ticketDetail.supplier && <span className="text-white/40">Supplier: {ticketDetail.supplier}</span>}
              </div>
            )}

            {/* Approval status */}
            <div className="space-y-2">
              {ticketDetail.rpSignedAt && (
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 flex items-center gap-2">
                  <ShieldCheck size={14} className="text-rose-400" />
                  <span className="text-sm text-rose-300">RP signed off — {new Date(ticketDetail.rpSignedAt).toLocaleString('en-ZA')}</span>
                </div>
              )}
              {ticketDetail.approvedAt && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 flex items-center gap-2">
                  <ThumbsUp size={14} className="text-green-400" />
                  <span className="text-sm text-green-300">Approved — {new Date(ticketDetail.approvedAt).toLocaleString('en-ZA')}</span>
                </div>
              )}
              {ticketDetail.resolution && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="text-xs text-white/40 mb-1">Resolution</div>
                  <p className="text-sm text-white/70">{ticketDetail.resolution}</p>
                </div>
              )}
            </div>

            {/* Comments */}
            {ticketDetail.comments?.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-white/60 mb-2">Comments</h3>
                <div className="space-y-2">
                  {ticketDetail.comments.map((c: any) => (
                    <div key={c.id} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
                      <p className="text-sm text-white/70">{c.content}</p>
                      <span className="text-xs text-white/20">{new Date(c.createdAt).toLocaleString('en-ZA')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            {ticketDetail.status !== 'COMPLETED' && ticketDetail.status !== 'CLOSED' && (
              <div>
                <textarea placeholder="Notes..." value={comment} onChange={e => setComment(e.target.value)}
                  className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[80px] resize-y" />
                <div className="flex gap-2 mt-2 flex-wrap">
                  {/* Comment */}
                  <button onClick={() => commentMut.mutate()} disabled={!comment}
                    className="px-4 py-2.5 bg-white/5 border border-white/10 text-white/60 rounded-xl text-sm font-semibold hover:bg-white/10 transition disabled:opacity-40 flex items-center gap-1.5 min-h-[44px]">
                    <MessageSquare size={14} /> Comment
                  </button>
                  {/* Resolve — level 2+ */}
                  {hasMinLevel(2) && (
                    <button onClick={() => resolveMut.mutate(ticketDetail.id)} disabled={!comment}
                      className="px-4 py-2.5 bg-primary/10 border border-primary/30 text-primary rounded-xl text-sm font-semibold hover:bg-primary/20 transition disabled:opacity-40 flex items-center gap-1.5 min-h-[44px]">
                      <CheckCircle size={14} /> Resolve
                    </button>
                  )}
                  {/* RP Sign-off — only RP */}
                  {isRP && !ticketDetail.rpSignedAt && (ticketDetail.ticketType === 'RP_SIGNOFF' || ticketDetail.ticketType === 'APPROVAL') && (
                    <button onClick={() => approveMut.mutate({ id: ticketDetail.id, action: 'rp_sign' })}
                      className="px-4 py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-semibold hover:bg-rose-500/20 transition flex items-center gap-1.5 min-h-[44px]">
                      <ShieldCheck size={14} /> RP Sign-off
                    </button>
                  )}
                  {/* Approve — only Tenant Admin */}
                  {isAdmin && (ticketDetail.ticketType === 'REQUISITION' || ticketDetail.ticketType === 'APPROVAL') && !ticketDetail.approvedAt && (
                    <>
                      <button onClick={() => approveMut.mutate({ id: ticketDetail.id, action: 'approve' })}
                        className="px-4 py-2.5 bg-green-500/10 border border-green-500/30 text-green-400 rounded-xl text-sm font-semibold hover:bg-green-500/20 transition flex items-center gap-1.5 min-h-[44px]">
                        <ThumbsUp size={14} /> Approve
                      </button>
                      <button onClick={() => approveMut.mutate({ id: ticketDetail.id, action: 'reject' })} disabled={!comment}
                        className="px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm font-semibold hover:bg-red-500/20 transition disabled:opacity-40 flex items-center gap-1.5 min-h-[44px]">
                        <XCircle size={14} /> Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Create Ticket Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Ticket">
        <ModalSelect label="Type" value={form.ticketType} onChange={e => setForm(f => ({ ...f, ticketType: (e.target as HTMLSelectElement).value }))}>
          <option value="ISSUE">Issue / Problem</option>
          <option value="REQUISITION">Requisition (supplies/equipment)</option>
          {hasMinLevel(3) && <option value="APPROVAL">Compliance Approval</option>}
          {hasMinLevel(3) && <option value="RP_SIGNOFF">RP Sign-off Required</option>}
        </ModalSelect>
        <ModalSelect label="Workflow Stage" value={form.workflowStage} onChange={e => setForm(f => ({ ...f, workflowStage: (e.target as HTMLSelectElement).value }))}>
          {STAGES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </ModalSelect>
        <ModalInput label="Title" placeholder="Brief description" value={form.title} onChange={e => setForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        <div className="mb-4">
          <label className="block text-sm text-white/50 mb-1.5">Details</label>
          <textarea placeholder="Full description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-base focus:border-primary focus:outline-none min-h-[80px] resize-y" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ModalSelect label="Priority" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: (e.target as HTMLSelectElement).value }))}>
            <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
          </ModalSelect>
          <ModalSelect label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: (e.target as HTMLSelectElement).value }))}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </ModalSelect>
        </div>
        {form.ticketType === 'REQUISITION' && (
          <div className="grid grid-cols-2 gap-3">
            <ModalInput label="Est. Cost (R)" type="number" placeholder="0.00" value={form.estimatedCost} onChange={e => setForm(f => ({ ...f, estimatedCost: (e.target as HTMLInputElement).value }))} />
            <ModalInput label="Quantity" type="number" placeholder="1" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: (e.target as HTMLInputElement).value }))} />
          </div>
        )}
        <ModalButton loading={createMut.isPending} onClick={() => createMut.mutate()} disabled={!form.title || !form.description}>
          Create Ticket
        </ModalButton>
      </Modal>
    </div>
  );
}
