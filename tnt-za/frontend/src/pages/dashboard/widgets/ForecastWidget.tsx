import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useRBAC } from '../../../hooks/useRBAC';
import { useToastStore } from '../../../stores/toastStore';
import { CalendarDays, ArrowRight, Sparkles, Leaf, Droplets, Sun } from 'lucide-react';
import api from '../../../services/api';

export default function ForecastWidget() {
  const { hasMinLevel } = useRBAC();
  const addToast = useToastStore(s => s.addToast);
  const qc = useQueryClient();

  const { data: forecast } = useQuery({
    queryKey: ['forecast'],
    queryFn: () => api.get('/forecast?days=3').then(r => r.data.forecast),
  });

  const generateMut = useMutation({
    mutationFn: () => api.post('/forecast/generate-tickets', { daysAhead: 3 }),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ['tickets'] }); addToast('success', `${res.data.created} tickets auto-created from calendar`); },
    onError: (e: any) => addToast('error', e.response?.data?.error || 'Failed'),
  });

  if (!forecast?.length) return null;

  const todayTasks = forecast.filter((f: any) => f.isToday);
  const tomorrowTasks = forecast.filter((f: any) => f.isTomorrow);
  const laterTasks = forecast.filter((f: any) => !f.isToday && !f.isTomorrow);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-white/60">Grow Forecast</h2>
        </div>
        <div className="flex items-center gap-2">
          {hasMinLevel(2) && (
            <button onClick={() => generateMut.mutate()} disabled={generateMut.isPending}
              className="text-[10px] px-2 py-1 bg-primary/10 text-primary border border-primary/20 rounded-lg hover:bg-primary/20 transition font-semibold">
              Auto-Ticket
            </button>
          )}
          <Link to="/calendar" className="text-xs text-primary flex items-center gap-1 hover:text-primary-light">
            Calendar <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {/* Today */}
        {todayTasks.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-primary uppercase tracking-wider mb-1">Today</div>
            {todayTasks.map((t: any, i: number) => (
              <ForecastItem key={i} item={t} />
            ))}
          </div>
        )}

        {/* Tomorrow */}
        {tomorrowTasks.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-white/30 uppercase tracking-wider mb-1">Tomorrow</div>
            {tomorrowTasks.map((t: any, i: number) => (
              <ForecastItem key={i} item={t} />
            ))}
          </div>
        )}

        {/* Later */}
        {laterTasks.length > 0 && (
          <div>
            <div className="text-[10px] font-bold text-white/15 uppercase tracking-wider mb-1">Coming Up</div>
            {laterTasks.slice(0, 3).map((t: any, i: number) => (
              <ForecastItem key={i} item={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ForecastItem({ item }: { item: any }) {
  const icon = item.ipmApplication ? Droplets : item.task?.includes('FLIP') || item.task?.includes('Harvest') ? Sun : Leaf;
  const Icon = icon;

  return (
    <div className={`flex items-center gap-2.5 py-1.5 ${item.isCritical ? 'bg-amber-500/5 -mx-2 px-2 rounded-lg' : ''}`}>
      <Icon size={12} className={item.isCritical ? 'text-amber-400' : 'text-white/20'} />
      <div className="flex-1 min-w-0">
        <div className={`text-xs truncate ${item.isCritical ? 'text-amber-300 font-medium' : 'text-white/50'}`}>
          {item.task || item.additionalTask}
        </div>
        {item.ipmApplication && (
          <div className="text-[10px] text-blue-400/50">{item.ipmApplication} {item.dosage}</div>
        )}
      </div>
      <span className="text-[10px] text-white/15 flex-shrink-0">D{item.dayNum}</span>
    </div>
  );
}
