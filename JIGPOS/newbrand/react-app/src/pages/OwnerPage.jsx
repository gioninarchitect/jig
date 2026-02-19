// Owner Dashboard — Command Centre with dark theme matching vanilla owner-dashboard.html
import { useState, useEffect } from 'react';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';
import { formatCurrency } from '../config';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/ui/Badge';
import api from '../services/api';

// SVG icon paths (Heroicons outline)
function Icon({ d, className = 'w-5 h-5' }) {
  return <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

const I = {
  home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  eye: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z',
  live: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  branches: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  camera: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  approve: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  wholesale: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  staff: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  money: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  stocktake: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  inventory: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
};

const menuItems = [
  { key: 'overview', label: 'Command Centre', icon: <Icon d={I.home} /> },
  { key: 'livefeed', label: 'Live Feed', icon: <Icon d={I.live} /> },
  { key: 'branches', label: 'Branches', icon: <Icon d={I.branches} /> },
  { key: 'cameras', label: 'Cameras', icon: <Icon d={I.camera} /> },
  { key: 'approvals', label: 'Approvals', icon: <Icon d={I.approve} /> },
  { key: 'wholesale', label: 'Wholesale', icon: <Icon d={I.wholesale} /> },
  { key: 'reports', label: 'Reports', icon: <Icon d={I.reports} /> },
  { key: 'staff', label: 'Staff', icon: <Icon d={I.staff} /> },
  { key: 'financials', label: 'Financials', icon: <Icon d={I.money} /> },
  { key: 'stocktake', label: 'Stock Take', icon: <Icon d={I.stocktake} /> },
  { key: 'inventory', label: 'Inventory', icon: <Icon d={I.inventory} /> },
];

export default function OwnerPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/dashboard/owner-stats');
        setStats(res.data);
      } catch {
        try {
          const res = await api.get('/dashboard/stats');
          setStats(res.data);
        } catch { /* empty */ }
      }
      setLoading(false);
    }
    load();
  }, []);

  const d = stats || {};

  return (
    <DashboardLayout title="Owner" menuItems={menuItems} user={user} onNavigate={setTab} activeItem={tab}>
      {tab === 'overview' && (
        <>
          <div className="flex items-center gap-3 mb-6">
            <h2 className="font-heading text-2xl text-white uppercase">Command Centre</h2>
            <Badge status="active">LIVE</Badge>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total Revenue" value={d.totalRevenue ? formatCurrency(d.totalRevenue) : d.revenueToday ? formatCurrency(d.revenueToday) : '--'} />
                <StatCard label="Active Branches" value={d.activeBranches ?? d.branchCount ?? '--'} />
                <StatCard label="Total Orders" value={d.totalOrders ?? d.ordersToday ?? '--'} />
                <StatCard label="Active Staff" value={d.activeStaff ?? '--'} />
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Products" value={d.productCount ?? d.totalProducts ?? '--'} />
                <StatCard label="Low Stock Items" value={d.lowStockCount ?? '--'} />
                <StatCard label="Pending Approvals" value={d.pendingApprovals ?? '--'} />
                <StatCard label="Customers" value={d.customerCount ?? '--'} />
              </div>

              {/* Quick access cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <QuickCard title="360 View" desc="Full branch network overview with risk heatmap" link="/app/owner-360" icon={I.eye} />
                <QuickCard title="Approvals" desc="Pending orders, refunds and stock adjustments" onClick={() => setTab('approvals')} icon={I.approve} />
                <QuickCard title="Reports" desc="Sales, staff performance and compliance" onClick={() => setTab('reports')} icon={I.reports} />
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'livefeed' && <PlaceholderSection title="Live Feed" desc="Real-time event stream from all branches" icon={I.live} />}
      {tab === 'branches' && <PlaceholderSection title="Branches" desc="All branch locations, status and performance" icon={I.branches} />}
      {tab === 'cameras' && <PlaceholderSection title="Cameras" desc="Live CCTV feeds from branch locations" icon={I.camera} />}
      {tab === 'approvals' && <PlaceholderSection title="Approvals" desc="Pending order approvals, refunds and stock adjustment requests" icon={I.approve} />}
      {tab === 'wholesale' && <PlaceholderSection title="Wholesale" desc="B2B orders, wholesale customers and delivery tracking" icon={I.wholesale} />}
      {tab === 'reports' && <PlaceholderSection title="Reports" desc="Sales reports, staff performance, compliance and financial summaries" icon={I.reports} />}
      {tab === 'staff' && <PlaceholderSection title="Staff" desc="Staff roster, shifts, performance metrics and payroll overview" icon={I.staff} />}
      {tab === 'financials' && <PlaceholderSection title="Financials" desc="Revenue tracking, budget vs actual and P&L overview" icon={I.money} />}
      {tab === 'stocktake' && <PlaceholderSection title="Stock Take" desc="Stocktake schedules, results and variance reports" icon={I.stocktake} />}
      {tab === 'inventory' && <PlaceholderSection title="Inventory" desc="Network-wide stock levels, transfers and alerts" icon={I.inventory} />}
    </DashboardLayout>
  );
}

function QuickCard({ title, desc, link, onClick, icon }) {
  const Tag = link ? 'a' : 'button';
  const props = link ? { href: link } : { onClick };
  return (
    <Tag {...props} className="p-5 rounded-xl border border-gray-200 bg-white hover:border-jig-purple/30 hover:shadow-md transition-all text-left group block w-full">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-jig-slate flex items-center justify-center">
          <Icon d={icon} className="w-5 h-5 text-jig-purple group-hover:text-jig-amber transition-colors" />
        </div>
        <span className="font-heading text-sm text-white uppercase">{title}</span>
      </div>
      <p className="text-xs text-gray-500">{desc}</p>
    </Tag>
  );
}

function PlaceholderSection({ title, desc, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-jig-slate flex items-center justify-center mb-4" style={{ border: '2px solid rgba(58,95,72,0.2)' }}>
        <Icon d={icon} className="w-8 h-8 text-jig-purple" />
      </div>
      <h3 className="font-heading text-xl text-white uppercase mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md">{desc}</p>
      <div className="mt-4 px-4 py-2 rounded-full bg-jig-slate text-xs text-jig-purple font-semibold" style={{ border: '1px solid rgba(58,95,72,0.2)' }}>
        Coming Soon
      </div>
    </div>
  );
}
