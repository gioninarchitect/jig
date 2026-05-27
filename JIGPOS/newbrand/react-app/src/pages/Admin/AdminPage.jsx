// P27 — Admin Dashboard (full tab layout matching vanilla admin.html)
// RBAC per tab from auth context. Module marketplace integration.

import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useWorldModelConfig } from '../../world-model/WorldModelContext';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../config';
import { getRoleLabel } from '../../config/roles';
import api from '../../services/api';

// SVG icon paths (24x24 viewBox)
const ICONS = {
  overview: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  inventory: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  pos: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  orders: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  staff: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
  users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  branches: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  suppliers: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  'purchase-orders': 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  customers: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
  payments: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
  vouchers: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z',
  affiliates: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  reports: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  loyalty: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  compliance: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  marketplace: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  leads: 'M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z',
  settings: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  'settings-inner': 'M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  'audit-log': 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  payroll: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z',
  wholesale: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
  marketing: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
  viral: 'M13 10V3L4 14h7v7l9-11h-7z',
};

function Icon({ name, className = 'w-5 h-5' }) {
  const d = ICONS[name];
  if (!d) return null;
  // Settings has two paths
  if (name === 'settings') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={ICONS.settings} />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={ICONS['settings-inner']} />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} />
    </svg>
  );
}

const MENU_ITEMS = [
  { key: 'overview', label: 'Overview', icon: <Icon name="overview" /> },
  { key: 'inventory', label: 'Inventory', icon: <Icon name="inventory" /> },
  { key: 'pos', label: 'POS', icon: <Icon name="pos" /> },
  { key: 'payments', label: 'Payments', icon: <Icon name="payments" /> },
  { key: 'orders', label: 'Orders', icon: <Icon name="orders" /> },
  { key: 'vouchers', label: 'Vouchers', icon: <Icon name="vouchers" /> },
  { key: 'affiliates', label: 'Affiliates', icon: <Icon name="affiliates" /> },
  { key: 'users', label: 'Users', icon: <Icon name="users" /> },
  { key: 'staff', label: 'Staff', icon: <Icon name="staff" /> },
  { key: 'payroll', label: 'Payroll', icon: <Icon name="payroll" /> },
  { key: 'branches', label: 'Branches', icon: <Icon name="branches" /> },
  { key: 'suppliers', label: 'Suppliers', icon: <Icon name="suppliers" /> },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: <Icon name="purchase-orders" /> },
  { key: 'wholesale', label: 'Wholesale / B2B', icon: <Icon name="wholesale" /> },
  { key: 'customers', label: 'Customers', icon: <Icon name="customers" /> },
  { key: 'leads', label: 'Leads', icon: <Icon name="leads" /> },
  { key: 'marketing', label: 'Marketing', icon: <Icon name="marketing" /> },
  { key: 'viral', label: 'Viral Engine', icon: <Icon name="viral" /> },
  { key: 'reports', label: 'Reports', icon: <Icon name="reports" /> },
  { key: 'loyalty', label: 'Loyalty', icon: <Icon name="loyalty" /> },
  { key: 'compliance', label: 'Compliance', icon: <Icon name="compliance" /> },
  { key: 'marketplace', label: 'Marketplace', icon: <Icon name="marketplace" /> },
  { key: 'settings', label: 'Settings', icon: <Icon name="settings" /> },
  { key: 'audit-log', label: 'Audit Log', icon: <Icon name="audit-log" /> },
];

export default function AdminPage() {
  const { user } = useAuth();
  const config = useWorldModelConfig();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch { /* empty state */ }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <DashboardLayout
      title="Admin"
      menuItems={MENU_ITEMS}
      user={user}
      onNavigate={setTab}
      activeItem={tab}
    >
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-white uppercase">
          Welcome, {user?.firstName}
        </h2>
        <p className="text-sm text-gray-500">{getRoleLabel(user?.role)} Dashboard</p>
      </div>

      {tab === 'overview' && <OverviewTab stats={stats} loading={loading} config={config} />}
      {tab === 'inventory' && <DataListTab endpoint="/products?status=active&limit=50" title="Products" columns={['name', 'sku', 'category', 'price', 'status']} />}
      {tab === 'pos' && <DataListTab endpoint="/pos/sessions?limit=20" title="POS Sessions" columns={['sessionId', 'status', 'openedAt']} />}
      {tab === 'payments' && <PaymentsTab />}
      {tab === 'orders' && <DataListTab endpoint="/orders/all?limit=50" title="Orders" columns={['orderNumber', 'status', 'total', 'createdAt']} />}
      {tab === 'vouchers' && <PlaceholderTab title="Vouchers" description="Create, manage and track voucher campaigns. Module-gated — enable via Marketplace." icon="vouchers" />}
      {tab === 'affiliates' && <PlaceholderTab title="Affiliate Program" description="Manage wellness advocates and track commission payouts. Module-gated — enable via Marketplace." icon="affiliates" />}
      {tab === 'staff' && <DataListTab endpoint="/users?role=branch_assistant&limit=50" title="Staff" columns={['firstName', 'lastName', 'role', 'status']} />}
      {tab === 'users' && <DataListTab endpoint="/users?limit=50" title="Users" columns={['firstName', 'lastName', 'email', 'role', 'status']} />}
      {tab === 'payroll' && <PlaceholderTab title="Payroll" description="Staff salary management, pay runs and payslip generation." icon="payroll" />}
      {tab === 'branches' && <DataListTab endpoint="/branches?limit=20" title="Branches" columns={['name', 'branchCode', 'status', 'city']} />}
      {tab === 'suppliers' && <DataListTab endpoint="/suppliers?limit=50" title="Suppliers" columns={['name', 'contactPerson', 'email', 'status']} />}
      {tab === 'purchase-orders' && <DataListTab endpoint="/purchase-orders?limit=50" title="Purchase Orders" columns={['poNumber', 'supplier', 'status', 'total']} />}
      {tab === 'wholesale' && <PlaceholderTab title="Wholesale / B2B Orders" description="Manage wholesale customers, create B2B orders and track deliveries." icon="wholesale" />}
      {tab === 'customers' && <DataListTab endpoint="/users?role=customer&limit=50" title="Customers" columns={['firstName', 'lastName', 'email', 'loyalty']} />}
      {tab === 'leads' && <PlaceholderTab title="Leads" description="Lead tracking and CRM — capture, nurture and convert leads." icon="leads" />}
      {tab === 'marketing' && <PlaceholderTab title="Marketing" description="Campaign management, email blasts and promotional scheduling." icon="marketing" />}
      {tab === 'viral' && <PlaceholderTab title="Viral Engine" description="Campaigns, influencer verification, product scores and analytics. Module-gated — enable via Marketplace." icon="viral" />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'loyalty' && <DataListTab endpoint="/loyalty/tiers" title="Loyalty Tiers" columns={['name', 'pointsRequired', 'discount']} />}
      {tab === 'compliance' && <ComplianceTab />}
      {tab === 'marketplace' && <MarketplaceTab />}
      {tab === 'settings' && <SettingsTab />}
      {tab === 'audit-log' && <DataListTab endpoint="/audit-log?limit=100" title="Audit Log" columns={['action', 'user', 'resource', 'createdAt']} />}
    </DashboardLayout>
  );
}

// ─── Overview Tab ───────────────────────────────────────────────

function OverviewTab({ stats, loading, config }) {
  if (loading) return <div className="flex justify-center py-12"><div className="w-8 h-8 border-3 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  const d = stats || {};
  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={d.productCount ?? d.totalProducts ?? '--'} />
        <StatCard label="Orders Today" value={d.ordersToday ?? '--'} />
        <StatCard label="Revenue Today" value={d.revenueToday ? formatCurrency(d.revenueToday) : '--'} />
        <StatCard label="Active Staff" value={d.activeStaff ?? '--'} />
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Customers" value={d.customerCount ?? '--'} />
        <StatCard label="Low Stock Items" value={d.lowStockCount ?? '--'} />
        <StatCard label="Pending POs" value={d.pendingPOs ?? '--'} />
        <StatCard label="Active Branches" value={d.activeBranches ?? '--'} />
      </div>
      {config?.features && (
        <div className="p-4 rounded-lg border border-or-gold/20 bg-origin-slate">
          <div className="text-xs text-gray-500 font-bold uppercase mb-2">World Model Features</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(config.features).map(([key, val]) => (
              <Badge key={key} status={val?.enabled ? 'active' : 'pending'}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Generic Data List Tab ──────────────────────────────────────

function DataListTab({ endpoint, title, columns }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(endpoint);
        const items = res.data?.data || res.data?.products || res.data?.orders || res.data?.users || res.data?.branches || res.data?.suppliers || res.data?.purchaseOrders || res.data?.tiers || res.data?.logs || [];
        setData(Array.isArray(items) ? items : []);
      } catch { setData([]); }
      setLoading(false);
    }
    load();
  }, [endpoint]);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-white uppercase">{title}</h3>
        <span className="text-xs text-gray-400">{data.length} records</span>
      </div>
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No {title.toLowerCase()} found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                {columns.map(col => (
                  <th key={col} className="py-2 px-3 text-left text-gray-500 font-bold uppercase">{col.replace(/([A-Z])/g, ' $1')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row, i) => (
                <tr key={row._id || i} className="border-b border-gray-100 hover:bg-origin-slate/50">
                  {columns.map(col => (
                    <td key={col} className="py-2 px-3 text-white">{formatCell(row, col)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatCell(row, col) {
  const val = row[col];
  if (val == null) return '--';
  if (typeof val === 'object' && val.name) return val.name;
  if (col === 'price' || col === 'total') return formatCurrency(val);
  if (col === 'createdAt' || col === 'openedAt') return new Date(val).toLocaleDateString('en-ZA');
  if (typeof val === 'boolean') return val ? 'Yes' : 'No';
  return String(val);
}

// ─── Payments Tab ───────────────────────────────────────────────

function PaymentsTab() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/payments?limit=50');
        const items = res.data?.payments || res.data?.data || [];
        setPayments(Array.isArray(items) ? items : []);
      } catch { setPayments([]); }
      setLoading(false);
    }
    load();
  }, []);

  const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'eft', label: 'EFT' },
    { key: 'card', label: 'Card' },
    { key: 'cash', label: 'Cash' },
    { key: 'pending', label: 'Pending' },
  ];

  const filtered = filter === 'all' ? payments : payments.filter(p => {
    if (filter === 'pending') return p.status === 'pending';
    return p.method === filter || p.paymentMethod === filter;
  });

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg text-white uppercase">Payments</h3>
        <span className="text-xs text-gray-400">{filtered.length} records</span>
      </div>
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={filter === f.key
              ? { background: '#C9A84C', color: 'white' }
              : { background: '#0E0E0E', color: '#C9A84C', border: '1px solid #C9A84C' }
            }
          >
            {f.label}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No payments found</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 text-left text-gray-500 font-bold uppercase">Reference</th>
                <th className="py-2 px-3 text-left text-gray-500 font-bold uppercase">Method</th>
                <th className="py-2 px-3 text-left text-gray-500 font-bold uppercase">Amount</th>
                <th className="py-2 px-3 text-left text-gray-500 font-bold uppercase">Status</th>
                <th className="py-2 px-3 text-left text-gray-500 font-bold uppercase">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((p, i) => (
                <tr key={p._id || i} className="border-b border-gray-100 hover:bg-origin-slate/50">
                  <td className="py-2 px-3 text-white">{p.reference || p.saleNumber || '--'}</td>
                  <td className="py-2 px-3 text-white capitalize">{p.method || p.paymentMethod || '--'}</td>
                  <td className="py-2 px-3 text-white">{formatCurrency(p.amount || p.totalAmount || 0)}</td>
                  <td className="py-2 px-3"><Badge status={p.status === 'completed' || p.status === 'paid' ? 'active' : 'pending'}>{p.status || '--'}</Badge></td>
                  <td className="py-2 px-3 text-white">{p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-ZA') : '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Placeholder Tab (for features not yet built) ───────────────

function PlaceholderTab({ title, description, icon }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-origin-slate flex items-center justify-center mb-4" style={{ border: '2px solid rgba(58,95,72,0.2)' }}>
        <Icon name={icon} className="w-8 h-8 text-or-gold" />
      </div>
      <h3 className="font-heading text-xl text-white uppercase mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-md">{description}</p>
      <div className="mt-4 px-4 py-2 rounded-full bg-origin-slate text-xs text-or-gold font-semibold" style={{ border: '1px solid rgba(58,95,72,0.2)' }}>
        Coming Soon
      </div>
    </div>
  );
}

// ─── Reports Tab ────────────────────────────────────────────────

function ReportsTab() {
  const reports = [
    { key: 'sales-daily', label: 'Daily Sales Report', desc: 'Sales breakdown by product, category and payment method' },
    { key: 'sales-monthly', label: 'Monthly Sales Report', desc: 'Month-over-month revenue and growth trends' },
    { key: 'inventory-value', label: 'Inventory Valuation', desc: 'Current stock value across all branches' },
    { key: 'stock-movement', label: 'Stock Movement', desc: 'Transfers, adjustments and shrinkage tracking' },
    { key: 'staff-performance', label: 'Staff Performance', desc: 'Sales per assistant, shift stats and targets' },
    { key: 'compliance', label: 'Compliance Report', desc: 'Section 21 audits, purchase limits and batch traces' },
  ];

  return (
    <div>
      <h3 className="font-heading text-lg text-white uppercase mb-4">Reports</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {reports.map(r => (
          <div key={r.key} className="p-4 rounded-lg border border-gray-200 hover:border-or-gold/30 hover:bg-origin-slate/50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-2 mb-1">
              <Icon name="reports" className="w-4 h-4 text-or-gold group-hover:text-or-gold transition-colors" />
              <span className="font-heading text-sm text-white">{r.label}</span>
            </div>
            <div className="text-[11px] text-gray-400">{r.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compliance Tab ─────────────────────────────────────────────

function ComplianceTab() {
  const items = [
    { title: 'Section 21 Documents', desc: 'Manage prescriptions and authorization letters', icon: 'compliance' },
    { title: 'Purchase Limits', desc: 'Monitor daily and monthly gram limits', icon: 'reports' },
    { title: 'Batch Traceability', desc: 'Full supplier-to-customer audit trail', icon: 'inventory' },
    { title: 'Audit Reports', desc: 'One-click audit package generation', icon: 'audit-log' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Compliance Overview</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {items.map((item, i) => (
          <div key={i} className="p-4 rounded-lg border border-or-gold/20 bg-origin-slate flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shrink-0">
              <Icon name={item.icon} className="w-5 h-5 text-or-gold" />
            </div>
            <div>
              <div className="text-xs text-gray-500 font-bold">{item.title}</div>
              <div className="text-sm text-white mt-1">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Marketplace Tab ────────────────────────────────────────────

function MarketplaceTab() {
  const [modules, setModules] = useState([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/modules');
        setModules(res.data?.modules || res.data?.data || []);
      } catch { setModules([]); }
    }
    load();
  }, []);

  return (
    <div>
      <h3 className="font-heading text-lg text-white uppercase mb-4">Module Marketplace</h3>
      {modules.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No modules available</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {modules.map((m, i) => (
            <div key={m._id || i} className="p-4 rounded-lg border border-gray-200 hover:border-or-gold/30 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Icon name="marketplace" className="w-4 h-4 text-or-gold" />
                <span className="font-heading text-sm text-white">{m.name}</span>
              </div>
              <div className="text-xs text-gray-400 mt-1">{m.description}</div>
              <Badge status={m.isActive ? 'active' : 'pending'} className="mt-2">
                {m.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ───────────────────────────────────────────────

function SettingsTab() {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Branch Settings</h3>
      <div className="p-4 rounded-lg border border-gray-200 bg-white flex items-start gap-3">
        <Icon name="settings" className="w-5 h-5 text-or-gold shrink-0 mt-0.5" />
        <div className="text-sm text-gray-500">Settings are managed per branch via Super Admin Configuration Panel (P30-35)</div>
      </div>
    </div>
  );
}
