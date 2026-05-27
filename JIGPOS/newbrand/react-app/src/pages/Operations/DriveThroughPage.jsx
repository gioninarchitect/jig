// P27 — Drive-Through POS
// Quick-serve interface: order queue, fast checkout, ready display.

import { useState, useEffect } from 'react';
import POSLayout from '../../layouts/POSLayout';
import { useAuth } from '../../contexts/AuthContext';
import Badge from '../../components/ui/Badge';
import { formatCurrency } from '../../config';
import api from '../../services/api';

export default function DriveThroughPage() {
  const { user, logout } = useAuth();
  const [view, setView] = useState('order'); // order | queue | ready
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [prodRes, queueRes] = await Promise.all([
          api.get('/products?status=active&track=lifestyle&limit=30'),
          api.get('/orders/all?status=preparing&limit=20'),
        ]);
        setProducts(prodRes.data?.products || prodRes.data?.data || []);
        setQueue(queueRes.data?.orders || queueRes.data?.data || []);
      } catch { /* fallback empty */ }
      setLoading(false);
    }
    load();
  }, []);

  function addToCart(product) {
    setCart(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) return prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart(prev => prev.filter(i => i._id !== productId));
  }

  async function submitOrder() {
    if (cart.length === 0) return;
    try {
      await api.post('/orders', {
        items: cart.map(i => ({ product: i._id, quantity: i.quantity, price: i.price })),
        type: 'drive-through',
        status: 'preparing',
      });
      setCart([]);
    } catch { /* handle error */ }
  }

  const cartTotal = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

  return (
    <POSLayout
      header={
        <>
          <span className="font-heading text-xl uppercase">Drive-Through</span>
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              {['order', 'queue', 'ready'].map(v => (
                <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded text-xs font-bold ${view === v ? 'bg-or-gold text-white' : 'bg-white/10 text-gray-100'}`}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
            <span className="text-sm text-gray-100">{user?.firstName}</span>
            <button onClick={logout} className="text-or-gold hover:underline text-xs">Logout</button>
          </div>
        </>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-3 border-or-gold border-t-transparent rounded-full animate-spin" /></div>
      ) : view === 'order' ? (
        <div className="flex h-full">
          {/* Product grid */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map(p => (
                <button key={p._id} onClick={() => addToCart(p)} className="p-3 rounded-lg border border-gray-700 bg-origin-slate/30 hover:bg-origin-slate/50 text-left transition-colors">
                  <div className="text-sm font-heading text-gray-100">{p.name}</div>
                  <div className="text-xs text-or-gold mt-1">{formatCurrency(p.price)}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Cart sidebar */}
          <div className="w-72 border-l border-gray-700 bg-origin-slate/20 flex flex-col">
            <div className="p-3 border-b border-gray-700">
              <div className="text-xs text-gray-100 font-bold uppercase">Current Order</div>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.map(item => (
                <div key={item._id} className="flex items-center justify-between text-xs text-gray-100">
                  <div className="flex-1">
                    <div>{item.name}</div>
                    <div className="text-or-gold">{item.quantity}x {formatCurrency(item.price)}</div>
                  </div>
                  <button onClick={() => removeFromCart(item._id)} className="text-origin-red text-[10px] hover:underline ml-2">Remove</button>
                </div>
              ))}
              {cart.length === 0 && <div className="text-center text-gray-500 text-xs py-4">No items</div>}
            </div>
            <div className="p-3 border-t border-gray-700">
              <div className="flex justify-between text-sm text-gray-100 font-bold mb-3">
                <span>Total</span>
                <span className="text-or-gold">{formatCurrency(cartTotal)}</span>
              </div>
              <button onClick={submitOrder} disabled={cart.length === 0} className="w-full py-2.5 rounded-lg bg-or-gold text-white text-sm font-bold disabled:opacity-30">
                Submit Order
              </button>
            </div>
          </div>
        </div>
      ) : view === 'queue' ? (
        <div className="p-6 space-y-3">
          <h3 className="font-heading text-xl text-gray-100 uppercase mb-4">Order Queue</h3>
          {queue.map(o => (
            <div key={o._id} className="p-4 rounded-lg border border-gray-700 bg-origin-slate/20 flex items-center justify-between">
              <div>
                <div className="text-sm font-heading text-gray-100">{o.orderNumber || `#${o._id?.slice(-6)}`}</div>
                <div className="text-[10px] text-gray-400">{o.items?.length || 0} items | {o.type || 'drive-through'}</div>
              </div>
              <Badge status="processing">Preparing</Badge>
            </div>
          ))}
          {queue.length === 0 && <div className="text-center py-8 text-gray-500 text-sm">No orders in queue</div>}
        </div>
      ) : (
        <div className="p-6">
          <h3 className="font-heading text-xl text-gray-100 uppercase mb-4">Ready for Pickup</h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {queue.filter(o => o.status === 'ready').map(o => (
              <div key={o._id} className="p-6 rounded-lg border-2 border-or-gold bg-or-gold/10 text-center">
                <div className="font-heading text-3xl text-or-gold">{o.orderNumber || `#${o._id?.slice(-6)}`}</div>
                <Badge status="active" className="mt-2">Ready</Badge>
              </div>
            ))}
            {queue.filter(o => o.status === 'ready').length === 0 && <div className="col-span-3 text-center py-8 text-gray-500 text-sm">No orders ready</div>}
          </div>
        </div>
      )}
    </POSLayout>
  );
}
