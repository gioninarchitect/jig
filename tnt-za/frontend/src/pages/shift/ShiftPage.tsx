import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { useToastStore } from '../../stores/toastStore';
import { SkeletonTable } from '../../components/Skeleton';
import { Sun, Moon, Clock, Check, AlertTriangle, Play, ChevronRight } from 'lucide-react';
import api from '../../services/api';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function ShiftPage() {
  const { user } = useAuth();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();
  const [deviationNotes, setDeviationNotes] = useState('');
  const [taskStatuses, setTaskStatuses] = useState<Record<number, { done: boolean; notes: string }>>({});

  const { data: shift, isLoading } = useQuery({
    queryKey: ['my-shift'],
    queryFn: () => api.get('/shifts/my-shift').then(r => r.data.shift),
  });

  const startMut = useMutation({
    mutationFn: () => api.patch(`/shifts/${shift.id}/start`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-shift'] }); addToast('success', 'Shift started'); },
  });

  const completeMut = useMutation({
    mutationFn: () => api.patch(`/shifts/${shift.id}/complete`, { deviationNotes: deviationNotes || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['my-shift'] }); addToast('success', 'Shift completed'); },
  });

  const today = new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const firstName = user?.name?.split(' ')[0] || 'there';
  const tasks = shift?.tasks as any[] || [];

  const completedTasks = Object.values(taskStatuses).filter(t => t.done).length;
  const hasIncomplete = tasks.length > 0 && completedTasks < tasks.length;

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center pt-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
          {new Date().getHours() < 17 ? <Sun size={28} className="text-primary" /> : <Moon size={28} className="text-primary" />}
        </div>
        <h1 className="text-2xl font-bold text-white">{getGreeting()}, {firstName}</h1>
        <p className="text-sm text-white/40">{today}</p>
      </div>

      {isLoading ? <SkeletonTable rows={4} /> : !shift ? (
        /* No shift allocated */
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <Clock size={40} className="text-white/15 mx-auto mb-3" />
          <p className="text-white/50 font-medium">No shift allocated for today</p>
          <p className="text-xs text-white/25 mt-2">Your manager will allocate your tasks via the grow calendar</p>
        </div>
      ) : (
        <>
          {/* Role card */}
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-primary/60 uppercase tracking-wider font-semibold">Your Role Today</div>
                <div className="text-xl font-bold text-white mt-1">{shift.role?.replace(/_/g, ' ')}</div>
              </div>
              <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${shift.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' : shift.status === 'STARTED' ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-white/40'}`}>
                {shift.status}
              </div>
            </div>
            <p className="text-xs text-white/30 mt-2">Assigned by: {shift.allocatedById?.substring(0, 8)}...</p>
          </div>

          {/* Start shift button */}
          {shift.status === 'PENDING' && (
            <button onClick={() => startMut.mutate()} disabled={startMut.isPending}
              className="w-full py-4 bg-primary hover:bg-primary-light text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition active:scale-[0.98] min-h-[56px]">
              <Play size={22} /> Start Shift
            </button>
          )}

          {/* Tasks */}
          {(shift.status === 'STARTED' || shift.status === 'COMPLETED') && tasks.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white/60">Today's Tasks</h2>
                <span className="text-xs text-white/20">{completedTasks}/{tasks.length} done</span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0}%` }} />
              </div>

              {tasks.map((task: any, i: number) => {
                const status = taskStatuses[i] || { done: false, notes: '' };
                return (
                  <div key={i} className={`border rounded-xl p-4 transition ${status.done ? 'bg-green-500/5 border-green-500/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <button onClick={() => {
                        if (shift.status !== 'COMPLETED') {
                          setTaskStatuses(s => ({ ...s, [i]: { ...status, done: !status.done } }));
                        }
                      }}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition min-w-[24px] ${status.done ? 'bg-green-500 border-green-500' : 'border-white/20 hover:border-primary'}`}>
                        {status.done && <Check size={14} className="text-white" />}
                      </button>

                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${status.done ? 'text-white/40 line-through' : 'text-white'}`}>{task.title}</div>
                        {task.description && <div className="text-xs text-white/30 mt-0.5">{task.description}</div>}
                      </div>
                    </div>

                    {/* Deviation notes per task */}
                    {!status.done && shift.status === 'STARTED' && (
                      <div className="mt-2 ml-9">
                        <input placeholder="Notes / issues (optional)" value={status.notes}
                          onChange={e => setTaskStatuses(s => ({ ...s, [i]: { ...status, notes: e.target.value } }))}
                          className="w-full px-3 py-2 bg-dark border border-white/10 rounded-lg text-white text-xs focus:border-primary focus:outline-none" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Complete shift */}
          {shift.status === 'STARTED' && (
            <div className="space-y-3 pt-2">
              {hasIncomplete && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-xs text-amber-300">{tasks.length - completedTasks} task{tasks.length - completedTasks > 1 ? 's' : ''} not completed. Add deviation notes below explaining why.</div>
                </div>
              )}

              {hasIncomplete && (
                <textarea placeholder="Why are tasks incomplete? (required if not all done)"
                  value={deviationNotes} onChange={e => setDeviationNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-dark border border-white/10 rounded-xl text-white text-sm focus:border-primary focus:outline-none min-h-[80px] resize-y" />
              )}

              <button onClick={() => completeMut.mutate()}
                disabled={completeMut.isPending || (hasIncomplete && !deviationNotes)}
                className="w-full py-4 bg-green-600 hover:bg-green-500 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition active:scale-[0.98] disabled:opacity-40 min-h-[56px]">
                <Check size={22} /> Complete Shift
              </button>
            </div>
          )}

          {/* Shift completed */}
          {shift.status === 'COMPLETED' && (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                <Check size={32} className="text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Shift Complete</h2>
              {shift.completedAt && <p className="text-xs text-white/30 mt-1">Completed at {new Date(shift.completedAt).toLocaleTimeString('en-ZA')}</p>}
              {shift.deviationNotes && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 mt-4 text-left">
                  <div className="text-xs text-amber-400 font-semibold mb-1">Deviation Notes</div>
                  <p className="text-sm text-white/50">{shift.deviationNotes}</p>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
