// P40 — Customer dashboard: Overview, Orders, Wellness Points, Section 21, Profile, Support (vanilla-matched)
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { formatCurrency } from '../../config';
import OrderCard from '../../components/storefront/OrderCard';
import api from '../../services/api';

const TABS = [
  { key: 'overview', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'orders', label: 'Orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
  { key: 'points', label: 'Wellness Points', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { key: 'section21', label: 'Section 21', icon: 'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z' },
  { key: 'profile', label: 'Profile', icon: 'M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z' },
  { key: 'support', label: 'Support', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
];

const TIER_BENEFITS = {
  bronze: ['5% discount on accessories', 'Birthday bonus points'],
  silver: ['10% discount on accessories', 'Birthday bonus points', 'Early access to new products'],
  gold: ['15% discount on all products', 'Birthday bonus points', 'Early access', 'Free standard shipping'],
  platinum: ['20% discount on all products', 'Priority support', 'Exclusive products', 'Free express shipping'],
};

const TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 2000, platinum: 5000 };

export default function MyAccountPage() {
  const { user } = useAuth();
  const { orders, loading: ordersLoading, refetch: refetchOrders } = useOrders();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [points, setPoints] = useState(null);
  const [section21Status, setSection21Status] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    api.get('/dashboard/stats').then((r) => setStats(r.data)).catch(() => {});
    api.get('/dashboard/points').then((r) => setPoints(r.data)).catch(() => {});
    api.get('/section21/status').then((r) => setSection21Status(r.data)).catch(() => {});
  }, []);

  async function handleUploadProof(orderId) {
    fileRef.current?.click();
    fileRef.current.dataset.orderId = orderId;
  }

  async function onFileSelected(e) {
    const file = e.target.files?.[0];
    const orderId = e.target.dataset?.orderId;
    if (!file || !orderId) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('proof', file);
      await api.post(`/orders/${orderId}/upload-proof`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      refetchOrders();
    } catch {
      // Silent
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleSection21Upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', file);
      await api.post('/section21/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const res = await api.get('/section21/status');
      setSection21Status(res.data);
    } catch {
      // Silent
    } finally {
      setUploading(false);
    }
  }

  const orderCount = orders.length;
  const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const tier = points?.tier || user?.membershipTier || 'bronze';
  const pointsBalance = points?.balance || points?.points || user?.wellnessPoints || 0;

  // Progress to next tier
  const tierKeys = ['bronze', 'silver', 'gold', 'platinum'];
  const currentTierIdx = tierKeys.indexOf(tier);
  const nextTier = currentTierIdx < tierKeys.length - 1 ? tierKeys[currentTierIdx + 1] : null;
  const nextThreshold = nextTier ? TIER_THRESHOLDS[nextTier] : TIER_THRESHOLDS.platinum;
  const currentThreshold = TIER_THRESHOLDS[tier] || 0;
  const progressPct = nextTier
    ? Math.min(100, ((pointsBalance - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;

  return (
    <div>
      {/* Hidden file input */}
      <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={onFileSelected} />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Welcome Banner */}
        <div
          className="rounded-[12px] p-8 mb-8 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', border: '2px solid #D97706' }}
        >
          {/* Decorative circle */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{ top: '-50%', right: '-20%', width: 300, height: 300, background: 'rgba(255,255,255,0.1)', zIndex: 1 }}
          />
          <div className="relative z-[2]">
            <h1 className="font-heading text-[2rem] text-gray-100 uppercase tracking-wider mb-1">
              Welcome back, {user?.firstName || user?.name || 'Member'}
            </h1>
            <p className="text-white/80 mb-4">{user?.email}</p>
            <span
              className="inline-block px-4 py-2 rounded-[20px] font-semibold text-sm capitalize"
              style={{ background: '#D97706', color: '#1E1E1E' }}
            >
              {tier} Member
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          className="bg-white mb-8 sticky top-[78px] z-[100] overflow-x-auto"
          style={{ borderBottom: '2px solid #E8E8E8', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
        >
          <div className="flex">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="flex items-center gap-2 px-6 py-4 text-[0.95rem] font-medium whitespace-nowrap transition-all"
                style={{
                  borderBottom: `3px solid ${tab === t.key ? '#D97706' : 'transparent'}`,
                  color: tab === t.key ? '#7C3AED' : '#737373',
                  background: tab === t.key ? 'rgba(58,95,72,0.05)' : 'transparent',
                }}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
                </svg>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* OVERVIEW TAB */}
        {tab === 'overview' && (
          <div>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[
                { label: 'Total Orders', value: orderCount, iconPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
                { label: 'Total Spent', value: formatCurrency(totalSpent), iconPath: 'M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                { label: 'Wellness Points', value: pointsBalance, iconPath: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
                { label: 'Membership', value: tier, iconPath: 'M16.5 18.75h-9m9 0a3 3 0 013 3h-15a3 3 0 013-3m9 0v-3.375c0-.621-.503-1.125-1.125-1.125h-.871M7.5 18.75v-3.375c0-.621.504-1.125 1.125-1.125h.872m5.007 0H9.497m5.007 0a7.454 7.454 0 01-.982-3.172M9.497 14.25a7.454 7.454 0 00.981-3.172M5.25 4.236c-.982.143-1.954.317-2.916.52A6.003 6.003 0 007.73 9.728M5.25 4.236V4.5c0 2.108.966 3.99 2.48 5.228M5.25 4.236V2.721C7.456 2.41 9.71 2.25 12 2.25c2.291 0 4.545.16 6.75.47v1.516M18.75 4.236c.982.143 1.954.317 2.916.52A6.003 6.003 0 0016.27 9.728M18.75 4.236V4.5c0 2.108-.966 3.99-2.48 5.228m0 0a6.003 6.003 0 01-5.54 0' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white rounded-[16px] p-6 text-center relative overflow-hidden"
                  style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
                >
                  {/* Gold top bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-[4px]"
                    style={{ background: 'linear-gradient(90deg, #E8C45A, #D97706, #B8922D)' }}
                  />
                  {/* Icon circle */}
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'linear-gradient(135deg, #4A7A5D 0%, #7C3AED 100%)' }}
                  >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={stat.iconPath} />
                    </svg>
                  </div>
                  <div className="font-heading text-[2rem] text-jig-purple mb-1 capitalize">{stat.value}</div>
                  <div className="text-[0.875rem] text-gray-500 uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Points Progress */}
            <div
              className="bg-white rounded-[16px] p-6 mb-8"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-jig-purple-dark uppercase tracking-wider">Points Progress</span>
                {nextTier && (
                  <span className="text-xs text-gray-500">
                    {nextThreshold - pointsBalance > 0 ? `${nextThreshold - pointsBalance} pts to ${nextTier}` : ''}
                  </span>
                )}
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-[4px] overflow-hidden">
                <div
                  className="h-full rounded-[4px] transition-all"
                  style={{
                    width: `${progressPct}%`,
                    background: 'linear-gradient(90deg, #E8C45A, #D97706, #B8922D)',
                  }}
                />
              </div>
            </div>

            {/* Recent Orders */}
            <div
              className="bg-white rounded-[16px] p-6"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="flex items-center justify-between mb-6 pb-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
                <h2 className="font-heading text-[1.4rem] text-jig-purple uppercase">Recent Orders</h2>
                {orders.length > 0 && (
                  <button
                    onClick={() => setTab('orders')}
                    className="text-sm font-semibold hover:underline"
                    style={{ color: '#D97706' }}
                  >
                    View All
                  </button>
                )}
              </div>
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid #E8E8E8', borderTopColor: '#D97706' }} />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No orders yet.</p>
              ) : (
                <div className="space-y-3">
                  {orders.slice(0, 5).map((order) => (
                    <OrderCard key={order._id} order={order} onUploadProof={handleUploadProof} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {tab === 'orders' && (
          <div>
            <div
              className="bg-white rounded-[16px] p-6"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="mb-6 pb-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
                <h2 className="font-heading text-[1.4rem] text-jig-purple uppercase">Order History</h2>
                <p className="text-[0.875rem] text-gray-500 mt-1">All your past and current orders.</p>
              </div>
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-10 h-10 rounded-full animate-spin" style={{ border: '4px solid #E8E8E8', borderTopColor: '#D97706' }} />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-6">No orders yet.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((order) => (
                    <OrderCard key={order._id} order={order} onUploadProof={handleUploadProof} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* WELLNESS POINTS TAB */}
        {tab === 'points' && (
          <div>
            {/* Points Header Card */}
            <div
              className="bg-white rounded-[16px] p-8 mb-6 relative overflow-hidden"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="absolute top-0 left-0 right-0 h-[4px]" style={{ background: 'linear-gradient(90deg, #E8C45A, #D97706, #B8922D)' }} />
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-heading text-[1.8rem] text-jig-purple uppercase">Wellness Points</h2>
                  <p className="text-[0.875rem] text-gray-500">Earn points with every purchase.</p>
                </div>
                <div className="text-right">
                  <div className="font-heading text-[3rem] leading-none" style={{ color: '#D97706' }}>{pointsBalance}</div>
                  <div className="text-xs text-gray-400 uppercase tracking-widest mt-1">Points</div>
                </div>
              </div>

              {/* Tier + Progress */}
              <div className="bg-jig-slate rounded-[12px] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Current Tier:</span>
                    <span
                      className="inline-block px-3 py-1 rounded-[20px] font-semibold text-sm capitalize"
                      style={{ background: '#D97706', color: '#1E1E1E' }}
                    >
                      {tier}
                    </span>
                  </div>
                  {nextTier && (
                    <span className="text-xs text-gray-500">Next: <strong className="capitalize">{nextTier}</strong></span>
                  )}
                </div>
                <div className="w-full h-2 bg-gray-200 rounded-[4px] overflow-hidden">
                  <div
                    className="h-full rounded-[4px] transition-all"
                    style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #E8C45A, #D97706, #B8922D)' }}
                  />
                </div>
                {nextTier && (
                  <p className="text-xs text-gray-500 mt-2">
                    {Math.max(0, nextThreshold - pointsBalance)} more points to reach {nextTier}
                  </p>
                )}
              </div>
            </div>

            {/* Tier Benefits */}
            <div
              className="bg-white rounded-[16px] p-6"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
                <h3 className="font-heading text-[1.4rem] text-jig-purple uppercase">Your Benefits</h3>
              </div>
              <div className="space-y-3">
                {(TIER_BENEFITS[tier] || TIER_BENEFITS.bronze).map((benefit, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                    <svg className="w-5 h-5 shrink-0" fill="#D97706" viewBox="0 0 512 512">
                      <path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z" />
                    </svg>
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 21 TAB */}
        {tab === 'section21' && (
          <div>
            <div
              className="bg-white rounded-[16px] p-6 mb-6"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="mb-6 pb-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
                <h2 className="font-heading text-[1.4rem] text-jig-purple uppercase">Section 21 Status</h2>
                <p className="text-[0.875rem] text-gray-500 mt-1">Your medical cannabis access status.</p>
              </div>
              {section21Status ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-semibold text-gray-600">Status:</span>
                    <span
                      className="inline-block px-3 py-1 rounded-[12px] text-xs font-bold uppercase tracking-wider"
                      style={
                        section21Status.approved
                          ? { background: 'rgba(16,185,129,0.1)', color: '#22C55E', border: '1px solid rgba(16,185,129,0.2)' }
                          : section21Status.pending
                          ? { background: 'rgba(245,158,11,0.1)', color: '#D97706', border: '1px solid rgba(245,158,11,0.2)' }
                          : { background: 'rgba(239,68,68,0.1)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }
                      }
                    >
                      {section21Status.approved ? 'Approved' : section21Status.pending ? 'Pending Review' : 'Not Registered'}
                    </span>
                  </div>
                  {section21Status.approved && (
                    <p className="text-sm text-gray-500">You have access to Section 21 medical cannabis products.</p>
                  )}
                  {section21Status.pending && (
                    <p className="text-sm text-gray-500">Your prescription is under review. We'll notify you once approved.</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Unable to load Section 21 status.</p>
              )}
            </div>

            <div
              className="bg-jig-slate rounded-[16px] p-6"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="mb-4 pb-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
                <h3 className="font-heading text-[1.4rem] text-jig-purple uppercase">Upload Prescription</h3>
                <p className="text-[0.875rem] text-gray-500 mt-1">
                  Upload your SAHPRA-approved Section 21 prescription document.
                </p>
              </div>
              <label
                className={`block w-full py-4 text-center text-sm font-bold uppercase tracking-wider rounded-[12px] cursor-pointer transition-all ${uploading ? 'opacity-50' : ''}`}
                style={{ border: '2px dashed #7C3AED', color: '#7C3AED' }}
              >
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleSection21Upload} disabled={uploading} />
                <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#7C3AED' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                {uploading ? 'Uploading...' : 'Choose File or Drag & Drop'}
              </label>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <div>
            <div
              className="bg-white rounded-[16px] p-6 max-w-lg"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="mb-6 pb-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
                <h2 className="font-heading text-[1.4rem] text-jig-purple uppercase">Profile</h2>
                <p className="text-[0.875rem] text-gray-500 mt-1">Your account details.</p>
              </div>
              <div className="space-y-5">
                {[
                  { label: 'Name', value: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || '-' },
                  { label: 'Email', value: user?.email || '-' },
                  { label: 'Phone', value: user?.phone || '-' },
                  { label: 'Role', value: user?.role || 'Customer' },
                  { label: 'Membership', value: tier },
                ].map((field) => (
                  <div key={field.label}>
                    <span className="text-xs text-gray-400 uppercase tracking-widest block mb-1">{field.label}</span>
                    <span className="font-semibold text-white capitalize">{field.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SUPPORT TAB */}
        {tab === 'support' && (
          <div>
            <div
              className="bg-white rounded-[16px] p-6 max-w-lg"
              style={{ border: '2px solid #E8E8E8', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}
            >
              <div className="mb-6 pb-4" style={{ borderBottom: '1px solid #E8E8E8' }}>
                <h2 className="font-heading text-[1.4rem] text-jig-purple uppercase">Support</h2>
                <p className="text-[0.875rem] text-gray-500 mt-1">Need help? Contact our support team.</p>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Email', value: 'support@jig.cleva-ai.co.za', icon: 'M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75' },
                  { label: 'Phone', value: '+27 67 291 9110', icon: 'M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z' },
                  { label: 'WhatsApp', value: '+27 67 291 9110', icon: 'M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z' },
                ].map((contact) => (
                  <div
                    key={contact.label}
                    className="flex items-center gap-4 p-4 bg-jig-slate rounded-[12px]"
                    style={{ border: '1px solid rgba(58,95,72,0.1)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'linear-gradient(135deg, #4A7A5D 0%, #7C3AED 100%)' }}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={contact.icon} />
                      </svg>
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 uppercase tracking-wider block">{contact.label}</span>
                      <span className="font-semibold text-white text-sm">{contact.value}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
