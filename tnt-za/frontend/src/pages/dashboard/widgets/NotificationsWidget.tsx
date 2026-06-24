import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Bell, AlertTriangle, Clock, CheckCircle, ArrowRight, Scale, Skull, ShieldCheck, CalendarDays } from 'lucide-react';
import { useRBAC } from '../../../hooks/useRBAC';
import api from '../../../services/api';

const ICON_MAP: Record<string, any> = {
  overdue_task: Clock,
  critical_ticket: AlertTriangle,
  mother_health: Skull,
  stale_tickets: AlertTriangle,
  shift_pending: CalendarDays,
  pending_approvals: CheckCircle,
  rp_pending: ShieldCheck,
  weight_anomaly: Scale,
  calibration_due: Clock,
  faulty_assets: AlertTriangle,
  low_stock: AlertTriangle,
  maint_tickets: AlertTriangle,
  active_trim: Clock,
  facility_tickets: AlertTriangle,
  deviation: ShieldCheck,
};

const COLOR_MAP: Record<number, string> = {
  1: 'text-red-400',
  2: 'text-amber-400',
  3: 'text-blue-400',
};

export default function NotificationsWidget() {
  // Weight-variance / diversion alerts route ONLY to FM + admins (CLAUDE.md rule).
  const { hasRole } = useRBAC();
  const canSeeWeight = hasRole('FACILITY_MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN');

  const { data: smartNotifs } = useQuery({
    queryKey: ['smart-notifications'],
    queryFn: () => api.get('/smart/notifications').then(r => r.data.notifications),
    refetchInterval: 60000, // refresh every minute
  });

  // Also keep the weight anomaly check (real-time critical)
  const { data: anomalies } = useQuery({
    queryKey: ['anomalies', 'variance'],
    queryFn: () => api.get('/anomalies?type=CONTAINER_WEIGHT_VARIANCE&resolved=false').then(r => r.data.anomalies),
  });

  const notifications = [...(smartNotifs || [])];

  // Add weight anomalies (highest priority, always show)
  if (anomalies?.length > 0) {
    notifications.unshift({
      type: 'weight_anomaly', priority: 1,
      title: `${anomalies.length} weight variance alert${anomalies.length > 1 ? 's' : ''}`,
      message: 'Investigate immediately — possible diversion',
      link: '/compliance',
    });
  }

  // Collapse a burst of deviation notifications into ONE entry so they don't bury the dashboard.
  // (The full alter/resolve flow lives in Quality Management → Open Deviations.)
  const isDev = (n: any) => /deviation/i.test(n.title || '') || n.link === '/qms';
  const devNotifs = notifications.filter(isDev);
  const display = devNotifs.length > 1
    ? [{ type: 'deviation', priority: Math.min(...devNotifs.map((n: any) => n.priority || 3)),
         title: `${devNotifs.length} deviations to review`, message: 'Review & close in Quality Management', link: '/qms' },
       ...notifications.filter((n: any) => !isDev(n))]
    : notifications;

  if (display.length === 0) return null;

  const hasCritical = display.some(n => n.priority === 1);

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${hasCritical ? 'bg-red-500/5 border-red-500/15' : 'bg-amber-500/5 border-amber-500/15'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bell size={16} className={hasCritical ? 'text-red-400' : 'text-amber-400'} />
          <h2 className="text-sm font-semibold text-white/60">Notifications</h2>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/40 font-mono">{display.length}</span>
        </div>
      </div>
      {/* Cap the bell so a burst of deviations can't bury the dashboard — show the top 5
          (criticals first), then a "+N more" link to the full board. */}
      <div className="space-y-1.5">
        {[...display].sort((a, b) => (a.priority || 3) - (b.priority || 3)).slice(0, 5).map((n: any, i: number) => {
          const Icon = ICON_MAP[n.type] || AlertTriangle;
          const color = COLOR_MAP[n.priority] || 'text-white/40';
          return (
            <Link key={i} to={n.link} className="flex items-start gap-2.5 py-2 hover:bg-white/5 -mx-2 px-2 rounded-lg transition">
              <Icon size={14} className={`${color} flex-shrink-0 mt-0.5`} />
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${n.priority === 1 ? 'text-white' : 'text-white/70'}`}>{n.title}</div>
                <div className="text-xs text-white/30 mt-0.5 truncate">{n.message}</div>
              </div>
              <ArrowRight size={12} className="text-white/10 flex-shrink-0 mt-1" />
            </Link>
          );
        })}
        {display.length > 5 && (
          <Link to="/tickets" className="block text-center text-xs text-white/40 hover:text-primary py-1.5">+{display.length - 5} more</Link>
        )}
      </div>
    </div>
  );
}
