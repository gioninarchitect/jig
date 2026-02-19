// P27 — Customer Dashboard
// Lifestyle + Medical browsing, purchase limit widget, wellness points, Section 21 portal, cart + ordering.

import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import StatCard from '../../components/ui/StatCard';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../config';
import api from '../../services/api';

function SvgIcon({ d }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

const MENU_ITEMS = [
  { key: 'shop', label: 'Shop', icon: <SvgIcon d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /> },
  { key: 'orders', label: 'My Orders', icon: <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
  { key: 'loyalty', label: 'Loyalty', icon: <SvgIcon d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> },
  { key: 'section21', label: 'Section 21', icon: <SvgIcon d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /> },
  { key: 'profile', label: 'Profile', icon: <SvgIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
];

export default function CustomerPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('shop');

  return (
    <DashboardLayout title="My Account" menuItems={MENU_ITEMS} user={user} onNavigate={setTab} activeItem={tab}>
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-white uppercase">Welcome, {user?.firstName}</h2>
        <p className="text-sm text-gray-500">Your JIG Account</p>
      </div>

      {/* Purchase limit widget — always visible */}
      <PurchaseLimitWidget userId={user?._id || user?.id} />

      {tab === 'shop' && <ShopTab />}
      {tab === 'orders' && <OrdersTab />}
      {tab === 'loyalty' && <LoyaltyTab user={user} />}
      {tab === 'section21' && <Section21Tab userId={user?._id || user?.id} />}
      {tab === 'profile' && <ProfileTab user={user} />}
    </DashboardLayout>
  );
}

// ─── Purchase Limit Widget ──────────────────────────────────────

function PurchaseLimitWidget({ userId }) {
  const [limits, setLimits] = useState(null);

  useEffect(() => {
    if (!userId) return;
    async function load() {
      try {
        const res = await api.get(`/purchase-limits/patients/${userId}/limits`);
        setLimits(res.data);
      } catch { /* Not a Section 21 patient or endpoint unavailable */ }
    }
    load();
  }, [userId]);

  if (!limits) return null;

  const dailyPercent = limits.dailyLimit > 0 ? Math.round((limits.dailyUsed / limits.dailyLimit) * 100) : 0;
  const monthlyPercent = limits.monthlyLimit > 0 ? Math.round((limits.monthlyUsed / limits.monthlyLimit) * 100) : 0;

  return (
    <div className="mb-4 p-3 rounded-lg border border-jig-purple/20 bg-jig-slate">
      <div className="text-[10px] text-gray-400 font-bold uppercase mb-2">Purchase Limits</div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Daily</span>
            <span className="font-bold text-white">{limits.dailyUsed}g / {limits.dailyLimit}g</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${dailyPercent > 80 ? 'bg-jig-red' : dailyPercent > 50 ? 'bg-jig-amber' : 'bg-jig-purple'}`} style={{ width: `${Math.min(dailyPercent, 100)}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Monthly</span>
            <span className="font-bold text-white">{limits.monthlyUsed}g / {limits.monthlyLimit}g</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${monthlyPercent > 80 ? 'bg-jig-red' : monthlyPercent > 50 ? 'bg-jig-amber' : 'bg-jig-purple'}`} style={{ width: `${Math.min(monthlyPercent, 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shop Tab ───────────────────────────────────────────────────

function ShopTab() {
  const [products, setProducts] = useState([]);
  const [track, setTrack] = useState('lifestyle');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/products?status=active&track=${track}&limit=50`);
        setProducts(res.data?.products || res.data?.data || []);
      } catch { setProducts([]); }
      setLoading(false);
    }
    setLoading(true);
    load();
  }, [track]);

  return (
    <div className="space-y-4">
      {/* Track toggle */}
      <div className="flex gap-2">
        <button onClick={() => setTrack('lifestyle')} className={`px-4 py-2 rounded-lg text-xs font-bold ${track === 'lifestyle' ? 'bg-jig-purple text-white' : 'bg-gray-100 text-gray-500'}`}>Lifestyle</button>
        <button onClick={() => setTrack('medical')} className={`px-4 py-2 rounded-lg text-xs font-bold ${track === 'medical' ? 'bg-jig-purple text-white' : 'bg-gray-100 text-gray-500'}`}>Section 21</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {products.map(p => (
            <div key={p._id} className="p-4 rounded-lg border border-gray-200 hover:border-jig-purple/30 transition-colors">
              <div className="text-sm font-heading text-white">{p.name}</div>
              <div className="text-[10px] text-gray-400 mt-1">{p.category}</div>
              {p.cannabinoids?.thc && <div className="text-[10px] text-gray-400">THC: {p.cannabinoids.thc}% | CBD: {p.cannabinoids.cbd}%</div>}
              <div className="flex items-center justify-between mt-3">
                <span className="font-heading text-lg text-white">{formatCurrency(p.price)}</span>
                <button className="px-3 py-1.5 rounded-lg bg-jig-purple text-white text-xs font-bold">Add to Cart</button>
              </div>
            </div>
          ))}
          {products.length === 0 && <div className="col-span-3 text-center py-8 text-gray-400 text-sm">No products available</div>}
        </div>
      )}
    </div>
  );
}

// ─── Orders Tab ─────────────────────────────────────────────────

function OrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/orders/my?limit=20');
        setOrders(res.data?.orders || res.data?.data || []);
      } catch { setOrders([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">My Orders</h3>
      {orders.map(o => (
        <div key={o._id} className="p-3 rounded-lg border border-gray-200 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white">{o.orderNumber}</div>
            <div className="text-[10px] text-gray-400">{new Date(o.createdAt).toLocaleDateString('en-ZA')} | {o.items?.length || 0} items</div>
          </div>
          <div className="text-right">
            <Badge status={o.status === 'completed' ? 'active' : o.status === 'cancelled' ? 'error' : 'processing'}>{o.status}</Badge>
            <div className="text-xs font-bold text-white mt-1">{formatCurrency(o.total || 0)}</div>
          </div>
        </div>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No orders yet</div>}
    </div>
  );
}

// ─── Loyalty Tab ────────────────────────────────────────────────

function LoyaltyTab({ user }) {
  const points = user?.loyalty?.points ?? user?.wellnessPoints ?? 0;
  const tier = user?.loyalty?.tier?.replace('_', ' ') ?? user?.membershipTier ?? 'Bronze';

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Wellness Points</h3>
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Points Balance" value={points} />
        <StatCard label="Current Tier" value={tier} />
        <StatCard label="Points This Month" value="--" />
      </div>
      <div className="p-4 rounded-lg border border-jig-purple/20 bg-jig-slate">
        <div className="text-xs text-gray-500 font-bold uppercase mb-2">Tier Benefits</div>
        <div className="space-y-1 text-xs text-white">
          <div>Bronze: 1x points multiplier</div>
          <div>Silver (500+ pts): 1.5x multiplier + free delivery</div>
          <div>Gold (2000+ pts): 2x multiplier + priority access + birthday bonus</div>
          <div>Platinum (5000+ pts): 3x multiplier + exclusive products + personal consultant</div>
        </div>
      </div>
    </div>
  );
}

// ─── Section 21 Tab ─────────────────────────────────────────────

function Section21Tab({ userId }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/section21/status');
        setStatus(res.data);
      } catch { /* Not a Section 21 patient */ }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Section 21 Portal</h3>
      {status ? (
        <div className="p-4 rounded-lg border border-jig-purple/20 bg-jig-slate">
          <div className="grid sm:grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-xs text-gray-400">Status</div>
              <Badge status={status.approved ? 'active' : status.pending ? 'processing' : 'error'}>
                {status.approved ? 'Approved' : status.pending ? 'Pending' : 'Not Registered'}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-gray-400">Prescription</div>
              <div className="text-xs font-bold text-white">{status.prescriptionNumber || '--'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Expiry</div>
              <div className="text-xs font-bold text-white">
                {status.expiryDate ? new Date(status.expiryDate).toLocaleDateString('en-ZA') : '--'}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-lg border border-gray-200 text-center">
          <div className="text-sm text-gray-500 mb-3">Upload your Section 21 prescription to access medical cannabis</div>
          <button className="px-4 py-2 rounded-lg bg-jig-purple text-white text-xs font-bold">Upload Prescription</button>
        </div>
      )}
    </div>
  );
}

// ─── Profile Tab ────────────────────────────────────────────────

function ProfileTab({ user }) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">My Profile</h3>
      <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
        {[
          ['Name', `${user?.firstName || ''} ${user?.lastName || ''}`],
          ['Email', user?.email],
          ['Phone', user?.phone || '--'],
          ['Role', user?.role],
          ['Member Since', user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-ZA') : '--'],
        ].map(([label, value]) => (
          <div key={label} className="flex items-center justify-between border-b border-gray-100 pb-2 last:border-0">
            <span className="text-xs text-gray-500">{label}</span>
            <span className="text-xs font-bold text-white">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
