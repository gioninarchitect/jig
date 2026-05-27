/**
 * PureGro Premium Cannabis Care - Admin Supplier Management
 *
 * Full supplier list with search, type/status filters, add supplier,
 * expandable detail with product catalog and purchase orders.
 */

import { useState, useEffect, useCallback } from 'react';
import { capitalize, formatRand } from '../../utils';
import { getStoredToken } from '../../api';

const API_BASE = '/api/v1';

// ── Types ───────────────────────────────────────────────────

interface Supplier {
  id: string;
  companyName: string;
  supplierType: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: { street: string | null; city: string | null; province: string | null };
  licenseNumber: string | null;
  status: string;
  paymentTerms: string;
  notes: string | null;
  productCount: number;
  createdAt: string;
  updatedAt: string;
}

interface SupplierProduct {
  id: string;
  productName: string;
  sku: string | null;
  unitPrice: number;
  minOrderQty: number;
  leadTimeDays: number;
  notes: string | null;
  createdAt: string;
}

interface SupplierOrder {
  id: string;
  supplierId: string;
  supplierName?: string;
  poNumber: string;
  status: string;
  total: number;
  expectedDelivery: string | null;
  receivedAt: string | null;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

// ── API helpers ─────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

// ── Type badge colors ───────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  farm: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  grower: 'bg-lime-500/15 text-lime-400 border-lime-500/25',
  processor: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  lab: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  distributor: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  approved: 'bg-green-500/15 text-green-400 border-green-500/25',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/25',
  inactive: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
};

const PO_STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/15 text-gray-400 border-gray-500/25',
  sent: 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  confirmed: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  shipped: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  received: 'bg-green-500/15 text-green-400 border-green-500/25',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/25',
};

// ── Component ───────────────────────────────────────────────

export default function AdminSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [poSupplierId, setPOSupplierId] = useState<string | null>(null);

  // Detail data for expanded supplier
  const [detailProducts, setDetailProducts] = useState<SupplierProduct[]>([]);
  const [detailOrders, setDetailOrders] = useState<SupplierOrder[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const qs = new URLSearchParams();
      if (typeFilter) qs.set('type', typeFilter);
      if (statusFilter) qs.set('status', statusFilter);
      const q = qs.toString();
      const data = await apiGet<{ suppliers: Supplier[]; count: number }>(
        `/suppliers${q ? `?${q}` : ''}`,
      );
      setSuppliers(data.suppliers);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const loadDetail = async (id: string) => {
    setDetailLoading(true);
    try {
      const data = await apiGet<{
        supplier: Supplier;
        products: SupplierProduct[];
        orders: SupplierOrder[];
      }>(`/suppliers/${id}`);
      setDetailProducts(data.products);
      setDetailOrders(data.orders);
    } catch {
      // silent
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRowClick = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      loadDetail(id);
    }
  };

  const handleStatusChange = async (supplierId: string, newStatus: string) => {
    try {
      await apiPatch(`/suppliers/${supplierId}`, { status: newStatus });
      loadSuppliers();
    } catch {
      // silent
    }
  };

  const filtered = suppliers.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.companyName || '').toLowerCase().includes(q) ||
      (s.contactPerson || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">
          Suppliers
        </h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="rounded bg-pg-green px-4 py-2 font-heading text-[11px] font-semibold uppercase tracking-wider text-pg-white transition-colors hover:bg-pg-green/80"
        >
          + Add Supplier
        </button>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <input
          type="text"
          placeholder="Search suppliers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded border border-white/[0.1] bg-pg-gray-900 px-3.5 py-2 text-sm text-pg-white outline-none transition-all placeholder:text-pg-gray-700 focus:border-pg-green focus:ring-2 focus:ring-pg-green/15"
        />
        <div className="flex gap-2">
          {['', 'farm', 'grower', 'processor', 'lab', 'distributor'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded px-3 py-1.5 font-heading text-[11px] font-medium uppercase tracking-wider transition-all ${
                typeFilter === t
                  ? 'bg-pg-green text-pg-white'
                  : 'border border-white/[0.1] bg-white/[0.04] text-pg-gray-500 hover:border-white/[0.2] hover:text-pg-white'
              }`}
            >
              {t || 'All Types'}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          {['', 'pending', 'approved', 'suspended', 'inactive'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded px-3 py-1.5 font-heading text-[11px] font-medium uppercase tracking-wider transition-all ${
                statusFilter === s
                  ? 'bg-pg-green text-pg-white'
                  : 'border border-white/[0.1] bg-white/[0.04] text-pg-gray-500 hover:border-white/[0.2] hover:text-pg-white'
              }`}
            >
              {s || 'All Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-pg-dark">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr>
                {['Company', 'Type', 'Contact', 'Location', 'License', 'Products', 'Terms', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((s) => (
                <>
                  <tr
                    key={s.id}
                    onClick={() => handleRowClick(s.id)}
                    className={`cursor-pointer transition-colors hover:bg-white/[0.02] ${expandedId === s.id ? 'bg-white/[0.03]' : ''}`}
                  >
                    <td className="px-4 py-3 font-medium text-pg-green">{s.companyName}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${TYPE_COLORS[s.supplierType] || 'text-pg-gray-500'}`}>
                        {capitalize(s.supplierType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-pg-gray-300">{s.contactPerson || '-'}</div>
                      <div className="text-xs text-pg-gray-500">{s.email || ''}</div>
                    </td>
                    <td className="px-4 py-3 text-pg-gray-300">
                      {[s.address?.city, s.address?.province].filter(Boolean).join(', ') || '-'}
                    </td>
                    <td className="px-4 py-3 text-pg-gray-300">{s.licenseNumber || '-'}</td>
                    <td className="px-4 py-3 text-pg-gray-300">{s.productCount}</td>
                    <td className="px-4 py-3 text-pg-gray-300">{s.paymentTerms}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded border px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[s.status] || 'text-pg-gray-500'}`}>
                        {capitalize(s.status)}
                      </span>
                    </td>
                  </tr>

                  {/* Expanded detail */}
                  {expandedId === s.id && (
                    <tr key={`${s.id}-detail`}>
                      <td colSpan={8} className="bg-pg-black/50 px-6 py-4">
                        {detailLoading ? (
                          <div className="flex h-20 items-center justify-center">
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {/* Status actions */}
                            <div className="flex items-center gap-3">
                              <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                                Set Status:
                              </span>
                              {['approved', 'suspended', 'inactive'].map((st) => (
                                <button
                                  key={st}
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(s.id, st); }}
                                  className={`rounded border px-2.5 py-1 font-heading text-[10px] font-medium uppercase tracking-wider transition-all hover:opacity-80 ${STATUS_COLORS[st]}`}
                                >
                                  {capitalize(st)}
                                </button>
                              ))}
                            </div>

                            {/* Product catalog */}
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-pg-white">
                                  Product Catalog ({detailProducts.length})
                                </h3>
                                <AddProductButton supplierId={s.id} onAdded={() => loadDetail(s.id)} />
                              </div>
                              {detailProducts.length > 0 ? (
                                <div className="overflow-hidden rounded border border-white/[0.06]">
                                  <table className="w-full text-left text-xs">
                                    <thead className="border-b border-white/[0.06] bg-pg-dark">
                                      <tr>
                                        {['Product', 'SKU', 'Unit Price', 'Min Order', 'Lead Time'].map((h) => (
                                          <th key={h} className="px-3 py-2 font-heading text-[9px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                      {detailProducts.map((p) => (
                                        <tr key={p.id} className="hover:bg-white/[0.02]">
                                          <td className="px-3 py-2 text-pg-gray-300">{p.productName}</td>
                                          <td className="px-3 py-2 text-pg-gray-500">{p.sku || '-'}</td>
                                          <td className="px-3 py-2 text-pg-gold">{formatRand(p.unitPrice)}</td>
                                          <td className="px-3 py-2 text-pg-gray-300">{p.minOrderQty}</td>
                                          <td className="px-3 py-2 text-pg-gray-300">{p.leadTimeDays}d</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-pg-gray-500">No products in catalog yet.</p>
                              )}
                            </div>

                            {/* Purchase orders */}
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <h3 className="font-heading text-xs font-semibold uppercase tracking-wider text-pg-white">
                                  Purchase Orders ({detailOrders.length})
                                </h3>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPOSupplierId(s.id);
                                    setShowPOModal(true);
                                  }}
                                  className="rounded bg-pg-green/15 px-3 py-1 font-heading text-[10px] font-semibold uppercase tracking-wider text-pg-green border border-pg-green/25 transition-colors hover:bg-pg-green/25"
                                >
                                  + Create PO
                                </button>
                              </div>
                              {detailOrders.length > 0 ? (
                                <div className="overflow-hidden rounded border border-white/[0.06]">
                                  <table className="w-full text-left text-xs">
                                    <thead className="border-b border-white/[0.06] bg-pg-dark">
                                      <tr>
                                        {['PO #', 'Status', 'Total', 'Expected', 'Created'].map((h) => (
                                          <th key={h} className="px-3 py-2 font-heading text-[9px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/[0.04]">
                                      {detailOrders.map((o) => (
                                        <tr key={o.id} className="hover:bg-white/[0.02]">
                                          <td className="px-3 py-2 font-medium text-pg-green">{o.poNumber}</td>
                                          <td className="px-3 py-2">
                                            <span className={`rounded border px-2 py-0.5 font-heading text-[9px] font-semibold uppercase tracking-wider ${PO_STATUS_COLORS[o.status] || 'text-pg-gray-500'}`}>
                                              {capitalize(o.status)}
                                            </span>
                                          </td>
                                          <td className="px-3 py-2 text-pg-gold">{formatRand(o.total)}</td>
                                          <td className="px-3 py-2 text-pg-gray-300">
                                            {o.expectedDelivery ? new Date(o.expectedDelivery).toLocaleDateString('en-ZA') : '-'}
                                          </td>
                                          <td className="px-3 py-2 text-pg-gray-500">
                                            {new Date(o.createdAt).toLocaleDateString('en-ZA')}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-xs text-pg-gray-500">No purchase orders yet.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-pg-gray-500">
                    No suppliers match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-pg-gray-500">
        Showing {filtered.length} of {suppliers.length} suppliers
      </p>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <AddSupplierModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); loadSuppliers(); }}
        />
      )}

      {/* Create PO Modal */}
      {showPOModal && poSupplierId && (
        <CreatePOModal
          supplierId={poSupplierId}
          onClose={() => { setShowPOModal(false); setPOSupplierId(null); }}
          onCreated={() => {
            setShowPOModal(false);
            setPOSupplierId(null);
            if (expandedId) loadDetail(expandedId);
          }}
        />
      )}
    </div>
  );
}

// ── Add Product Button (inline) ─────────────────────────────

function AddProductButton({ supplierId, onAdded }: { supplierId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [productName, setProductName] = useState('');
  const [sku, setSku] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!productName) return;
    setSaving(true);
    try {
      await apiPost(`/suppliers/${supplierId}/products`, {
        productName,
        sku: sku || undefined,
        unitPrice: unitPrice ? Number(unitPrice) : undefined,
      });
      setProductName('');
      setSku('');
      setUnitPrice('');
      setOpen(false);
      onAdded();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        className="rounded bg-pg-green/15 px-3 py-1 font-heading text-[10px] font-semibold uppercase tracking-wider text-pg-green border border-pg-green/25 transition-colors hover:bg-pg-green/25"
      >
        + Add Product
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <input
        type="text"
        placeholder="Product name"
        value={productName}
        onChange={(e) => setProductName(e.target.value)}
        className="w-40 rounded border border-white/[0.1] bg-pg-gray-900 px-2 py-1 text-xs text-pg-white outline-none focus:border-pg-green"
      />
      <input
        type="text"
        placeholder="SKU"
        value={sku}
        onChange={(e) => setSku(e.target.value)}
        className="w-24 rounded border border-white/[0.1] bg-pg-gray-900 px-2 py-1 text-xs text-pg-white outline-none focus:border-pg-green"
      />
      <input
        type="number"
        placeholder="Price"
        value={unitPrice}
        onChange={(e) => setUnitPrice(e.target.value)}
        className="w-20 rounded border border-white/[0.1] bg-pg-gray-900 px-2 py-1 text-xs text-pg-white outline-none focus:border-pg-green"
      />
      <button
        onClick={handleSubmit}
        disabled={saving || !productName}
        className="rounded bg-pg-green px-2.5 py-1 font-heading text-[10px] font-semibold uppercase text-pg-white transition-colors hover:bg-pg-green/80 disabled:opacity-50"
      >
        {saving ? '...' : 'Save'}
      </button>
      <button
        onClick={() => setOpen(false)}
        className="text-pg-gray-500 hover:text-pg-white text-xs"
      >
        Cancel
      </button>
    </div>
  );
}

// ── Add Supplier Modal ──────────────────────────────────────

function AddSupplierModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    companyName: '',
    supplierType: 'farm',
    contactPerson: '',
    email: '',
    phone: '',
    addressStreet: '',
    addressCity: '',
    addressProvince: '',
    licenseNumber: '',
    paymentTerms: 'COD',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName) { setError('Company name is required'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost('/suppliers', form);
      onCreated();
    } catch {
      setError('Failed to create supplier');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded border border-white/[0.1] bg-pg-gray-900 px-3 py-2 text-sm text-pg-white outline-none transition-all placeholder:text-pg-gray-700 focus:border-pg-green focus:ring-2 focus:ring-pg-green/15';
  const labelClass = 'mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg border border-white/[0.06] bg-pg-dark p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide text-pg-white">
          Add Supplier
        </h2>

        {error && (
          <div className="mb-4 rounded border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Company Name *</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(e) => setForm({ ...form, companyName: e.target.value })}
                className={inputClass}
                placeholder="Green Fields Farm"
              />
            </div>
            <div>
              <label className={labelClass}>Type</label>
              <select
                value={form.supplierType}
                onChange={(e) => setForm({ ...form, supplierType: e.target.value })}
                className={inputClass}
              >
                <option value="farm">Farm</option>
                <option value="grower">Grower</option>
                <option value="processor">Processor</option>
                <option value="distributor">Distributor</option>
                <option value="lab">Lab</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Contact Person</label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className={inputClass}
                placeholder="John Smith"
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputClass}
                placeholder="john@greenfields.co.za"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputClass}
                placeholder="082 123 4567"
              />
            </div>
            <div>
              <label className={labelClass}>License Number</label>
              <input
                type="text"
                value={form.licenseNumber}
                onChange={(e) => setForm({ ...form, licenseNumber: e.target.value })}
                className={inputClass}
                placeholder="LIC-12345"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Street</label>
              <input
                type="text"
                value={form.addressStreet}
                onChange={(e) => setForm({ ...form, addressStreet: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input
                type="text"
                value={form.addressCity}
                onChange={(e) => setForm({ ...form, addressCity: e.target.value })}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Province</label>
              <input
                type="text"
                value={form.addressProvince}
                onChange={(e) => setForm({ ...form, addressProvince: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Payment Terms</label>
              <select
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className={inputClass}
              >
                <option value="COD">COD</option>
                <option value="NET30">NET 30</option>
                <option value="NET60">NET 60</option>
                <option value="Prepaid">Prepaid</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input
                type="text"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={inputClass}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/[0.1] bg-white/[0.04] px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-pg-gray-500 transition-all hover:border-white/[0.2] hover:text-pg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-pg-green px-4 py-2 font-heading text-[11px] font-semibold uppercase tracking-wider text-pg-white transition-colors hover:bg-pg-green/80 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Supplier'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Purchase Order Modal ─────────────────────────────

function CreatePOModal({
  supplierId,
  onClose,
  onCreated,
}: {
  supplierId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [items, setItems] = useState([{ productName: '', quantity: 1, unitPrice: 0 }]);
  const [expectedDelivery, setExpectedDelivery] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addItem = () => setItems([...items, { productName: '', quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    const next = [...items];
    (next[idx] as any)[field] = value;
    setItems(next);
  };

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validItems = items.filter((i) => i.productName);
    if (validItems.length === 0) { setError('At least one item is required'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost('/suppliers/orders', {
        supplierId,
        items: validItems,
        expectedDelivery: expectedDelivery || undefined,
        notes: notes || undefined,
      });
      onCreated();
    } catch {
      setError('Failed to create purchase order');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full rounded border border-white/[0.1] bg-pg-gray-900 px-3 py-2 text-sm text-pg-white outline-none transition-all placeholder:text-pg-gray-700 focus:border-pg-green focus:ring-2 focus:ring-pg-green/15';
  const labelClass = 'mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-lg border border-white/[0.06] bg-pg-dark p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide text-pg-white">
          Create Purchase Order
        </h2>

        {error && (
          <div className="mb-4 rounded border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Items */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className={labelClass}>Order Items</label>
              <button
                type="button"
                onClick={addItem}
                className="text-pg-green font-heading text-[10px] font-semibold uppercase tracking-wider hover:text-pg-green-light"
              >
                + Add Line
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Product name"
                    value={item.productName}
                    onChange={(e) => updateItem(idx, 'productName', e.target.value)}
                    className="flex-1 rounded border border-white/[0.1] bg-pg-gray-900 px-2 py-1.5 text-xs text-pg-white outline-none focus:border-pg-green"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))}
                    className="w-20 rounded border border-white/[0.1] bg-pg-gray-900 px-2 py-1.5 text-xs text-pg-white outline-none focus:border-pg-green"
                  />
                  <input
                    type="number"
                    placeholder="Unit price"
                    value={item.unitPrice || ''}
                    onChange={(e) => updateItem(idx, 'unitPrice', Number(e.target.value))}
                    className="w-24 rounded border border-white/[0.1] bg-pg-gray-900 px-2 py-1.5 text-xs text-pg-white outline-none focus:border-pg-green"
                  />
                  <span className="w-20 text-right text-xs text-pg-gold">
                    {formatRand(item.quantity * item.unitPrice)}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      X
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 text-right text-sm font-medium text-pg-gold">
              Total: {formatRand(total)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Expected Delivery</label>
              <input
                type="date"
                value={expectedDelivery}
                onChange={(e) => setExpectedDelivery(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={inputClass}
                placeholder="Optional notes..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-white/[0.1] bg-white/[0.04] px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-pg-gray-500 transition-all hover:border-white/[0.2] hover:text-pg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-pg-green px-4 py-2 font-heading text-[11px] font-semibold uppercase tracking-wider text-pg-white transition-colors hover:bg-pg-green/80 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create PO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
