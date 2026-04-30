import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import StatCard from '../../components/StatCard';
import { SkeletonCard } from '../../components/Skeleton';
import {
  Leaf, ShoppingBag, Egg, Wheat, Beef, Building2, ArrowRight,
  TrendingUp, AlertTriangle, TicketCheck, Users, Shield, Package,
} from 'lucide-react';
import api from '../../services/api';

// Business units
const UNITS = [
  { id: 'cannabis', label: 'Origin Cannabis', icon: Leaf, color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5' },
  { id: 'retail', label: 'Origin Retail', icon: ShoppingBag, color: 'text-primary', border: 'border-primary/20', bg: 'bg-primary/5' },
  { id: 'chickens', label: 'Chickens', icon: Egg, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
  { id: 'maize', label: 'Maize', icon: Wheat, color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
  { id: 'cattle', label: 'Cattle', icon: Beef, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [activeUnit, setActiveUnit] = useState('cannabis');
  const firstName = user?.name?.split(' ')[0] || 'there';

  // Cannabis data
  const { data: worldState } = useQuery({ queryKey: ['world-state'], queryFn: () => api.get('/world-model/state').then(r => r.data.state) });
  const { data: tickets } = useQuery({ queryKey: ['tickets', ''], queryFn: () => api.get('/baygrid/tickets').then(r => r.data.tickets) });
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users').then(r => r.data.users) });
  const { data: assetStats } = useQuery({ queryKey: ['asset-stats'], queryFn: () => api.get('/assets/stats').then(r => r.data.stats) });
  const { data: smartNotifs } = useQuery({ queryKey: ['smart-notifications'], queryFn: () => api.get('/smart/notifications').then(r => r.data.notifications) });

  const openTickets = tickets?.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED').length || 0;
  const criticalTickets = tickets?.filter((t: any) => t.priority === 'CRITICAL' && t.status !== 'COMPLETED').length || 0;
  const pendingApprovals = tickets?.filter((t: any) => (t.ticketType === 'REQUISITION' || t.ticketType === 'APPROVAL') && !t.approvedAt && t.status !== 'COMPLETED').length || 0;
  const totalStaff = users?.filter((u: any) => u.active !== false).length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{getGreeting()}, {firstName}</h1>
          <p className="text-xs text-white/30">Owner Dashboard — ILCO Farming</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Building2 size={20} className="text-primary" />
        </div>
      </div>

      {/* Smart notifications */}
      {smartNotifs && smartNotifs.length > 0 && (
        <div className={`rounded-xl border p-4 ${smartNotifs.some((n: any) => n.priority === 1) ? 'bg-red-500/5 border-red-500/15' : 'bg-amber-500/5 border-amber-500/15'}`}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-xs font-semibold text-white/50">{smartNotifs.length} Notifications</span>
          </div>
          {smartNotifs.slice(0, 3).map((n: any, i: number) => (
            <Link key={i} to={n.link} className="flex items-center gap-2 py-1.5 text-sm text-white/60 hover:text-white">
              <span className={`w-1.5 h-1.5 rounded-full ${n.priority === 1 ? 'bg-red-500' : 'bg-amber-500'}`} />
              {n.title}
            </Link>
          ))}
        </div>
      )}

      {/* Business unit tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {UNITS.map(u => (
          <button key={u.id} onClick={() => setActiveUnit(u.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition min-h-[40px] ${activeUnit === u.id ? `${u.bg} ${u.color} border ${u.border}` : 'bg-white/[0.03] text-white/30 hover:text-white/50'}`}>
            <u.icon size={14} />
            {u.label}
          </button>
        ))}
      </div>

      {/* ═══ CANNABIS TAB ═══ */}
      {activeUnit === 'cannabis' && (
        <div className="space-y-4">
          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatCard label="Plants" value={worldState?.facility?.totalPlants} icon={<Leaf size={18} />} />
            <StatCard label="Batches" value={worldState?.facility?.activeBatches} icon={<Package size={18} />} />
            <StatCard label="Staff" value={totalStaff} icon={<Users size={18} />} />
            <StatCard label="Open Tickets" value={openTickets} icon={<TicketCheck size={18} />} danger={criticalTickets > 0} />
          </div>

          {/* Approval queue */}
          {pendingApprovals > 0 && (
            <Link to="/tickets" className="block bg-primary/5 border border-primary/20 rounded-xl p-4 hover:bg-primary/10 transition">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-primary">{pendingApprovals} approval{pendingApprovals > 1 ? 's' : ''} waiting</div>
                  <div className="text-xs text-white/30">Requisitions + compliance docs need your sign-off</div>
                </div>
                <ArrowRight size={16} className="text-primary" />
              </div>
            </Link>
          )}

          {/* Compliance overview */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className={`rounded-xl p-3 border text-center ${worldState?.compliance?.openAnomalies > 0 ? 'bg-red-500/5 border-red-500/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <div className={`text-xl font-bold font-mono ${worldState?.compliance?.openAnomalies > 0 ? 'text-red-400' : 'text-white'}`}>{worldState?.compliance?.openAnomalies ?? 0}</div>
              <div className="text-[10px] text-white/20">Anomalies</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
              <div className="text-xl font-bold font-mono text-white">{worldState?.lab?.issuedCOAs ?? 0}</div>
              <div className="text-[10px] text-white/20">COAs</div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
              <div className="text-xl font-bold font-mono text-white">{worldState?.facility?.quotaUsedPercent?.toFixed(0) ?? 0}%</div>
              <div className="text-[10px] text-white/20">Quota Used</div>
            </div>
            <div className={`rounded-xl p-3 border text-center ${(assetStats?.faulty || 0) > 0 ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
              <div className="text-xl font-bold font-mono text-white">{assetStats?.total ?? 0}</div>
              <div className="text-[10px] text-white/20">Assets</div>
            </div>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            <QuickLink to="/facility360" label="Facility 360" />
            <QuickLink to="/site-master-file" label="Site Master" />
            <QuickLink to="/baygrid" label="BayGrid" />
            <QuickLink to="/batches" label="Batches" />
            <QuickLink to="/audit" label="Audit Trail" />
            <QuickLink to="/users" label="Staff" />
          </div>
        </div>
      )}

      {/* ═══ RETAIL TAB ═══ */}
      {activeUnit === 'retail' && (
        <div className="space-y-4">
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center">
            <ShoppingBag size={32} className="text-primary mx-auto mb-3 opacity-30" />
            <h2 className="text-lg font-bold text-white/50">Origin Retail</h2>
            <p className="text-sm text-white/20 mt-1">Integration with Origin POS coming soon</p>
            <p className="text-xs text-white/10 mt-4">Will show: daily sales, stock levels, order pipeline, customer analytics</p>
          </div>
        </div>
      )}

      {/* ═══ CHICKENS TAB ═══ */}
      {activeUnit === 'chickens' && (
        <FarmUnit
          title="Chicken Operations"
          icon={Egg}
          color="text-amber-400"
          stats={[
            { label: 'Flock Size', value: '—' },
            { label: 'Egg Production', value: '—' },
            { label: 'Feed Stock', value: '—' },
            { label: 'Mortality', value: '—' },
          ]}
        />
      )}

      {/* ═══ MAIZE TAB ═══ */}
      {activeUnit === 'maize' && (
        <FarmUnit
          title="Maize Operations"
          icon={Wheat}
          color="text-yellow-400"
          stats={[
            { label: 'Hectares', value: '—' },
            { label: 'Yield/ha', value: '—' },
            { label: 'Season', value: '—' },
            { label: 'Silo Stock', value: '—' },
          ]}
        />
      )}

      {/* ═══ CATTLE TAB ═══ */}
      {activeUnit === 'cattle' && (
        <FarmUnit
          title="Cattle Operations"
          icon={Beef}
          color="text-orange-400"
          stats={[
            { label: 'Herd Size', value: '—' },
            { label: 'Calves', value: '—' },
            { label: 'Grazing', value: '—' },
            { label: 'Veterinary', value: '—' },
          ]}
        />
      )}
    </div>
  );
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="text-center py-2.5 px-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/40 hover:text-white hover:bg-white/[0.06] transition min-h-[40px] flex items-center justify-center">
      {label}
    </Link>
  );
}

function FarmUnit({ title, icon: Icon, color, stats }: { title: string; icon: any; color: string; stats: { label: string; value: string }[] }) {
  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <Icon size={24} className={`${color} opacity-50`} />
          <h2 className="text-lg font-bold text-white/50">{title}</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {stats.map((s, i) => (
            <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 text-center">
              <div className="text-xl font-bold font-mono text-white/20">{s.value}</div>
              <div className="text-[10px] text-white/15">{s.label}</div>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/10 text-center mt-4">Module coming soon — contact support to configure</p>
      </div>
    </div>
  );
}
