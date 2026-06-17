import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRBAC } from '../../hooks/useRBAC';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/toastStore';
import Modal, { ModalInput, ModalSelect, ModalButton } from '../../components/Modal';
import { SkeletonTable } from '../../components/Skeleton';
import { Users, Clock, GraduationCap, Plus, Check, AlertTriangle, LogIn, LogOut } from 'lucide-react';
import api from '../../services/api';

export default function HRPage() {
  const { hasMinLevel } = useRBAC();
  const { user } = useAuth();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [tab, setTab] = useState<'attendance' | 'training' | 'leave' | 'competency'>('attendance');
  const [showLeave, setShowLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' });
  const [showTraining, setShowTraining] = useState(false);
  const [trainingForm, setTrainingForm] = useState({ userId: '', userName: '', trainingType: 'SOP_TRAINING', title: '', description: '' });

  const today = new Date().toISOString().split('T')[0];

  const { data: stats } = useQuery({ queryKey: ['hr-stats'], queryFn: () => api.get('/hr/stats').then(r => r.data.stats) });
  const { data: attendance } = useQuery({ queryKey: ['attendance', today], queryFn: () => api.get(`/hr/attendance/${today}`).then(r => r.data.records), enabled: hasMinLevel(2) });
  const { data: training } = useQuery({ queryKey: ['training'], queryFn: () => api.get('/hr/training').then(r => r.data.records) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data.users), enabled: hasMinLevel(2) });
  const { data: sopTraining } = useQuery({ queryKey: ['sop-training-overview'], queryFn: () => api.get('/qms/training-overview').then(r => r.data), enabled: hasMinLevel(2) });
  const { data: leave } = useQuery({ queryKey: ['leave'], queryFn: () => api.get('/hr/leave').then(r => r.data.leave), enabled: hasMinLevel(2) && tab === 'leave' });
  const { data: matrix } = useQuery({ queryKey: ['competency-matrix'], queryFn: () => api.get('/hr/competency-matrix').then(r => r.data.matrix), enabled: hasMinLevel(2) && tab === 'competency' });

  const leaveMut = useMutation({
    mutationFn: () => api.post('/hr/leave', leaveForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave'] }); setShowLeave(false); setLeaveForm({ leaveType: 'ANNUAL', startDate: '', endDate: '', reason: '' }); addToast('success', 'Leave requested'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });
  const decideLeaveMut = useMutation({
    mutationFn: (p: { id: string; status: string }) => api.patch(`/hr/leave/${p.id}`, { status: p.status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leave'] }); addToast('success', 'Leave updated'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const clockInMut = useMutation({
    mutationFn: () => api.post('/hr/clock-in', { name: user?.name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); qc.invalidateQueries({ queryKey: ['hr-stats'] }); addToast('success', 'Clocked in'); },
  });

  const clockOutMut = useMutation({
    mutationFn: () => api.post('/hr/clock-out'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attendance'] }); addToast('success', 'Clocked out'); },
  });

  const createTrainingMut = useMutation({
    mutationFn: () => api.post('/hr/training', trainingForm),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training'] }); setShowTraining(false); addToast('success', 'Training assigned'); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  const completeTrainingMut = useMutation({
    mutationFn: (id: string) => api.patch(`/hr/training/${id}/complete`, {}),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training'] }); addToast('success', 'Training completed'); },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">HR & Training</h1>
          <p className="text-sm text-white/40">Attendance, training, SOP compliance</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => clockInMut.mutate()} disabled={clockInMut.isPending}
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <LogIn size={16} /> Clock In
          </button>
          <button onClick={() => clockOutMut.mutate()} disabled={clockOutMut.isPending}
            className="px-4 py-2.5 bg-red-500/80 hover:bg-red-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
            <LogOut size={16} /> Clock Out
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-green-400">{stats.presentToday}</div>
            <div className="text-[10px] text-white/20">Present Today</div>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
            <div className="text-xl font-bold font-mono text-white">{stats.totalStaff}</div>
            <div className="text-[10px] text-white/20">Total Staff</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stats.pendingTraining > 0 ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
            <div className={`text-xl font-bold font-mono ${stats.pendingTraining > 0 ? 'text-amber-400' : 'text-white'}`}>{stats.pendingTraining}</div>
            <div className="text-[10px] text-white/20">Pending Training</div>
          </div>
          <div className={`rounded-xl p-3 text-center border ${stats.expiredTraining > 0 ? 'bg-red-500/5 border-red-500/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
            <div className={`text-xl font-bold font-mono ${stats.expiredTraining > 0 ? 'text-red-400' : 'text-white'}`}>{stats.expiredTraining}</div>
            <div className="text-[10px] text-white/20">Expired Certs</div>
          </div>
        </div>
      )}

      {/* SOP Training Compliance */}
      {sopTraining && (
        <div className={`rounded-xl p-4 border ${sopTraining.overallCompliance < 80 ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white/60">SOP Training Compliance</span>
            <span className={`text-lg font-bold font-mono ${sopTraining.overallCompliance >= 90 ? 'text-green-400' : sopTraining.overallCompliance >= 70 ? 'text-amber-400' : 'text-red-400'}`}>{sopTraining.overallCompliance}%</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${sopTraining.overallCompliance >= 90 ? 'bg-green-500' : sopTraining.overallCompliance >= 70 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${sopTraining.overallCompliance}%` }} />
          </div>
          <div className="text-xs text-white/20 mt-1">{sopTraining.totalTrained}/{sopTraining.totalTrainingRequired} trained</div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('attendance')} className={`px-4 py-2 rounded-xl text-sm font-medium transition min-h-[40px] ${tab === 'attendance' ? 'bg-primary text-white' : 'bg-white/5 text-white/40'}`}>
          <Clock size={14} className="inline mr-1.5" />Attendance
        </button>
        <button onClick={() => setTab('training')} className={`px-4 py-2 rounded-xl text-sm font-medium transition min-h-[40px] ${tab === 'training' ? 'bg-primary text-white' : 'bg-white/5 text-white/40'}`}>
          <GraduationCap size={14} className="inline mr-1.5" />Training
        </button>
        <button onClick={() => setTab('leave')} className={`px-4 py-2 rounded-xl text-sm font-medium transition min-h-[40px] ${tab === 'leave' ? 'bg-primary text-white' : 'bg-white/5 text-white/40'}`}>Leave</button>
        <button onClick={() => setTab('competency')} className={`px-4 py-2 rounded-xl text-sm font-medium transition min-h-[40px] ${tab === 'competency' ? 'bg-primary text-white' : 'bg-white/5 text-white/40'}`}>Competency</button>
        {hasMinLevel(2) && tab === 'training' && (
          <button onClick={() => setShowTraining(true)} className="ml-auto px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-xl text-xs font-semibold min-h-[40px]">
            <Plus size={12} className="inline mr-1" />Assign Training
          </button>
        )}
        {tab === 'leave' && (
          <button onClick={() => setShowLeave(true)} className="ml-auto px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-xl text-xs font-semibold min-h-[40px]">
            <Plus size={12} className="inline mr-1" />Request Leave
          </button>
        )}
      </div>

      {/* Leave tab */}
      {tab === 'leave' && hasMinLevel(2) && (
        <div className="space-y-2">
          {!leave?.length ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-8 text-center text-white/40">No leave requests</div>
          ) : leave.map((l: any) => (
            <div key={l.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold text-white">{l.userName || 'Staff'} · <span className="text-white/50 font-normal">{l.leaveType}</span></div>
                <div className="text-xs text-white/40">{new Date(l.startDate).toLocaleDateString('en-ZA')} → {new Date(l.endDate).toLocaleDateString('en-ZA')} · {l.days} day{l.days > 1 ? 's' : ''}{l.reason ? ` · ${l.reason}` : ''}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${l.status === 'APPROVED' ? 'bg-green-500/15 text-green-300' : l.status === 'REJECTED' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'}`}>{l.status}</span>
                {l.status === 'PENDING' && (
                  <>
                    <button onClick={() => decideLeaveMut.mutate({ id: l.id, status: 'APPROVED' })} className="px-2.5 py-1 rounded-lg bg-green-500/15 border border-green-500/30 text-green-300 text-xs font-semibold">Approve</button>
                    <button onClick={() => decideLeaveMut.mutate({ id: l.id, status: 'REJECTED' })} className="px-2.5 py-1 rounded-lg bg-red-500/10 border border-red-500/25 text-red-300 text-xs font-semibold">Reject</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Competency matrix tab */}
      {tab === 'competency' && hasMinLevel(2) && matrix && (
        <div className="overflow-x-auto bg-white/[0.03] border border-white/[0.06] rounded-xl">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-white/10">
              <th className="text-left p-2.5 text-white/50 sticky left-0 bg-[#0f0f0f]">Staff</th>
              {matrix.titles.map((t: string) => <th key={t} className="p-2 text-white/40 font-medium" style={{ minWidth: 90 }}>{t}</th>)}
            </tr></thead>
            <tbody>
              {matrix.staff.map((s: any) => (
                <tr key={s.id} className="border-b border-white/5">
                  <td className="p-2.5 sticky left-0 bg-[#0f0f0f]"><div className="text-white font-medium">{s.name}</div><div className="text-[10px] text-white/30">{s.role.replace(/_/g, ' ').toLowerCase()}</div></td>
                  {matrix.titles.map((t: string) => { const c = s.competencies[t]; const col = !c ? '#333' : c.status === 'COMPLETED' ? '#22C55E' : c.status === 'EXPIRED' ? '#DC2626' : '#F8C242'; return (
                    <td key={t} className="p-2 text-center"><span className="inline-block w-3 h-3 rounded-full" style={{ background: col }} title={c ? c.status : 'not assigned'} /></td>
                  ); })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex gap-4 text-[11px] text-white/40 p-3 border-t border-white/10">
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: '#22C55E' }} />Competent</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: '#F8C242' }} />Pending/In progress</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: '#DC2626' }} />Expired</span>
            <span><span className="inline-block w-2.5 h-2.5 rounded-full mr-1" style={{ background: '#333' }} />Not assigned</span>
          </div>
        </div>
      )}

      {/* Attendance tab */}
      {tab === 'attendance' && (
        <div className="space-y-2">
          {!attendance?.length ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center text-white/30">No attendance records for today</div>
          ) : attendance.map((a: any) => (
            <div key={a.id} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${a.status === 'PRESENT' ? 'bg-green-500' : a.status === 'LATE' ? 'bg-amber-500' : 'bg-red-500'}`} />
                <div>
                  <div className="text-sm text-white font-medium">{a.userName}</div>
                  <div className="text-xs text-white/20">{a.status}</div>
                </div>
              </div>
              <div className="text-right">
                {a.clockIn && <div className="text-xs text-white/30">In: {new Date(a.clockIn).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</div>}
                {a.clockOut && <div className="text-xs text-white/30">Out: {new Date(a.clockOut).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</div>}
                {a.hoursWorked && <div className="text-xs text-primary font-mono">{a.hoursWorked}h</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Training tab */}
      {tab === 'training' && (
        <div className="space-y-2">
          {!training?.length ? (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center text-white/30">No training records</div>
          ) : training.map((t: any) => (
            <div key={t.id} className={`bg-white/[0.03] border rounded-xl p-3 ${t.status === 'COMPLETED' ? 'border-green-500/15' : t.status === 'EXPIRED' ? 'border-red-500/15' : 'border-white/[0.06]'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm text-white font-medium">{t.title}</div>
                  <div className="text-xs text-white/20 mt-0.5">{t.userName} — {t.trainingType.replace(/_/g, ' ')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : t.status === 'EXPIRED' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'}`}>{t.status}</span>
                  {t.status === 'PENDING' && hasMinLevel(2) && (
                    <button onClick={() => completeTrainingMut.mutate(t.id)} className="text-xs text-primary hover:text-primary-light">Complete</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign Training Modal */}
      <Modal open={showTraining} onClose={() => setShowTraining(false)} title="Assign Training">
        {users && (
          <ModalSelect label="Staff Member" value={trainingForm.userId} onChange={e => {
            const u = users.find((u: any) => u.id === (e.target as HTMLSelectElement).value);
            setTrainingForm(f => ({ ...f, userId: (e.target as HTMLSelectElement).value, userName: u?.name || '' }));
          }}>
            <option value="">Select person</option>
            {users.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({u.role?.replace(/_/g, ' ')})</option>)}
          </ModalSelect>
        )}
        <ModalSelect label="Training Type" value={trainingForm.trainingType} onChange={e => setTrainingForm(f => ({ ...f, trainingType: (e.target as HTMLSelectElement).value }))}>
          <option value="SOP_TRAINING">SOP Training</option>
          <option value="INDUCTION">Induction</option>
          <option value="SAFETY">Safety</option>
          <option value="EQUIPMENT">Equipment</option>
          <option value="COMPLIANCE">Compliance</option>
          <option value="ROLE_SPECIFIC">Role Specific</option>
        </ModalSelect>
        <ModalInput label="Title" placeholder="e.g. Harvest SOP v2 Training" value={trainingForm.title} onChange={e => setTrainingForm(f => ({ ...f, title: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={createTrainingMut.isPending} onClick={() => createTrainingMut.mutate()} disabled={!trainingForm.userId || !trainingForm.title}>
          Assign Training
        </ModalButton>
      </Modal>

      {/* Request Leave */}
      <Modal open={showLeave} onClose={() => setShowLeave(false)} title="Request Leave">
        <ModalSelect label="Type" value={leaveForm.leaveType} onChange={e => setLeaveForm(f => ({ ...f, leaveType: (e.target as HTMLSelectElement).value }))}>
          <option value="ANNUAL">Annual</option><option value="SICK">Sick</option><option value="FAMILY">Family Responsibility</option><option value="UNPAID">Unpaid</option><option value="OTHER">Other</option>
        </ModalSelect>
        <ModalInput label="From" type="date" value={leaveForm.startDate} onChange={e => setLeaveForm(f => ({ ...f, startDate: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="To" type="date" value={leaveForm.endDate} onChange={e => setLeaveForm(f => ({ ...f, endDate: (e.target as HTMLInputElement).value }))} />
        <ModalInput label="Reason (optional)" value={leaveForm.reason} onChange={e => setLeaveForm(f => ({ ...f, reason: (e.target as HTMLInputElement).value }))} />
        <ModalButton loading={leaveMut.isPending} onClick={() => leaveMut.mutate()} disabled={!leaveForm.startDate || !leaveForm.endDate}>Submit request</ModalButton>
      </Modal>
    </div>
  );
}
