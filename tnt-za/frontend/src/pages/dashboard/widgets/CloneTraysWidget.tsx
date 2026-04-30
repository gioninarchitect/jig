import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Scissors, ArrowRight, Crown } from 'lucide-react';
import api from '../../../services/api';

export default function CloneTraysWidget() {
  const { data: trays } = useQuery({
    queryKey: ['clone-trays'],
    queryFn: () => api.get('/baygrid/clone-trays').then(r => r.data.trays),
  });

  const active = trays?.filter((t: any) => t.status === 'ROOTING' || t.status === 'ROOTED') || [];
  if (!active.length) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Scissors size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-white/60">Active Clone Trays</h2>
        </div>
        <Link to="/mothers" className="text-xs text-primary flex items-center gap-1 hover:text-primary-light">
          Mothers <ArrowRight size={12} />
        </Link>
      </div>
      <div className="space-y-2">
        {active.slice(0, 4).map((t: any) => {
          const daysSince = Math.floor((Date.now() - new Date(t.cloneDate).getTime()) / 86400000);
          const progress = Math.min(100, (daysSince / t.rootingDays) * 100);
          return (
            <div key={t.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-mono text-primary text-sm">{t.trayNumber}</span>
                  <span className="text-xs text-white/30">{t.strain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${t.status === 'ROOTED' ? 'bg-green-500' : 'bg-primary'}`}
                      style={{ width: `${progress}%` }} />
                  </div>
                  <span className="text-xs text-white/40">{daysSince}d</span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm text-white/70 font-mono">{t.rooted}/{t.totalCuttings}</div>
                <div className={`text-[10px] ${t.status === 'ROOTED' ? 'text-green-400' : 'text-amber-400'}`}>{t.status}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
