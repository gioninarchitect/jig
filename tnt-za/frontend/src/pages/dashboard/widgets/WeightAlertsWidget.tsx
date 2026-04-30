import { useQuery } from '@tanstack/react-query';
import { SkeletonTable } from '../../../components/Skeleton';
import { AlertCircle } from 'lucide-react';
import api from '../../../services/api';

export default function WeightAlertsWidget() {
  const { data: anomalies, isLoading } = useQuery({
    queryKey: ['anomalies', 'variance'],
    queryFn: () => api.get('/anomalies?type=CONTAINER_WEIGHT_VARIANCE&resolved=false').then(r => r.data.anomalies),
  });

  const hasAlerts = anomalies?.length > 0;

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${hasAlerts ? 'bg-red-500/10 border-red-500/40' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle size={20} className={hasAlerts ? 'text-red-400' : 'text-white/40'} />
        <h2 className="text-sm font-semibold text-white/60">Weight Variance Alerts</h2>
        {hasAlerts && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">{anomalies.length}</span>}
      </div>
      {isLoading ? <SkeletonTable rows={2} /> : !hasAlerts ? (
        <p className="text-white/30 text-sm">No open weight variance alerts</p>
      ) : (
        <div className="space-y-2">
          {anomalies.map((a: any) => (
            <div key={a.id} className="bg-red-500/5 border border-red-500/20 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${a.severity === 'CRITICAL' ? 'bg-red-500 text-white' : 'bg-amber-500 text-black'}`}>
                  {a.severity}
                </span>
                <span className="text-xs text-white/30">{new Date(a.detectedAt).toLocaleString('en-ZA')}</span>
              </div>
              <p className="text-sm text-red-200 mt-1">{a.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
