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
  const [tab, setTab] = useState<'attendance' | 'training'>('attendance');
  const [showTraining, setShowTraining] = useState(false);
  const [trainingForm, setTrainingForm] = useState({ userId: '', userName: '', trainingType: 'SOP_TRAINING', title: '', description: '' });

  const today = new Date().toISOString().split('T')[0];

  const { data: stats } = useQuery({ queryKey: ['hr-stats'], queryFn: () => api.get('/hr/stats').then(r => r.data.stats) });
  const { data: attendance } = useQuery({ queryKey: ['attendance', today], queryFn: () => api.get(`/hr/attendance/${today}`).then(r => r.data.records), enabled: hasMinLevel(2) });
  const { data: training } = useQuery({ queryKey: ['training'], queryFn: () => api.get('/hr/training').then(r => r.data.records) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data.users), enabled: hasMinLevel(2) });
  const { data: sopTraining } = useQuery({ queryKey: ['sop-training-overview'], queryFn: () => api.get('/qms/training-overview').then(r => r.data), enabled: hasMinLevel(2) });

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
            className="px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-xl text-sm font-semibold flex items-center gap-2 transition min-h-[44px]">
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
        {hasMinLevel(2) && tab === 'training' && (
          <button onClick={() => setShowTraining(true)} className="ml-auto px-3 py-2 bg-primary/10 border border-primary/30 text-primary rounded-xl text-xs font-semibold min-h-[40px]">
            <Plus size={12} className="inline mr-1" />Assign Training
          </button>
        )}
      </div>

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
    </div>
  );
}
