// P27 — Supplier Portal
// Product submission to MDC, order tracking, compliance documents, profile.

import { useState, useEffect } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../../components/ui/Badge';
import StatCard from '../../components/ui/StatCard';
import { formatCurrency } from '../../config';
import api from '../../services/api';

function SvgIcon({ d }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

const MENU_ITEMS = [
  { key: 'products', label: 'My Products', icon: <SvgIcon d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /> },
  { key: 'submit', label: 'Submit Product', icon: <SvgIcon d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { key: 'orders', label: 'Orders', icon: <SvgIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
  { key: 'documents', label: 'Documents', icon: <SvgIcon d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  { key: 'profile', label: 'Profile', icon: <SvgIcon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
];

export default function SupplierPortalPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState('products');

  return (
    <DashboardLayout title="Supplier Portal" menuItems={MENU_ITEMS} user={user} onNavigate={setTab} activeItem={tab}>
      <div className="mb-6">
        <h2 className="font-heading text-2xl text-white uppercase">Supplier Portal</h2>
        <p className="text-sm text-gray-500">Manage your products and orders with Origin</p>
      </div>

      {tab === 'products' && <MyProductsTab />}
      {tab === 'submit' && <SubmitProductTab />}
      {tab === 'orders' && <SupplierOrdersTab />}
      {tab === 'documents' && <DocumentsTab />}
      {tab === 'profile' && <SupplierProfileTab user={user} />}
    </DashboardLayout>
  );
}

// ─── My Products Tab ────────────────────────────────────────────

function MyProductsTab() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/supplier/products?limit=50');
        setProducts(res.data?.products || res.data?.data || []);
      } catch { setProducts([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  const statusGroups = {
    active: products.filter(p => p.status === 'active'),
    pending: products.filter(p => p.status === 'pending_review' || p.status === 'pending'),
    rejected: products.filter(p => p.status === 'rejected'),
  };

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard label="Active Products" value={statusGroups.active.length} />
        <StatCard label="Pending Review" value={statusGroups.pending.length} />
        <StatCard label="Rejected" value={statusGroups.rejected.length} />
      </div>

      <h3 className="font-heading text-lg text-white uppercase">Your Products</h3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {products.map(p => (
          <div key={p._id} className="p-4 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-heading text-white">{p.name}</div>
              <Badge status={p.status === 'active' ? 'active' : p.status === 'rejected' ? 'error' : 'processing'}>
                {p.status?.replace('_', ' ') || 'pending'}
              </Badge>
            </div>
            <div className="text-[10px] text-gray-400">{p.category} | {p.sku || '--'}</div>
            {p.cannabinoids?.thc != null && <div className="text-[10px] text-gray-400 mt-1">THC: {p.cannabinoids.thc}% | CBD: {p.cannabinoids.cbd}%</div>}
            <div className="text-xs font-bold text-white mt-2">{formatCurrency(p.price)}</div>
            {p.rejectionReason && <div className="text-[10px] text-origin-red mt-1">Reason: {p.rejectionReason}</div>}
          </div>
        ))}
        {products.length === 0 && <div className="col-span-3 text-center py-8 text-gray-400 text-sm">No products submitted yet</div>}
      </div>
    </div>
  );
}

// ─── Submit Product Tab ─────────────────────────────────────────

function SubmitProductTab() {
  const [form, setForm] = useState({ name: '', category: '', price: '', description: '', thc: '', cbd: '', growMethod: '' });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  function update(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function submit(e) {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      await api.post('/supplier/products', {
        name: form.name,
        category: form.category,
        price: Number(form.price),
        description: form.description,
        cannabinoids: { thc: Number(form.thc) || 0, cbd: Number(form.cbd) || 0 },
        growMethod: form.growMethod,
      });
      setMessage({ type: 'success', text: 'Product submitted for MDC review' });
      setForm({ name: '', category: '', price: '', description: '', thc: '', cbd: '', growMethod: '' });
    } catch {
      setMessage({ type: 'error', text: 'Failed to submit product' });
    }
    setSubmitting(false);
  }

  return (
    <div className="max-w-lg">
      <h3 className="font-heading text-lg text-white uppercase mb-4">Submit New Product</h3>
      <p className="text-xs text-gray-500 mb-4">Products are submitted for MDC review before activation</p>

      {message && (
        <div className={`p-3 rounded-lg mb-4 text-xs font-bold ${message.type === 'success' ? 'bg-or-gold/10 text-or-gold' : 'bg-origin-red/10 text-origin-red'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={submit} className="space-y-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Product Name *</label>
          <input type="text" required value={form.name} onChange={e => update('name', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-or-gold outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Category *</label>
            <select required value={form.category} onChange={e => update('category', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-or-gold outline-none">
              <option value="">Select...</option>
              <option value="flower">Flower</option>
              <option value="oil">Oil</option>
              <option value="edible">Edible</option>
              <option value="topical">Topical</option>
              <option value="accessory">Accessory</option>
              <option value="concentrate">Concentrate</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Price (ZAR) *</label>
            <input type="number" required min="0" step="0.01" value={form.price} onChange={e => update('price', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-or-gold outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">THC %</label>
            <input type="number" min="0" max="100" step="0.1" value={form.thc} onChange={e => update('thc', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-or-gold outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">CBD %</label>
            <input type="number" min="0" max="100" step="0.1" value={form.cbd} onChange={e => update('cbd', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-or-gold outline-none" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Grow Method</label>
            <select value={form.growMethod} onChange={e => update('growMethod', e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-or-gold outline-none">
              <option value="">Select...</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="greenhouse">Greenhouse</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Description</label>
          <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-or-gold outline-none" />
        </div>
        <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-lg bg-or-gold text-white text-sm font-bold disabled:opacity-50">
          {submitting ? 'Submitting...' : 'Submit for Review'}
        </button>
      </form>
    </div>
  );
}

// ─── Supplier Orders Tab ────────────────────────────────────────

function SupplierOrdersTab() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/supplier/purchase-orders?limit=50');
        setOrders(res.data?.purchaseOrders || res.data?.data || []);
      } catch { setOrders([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Purchase Orders</h3>
      {orders.map(o => (
        <div key={o._id} className="p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-heading text-white">{o.poNumber}</div>
              <div className="text-[10px] text-gray-400">{o.items?.length || 0} items | {new Date(o.createdAt).toLocaleDateString('en-ZA')}</div>
            </div>
            <div className="text-right">
              <Badge status={o.status === 'received' ? 'active' : o.status === 'cancelled' ? 'error' : 'processing'}>{o.status}</Badge>
              <div className="text-xs font-bold text-white mt-1">{formatCurrency(o.total || 0)}</div>
            </div>
          </div>
        </div>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-400 text-sm">No purchase orders</div>}
    </div>
  );
}

// ─── Documents Tab ──────────────────────────────────────────────

function DocumentsTab() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/supplier/documents?limit=50');
        setDocs(res.data?.documents || res.data?.data || []);
      } catch { setDocs([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg text-white uppercase">Compliance Documents</h3>
        <button className="px-4 py-2 rounded-lg bg-or-gold text-white text-xs font-bold">Upload Document</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        {docs.map(doc => (
          <div key={doc._id} className="p-4 rounded-lg border border-gray-200">
            <div className="text-sm font-heading text-white">{doc.name || doc.type}</div>
            <div className="text-[10px] text-gray-400 mt-1">{doc.type} | Uploaded {new Date(doc.createdAt).toLocaleDateString('en-ZA')}</div>
            {doc.expiryDate && (
              <div className={`text-[10px] mt-1 ${new Date(doc.expiryDate) < new Date() ? 'text-origin-red font-bold' : 'text-gray-400'}`}>
                Expires: {new Date(doc.expiryDate).toLocaleDateString('en-ZA')}
              </div>
            )}
            <Badge status={doc.verified ? 'active' : 'processing'} className="mt-2">
              {doc.verified ? 'Verified' : 'Pending Review'}
            </Badge>
          </div>
        ))}
        {docs.length === 0 && <div className="col-span-2 text-center py-8 text-gray-400 text-sm">No documents uploaded</div>}
      </div>
    </div>
  );
}

// ─── Profile Tab ────────────────────────────────────────────────

function SupplierProfileTab({ user }) {
  return (
    <div className="space-y-4">
      <h3 className="font-heading text-lg text-white uppercase">Supplier Profile</h3>
      <div className="p-4 rounded-lg border border-gray-200 bg-white space-y-3">
        {[
          ['Company', user?.companyName || user?.firstName || '--'],
          ['Contact', `${user?.firstName || ''} ${user?.lastName || ''}`],
          ['Email', user?.email],
          ['Phone', user?.phone || '--'],
          ['Type', user?.supplierType || '--'],
          ['Region', user?.region || '--'],
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
