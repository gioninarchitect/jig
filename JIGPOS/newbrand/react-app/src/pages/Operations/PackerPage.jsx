// P27 — Packer App
// Pack queue, quality check, labelling. Order-driven workflow.

import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';

function SvgIcon({ d }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

const MENU_ITEMS = [
  { key: 'queue', label: 'Queue', icon: <SvgIcon d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /> },
  { key: 'in-progress', label: 'In Progress', icon: <SvgIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> },
  { key: 'completed', label: 'Completed', icon: <SvgIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
];

export default function PackerPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('queue');

  return (
    <DashboardLayout title="Packer" menuItems={MENU_ITEMS} user={user} onNavigate={setTab} activeItem={tab}>
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-white uppercase">Packing Station</h2>
        <p className="text-sm text-gray-500">Pack, verify, and label orders</p>
      </div>

      {tab === 'queue' && <PackQueue />}
      {tab === 'in-progress' && <InProgressQueue />}
      {tab === 'completed' && <CompletedQueue />}
    </DashboardLayout>
  );
}

// ─── Pack Queue ─────────────────────────────────────────────────

function PackQueue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/orders/all?status=paid&limit=50');
        setOrders(res.data?.orders || res.data?.data || []);
      } catch { setOrders([]); }
      setLoading(false);
    }
    load();
  }, []);

  async function startPacking(orderId) {
    try {
      await api.post(`/orders/${orderId}/start-packing`);
      setOrders(prev => prev.filter(o => o._id !== orderId));
    } catch { /* handle error */ }
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading text-lg text-white uppercase">Orders to Pack</h3>
        <span className="text-xs text-gray-400">{orders.length} orders</span>
      </div>
      {orders.map(order => (
        <OrderCard key={order._id} order={order}>
          <button onClick={() => startPacking(order._id)} className="px-4 py-2 rounded-lg bg-or-gold text-white text-xs font-bold">
            Start Packing
          </button>
        </OrderCard>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No orders waiting to be packed</div>}
    </div>
  );
}

// ─── In Progress ────────────────────────────────────────────────

function InProgressQueue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/orders/all?status=packing&limit=50');
        setOrders(res.data?.orders || res.data?.data || []);
      } catch { setOrders([]); }
      setLoading(false);
    }
    load();
  }, []);

  async function markPacked(orderId) {
    try {
      await api.post(`/orders/${orderId}/complete-packing`);
      setOrders(prev => prev.filter(o => o._id !== orderId));
    } catch { /* handle error */ }
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading text-lg text-white uppercase">Currently Packing</h3>
        <span className="text-xs text-gray-400">{orders.length} orders</span>
      </div>
      {orders.map(order => (
        <OrderCard key={order._id} order={order}>
          <button onClick={() => markPacked(order._id)} className="px-4 py-2 rounded-lg bg-or-gold text-white text-xs font-bold">
            Mark Packed
          </button>
        </OrderCard>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No orders being packed</div>}
    </div>
  );
}

// ─── Completed ──────────────────────────────────────────────────

function CompletedQueue() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/orders/all?status=packed&limit=50');
        setOrders(res.data?.orders || res.data?.data || []);
      } catch { setOrders([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading text-lg text-white uppercase">Packed — Ready for Dispatch</h3>
        <span className="text-xs text-gray-400">{orders.length} orders</span>
      </div>
      {orders.map(order => (
        <OrderCard key={order._id} order={order}>
          <Badge status="active">Packed</Badge>
        </OrderCard>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No packed orders</div>}
    </div>
  );
}

// ─── Shared Order Card ──────────────────────────────────────────

function OrderCard({ order, children }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-4 rounded-lg border border-gray-200 hover:border-or-gold/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3">
            <div className="text-sm font-heading text-white">{order.orderNumber || `#${order._id?.slice(-6)}`}</div>
            <Badge status={order.status === 'packed' ? 'active' : order.status === 'packing' ? 'processing' : 'pending'}>{order.status}</Badge>
          </div>
          <div className="text-[10px] text-gray-400 mt-1">
            {order.items?.length || 0} items | {new Date(order.createdAt).toLocaleString('en-ZA')}
            {order.customer?.firstName && ` | ${order.customer.firstName} ${order.customer.lastName || ''}`}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {children}
        </div>
      </div>

      {expanded && order.items && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">{item.quantity}</span>
                <span className="text-white">{item.name || item.product?.name}</span>
              </div>
              {item.weight && <span className="text-gray-400">{item.weight}g</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
