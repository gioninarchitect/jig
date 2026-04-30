import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CheckSquare, ArrowRight, AlertTriangle, Clock } from 'lucide-react';
import api from '../../../services/api';

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-amber-500', MEDIUM: 'bg-blue-500', LOW: 'bg-white/30',
};

export default function TasksDueWidget() {
  const { data: tasks } = useQuery({
    queryKey: ['tasks', 'PENDING', true],
    queryFn: () => api.get('/tasks', { params: { status: 'PENDING', mine: true } }).then(r => r.data.tasks),
  });

  const pending = tasks || [];
  const overdue = pending.filter((t: any) => t.dueDate && new Date(t.dueDate) < new Date());

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${overdue.length > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CheckSquare size={16} className={overdue.length > 0 ? 'text-amber-400' : 'text-primary'} />
          <h2 className="text-sm font-semibold text-white/60">My Tasks</h2>
          {pending.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${overdue.length > 0 ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/50'}`}>
              {pending.length}
            </span>
          )}
        </div>
        <Link to="/tasks" className="text-xs text-primary flex items-center gap-1 hover:text-primary-light">
          All Tasks <ArrowRight size={12} />
        </Link>
      </div>

      {!pending.length ? (
        <p className="text-white/30 text-sm">No tasks pending</p>
      ) : (
        <div className="space-y-1.5">
          {pending.slice(0, 5).map((t: any) => {
            const isOverdue = t.dueDate && new Date(t.dueDate) < new Date();
            return (
              <div key={t.id} className="flex items-center gap-2.5 py-1.5">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                <span className={`text-sm flex-1 truncate ${isOverdue ? 'text-amber-300' : 'text-white/80'}`}>{t.title}</span>
                {isOverdue && <AlertTriangle size={12} className="text-amber-400 flex-shrink-0" />}
                {t.dueDate && !isOverdue && (
                  <span className="text-xs text-white/20 flex-shrink-0">{new Date(t.dueDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</span>
                )}
              </div>
            );
          })}
          {pending.length > 5 && <p className="text-xs text-white/30 pt-1">+{pending.length - 5} more</p>}
        </div>
      )}
    </div>
  );
}
