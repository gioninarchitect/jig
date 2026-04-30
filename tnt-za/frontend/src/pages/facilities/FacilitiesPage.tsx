import { useQuery } from '@tanstack/react-query';
import { SkeletonCard } from '../../components/Skeleton';
import { Building2, MapPin } from 'lucide-react';
import api from '../../services/api';

export default function FacilitiesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => api.get('/facilities').then(r => r.data.facilities),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-white">Facilities</h1>
      {isLoading ? <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[1,2].map(i => <SkeletonCard key={i} />)}</div> : !data?.length ? (
        <p className="text-white/40 text-center py-12">No facilities</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.map((f: any) => {
            const quotaPct = f.quotaAllocated > 0 ? (f.quotaUsed / f.quotaAllocated * 100) : 0;
            return (
              <div key={f.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 size={18} className="text-primary" />
                  <span className="font-bold text-white">{f.name}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-white/40 mb-4"><MapPin size={12} />{f.location}</div>
                <div className="grid grid-cols-3 gap-3 mb-4 text-center">
                  <div><div className="text-lg font-bold font-mono text-white">{f._count?.plants ?? 0}</div><div className="text-xs text-white/40">Plants</div></div>
                  <div><div className="text-lg font-bold font-mono text-white">{f._count?.batches ?? 0}</div><div className="text-xs text-white/40">Batches</div></div>
                  <div><div className="text-lg font-bold font-mono text-white">{f._count?.containers ?? 0}</div><div className="text-xs text-white/40">Containers</div></div>
                </div>
                <div className="mb-2 flex justify-between text-xs"><span className="text-white/40">Quota</span><span className="text-white/60">{quotaPct.toFixed(0)}%</span></div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${quotaPct > 85 ? 'bg-red-500' : quotaPct > 70 ? 'bg-amber-500' : 'bg-primary'}`} style={{ width: `${Math.min(quotaPct, 100)}%` }} />
                </div>
                {f.zones?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {f.zones.map((z: any) => (
                      <span key={z.id} className="text-[10px] bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white/50">{z.name}</span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
