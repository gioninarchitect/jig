import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import StatCard from '../../components/StatCard';
import { SkeletonCard } from '../../components/Skeleton';
import {
  Leaf, ShoppingBag, Egg, Wheat, Beef, Building2,
  AlertTriangle, TicketCheck, Users, Package,
} from 'lucide-react';
import api from '../../services/api';
import ApprovalsWaitingBanner from '../../components/ApprovalsWaitingBanner';
import BottleneckRadarWidget from '../dashboard/widgets/BottleneckRadarWidget';
import OwnerConciergeWidget from '../dashboard/widgets/OwnerConciergeWidget';

// Business units
const UNITS = [
  { id: 'cannabis', label: 'Origin Cannabis', icon: Leaf, color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5' },
  { id: 'retail', label: 'Origin Retail', icon: ShoppingBag, color: 'text-primary', border: 'border-primary/20', bg: 'bg-primary/5' },
  { id: 'chickens', label: 'Chickens', icon: Egg, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
  { id: 'mielies', label: 'Mielies', icon: Wheat, color: 'text-yellow-400', border: 'border-yellow-500/20', bg: 'bg-yellow-500/5' },
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
  const { data: chickenSummary } = useQuery({ queryKey: ['chicken-summary-owner'], queryFn: () => api.get('/chickens/summary').then(r => r.data.summary).catch(() => null), enabled: activeUnit === 'chickens' });
  const { data: assetStats } = useQuery({ queryKey: ['asset-stats'], queryFn: () => api.get('/assets/stats').then(r => r.data.stats) });
  const { data: smartNotifs } = useQuery({ queryKey: ['smart-notifications'], queryFn: () => api.get('/smart/notifications').then(r => r.data.notifications) });

  // Origin Retail (Potchefstroom store) — live via the POS bridge. Only fetched when the Retail tab is open.
  const { data: retail, isLoading: retailLoading } = useQuery({
    queryKey: ['origin-summary'],
    queryFn: () => api.get('/origin/summary').then(r => r.data.summary),
    enabled: activeUnit === 'retail',
    refetchInterval: activeUnit === 'retail' ? 60000 : false,
  });

  const openTickets = tickets?.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED').length || 0;
  const criticalTickets = tickets?.filter((t: any) => t.priority === 'CRITICAL' && t.status !== 'COMPLETED').length || 0;
  const totalStaff = users?.filter((u: any) => u.active !== false).length || 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">{getGreeting()}, {firstName}</h1>
          <p className="text-xs text-white/30">Owner Dashboard — Origin Farming</p>
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

          {/* Owner Concierge — AI morning brief (Opus 4.7) */}
          <OwnerConciergeWidget />

          {/* Approvals waiting — shared, role-aware */}
          <ApprovalsWaitingBanner />

          {/* Bottleneck radar — ageing queues across RP/Owner/Maintenance/Lab/Dispatch */}
          <BottleneckRadarWidget />

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
          {retailLoading && <SkeletonCard />}

          {!retailLoading && retail && !retail.connected && (
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 text-center">
              <ShoppingBag size={32} className="text-primary mx-auto mb-3 opacity-30" />
              <h2 className="text-lg font-bold text-white/50">Origin Retail — not connected</h2>
              <p className="text-sm text-white/20 mt-1">Couldn't reach the Origin POS ({retail.reason || 'unknown'}).</p>
              <p className="text-xs text-white/10 mt-3">Check the bridge key / store link, then refresh.</p>
            </div>
          )}

          {!retailLoading && retail && retail.connected && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-white">{retail.branch} store</h2>
                  <p className="text-[10px] text-white/30">Live from Origin POS · today</p>
                </div>
                <span className="text-[10px] text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> live</span>
              </div>

              {/* Today's trading */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <StatCard label="Sales today" value={`R${(retail.today?.sales ?? 0).toLocaleString('en-ZA')}`} icon={<ShoppingBag size={18} />} />
                <StatCard label="Transactions" value={retail.today?.transactions ?? 0} icon={<TicketCheck size={18} />} />
                <StatCard label="Avg basket" value={`R${(retail.today?.avgBasket ?? 0).toFixed(0)}`} icon={<Package size={18} />} />
                <StatCard label="Active SKUs" value={retail.products?.active ?? 0} icon={<Package size={18} />} />
              </div>

              {/* Stock health */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className={`rounded-xl p-3 border text-center ${(retail.products?.lowStock || 0) > 0 ? 'bg-amber-500/5 border-amber-500/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                  <div className={`text-xl font-bold font-mono ${(retail.products?.lowStock || 0) > 0 ? 'text-amber-400' : 'text-white'}`}>{retail.products?.lowStock ?? 0}</div>
                  <div className="text-[10px] text-white/20">Low stock</div>
                </div>
                <div className={`rounded-xl p-3 border text-center ${(retail.products?.outOfStock || 0) > 0 ? 'bg-red-500/5 border-red-500/15' : 'bg-white/[0.03] border-white/[0.06]'}`}>
                  <div className={`text-xl font-bold font-mono ${(retail.products?.outOfStock || 0) > 0 ? 'text-red-400' : 'text-white'}`}>{retail.products?.outOfStock ?? 0}</div>
                  <div className="text-[10px] text-white/20">Out of stock</div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <div className="text-xl font-bold font-mono text-white">{retail.today?.voided ?? 0}</div>
                  <div className="text-[10px] text-white/20">Voided today</div>
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
                  <div className="text-sm font-bold font-mono text-white">{Object.keys(retail.today?.byMethod || {}).map(k => `${k} R${Math.round(retail.today.byMethod[k])}`).join(' · ') || '—'}</div>
                  <div className="text-[10px] text-white/20">By method</div>
                </div>
              </div>

              {/* Top sellers + low stock */}
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-white/40 mb-2">Top sellers today</h3>
                  {(retail.topProducts || []).length === 0 && <p className="text-xs text-white/20">No sales yet today.</p>}
                  {(retail.topProducts || []).map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-sm border-b border-white/[0.04] last:border-0">
                      <span className="text-white/70 truncate pr-2">{p.name}</span>
                      <span className="text-primary font-mono whitespace-nowrap">R{Math.round(p.revenue)} · {p.qty}×</span>
                    </div>
                  ))}
                </div>
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4">
                  <h3 className="text-xs font-semibold text-white/40 mb-2">Low stock — reorder</h3>
                  {(retail.lowStockList || []).length === 0 && <p className="text-xs text-white/20">All stock healthy.</p>}
                  {(retail.lowStockList || []).slice(0, 8).map((p: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 text-sm border-b border-white/[0.04] last:border-0">
                      <span className="text-white/70 truncate pr-2">{p.name}</span>
                      <span className={`font-mono whitespace-nowrap ${p.qty <= 0 ? 'text-red-400' : 'text-amber-400'}`}>{p.qty} left</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ CHICKENS TAB ═══ */}
      {activeUnit === 'chickens' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Egg size={18} className="text-amber-400" /><h2 className="text-lg font-bold text-white">Chicken Operations</h2></div>
            <Link to="/chickens" className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">Open Chicken Farm →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Flock Size', value: chickenSummary ? chickenSummary.totals.flock.toLocaleString() : '—' },
              { label: 'Coops', value: chickenSummary ? chickenSummary.totals.coops : '—' },
              { label: 'Mortality Today', value: chickenSummary ? chickenSummary.totals.mortalityToday : '—', warn: (chickenSummary?.totals.mortalityToday || 0) > 0 },
              { label: 'Total Mortality', value: chickenSummary ? chickenSummary.totals.mortalityTotal : '—', danger: (chickenSummary?.totals.mortalityTotal || 0) > 0 },
            ].map((s: any) => (
              <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className={`text-2xl font-bold ${s.danger ? 'text-red-300' : s.warn ? 'text-amber-300' : 'text-white'}`}>{s.value}</div>
                <div className="text-xs text-white/40 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
          {chickenSummary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {chickenSummary.houses.map((h: any) => (
                <div key={h.name} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between">
                  <div><div className="font-bold text-white">{h.name}</div><div className="text-xs text-white/40">{h.flock.toLocaleString()} birds{h.tempC != null ? ` · ${h.tempC}°C` : ''}</div></div>
                  <div className="flex gap-3 text-xs"><span className="text-amber-300">↓ {h.mortalityToday} today</span><span className="text-red-300">Σ {h.mortalityTotal}</span></div>
                </div>
              ))}
            </div>
          )}
          {!chickenSummary && <p className="text-xs text-white/30 text-center py-4">Loading chicken data…</p>}
        </div>
      )}

      {/* ═══ MIELIES TAB ═══ */}
      {activeUnit === 'mielies' && (
        <FarmUnit
          title="Mielies Operations"
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
