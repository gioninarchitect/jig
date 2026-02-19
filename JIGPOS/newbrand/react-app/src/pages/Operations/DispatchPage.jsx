// P27 — Dispatch App
// Pick, verify, dispatch, courier handoff. Order fulfilment workflow.

import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import api from '../../services/api';

function SvgIcon({ d }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

const MENU_ITEMS = [
  { key: 'ready', label: 'Ready to Dispatch', icon: <SvgIcon d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /> },
  { key: 'dispatched', label: 'Dispatched', icon: <SvgIcon d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /> },
  { key: 'delivered', label: 'Delivered', icon: <SvgIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { key: 'stats', label: 'Stats', icon: <SvgIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
];

export default function DispatchPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('ready');

  return (
    <DashboardLayout title="Dispatch" menuItems={MENU_ITEMS} user={user} onNavigate={setTab} activeItem={tab}>
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-white uppercase">Dispatch Centre</h2>
        <p className="text-sm text-gray-500">Pick, verify, and dispatch orders</p>
      </div>

      {tab === 'ready' && <ReadyTab />}
      {tab === 'dispatched' && <DispatchedTab />}
      {tab === 'delivered' && <DeliveredTab />}
      {tab === 'stats' && <DispatchStats />}
    </DashboardLayout>
  );
}

// ─── Ready to Dispatch ──────────────────────────────────────────

function ReadyTab() {
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

  async function dispatch(orderId, method) {
    try {
      await api.post(`/orders/${orderId}/dispatch`, { courier: method });
      setOrders(prev => prev.filter(o => o._id !== orderId));
    } catch { /* handle error */ }
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading text-lg text-white uppercase">Ready for Dispatch</h3>
        <span className="text-xs text-gray-400">{orders.length} orders</span>
      </div>
      {orders.map(order => (
        <div key={order._id} className="p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-heading text-white">{order.orderNumber || `#${order._id?.slice(-6)}`}</div>
              <div className="text-[10px] text-gray-400">
                {order.items?.length || 0} items | {new Date(order.createdAt).toLocaleString('en-ZA')}
              </div>
            </div>
            <Badge status="active">Packed</Badge>
          </div>
          {order.deliveryAddress && (
            <div className="text-xs text-gray-500 mb-3 p-2 bg-gray-50 rounded">
              {order.deliveryAddress.street}, {order.deliveryAddress.city}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => dispatch(order._id, 'courier')} className="px-3 py-1.5 rounded-lg bg-jig-purple text-white text-xs font-bold">
              Courier Dispatch
            </button>
            <button onClick={() => dispatch(order._id, 'collection')} className="px-3 py-1.5 rounded-lg bg-jig-amber text-white text-xs font-bold">
              Collection Ready
            </button>
            <button onClick={() => dispatch(order._id, 'drive-through')} className="px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 text-xs font-bold">
              Drive-Through
            </button>
          </div>
        </div>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No orders ready for dispatch</div>}
    </div>
  );
}

// ─── Dispatched ─────────────────────────────────────────────────

function DispatchedTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/orders/all?status=dispatched&limit=50');
        setOrders(res.data?.orders || res.data?.data || []);
      } catch { setOrders([]); }
      setLoading(false);
    }
    load();
  }, []);

  async function markDelivered(orderId) {
    try {
      await api.post(`/orders/${orderId}/deliver`);
      setOrders(prev => prev.filter(o => o._id !== orderId));
    } catch { /* handle error */ }
  }

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading text-lg text-white uppercase">In Transit</h3>
        <span className="text-xs text-gray-400">{orders.length} orders</span>
      </div>
      {orders.map(order => (
        <div key={order._id} className="p-4 rounded-lg border border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-heading text-white">{order.orderNumber || `#${order._id?.slice(-6)}`}</div>
            <div className="text-[10px] text-gray-400">{order.dispatchMethod || 'courier'} | {new Date(order.updatedAt || order.createdAt).toLocaleString('en-ZA')}</div>
          </div>
          <button onClick={() => markDelivered(order._id)} className="px-3 py-1.5 rounded-lg bg-jig-purple text-white text-xs font-bold">
            Mark Delivered
          </button>
        </div>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No orders in transit</div>}
    </div>
  );
}

// ─── Delivered ──────────────────────────────────────────────────

function DeliveredTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/orders/all?status=delivered&limit=50');
        setOrders(res.data?.orders || res.data?.data || []);
      } catch { setOrders([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-heading text-lg text-white uppercase">Delivered</h3>
        <span className="text-xs text-gray-400">{orders.length} orders</span>
      </div>
      {orders.map(order => (
        <div key={order._id} className="p-3 rounded-lg border border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-heading text-white">{order.orderNumber || `#${order._id?.slice(-6)}`}</div>
            <div className="text-[10px] text-gray-400">{new Date(order.updatedAt || order.createdAt).toLocaleString('en-ZA')}</div>
          </div>
          <Badge status="active">Delivered</Badge>
        </div>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No delivered orders</div>}
    </div>
  );
}

// ─── Dispatch Stats ─────────────────────────────────────────────

function DispatchStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/dashboard/stats');
        setStats(res.data);
      } catch { /* empty */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>;

  const d = stats || {};
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Dispatch Performance</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Dispatched Today" value={d.dispatchedToday ?? '--'} />
        <StatCard label="Avg Pack-to-Dispatch" value={d.avgPackToDispatch ? `${d.avgPackToDispatch}min` : '--'} />
        <StatCard label="Pending Dispatch" value={d.pendingDispatch ?? '--'} />
        <StatCard label="Delivered Today" value={d.deliveredToday ?? '--'} />
      </div>
    </div>
  );
}
