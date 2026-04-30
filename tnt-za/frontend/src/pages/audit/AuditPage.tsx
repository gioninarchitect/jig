import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SkeletonTable } from '../../components/Skeleton';
import { Download } from 'lucide-react';
import api from '../../services/api';

export default function AuditPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['audit', page],
    queryFn: () => api.get('/audit', { params: { page, limit: 20 } }).then(r => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Audit Log</h1>
        <div className="flex gap-2">
          <a href="/api/audit/export" className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/60 hover:text-white flex items-center gap-2 transition min-h-[40px]">
            <Download size={14} /> CSV
          </a>
          <a href="/api/audit/package" className="px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg text-sm text-primary hover:bg-primary/20 flex items-center gap-2 transition min-h-[40px]">
            <Download size={14} /> PDF Package
          </a>
        </div>
      </div>
      {isLoading ? <SkeletonTable rows={10} /> : !data?.entries?.length ? (
        <p className="text-white/40 text-center py-12">No activity recorded yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-white/40 border-b border-white/10">
              <th className="pb-2 font-medium">Time</th><th className="pb-2 font-medium">User</th>
              <th className="pb-2 font-medium">Action</th><th className="pb-2 font-medium">Entity</th>
            </tr></thead>
            <tbody>
              {data.entries.map((e: any) => (
                <tr key={e.id} className="border-b border-white/5">
                  <td className="py-2.5 text-white/40 font-mono text-xs">{new Date(e.timestamp).toLocaleString('en-ZA')}</td>
                  <td className="py-2.5 text-white/60">{e.user?.name}</td>
                  <td className="py-2.5 text-white/80">{e.action.replace(/_/g, ' ')}</td>
                  <td className="py-2.5 text-white/40 text-xs">{e.entityType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
