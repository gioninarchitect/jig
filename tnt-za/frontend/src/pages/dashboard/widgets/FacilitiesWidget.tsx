import { useQuery } from '@tanstack/react-query';
import api from '../../../services/api';

export default function FacilitiesWidget() {
  const { data: facilities } = useQuery({
    queryKey: ['facilities'],
    queryFn: () => api.get('/facilities').then(r => r.data.facilities),
  });

  if (!facilities?.length) return null;

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-white/60 mb-3">Facilities</h2>
      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-white/40 border-b border-white/10">
            <th className="pb-2 font-medium">Name</th><th className="pb-2 font-medium">Location</th>
            <th className="pb-2 font-medium">Plants</th><th className="pb-2 font-medium">Batches</th>
            <th className="pb-2 font-medium">GMP</th>
          </tr></thead>
          <tbody>
            {facilities.map((f: any) => (
              <tr key={f.id} className="border-b border-white/5 text-white/70">
                <td className="py-2.5 font-medium text-white">{f.name}</td>
                <td className="py-2.5">{f.location}</td>
                <td className="py-2.5 font-mono">{f._count?.plants ?? 0}</td>
                <td className="py-2.5 font-mono">{f._count?.batches ?? 0}</td>
                <td className="py-2.5"><span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">{f.gmpStatus}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-2">
        {facilities.map((f: any) => (
          <div key={f.id} className="bg-white/[0.03] border border-white/5 rounded-lg p-3">
            <div className="font-medium text-white text-sm">{f.name}</div>
            <div className="text-xs text-white/40 mb-2">{f.location}</div>
            <div className="flex gap-4 text-xs">
              <span className="text-white/60"><span className="font-mono font-bold text-white">{f._count?.plants ?? 0}</span> plants</span>
              <span className="text-white/60"><span className="font-mono font-bold text-white">{f._count?.batches ?? 0}</span> batches</span>
              <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">{f.gmpStatus}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
