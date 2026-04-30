import { useQuery } from '@tanstack/react-query';
import { Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../../services/api';

const ROLE_COLORS: Record<string, string> = {
  FACILITY_MANAGER: 'bg-primary', PROCESSING_MANAGER: 'bg-primary', FACILITY_SUPERVISOR: 'bg-primary',
  QA_INSPECTOR: 'bg-cyan-500', MAINTENANCE_MANAGER: 'bg-orange-500',
  CULTIVATOR: 'bg-green-500', LAB_TECH: 'bg-amber-500', IRRIGATION_TECH: 'bg-blue-500',
  SECURITY_OFFICER: 'bg-red-500', TRIMMER: 'bg-emerald-500', GENERAL_WORKER: 'bg-white/30',
  HOUSEKEEPING: 'bg-pink-500', LAUNDRY: 'bg-violet-500', VIEWER: 'bg-white/20',
  TENANT_ADMIN: 'bg-blue-500', SUPER_ADMIN: 'bg-purple-500',
};

export default function StaffOverviewWidget() {
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(r => r.data.users),
  });

  if (!users) return null;

  const active = users.filter((u: any) => u.active !== false);
  const byRole: Record<string, number> = {};
  active.forEach((u: any) => { byRole[u.role] = (byRole[u.role] || 0) + 1; });

  const sorted = Object.entries(byRole).sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-white/60">Team ({active.length})</h2>
        </div>
        <Link to="/users" className="text-xs text-primary flex items-center gap-1 hover:text-primary-light">
          Manage <ArrowRight size={12} />
        </Link>
      </div>
      <div className="space-y-1.5">
        {sorted.map(([role, count]) => (
          <div key={role} className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${ROLE_COLORS[role] || 'bg-white/20'}`} />
            <span className="text-sm text-white/60 flex-1">{role.replace(/_/g, ' ')}</span>
            <span className="text-sm font-mono text-white font-bold">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
