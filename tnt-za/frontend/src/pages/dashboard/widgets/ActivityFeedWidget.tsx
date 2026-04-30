import { useQuery } from '@tanstack/react-query';
import { SkeletonTable } from '../../../components/Skeleton';
import { Clock } from 'lucide-react';
import api from '../../../services/api';

export default function ActivityFeedWidget() {
  const { data: auditData } = useQuery({
    queryKey: ['audit', 'recent'],
    queryFn: () => api.get('/audit?limit=10').then(r => r.data.entries),
  });

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-white/60 mb-4">Recent Activity</h2>
      {!auditData ? <SkeletonTable rows={5} /> : auditData.length === 0 ? (
        <p className="text-white/30 text-sm">No activity recorded yet</p>
      ) : (
        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {auditData.map((e: any) => (
            <div key={e.id} className="flex items-start gap-3 text-sm py-1.5 border-b border-white/5 last:border-0">
              <Clock size={14} className="text-white/30 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-white/80">{e.action.replace(/_/g, ' ')}</span>
                <span className="text-white/30 ml-2 text-xs">{e.user?.name}</span>
              </div>
              <span className="text-white/20 text-xs flex-shrink-0">{new Date(e.timestamp).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
