import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Gauge, ArrowRight, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';

const SEV_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-amber-500', MEDIUM: 'bg-blue-500', LOW: 'bg-white/30',
};
const SEV_TEXT: Record<string, string> = {
  CRITICAL: 'text-red-400', HIGH: 'text-amber-300', MEDIUM: 'text-blue-300', LOW: 'text-white/50',
};

export default function ActionQueueWidget() {
  const { data } = useQuery({
    queryKey: ['driver-queue-me'],
    queryFn: () => api.get('/driver/queue/me').then(r => r.data),
    refetchInterval: 60_000,
  });

  const items = data?.items || [];
  const urgent = items.filter((d: any) => d.severity === 'CRITICAL' || d.severity === 'HIGH').length;

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${urgent > 0 ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Gauge size={16} className={urgent > 0 ? 'text-amber-400' : 'text-primary'} />
          <h2 className="text-sm font-semibold text-white/60">Your shift — what to do now</h2>
          {items.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${urgent > 0 ? 'bg-amber-500 text-black' : 'bg-white/10 text-white/50'}`}>
              {items.length}
            </span>
          )}
        </div>
      </div>

      {!items.length ? (
        <p className="text-white/30 text-sm">Nothing outstanding. You're clear.</p>
      ) : (
        <div className="space-y-1.5">
          {items.slice(0, 6).map((d: any) => (
            <Link key={d.id} to={d.linkUrl || '#'} className="flex items-start gap-2.5 py-1.5 group">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${SEV_DOT[d.severity] || 'bg-white/30'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/80 truncate group-hover:text-primary">{d.title}</span>
                  {d.severity === 'CRITICAL' && <AlertTriangle size={12} className="text-red-400 flex-shrink-0" />}
                </div>
                {d.detail && <div className="text-xs text-white/30 truncate">{d.detail}</div>}
              </div>
              <span className={`text-[10px] font-bold uppercase flex-shrink-0 ${SEV_TEXT[d.severity] || 'text-white/40'}`}>{d.severity}</span>
            </Link>
          ))}
          {items.length > 6 && <p className="text-xs text-white/30 pt-1">+{items.length - 6} more</p>}
        </div>
      )}
    </div>
  );
}
