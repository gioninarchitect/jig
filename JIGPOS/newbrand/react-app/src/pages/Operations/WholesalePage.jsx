// P27 — Wholesale POS
// Bulk order builder, B2B customer selection, tiered pricing.

import { useState, useEffect } from 'react';
import POSLayout from '../../layouts/POSLayout';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../config';
import api from '../../services/api';

export default function WholesalePage() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('catalog'); // catalog | cart | orders
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/products?status=active&limit=100');
        setProducts(res.data?.products || res.data?.data || []);
      } catch { /* fallback empty */ }
      setLoading(false);
    }
    load();
  }, []);

  function addToCart(product, quantity) {
    const qty = Math.max(1, Number(quantity) || 1);
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) return prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { ...product, quantity: qty }];
    });
  }

  function updateQuantity(productId, quantity) {
    const qty = Math.max(0, Number(quantity));
    if (qty === 0) {
      setCart(prev => prev.filter(i => i._id !== productId));
    } else {
      setCart(prev => prev.map(i => i._id === productId ? { ...i, quantity: qty } : i));
    }
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    try {
      await api.post('/orders', {
        items: cart.map(i => ({ product: i._id, quantity: i.quantity, price: i.wholesalePrice || i.price })),
        type: 'wholesale',
        customer: customer?._id,
        status: 'pending',
      });
      setCart([]);
      setCustomer(null);
    } catch { /* handle error */ }
  }

  const cartTotal = cart.reduce((sum, i) => sum + ((i.wholesalePrice || i.price) * i.quantity), 0);
  const cartUnits = cart.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <POSLayout
      header={
        <>
          <span className="font-heading text-xl uppercase">Wholesale POS</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {['catalog', 'cart', 'orders'].map(v => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded text-xs font-bold ${view === v ? 'bg-jig-purple text-white' : 'bg-white/10 text-gray-100'}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                  {v === 'cart' && cart.length > 0 && <span className="ml-1 px-1 bg-jig-amber text-white rounded text-[10px]">{cartUnits}</span>}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-100">{user?.firstName}</span>
            <button onClick={logout} className="text-jig-amber hover:underline text-xs">Logout</button>
          </div>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-3 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'catalog' ? (
        <CatalogView products={products} onAdd={addToCart} />
      ) : view === 'cart' ? (
        <CartView cart={cart} cartTotal={cartTotal} customer={customer} setCustomer={setCustomer} updateQuantity={updateQuantity} submitOrder={submitOrder} />
      ) : (
        <OrdersView />
      )}
    </POSLayout>
  );
}

// ─── Catalog View ───────────────────────────────────────────────

function CatalogView({ products, onAdd }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];
  const filtered = products.filter(p => {
    if (category !== 'all' && p.category !== category) return false;
    if (search && !p.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-4 space-y-4 overflow-y-auto h-full">
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search products..."
          className="flex-1 px-3 py-2 rounded-lg bg-white/10 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 focus:ring-2 focus:ring-jig-purple outline-none"
        />
        <select value={category} onChange={e => setCategory(e.target.value)} className="px-3 py-2 rounded-lg bg-white/10 border border-gray-700 text-gray-100 text-sm">
          {categories.map(c => <option key={c} value={c} className="bg-jig-slate">{c === 'all' ? 'All Categories' : c}</option>)}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-3 text-left text-gray-400 font-bold uppercase">Product</th>
              <th className="py-2 px-3 text-left text-gray-400 font-bold uppercase">Category</th>
              <th className="py-2 px-3 text-right text-gray-400 font-bold uppercase">Retail</th>
              <th className="py-2 px-3 text-right text-gray-400 font-bold uppercase">Wholesale</th>
              <th className="py-2 px-3 text-right text-gray-400 font-bold uppercase">Stock</th>
              <th className="py-2 px-3 text-center text-gray-400 font-bold uppercase">Add</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => (
              <ProductRow key={p._id} product={p} onAdd={onAdd} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No products found</div>}
      </div>
    </div>
  );
}

function ProductRow({ product, onAdd }) {
  const [qty, setQty] = useState(10);
  const wholesale = product.wholesalePrice || (product.price * 0.7);

  return (
    <tr className="border-b border-gray-800 hover:bg-white/5">
      <td className="py-2 px-3 text-gray-100">{product.name}</td>
      <td className="py-2 px-3 text-gray-400">{product.category}</td>
      <td className="py-2 px-3 text-right text-gray-400">{formatCurrency(product.price)}</td>
      <td className="py-2 px-3 text-right text-jig-amber font-bold">{formatCurrency(wholesale)}</td>
      <td className="py-2 px-3 text-right text-gray-400">{product.inventory?.quantity ?? '--'}</td>
      <td className="py-2 px-3">
        <div className="flex items-center justify-center gap-1">
          <input type="number" min="1" value={qty} onChange={e => setQty(Number(e.target.value))} className="w-14 px-1 py-1 rounded bg-white/10 border border-gray-700 text-gray-100 text-xs text-center" />
          <button onClick={() => onAdd(product, qty)} className="px-2 py-1 rounded bg-jig-purple text-white text-[10px] font-bold">Add</button>
        </div>
      </td>
    </tr>
  );
}

// ─── Cart View ──────────────────────────────────────────────────

function CartView({ cart, cartTotal, customer, setCustomer, updateQuantity, submitOrder }) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState([]);

  async function searchCustomers(query) {
    setCustomerSearch(query);
    if (query.length < 2) { setCustomers([]); return; }
    try {
      const res = await api.get(`/users?search=${encodeURIComponent(query)}&role=wholesale_customer&limit=10`);
      setCustomers(res.data?.users || res.data?.data || []);
    } catch { setCustomers([]); }
  }

  return (
    <div className="p-6 space-y-4 overflow-y-auto h-full max-w-3xl mx-auto">
      <h3 className="font-heading text-xl text-gray-100 uppercase">Wholesale Order</h3>

      {/* Customer selection */}
      <div className="p-4 rounded-lg border border-gray-700 bg-jig-slate/20">
        <div className="text-xs text-gray-400 font-bold uppercase mb-2">B2B Customer</div>
        {customer ? (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-100">{customer.companyName || `${customer.firstName} ${customer.lastName}`}</div>
            <button onClick={() => setCustomer(null)} className="text-[10px] text-jig-amber hover:underline">Change</button>
          </div>
        ) : (
          <div>
            <input
              type="text"
              value={customerSearch}
              onChange={e => searchCustomers(e.target.value)}
              placeholder="Search customer..."
              className="w-full px-3 py-2 rounded-lg bg-white/10 border border-gray-700 text-gray-100 text-sm placeholder-gray-500 outline-none"
            />
            {customers.length > 0 && (
              <div className="mt-2 space-y-1">
                {customers.map(c => (
                  <button key={c._id} onClick={() => { setCustomer(c); setCustomerSearch(''); setCustomers([]); }} className="w-full text-left p-2 rounded hover:bg-white/10 text-xs text-gray-100">
                    {c.companyName || `${c.firstName} ${c.lastName}`} — {c.email}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart items */}
      <div className="space-y-2">
        {cart.map(item => (
          <div key={item._id} className="p-3 rounded-lg border border-gray-700 flex items-center justify-between">
            <div className="flex-1 text-sm text-gray-100">{item.name}</div>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="0"
                value={item.quantity}
                onChange={e => updateQuantity(item._id, e.target.value)}
                className="w-16 px-2 py-1 rounded bg-white/10 border border-gray-700 text-gray-100 text-xs text-center"
              />
              <div className="text-xs text-jig-amber w-20 text-right">{formatCurrency((item.wholesalePrice || item.price) * item.quantity)}</div>
            </div>
          </div>
        ))}
        {cart.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">Cart is empty</div>}
      </div>

      {/* Total + Submit */}
      {cart.length > 0 && (
        <div className="p-4 rounded-lg border border-gray-700 bg-jig-slate/20">
          <div className="flex justify-between text-lg font-heading text-gray-100 mb-4">
            <span>Total ({cart.reduce((s, i) => s + i.quantity, 0)} units)</span>
            <span className="text-jig-amber">{formatCurrency(cartTotal)}</span>
          </div>
          <button onClick={submitOrder} className="w-full py-3 rounded-lg bg-jig-amber text-white text-sm font-bold">
            Submit Wholesale Order
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Orders View ────────────────────────────────────────────────

function OrdersView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get('/orders/all?status=wholesale&limit=50');
        setOrders(res.data?.orders || res.data?.data || []);
      } catch { setOrders([]); }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-full"><div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-3 overflow-y-auto h-full">
      <h3 className="font-heading text-xl text-gray-100 uppercase mb-4">Wholesale Orders</h3>
      {orders.map(o => (
        <div key={o._id} className="p-4 rounded-lg border border-gray-700 bg-jig-slate/20 flex items-center justify-between">
          <div>
            <div className="text-sm font-heading text-gray-100">{o.orderNumber || `#${o._id?.slice(-6)}`}</div>
            <div className="text-[10px] text-gray-400">
              {o.customer?.companyName || 'Walk-in'} | {o.items?.length || 0} items | {new Date(o.createdAt).toLocaleDateString('en-ZA')}
            </div>
          </div>
          <div className="text-right">
            <Badge status={o.status === 'completed' ? 'active' : o.status === 'cancelled' ? 'error' : 'processing'}>{o.status}</Badge>
            <div className="text-xs font-bold text-jig-amber mt-1">{formatCurrency(o.total || 0)}</div>
          </div>
        </div>
      ))}
      {orders.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No wholesale orders</div>}
    </div>
  );
}
