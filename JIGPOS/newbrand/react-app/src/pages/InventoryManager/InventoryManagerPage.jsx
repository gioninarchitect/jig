// P27 — Inventory Manager Dashboard
// MDC Control Panel, Product Catalog, Batch Management, PO Workflow,
// Potency Degradation badges (P23), Smart Reorder (P24).

import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import { useWorldModelConfig } from '../../world-model/WorldModelContext';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../config';
import api from '../../services/api';

function SvgIcon({ d }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

const MENU_ITEMS = [
  { key: 'mdc', label: 'MDC Control', icon: <SvgIcon d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /> },
  { key: 'products', label: 'Products', icon: <SvgIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
  { key: 'batches', label: 'Batches', icon: <SvgIcon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /> },
  { key: 'purchase-orders', label: 'Purchase Orders', icon: <SvgIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  { key: 'suppliers', label: 'Suppliers', icon: <SvgIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
  { key: 'stock-levels', label: 'Stock Levels', icon: <SvgIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
  { key: 'auto-reorder', label: 'Auto Reorder', icon: <SvgIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> },
  { key: 'transfers', label: 'Transfers', icon: <SvgIcon d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /> },
  { key: 'stocktake', label: 'Stocktake', icon: <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
  { key: 'reports', label: 'Reports', icon: <SvgIcon d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  { key: 'compliance', label: 'Section 21', icon: <SvgIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
  { key: 'smart-stock', label: 'Smart Stock', icon: <SvgIcon d="M13 10V3L4 14h7v7l9-11h-7z" /> },
  { key: 'potency', label: 'Potency', icon: <SvgIcon d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /> },
  { key: 'settings', label: 'Settings', icon: <SvgIcon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" /> },
];

export default function InventoryManagerPage() {
  const { user } = useAuth();
  const config = useWorldModelConfig();
  const [tab, setTab] = useState('mdc');

  return (
    <DashboardLayout title="Inventory" menuItems={MENU_ITEMS} user={user} onNavigate={setTab} activeItem={tab}>
      {tab === 'mdc' && <MDCTab />}
      {tab === 'products' && <ProductsTab />}
      {tab === 'batches' && <BatchesTab />}
      {tab === 'purchase-orders' && <PurchaseOrdersTab />}
      {tab === 'suppliers' && <SuppliersTab />}
      {tab === 'stock-levels' && <StockLevelsTab />}
      {tab === 'auto-reorder' && <AutoReorderTab />}
      {tab === 'transfers' && <TransfersTab />}
      {tab === 'stocktake' && <StocktakeTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'compliance' && <ComplianceTab />}
      {tab === 'smart-stock' && <SmartStockTab config={config} />}
      {tab === 'potency' && <PotencyTab config={config} />}
      {tab === 'settings' && <SettingsTab />}
    </DashboardLayout>
  );
}

// ─── MDC Control Panel ──────────────────────────────────────────

function MDCTab() {
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);

  useEffect(() => {
    async function load() {
      const [statsRes, pendingRes] = await Promise.allSettled([
        api.get('/products/stats'),
        api.get('/products?status=pending_review&limit=20'),
      ]);
      setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null);
      setPending(pendingRes.status === 'fulfilled' ? (pendingRes.value.data?.products || pendingRes.value.data?.data || []) : []);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl text-white uppercase">MDC Control Panel</h2>
        <p className="text-sm text-gray-500">Master Digital Catalogue — Single source of truth</p>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total SKUs" value={stats?.totalProducts ?? '--'} />
        <StatCard label="Pending Review" value={pending.length} />
        <StatCard label="Active Products" value={stats?.activeProducts ?? '--'} />
        <StatCard label="Suppliers" value={stats?.supplierCount ?? '--'} />
      </div>
      {pending.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 font-bold uppercase mb-2">Pending MDC Review</div>
          <div className="space-y-2">
            {pending.map(p => (
              <div key={p._id} className="p-3 rounded-lg border border-jig-amber/20 bg-jig-amber/5 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-white">{p.name}</div>
                  <div className="text-[10px] text-gray-400">SKU: {p.sku} | Category: {p.category}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 rounded bg-jig-purple text-white text-xs font-bold">Approve</button>
                  <button className="px-3 py-1 rounded bg-gray-200 text-gray-600 text-xs font-bold">Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Products Tab ───────────────────────────────────────────────

function ProductsTab() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/products?status=active&limit=100');
        setProducts(res.data?.products || res.data?.data || []);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  const filtered = search
    ? products.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()))
    : products;

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg text-white uppercase">Product Catalog</h3>
        <input
          type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs w-48 focus:outline-none focus:ring-2 focus:ring-jig-purple/30"
        />
      </div>
      <div className="text-xs text-gray-400">{filtered.length} products</div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.slice(0, 30).map(p => (
          <div key={p._id} className="p-3 rounded-lg border border-gray-200 hover:border-jig-purple/30 transition-colors">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-semibold text-white truncate">{p.name}</div>
              <Badge status={p.status === 'active' ? 'active' : 'pending'}>{p.status}</Badge>
            </div>
            <div className="text-[10px] text-gray-400">SKU: {p.sku} | {p.category}</div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-bold text-white">{formatCurrency(p.price)}</span>
              <span className="text-[10px] text-gray-400">Stock: {p.inventory?.quantity ?? '--'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Batches Tab ────────────────────────────────────────────────

function BatchesTab() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/batches?limit=50');
        setBatches(res.data?.batches || res.data?.data || []);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Batch Management</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="py-2 px-2 text-left text-gray-500">Batch ID</th>
              <th className="py-2 px-2 text-left text-gray-500">Product</th>
              <th className="py-2 px-2 text-left text-gray-500">THC%</th>
              <th className="py-2 px-2 text-left text-gray-500">CBD%</th>
              <th className="py-2 px-2 text-left text-gray-500">QA</th>
              <th className="py-2 px-2 text-left text-gray-500">Remaining</th>
              <th className="py-2 px-2 text-left text-gray-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {batches.map(b => (
              <tr key={b._id} className="border-b border-gray-100 hover:bg-jig-slate/50">
                <td className="py-2 px-2 text-white font-bold">{b.batchId}</td>
                <td className="py-2 px-2">{b.product?.name || '--'}</td>
                <td className="py-2 px-2">{b.cannabinoids?.thc ?? '--'}%</td>
                <td className="py-2 px-2">{b.cannabinoids?.cbd ?? '--'}%</td>
                <td className="py-2 px-2"><Badge status={b.qaStatus === 'approved' ? 'active' : b.qaStatus === 'rejected' ? 'error' : 'pending'}>{b.qaStatus}</Badge></td>
                <td className="py-2 px-2">{b.remainingQuantity} {b.unitOfMeasure}</td>
                <td className="py-2 px-2"><Badge status={b.status === 'active' ? 'active' : 'pending'}>{b.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Suppliers Tab ──────────────────────────────────────────────

function SuppliersTab() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/suppliers?limit=50');
        setSuppliers(res.data?.suppliers || res.data?.data || []);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Suppliers</h3>
      <div className="grid sm:grid-cols-2 gap-3">
        {suppliers.map(s => (
          <div key={s._id} className="p-3 rounded-lg border border-gray-200">
            <div className="text-sm font-semibold text-white">{s.name}</div>
            <div className="text-[10px] text-gray-400 mt-1">{s.contactPerson} | {s.email}</div>
            <Badge status={s.status === 'active' ? 'active' : 'pending'} className="mt-1">{s.status || 'active'}</Badge>
          </div>
        ))}
        {suppliers.length === 0 && <div className="text-gray-400 text-sm col-span-2 text-center py-8">No suppliers found</div>}
      </div>
    </div>
  );
}

// ─── Purchase Orders Tab ────────────────────────────────────────

function PurchaseOrdersTab() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/purchase-orders?limit=30');
        setPOs(res.data?.purchaseOrders || res.data?.data || []);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  const STATUS_BADGE = { draft: 'pending', submitted: 'processing', approved: 'active', ordered: 'info', received: 'active', cancelled: 'error' };

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Purchase Orders</h3>
      <div className="space-y-2">
        {pos.map(po => (
          <div key={po._id} className="p-3 rounded-lg border border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">{po.poNumber}</div>
              <div className="text-[10px] text-gray-400">{po.supplier?.name || '--'} | {po.items?.length || 0} items</div>
            </div>
            <div className="text-right">
              <Badge status={STATUS_BADGE[po.status] || 'pending'}>{po.status}</Badge>
              <div className="text-xs font-bold text-white mt-1">{formatCurrency(po.total || 0)}</div>
            </div>
          </div>
        ))}
        {pos.length === 0 && <div className="text-gray-400 text-sm text-center py-8">No purchase orders</div>}
      </div>
    </div>
  );
}

// ─── Transfers Tab ──────────────────────────────────────────────

function TransfersTab() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/stock-transfers?limit=30');
        setTransfers(res.data?.transfers || res.data?.data || []);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Inter-Branch Transfers</h3>
      <div className="space-y-2">
        {transfers.map(t => (
          <div key={t._id} className="p-3 rounded-lg border border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">{t.transferNumber}</div>
              <div className="text-[10px] text-gray-400">{t.fromBranchId?.name || '--'} → {t.toBranchId?.name || '--'}</div>
            </div>
            <Badge status={t.status === 'received' ? 'active' : t.status === 'in_transit' ? 'processing' : 'pending'}>{t.status}</Badge>
          </div>
        ))}
        {transfers.length === 0 && <div className="text-gray-400 text-sm text-center py-8">No transfers</div>}
      </div>
    </div>
  );
}

// ─── Stocktake Tab ──────────────────────────────────────────────

function StocktakeTab() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/stocktake/history');
        setSessions(res.data?.sessions || res.data?.data || []);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Stocktake History</h3>
      <div className="space-y-2">
        {sessions.map(s => (
          <div key={s._id} className="p-3 rounded-lg border border-gray-200 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">{s.sessionNumber}</div>
              <div className="text-[10px] text-gray-400">{s.stockTakeType} | {s.completedItems || 0}/{s.totalItems || 0} items</div>
            </div>
            <Badge status={s.status === 'approved' ? 'active' : s.status === 'in_progress' ? 'processing' : 'pending'}>{s.status}</Badge>
          </div>
        ))}
        {sessions.length === 0 && <div className="text-gray-400 text-sm text-center py-8">No stocktake sessions</div>}
      </div>
    </div>
  );
}

// ─── Smart Stock Tab (integrates P24) ───────────────────────────

function SmartStockTab({ config }) {
  if (!config?.features?.smartStock?.enabled) {
    return <div className="text-center py-8 text-gray-400 text-sm">Smart Stock is disabled — enable in Super Admin Config</div>;
  }
  // Lazy import — avoids loading P24 components unless needed
  const StockIntelligenceDashboard = require('../SmartStock/StockIntelligenceDashboard').default;
  return <StockIntelligenceDashboard />;
}

// ─── Stock Levels Tab ──────────────────────────────────────────

function StockLevelsTab() {
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/products?status=active&limit=200&fields=name,sku,category,inventory,price');
        const products = res.data?.products || res.data?.data || [];
        setLevels(products);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  const lowStock = levels.filter(p => (p.inventory?.quantity ?? 0) <= (p.inventory?.lowStockThreshold ?? 10) && (p.inventory?.quantity ?? 0) > 0);
  const outOfStock = levels.filter(p => (p.inventory?.quantity ?? 0) <= 0);
  const healthy = levels.filter(p => (p.inventory?.quantity ?? 0) > (p.inventory?.lowStockThreshold ?? 10));

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Stock Levels</h3>
      <div className="grid sm:grid-cols-4 gap-4">
        <StatCard label="Total SKUs" value={levels.length} />
        <StatCard label="Healthy Stock" value={healthy.length} />
        <StatCard label="Low Stock" value={lowStock.length} />
        <StatCard label="Out of Stock" value={outOfStock.length} />
      </div>

      {lowStock.length > 0 && (
        <div>
          <div className="text-xs text-jig-red font-bold uppercase mb-2">Low Stock Alerts</div>
          <div className="space-y-2">
            {lowStock.slice(0, 10).map(p => (
              <div key={p._id} className="p-3 rounded-lg border border-jig-red/20 bg-jig-red/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">{p.name}</div>
                  <div className="text-[10px] text-gray-400">{p.sku} | {p.category}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-jig-red">{p.inventory?.quantity ?? 0}</div>
                  <div className="text-[10px] text-gray-400">of {p.inventory?.lowStockThreshold ?? 10} min</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outOfStock.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 font-bold uppercase mb-2">Out of Stock ({outOfStock.length})</div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {outOfStock.map(p => (
              <div key={p._id} className="p-2 rounded-lg border border-gray-200 text-xs">
                <div className="font-bold text-white">{p.name}</div>
                <div className="text-[10px] text-gray-400">{p.sku}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Auto Reorder Tab ─────────────────────────────────────────

function AutoReorderTab() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/reorder-rules?limit=50');
        setRules(res.data?.rules || res.data?.data || []);
      } catch { setRules([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg text-white uppercase">Auto Reorder Rules</h3>
        <button className="px-4 py-2 rounded-lg bg-jig-purple text-white text-xs font-bold">Add Rule</button>
      </div>
      <p className="text-xs text-gray-500">Automatic purchase orders when stock drops below thresholds</p>

      {rules.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 px-2 text-left text-gray-500 font-bold uppercase">Product</th>
                <th className="py-2 px-2 text-left text-gray-500 font-bold uppercase">Trigger</th>
                <th className="py-2 px-2 text-left text-gray-500 font-bold uppercase">Reorder Qty</th>
                <th className="py-2 px-2 text-left text-gray-500 font-bold uppercase">Supplier</th>
                <th className="py-2 px-2 text-left text-gray-500 font-bold uppercase">Status</th>
              </tr>
            </thead>
            <tbody>
              {rules.map(r => (
                <tr key={r._id} className="border-b border-gray-100 hover:bg-jig-slate/50">
                  <td className="py-2 px-2 text-white font-bold">{r.product?.name || r.productName || '--'}</td>
                  <td className="py-2 px-2">{r.triggerQuantity ?? '--'} units</td>
                  <td className="py-2 px-2">{r.reorderQuantity ?? '--'} units</td>
                  <td className="py-2 px-2">{r.supplier?.name || '--'}</td>
                  <td className="py-2 px-2"><Badge status={r.enabled ? 'active' : 'pending'}>{r.enabled ? 'Active' : 'Disabled'}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-sm">No auto-reorder rules configured</div>
      )}
    </div>
  );
}

// ─── Reports Tab ──────────────────────────────────────────────

function ReportsTab() {
  const REPORTS = [
    { key: 'inventory', label: 'Inventory Report', desc: 'Current stock levels, values, and movement across all branches', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { key: 'section21', label: 'Section 21 Audit', desc: 'Medical product tracking, prescription compliance, dispensing log', icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
    { key: 'sales', label: 'Sales Summary', desc: 'Revenue, top sellers, category breakdown, trend analysis', icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6' },
    { key: 'variance', label: 'Variance Report', desc: 'Stocktake discrepancies, shrinkage analysis, write-offs', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Reports</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        {REPORTS.map(r => (
          <div key={r.key} className="p-4 rounded-lg border border-gray-200 hover:border-jig-purple/30 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-jig-purple/10 flex items-center justify-center">
                <SvgIcon d={r.icon} />
              </div>
              <div className="font-heading text-base text-white uppercase">{r.label}</div>
            </div>
            <p className="text-xs text-gray-500 mb-3">{r.desc}</p>
            <button className="px-4 py-2 rounded-lg bg-jig-purple text-white text-xs font-bold">Generate Report</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 21 Compliance Tab ────────────────────────────────

function ComplianceTab() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/section21/compliance-stats');
        setStats(res.data);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Section 21 Compliance</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Registered Patients" value={stats?.totalPatients ?? '--'} />
        <StatCard label="Active Prescriptions" value={stats?.activePrescriptions ?? '--'} />
        <StatCard label="Expiring This Month" value={stats?.expiringThisMonth ?? '--'} />
      </div>
      <div className="p-4 rounded-lg border border-jig-red/20 bg-jig-red/5">
        <div className="text-xs font-bold text-jig-red uppercase mb-2">Compliance Checklist</div>
        <div className="space-y-2 text-xs">
          {[
            'All Section 21 products have valid batch COAs',
            'Patient purchase limits are enforced per prescription',
            'Dispensing records are complete and auditable',
            'Prescription expiry alerts are active',
            'Medical product storage conditions are logged',
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <SvgIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              <span className="text-white">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────

function SettingsTab() {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Inventory Settings</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <SvgIcon d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            <div className="text-sm font-heading text-white uppercase">Low Stock Threshold</div>
          </div>
          <p className="text-xs text-gray-500 mb-2">Default threshold for low stock alerts across all products</p>
          <input type="number" defaultValue={10} className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          <span className="text-xs text-gray-400 ml-2">units</span>
        </div>
        <div className="p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-3">
            <SvgIcon d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            <div className="text-sm font-heading text-white uppercase">Notifications</div>
          </div>
          <div className="space-y-2 text-xs">
            {['Low stock email alerts', 'Auto-reorder notifications', 'Stocktake reminders', 'Batch expiry warnings'].map((item, i) => (
              <label key={i} className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-gray-300" />
                <span className="text-white">{item}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Potency Tab (integrates P23) ───────────────────────────────

function PotencyTab({ config }) {
  if (!config?.features?.potencyDegradation?.enabled) {
    return <div className="text-center py-8 text-gray-400 text-sm">Potency Degradation is disabled — enable in Super Admin Config</div>;
  }
  const PotencyDashboard = require('../SmartStock/PotencyDashboard').default;
  return <PotencyDashboard />;
}

function Spinner() {
  return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>;
}
