import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { SkeletonTable } from '../../components/Skeleton';
import { Package, FileText, Truck, CheckCircle, Clock } from 'lucide-react';
import api from '../../services/api';

export default function ClientPortal() {
  const { user } = useAuth();

  const { data: batches } = useQuery({
    queryKey: ['batches'],
    queryFn: () => api.get('/batches?status=RELEASED').then(r => r.data.batches),
  });

  const { data: manifests } = useQuery({
    queryKey: ['manifests'],
    queryFn: () => api.get('/transport/manifests').then(r => r.data.manifests),
  });

  return (
    <div className="space-y-4 max-w-lg mx-auto">
      <div className="text-center pt-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-3">
          <Package size={28} className="text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome, {user?.name}</h1>
        <p className="text-sm text-white/30">Origin — Client Portal</p>
      </div>

      {/* Available batches */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
          <Package size={14} className="text-primary" /> Available Batches
        </h2>
        {!batches?.length ? (
          <p className="text-white/30 text-sm">No released batches available</p>
        ) : (
          <div className="space-y-2">
            {batches.map((b: any) => (
              <div key={b.id} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-mono text-primary text-sm font-bold">{b.batchNumber}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">RELEASED</span>
                </div>
                <div className="flex gap-4 text-xs text-white/40">
                  <span>{b.strain}</span>
                  <span className="font-mono">{b.totalWeight?.toFixed(0)}g</span>
                </div>
                {b.coas?.length > 0 && (
                  <a href={`/provenance/${b.id}`} target="_blank" className="text-xs text-primary hover:text-primary-light mt-1 inline-flex items-center gap-1">
                    <FileText size={10} /> View COA + Provenance
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delivery status */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
        <h2 className="text-sm font-semibold text-white/60 mb-3 flex items-center gap-2">
          <Truck size={14} className="text-blue-400" /> Delivery Status
        </h2>
        {!manifests?.length ? (
          <p className="text-white/30 text-sm">No deliveries</p>
        ) : (
          <div className="space-y-2">
            {manifests.map((m: any) => {
              const isDelivered = !!m.arrivedAt;
              const isTransit = m.departedAt && !m.arrivedAt;
              return (
                <div key={m.id} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-white">{m.transporter || 'Transport'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDelivered ? 'bg-green-500/20 text-green-400' : isTransit ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {isDelivered ? 'DELIVERED' : isTransit ? 'IN TRANSIT' : 'PENDING'}
                    </span>
                  </div>
                  <div className="text-xs text-white/30">
                    {m.vehicleReg} {m.departedAt && `· Departed ${new Date(m.departedAt).toLocaleDateString('en-ZA')}`}
                    {m.arrivedAt && ` · Arrived ${new Date(m.arrivedAt).toLocaleDateString('en-ZA')}`}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
