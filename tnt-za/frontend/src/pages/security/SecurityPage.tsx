import { useQuery } from '@tanstack/react-query';
import { SkeletonTable } from '../../components/Skeleton';
import { Lock, Truck, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

export default function SecurityPage() {
  const { data: anomalies } = useQuery({ queryKey: ['anomalies-security'], queryFn: () => api.get('/anomalies?resolved=false').then(r => r.data.anomalies) });
  const { data: destructions } = useQuery({ queryKey: ['destructions-sec'], queryFn: () => api.get('/compliance/destruction').then(r => r.data.destructions) });
  const { data: manifests } = useQuery({ queryKey: ['manifests'], queryFn: () => api.get('/transport/manifests').then(r => r.data.manifests) });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Security</h1>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/60 mb-3">Open Anomalies ({anomalies?.length || 0})</h2>
        {!anomalies?.length ? <p className="text-white/30 text-sm">No open anomalies</p> : anomalies.map((a: any) => (
          <div key={a.id} className="flex items-start gap-2 py-2 border-b border-white/5 text-sm">
            <AlertTriangle size={14} className="text-amber-400 mt-0.5" />
            <div><span className="text-white/80">{a.description}</span><span className="text-white/30 ml-2 text-xs">{a.severity}</span></div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white/60 mb-3">Transport Manifests</h2>
        {!manifests?.length ? <p className="text-white/30 text-sm">No manifests</p> : manifests.map((m: any) => (
          <div key={m.id} className="flex items-center justify-between py-2 border-b border-white/5 text-sm">
            <div className="flex items-center gap-2">
              <Truck size={14} className="text-primary" />
              <span className="text-white/80">{m.transporter}</span>
              <span className="text-white/40 font-mono">{m.vehicleReg}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${m.arrivedAt ? 'bg-green-500/20 text-green-400' : m.departedAt ? 'bg-amber-500/20 text-amber-400' : 'bg-white/10 text-white/50'}`}>
              {m.arrivedAt ? 'Arrived' : m.departedAt ? 'In Transit' : 'Pending'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
